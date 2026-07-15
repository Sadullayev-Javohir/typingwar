using System.Security.Claims;
using System.Text.Json;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Application.Features.Online;
using TypingWar.Application.Features.Rooms;
using TypingWar.Infrastructure.Realtime;

namespace TypingWar.Web.Hubs;

/// <summary>
/// Onlayn foydalanuvchilar + do'stlar partiyasi (hangout/duel lobby).
///   • OnConnected/OnDisconnected — onlayn ro'yxatni yangilaydi (barchaga broadcast).
///   • Invite — foydalanuvchiga invite xabari yuboradi (notification, past-o'ngda).
///   • JoinParty — partiyaga qo'shiladi, a'zolar ro'yxatini yangilaydi.
///   • SendPartyMessage — partiya ichida umumiy chat.
///   • InviteToDuel — partiya a'zosini duelga chaqiradi (xona yaratib, kodini yuboradi).
/// Anonim (tizimga kirmagan) ulanishlar onlayn hisoblanmaydi.
/// </summary>
[AllowAnonymous]
public class PresenceHub : Hub
{
    private readonly OnlineUserService _online;
    private readonly PartyService _parties;
    private readonly ISender _mediator;
    private readonly IHubContext<PresenceHub> _hub;
    private readonly IServiceScopeFactory _scopeFactory;

    public PresenceHub(OnlineUserService online, PartyService parties,
        ISender mediator, IHubContext<PresenceHub> hub, IServiceScopeFactory scopeFactory)
    {
        _online = online;
        _parties = parties;
        _mediator = mediator;
        _hub = hub;
        _scopeFactory = scopeFactory;
    }

    private Guid? UserId =>
        Guid.TryParse(Context.User?.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    public override async Task OnConnectedAsync()
    {
        var uid = UserId;
        if (uid is Guid userId)
        {
            string? username = Context.User?.FindFirstValue(ClaimTypes.Name);
            string? avatar = null, region = null;
            double avgWpm = 0;

            // Profil + o'rtacha WPM ni yangi DI scope ichida o'qiymiz (hub singleton emas,
            // lekin scoped service'larga to'g'ridan-to'g'ri ega emas).
            try
            {
                using (var scope = _scopeFactory.CreateScope())
                {
                    var reader = scope.ServiceProvider.GetRequiredService<IUserProfileReader>();
                    var info = await reader.GetProfileAsync(userId);
                    if (info is not null)
                    {
                        username ??= info.Username;
                        avatar = info.AvatarUrl;
                        region = info.RegionCode;
                    }
                    avgWpm = await reader.GetAvgWpmAsync(userId);
                }
            }
            catch
            {
                // Profil o'qish xatosi (masalan DB vaqtincha erishilmagan) — onlayn
                // ro'yxatga qo'shilishni to'xtatmaymiz, standart qiymatlar bilan davom etamiz.
            }

            _online.Add(userId, Context.ConnectionId, username ?? "Foydalanuvchi", avgWpm, avatar, region);
            await BroadcastOnlineAsync();
        }
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var uid = UserId;
        if (uid is Guid userId)
        {
            _online.Remove(userId, Context.ConnectionId);
            await BroadcastOnlineAsync();
        }
        await base.OnDisconnectedAsync(exception);
    }

    private async Task BroadcastOnlineAsync()
        => await Clients.All.SendAsync("OnlineList", _online.GetList());

    /// <summary>
    /// targetUserId ga invite xabari yuboradi. Invite qiluvchining partiyasi yaratiladi
    /// (yoki mavjud bo'lsa olinadi) va kodi xabar bilan birga yuboriladi — qabul qilganda
    /// foydalanuvchi shu partiyaga tushadi.
    /// </summary>
    public async Task Invite(string targetUserId)
    {
        var uid = UserId;
        if (uid is null) { await Clients.Caller.SendAsync("Error", "Invite uchun tizimga kiring."); return; }

        if (!Guid.TryParse(targetUserId, out var target) || target == uid)
        { await Clients.Caller.SendAsync("Error", "Noto'g'ri foydalanuvchi."); return; }

        var targetInfo = _online.Get(target);
        if (targetInfo is null)
        { await Clients.Caller.SendAsync("Error", "Foydalanuvchi hozir onlayn emas."); return; }

        var from = _online.Get(uid.Value)!;
        var partyCode = _parties.GetOrCreateCode(uid.Value);

        await Clients.User(target.ToString()).SendAsync("InviteReceived", new
        {
            fromUserId = uid.Value.ToString(),
            fromName = from.Username,
            fromAvgWpm = from.AvgWpm,
            fromAvatar = from.AvatarUrl,
            fromRegion = from.RegionCode,
            partyCode
        });
        // Chaqiruvchini ham partiyaga yo'naltiramiz — shunda u ro'yxatda qolmay,
        // balki o'zi yaratgan partiyaga (hangout) o'tadi va chatda qatnashadi.
        await Clients.Caller.SendAsync("InviteSent", new
        {
            toName = targetInfo.Username,
            partyCode
        });
    }

    /// <summary>Partiyaga qo'shilish (invite qabul qilingandan keyin chaqiriladi).</summary>
    public async Task JoinParty(string code)
    {
        var uid = UserId;
        if (uid is null) return;
        code = (code ?? "").ToUpperInvariant();
        if (!_parties.Exists(code)) { await Clients.Caller.SendAsync("Error", "Partiya topilmadi."); return; }

        var me = _online.Get(uid.Value)!;
        var member = new PartyMemberDto(uid.Value.ToString(), me.Username, me.AvgWpm, me.AvatarUrl, me.RegionCode, false);
        var members = _parties.Join(code, member);

        await Groups.AddToGroupAsync(Context.ConnectionId, "party-" + code);
        await Clients.Group("party-" + code).SendAsync("PartyMembers", members);
    }

    /// <summary>Partiya ichida umumiy xabar (chat).</summary>
    public async Task SendPartyMessage(string code, string text)
    {
        var uid = UserId;
        if (uid is null) return;
        code = (code ?? "").ToUpperInvariant();
        if (!_parties.Exists(code)) return;

        var me = _online.Get(uid.Value);
        if (me is null) return;

        var clean = (text ?? "").Trim();
        if (clean.Length == 0) return;
        if (clean.Length > 280) clean = clean[..280];

        await Clients.Group("party-" + code).SendAsync("PartyMessage", new
        {
            userId = uid.Value.ToString(),
            name = me.Username,
            avatar = me.AvatarUrl,
            text = clean,
            at = DateTime.UtcNow.ToString("HH:mm")
        });
    }

    /// <summary>
    /// Partiya a'zosini duelga chaqiradi: yangi xona yaratiladi (chaqiruvchi — host),
    /// kodi nishonga yuboriladi. Ikkalasi ham /Room?code=... ga yo'naltiriladi.
    /// </summary>
    public async Task InviteToDuel(string targetUserId, string partyCode)
    {
        var uid = UserId;
        if (uid is null) { await Clients.Caller.SendAsync("Error", "Duel uchun tizimga kiring."); return; }
        if (!Guid.TryParse(targetUserId, out var target) || target == uid)
        { await Clients.Caller.SendAsync("Error", "Noto'g'ri foydalanuvchi."); return; }
        if (!_parties.Exists(partyCode))
        { await Clients.Caller.SendAsync("Error", "Partiya topilmadi."); return; }

        var from = _online.Get(uid.Value);
        if (from is null) return;

        // Xona yaratish (host = chaqiruvchi)
        RoomDto room;
        using (var scope = _scopeFactory.CreateScope())
        {
            var mediator = scope.ServiceProvider.GetRequiredService<ISender>();
            room = await mediator.Send(new CreateRoomCommand(null));
        }

        await Clients.User(target.ToString()).SendAsync("DuelInvite", new
        {
            fromUserId = uid.Value.ToString(),
            fromName = from.Username,
            fromAvgWpm = from.AvgWpm,
            fromAvatar = from.AvatarUrl,
            roomCode = room.Code
        });
        // Chaqiruvchiga ham xona kodini qaytaramiz → o'zi /Room ga o'tadi
        await Clients.Caller.SendAsync("DuelCreated", new { roomCode = room.Code });
    }
}

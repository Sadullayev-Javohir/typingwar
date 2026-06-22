using System.Security.Claims;
using System.Text.Json;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Application.Features.Rooms;
using TypingWar.Domain.Constants;
using TypingWar.Domain.Enums;
using TypingWar.Domain.Services;
using TypingWar.Infrastructure.Realtime;

namespace TypingWar.Web.Hubs;

/// <summary>
/// Do'stlar xonasi: qo'shilish, kutish, host boshlashi, 3-2-1 countdown,
/// live progress va natijalar. Mehmonlar (anonim) ham qo'shila oladi.
/// </summary>
[AllowAnonymous]
public class LobbyHub : Hub
{
    private readonly RoomLiveState _state;
    private readonly ISender _mediator;
    private readonly ITextProvider _textProvider;
    private readonly IApplicationDbContext _db;
    private readonly ICacheService _cache;
    private readonly IHubContext<LobbyHub> _hub;
    private readonly IServiceScopeFactory _scopeFactory;

    public LobbyHub(RoomLiveState state, ISender mediator, ITextProvider textProvider,
        IApplicationDbContext db, ICacheService cache,
        IHubContext<LobbyHub> hub, IServiceScopeFactory scopeFactory)
    {
        _state = state;
        _mediator = mediator;
        _textProvider = textProvider;
        _db = db;
        _cache = cache;
        _hub = hub;
        _scopeFactory = scopeFactory;
    }

    private Guid? UserId =>
        Guid.TryParse(Context.User?.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private static object View(RoomPlayerLive p) => new
    {
        connId = p.ConnectionId,
        name = p.Name,
        isHost = p.IsHost,
        progress = p.Progress,
        wpm = p.Wpm,
        rawWpm = p.RawWpm,
        accuracy = p.Accuracy,
        finished = p.Finished,
        place = p.Place,
        wpmSeries = p.WpmSeries
    };

    public async Task JoinRoom(string code, string? displayName)
    {
        code = code.ToUpperInvariant();

        var room = await _mediator.Send(new GetRoomQuery(code));
        if (room is null)
        {
            await Clients.Caller.SendAsync("Error", "Xona topilmadi yoki muddati tugagan.");
            return;
        }

        var live = _state.GetOrCreate(code, room.RoomId, room.HostId);
        live.Settings = room.Settings; // host tanlagan poyga sozlamalari (matn turi/til/uzunlik)

        var uid = UserId;
        bool isHost = uid.HasValue && uid.Value == room.HostId;
        var name = ResolveName(displayName, isHost);

        var player = new RoomPlayerLive
        {
            ConnectionId = Context.ConnectionId,
            UserId = uid,
            Name = name,
            IsHost = isHost
        };
        live.Players[Context.ConnectionId] = player;

        await Groups.AddToGroupAsync(Context.ConnectionId, code);

        await Clients.Caller.SendAsync("RoomState", new
        {
            code,
            isHost,
            status = live.Status.ToString(),
            players = live.Players.Values.Select(View).ToList()
        });
        await Clients.OthersInGroup(code).SendAsync("PlayerJoined", View(player));
    }

    public async Task StartRace(string code)
    {
        code = code.ToUpperInvariant();
        if (!_state.TryGet(code, out var live)) return;

        if (!live.Players.TryGetValue(Context.ConnectionId, out var me) || !me.IsHost)
        {
            await Clients.Caller.SendAsync("Error", "Faqat host poygani boshlay oladi.");
            return;
        }
        if (live.Status is RoomStatus.Countdown or RoomStatus.InProgress) return;

        var text = await _textProvider.GetAsync(BuildTextRequest(live.Settings));
        live.TextContent = text.Content;
        live.TextId = text.TextId;
        live.FinishOrder = 0;
        live.Round++;   // yangi poyga — sabotaj guard yangilanadi
        foreach (var p in live.Players.Values)
        {
            p.Finished = false; p.Progress = 0; p.Wpm = 0; p.RawWpm = 0; p.Accuracy = 0; p.Place = null;
            p.WpmSeries = Array.Empty<double>();
        }

        live.Status = RoomStatus.Countdown;
        await Clients.Group(code).SendAsync("RaceStarting", new { text = live.TextContent, countdown = 3 });
        live.Status = RoomStatus.InProgress;

        // Poyga 5 daqiqada tugamasa — xona avtomatik o'chadi (taymerni qayta o'rnatamiz)
        ScheduleRaceTimeout(live, code);
    }

    /// <summary>Host tanlagan sozlamalardan (JSON) matn so'rovini quradi. Xatolik bo'lsa — standart (o'zbek iqtibos).</summary>
    private static PracticeTextRequest BuildTextRequest(string settingsJson)
    {
        RoomRaceSettings s;
        try { s = JsonSerializer.Deserialize<RoomRaceSettings>(settingsJson) ?? new RoomRaceSettings(); }
        catch { s = new RoomRaceSettings(); }

        var mode = Enum.TryParse<TextMode>(s.TextMode, true, out var m) ? m : TextMode.Sentences;
        var lang = Enum.TryParse<Language>(s.Language, true, out var l) ? l : Language.Uzbek;
        var count = s.WordCount is >= 5 and <= 200 ? s.WordCount : 25;
        return new PracticeTextRequest(mode, lang, Difficulty.Normal, count, s.QuoteLength);
    }

    public async Task ReportProgress(string code, double progress, double wpm)
    {
        code = code.ToUpperInvariant();
        if (!_state.TryGet(code, out var live)) return;
        if (!live.Players.TryGetValue(Context.ConnectionId, out var p)) return;

        p.Progress = progress;
        p.Wpm = wpm;
        await Clients.OthersInGroup(code).SendAsync("ProgressUpdate", new
        {
            connId = Context.ConnectionId, name = p.Name, progress, wpm
        });
    }

    /// <summary>
    /// Raqibga sabotaj effekti yuboradi. Faqat poyga davomida, 3+ o'yinchi bo'lsa,
    /// har o'yinchi poygada faqat 1 marta (Redis guard). Effekt vizual — klient qo'llaydi.
    /// </summary>
    public async Task SabotageAttack(string code, string targetConnId, string sabotageType)
    {
        code = code.ToUpperInvariant();
        if (!_state.TryGet(code, out var live)) return;

        if (live.Status != RoomStatus.InProgress)
        {
            await Clients.Caller.SendAsync("Error", "Sabotaj faqat poyga davomida ishlaydi.");
            return;
        }
        if (live.Players.Count < GameConstants.MinPlayersForSabotage)
        {
            await Clients.Caller.SendAsync("Error",
                $"Sabotaj uchun kamida {GameConstants.MinPlayersForSabotage} o'yinchi kerak.");
            return;
        }
        if (!live.Players.TryGetValue(Context.ConnectionId, out var attacker) || attacker.Finished)
            return;
        if (targetConnId == Context.ConnectionId)
        {
            await Clients.Caller.SendAsync("Error", "O'zingizga sabotaj qila olmaysiz.");
            return;
        }
        if (!live.Players.TryGetValue(targetConnId, out var target) || target.Finished)
        {
            await Clients.Caller.SendAsync("Error", "Nishon mavjud emas yoki poygani tugatgan.");
            return;
        }

        // Redis guard — bitta poyga (round) = bitta sabotaj
        var guardKey = $"sab:{live.RoomId}:{live.Round}:{Context.ConnectionId}";
        if (await _cache.KeyExistsAsync(guardKey))
        {
            await Clients.Caller.SendAsync("Error", "Bu poygada sabotajni allaqachon ishlatdingiz.");
            return;
        }
        await _cache.SetStringAsync(guardKey, "1", TimeSpan.FromMinutes(GameConstants.RoomCodeTtlMinutes));

        var type = SabotageRules.Parse(sabotageType);
        var duration = SabotageRules.DurationSeconds(type);

        // Nishonga effekt
        await Clients.Client(targetConnId).SendAsync("Sabotaged", new
        {
            type = type.ToString(),
            durationSeconds = duration,
            from = attacker.Name
        });
        // Hammaga e'lon (lenta) — yuboruvchining tugmasi bloklanadi
        await Clients.Group(code).SendAsync("SabotageUsed", new
        {
            from = attacker.Name,
            fromConn = Context.ConnectionId,
            to = target.Name,
            toConn = targetConnId,
            type = type.ToString()
        });
    }

    public async Task FinishRace(string code, double wpm, double rawWpm, double accuracy, double[]? wpmSeries = null)
    {
        code = code.ToUpperInvariant();
        if (!_state.TryGet(code, out var live)) return;
        if (!live.Players.TryGetValue(Context.ConnectionId, out var p) || p.Finished) return;

        p.Finished = true;
        p.Wpm = wpm;
        p.RawWpm = rawWpm;
        p.Accuracy = accuracy;
        // Soniyalik WPM qatori (natija grafigi) — ishonchsiz uzunlikni cheklaymiz (5 daqiqa = 300s)
        p.WpmSeries = wpmSeries is { Length: > 0 } ? wpmSeries.Take(300).ToArray() : Array.Empty<double>();
        p.Progress = 100;
        p.Place = Interlocked.Increment(ref live.FinishOrder);

        await Clients.Group(code).SendAsync("PlayerFinished", View(p));

        if (live.Players.Values.All(x => x.Finished))
        {
            live.RaceTimeoutCts?.Cancel();   // hamma tugatdi — taymer kerak emas
            live.Status = RoomStatus.Finished;
            var results = live.Players.Values.OrderBy(x => x.Place).Select(View).ToList();
            await Clients.Group(code).SendAsync("RaceFinished", results);
            await PersistFinishedAsync(live);
        }
    }

    public async Task LeaveRoom(string code)
    {
        code = code.ToUpperInvariant();
        await RemoveConnection(code, Context.ConnectionId);
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var live = _state.FindByConnection(Context.ConnectionId);
        if (live is not null)
            await RemoveConnection(live.Code, Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    private async Task RemoveConnection(string code, string connectionId)
    {
        if (!_state.TryGet(code, out var live)) return;
        if (live.Players.TryRemove(connectionId, out var p))
        {
            await Groups.RemoveFromGroupAsync(connectionId, code);
            await Clients.Group(code).SendAsync("PlayerLeft", new { connId = connectionId, name = p.Name });

            // Host xonani tark etsa — kod butunlay o'chadi va qayta ishlatib bo'lmaydi.
            if (p.IsHost)
            {
                await CloseRoomAsync(live, p.Name);
                return;
            }
        }
        _state.RemoveIfEmpty(code);
    }

    /// <summary>
    /// Host chiqib xona yopilganda: Redis kodini o'chiradi (yangi qo'shilish to'xtaydi),
    /// DB da xonani Expired deb belgilaydi (GetRoom endi null qaytaradi), qolgan
    /// o'yinchilarni xabardor qiladi va live holatdan o'chiradi.
    /// </summary>
    private async Task CloseRoomAsync(RoomLive live, string hostName)
    {
        live.RaceTimeoutCts?.Cancel();   // xona yopildi — poyga taymeri kerak emas

        // 1) Redis kodini o'chir — bu kod orqali boshqa hech kim qo'shila olmaydi
        await _cache.RemoveAsync(CreateRoomCommandHandler.RoomKey(live.Code));

        // 2) DB da xonani Expired deb belgila (yakunlangan poyga holatiga tegmaymiz)
        var room = await _db.Rooms.FirstOrDefaultAsync(r => r.Id == live.RoomId);
        if (room is not null && room.Status != RoomStatus.Finished)
        {
            room.Status = RoomStatus.Expired;
            await _db.SaveChangesAsync();
        }

        // 3) Qolgan o'yinchilarni xabardor qil (klient ularni xonadan chiqaradi)
        await Clients.Group(live.Code).SendAsync("RoomClosed", new
        {
            reason = $"Xona egasi ({hostName}) chiqdi — xona yopildi va kod o'chirildi."
        });

        // 4) Live registrdan butunlay olib tashla
        _state.Remove(live.Code);
    }

    /// <summary>
    /// Poyga boshlangach 5 daqiqalik taymer qo'yadi. Bu vaqtda hamma tugatmasa
    /// (kimdir yozib bo'lmasa) — xona avtomatik o'chiriladi va o'yinchilar xabardor qilinadi.
    /// Hub instansiyasi har chaqiruvda yangilanadi, shuning uchun taymer fire-and-forget
    /// Task sifatida ishlaydi va yopish ishlarini yangi DI scope ichida bajaradi.
    /// </summary>
    private void ScheduleRaceTimeout(RoomLive live, string code)
    {
        live.RaceTimeoutCts?.Cancel();
        var cts = new CancellationTokenSource();
        live.RaceTimeoutCts = cts;

        var round = live.Round;                 // shu poyga uchun amal qiladi
        var hub = _hub;
        var scopeFactory = _scopeFactory;
        var state = _state;

        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(TimeSpan.FromMinutes(GameConstants.RoomRaceTimeoutMinutes), cts.Token);
            }
            catch (OperationCanceledException) { return; } // hamma tugatdi / xona yopildi

            // Hali ham o'sha poyga davom etyaptimi?
            if (live.Round != round || live.Status != RoomStatus.InProgress) return;

            live.Status = RoomStatus.Expired;

            using var scope = scopeFactory.CreateScope();
            var cache = scope.ServiceProvider.GetRequiredService<ICacheService>();
            var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

            await cache.RemoveAsync(CreateRoomCommandHandler.RoomKey(code));

            var room = await db.Rooms.FirstOrDefaultAsync(r => r.Id == live.RoomId);
            if (room is not null && room.Status != RoomStatus.Finished)
            {
                room.Status = RoomStatus.Expired;
                await db.SaveChangesAsync();
            }

            await hub.Clients.Group(code).SendAsync("RoomClosed", new
            {
                reason = $"Poyga {GameConstants.RoomRaceTimeoutMinutes} daqiqada tugamadi — xona avtomatik o'chirildi."
            });

            state.Remove(code);
        });
    }

    private async Task PersistFinishedAsync(RoomLive live)
    {
        var room = await _db.Rooms.FirstOrDefaultAsync(r => r.Id == live.RoomId);
        if (room is null) return;
        room.Status = RoomStatus.Finished;
        await _db.SaveChangesAsync();
    }

    private string ResolveName(string? displayName, bool isHost)
    {
        var claimName = Context.User?.FindFirstValue(ClaimTypes.Name);
        if (!string.IsNullOrWhiteSpace(claimName)) return claimName;
        if (!string.IsNullOrWhiteSpace(displayName)) return displayName.Trim()[..Math.Min(displayName.Trim().Length, 24)];
        return "Mehmon-" + Context.ConnectionId[..4];
    }
}

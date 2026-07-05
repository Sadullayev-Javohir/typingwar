using System.Security.Claims;
using System.Text.Json;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Application.Features.Rooms;
using TypingWar.Application.Features.Teams;
using TypingWar.Domain.Constants;
using TypingWar.Domain.Entities;
using TypingWar.Domain.Enums;
using TypingWar.Domain.Services;
using TypingWar.Infrastructure.Realtime;

namespace TypingWar.Web.Hubs;

/// <summary>
/// 5x5 jamoaviy musobaqa: A/B tomonga qo'shilish, host boshlashi, 3-2-1 countdown,
/// live progress va jamoa WPM yig'indisi, har jamoa uchun alohida natija grafigi.
/// Tuzilishi /Rooms (LobbyHub) bilan bir xil: qayta-ulanish grace, host grace,
/// poyga taymeri, barqaror ranglar va umumiy soat (matn /Practice dan).
/// </summary>
[AllowAnonymous]
public class TeamRaceHub : Hub
{
    private readonly TeamRaceLiveState _state;
    private readonly ISender _mediator;
    private readonly ITextProvider _textProvider;
    private readonly IApplicationDbContext _db;
    private readonly ICacheService _cache;
    private readonly IHubContext<TeamRaceHub> _hub;
    private readonly IServiceScopeFactory _scopeFactory;

    public TeamRaceHub(TeamRaceLiveState state, ISender mediator, ITextProvider textProvider,
        IApplicationDbContext db, ICacheService cache,
        IHubContext<TeamRaceHub> hub, IServiceScopeFactory scopeFactory)
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

    private static object View(TeamPlayerLive p) => new
    {
        connId = p.ConnectionId,
        name = p.Name,
        side = p.Side.ToString(),
        isHost = p.IsHost,
        colorIndex = p.ColorIndex,
        progress = p.Progress,
        wpm = p.Wpm,
        rawWpm = p.RawWpm,
        accuracy = p.Accuracy,
        finished = p.Finished,
        place = p.Place,
        wpmSeries = p.WpmSeries
    };

    private static object Scores(TeamRaceLive race) => new { a = race.TeamScore(TeamSide.A), b = race.TeamScore(TeamSide.B) };

    public async Task JoinTeamRace(string code, string? displayName, string side)
    {
        code = code.ToUpperInvariant();

        var race = await _mediator.Send(new GetTeamRaceQuery(code));
        if (race is null)
        {
            await Clients.Caller.SendAsync("Error", "Musobaqa topilmadi yoki muddati tugagan.");
            return;
        }

        var live = _state.GetOrCreate(code, race.TeamRaceId, race.HostId);
        live.Settings = race.Settings; // host tanlagan poyga sozlamalari

        var uid = UserId;
        bool isHost = uid.HasValue && uid.Value == race.HostId;
        var name = ResolveName(displayName);
        var wanted = ParseSide(side);

        // Host qaytib ulandi (refresh) — kutilayotgan yopishni bekor qil
        if (isHost)
        {
            live.HostGraceCts?.Cancel();
            live.HostGraceCts = null;
        }

        // Refresh seamless bo'lishi uchun: shu foydalanuvchining eski (uzilayotgan) ulanishlarini
        // olib tashlaymiz — aks holda dublikat o'yinchi/mushuk qoladi. Rang va tomonni saqlaymiz.
        int? reuseColor = null;
        if (uid.HasValue)
        {
            foreach (var kv in live.Players.Where(x => x.Value.UserId == uid && x.Key != Context.ConnectionId).ToList())
            {
                if (live.Players.TryRemove(kv.Key, out var old))
                {
                    reuseColor ??= old.ColorIndex;
                    if (live.Status != RaceStatus.Waiting) wanted = old.Side; // poyga boshlangach tomon o'zgarmaydi
                    await Groups.RemoveFromGroupAsync(kv.Key, code);
                    await Clients.Group(code).SendAsync("PlayerLeft", new { connId = kv.Key, name = old.Name, scores = Scores(live) });
                }
            }
        }

        // Jamoa to'la bo'lsa (kutish bosqichida) — rad et. Poyga boshlanganidan keyin
        // (qayta-ulanish) tekshirmaymiz, chunki o'yinchi allaqachon a'zo edi.
        if (live.Status == RaceStatus.Waiting && live.CountSide(wanted) >= GameConstants.TeamSize)
        {
            await Clients.Caller.SendAsync("Error", $"{wanted} jamoasi to'la (maks {GameConstants.TeamSize}).");
            return;
        }

        var player = new TeamPlayerLive
        {
            ConnectionId = Context.ConnectionId,
            UserId = uid,
            Name = name,
            Side = wanted,
            IsHost = isHost
        };

        // Rangni ATOMAR tayinlash — har o'yinchiga grafikda alohida chiziq (host=0).
        lock (live.ColorLock)
        {
            var used = live.Players.Values.Select(p => p.ColorIndex).ToHashSet();
            if (isHost)
                player.ColorIndex = 0;
            else if (reuseColor is int rc && !used.Contains(rc))
                player.ColorIndex = rc;
            else
            {
                var idx = 1;
                while (used.Contains(idx)) idx++;
                player.ColorIndex = idx;
            }
            live.Players[Context.ConnectionId] = player;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, code);

        await Clients.Caller.SendAsync("TeamState", new
        {
            code,
            isHost,
            status = live.Status.ToString(),
            players = live.Players.Values.Select(View).ToList(),
            scores = Scores(live),
            text = live.Status == RaceStatus.InProgress ? live.TextContent : null
        });
        await Clients.OthersInGroup(code).SendAsync("PlayerJoined", View(player));
    }

    public async Task ChangeSide(string code, string side)
    {
        code = code.ToUpperInvariant();
        if (!_state.TryGet(code, out var live)) return;
        if (live.Status != RaceStatus.Waiting) return;
        if (!live.Players.TryGetValue(Context.ConnectionId, out var p)) return;

        var wanted = ParseSide(side);
        if (wanted == p.Side) return;
        if (live.CountSide(wanted) >= GameConstants.TeamSize)
        {
            await Clients.Caller.SendAsync("Error", $"{wanted} jamoasi to'la.");
            return;
        }
        p.Side = wanted;
        await Clients.Group(code).SendAsync("SideChanged", new { connId = Context.ConnectionId, side = wanted.ToString() });
    }

    public async Task StartRace(string code)
    {
        code = code.ToUpperInvariant();
        if (!_state.TryGet(code, out var live)) return;
        if (!live.Players.TryGetValue(Context.ConnectionId, out var me) || !me.IsHost)
        {
            await Clients.Caller.SendAsync("Error", "Faqat host boshlay oladi.");
            return;
        }
        if (live.Status is RaceStatus.Countdown or RaceStatus.InProgress) return;

        var text = await _textProvider.GetAsync(BuildTextRequest(live.Settings));
        live.TextContent = text.Content;
        live.TextId = text.TextId;
        live.FinishOrder = 0;
        live.Round++;
        foreach (var p in live.Players.Values)
        {
            p.Finished = false; p.Progress = 0; p.Wpm = 0; p.RawWpm = 0; p.Accuracy = 0; p.Place = null;
            p.WpmSeries = Array.Empty<double>();
        }

        live.Status = RaceStatus.Countdown;
        await Clients.Group(code).SendAsync("TeamRaceStarting", new { text = live.TextContent, countdown = 3 });
        live.Status = RaceStatus.InProgress;

        ScheduleRaceTimeout(live, code);
    }

    /// <summary>Host tanlagan sozlamalardan (JSON) matn so'rovini quradi (/Rooms bilan bir xil).</summary>
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
            connId = Context.ConnectionId, name = p.Name, progress, wpm, scores = Scores(live)
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
        p.WpmSeries = wpmSeries is { Length: > 0 } ? wpmSeries.Take(300).ToArray() : Array.Empty<double>();
        p.Progress = 100;
        p.Place = Interlocked.Increment(ref live.FinishOrder);

        await Clients.Group(code).SendAsync("PlayerFinished", new { connId = Context.ConnectionId, scores = Scores(live) });

        if (live.Players.Values.All(x => x.Finished))
            await FinishWholeRaceAsync(live, code);
    }

    /// <summary>
    /// Host poygani majburan yakunlaydi (ba'zi o'yinchilar matnni yoza olmay qolsa ham).
    /// Tugatmagan o'yinchilar joriy holati (progress/wpm) bilan "tugatilgan" deb belgilanadi.
    /// </summary>
    public async Task EndRace(string code)
    {
        code = code.ToUpperInvariant();
        if (!_state.TryGet(code, out var live)) return;
        if (!live.Players.TryGetValue(Context.ConnectionId, out var me) || !me.IsHost)
        {
            await Clients.Caller.SendAsync("Error", "Faqat host poygani yakunlay oladi.");
            return;
        }
        if (live.Status != RaceStatus.InProgress) return;

        foreach (var p in live.Players.Values.Where(x => !x.Finished))
        {
            p.Finished = true;
            p.Place ??= Interlocked.Increment(ref live.FinishOrder);
        }

        await FinishWholeRaceAsync(live, code);
    }

    private async Task FinishWholeRaceAsync(TeamRaceLive live, string code)
    {
        live.RaceTimeoutCts?.Cancel();
        live.Status = RaceStatus.Finished;
        double a = live.TeamScore(TeamSide.A), b = live.TeamScore(TeamSide.B);
        var winner = TeamRaceScoring.Winner(a, b);
        await Clients.Group(code).SendAsync("TeamRaceFinished", new
        {
            scores = new { a, b },
            winner = winner?.ToString(),
            players = live.Players.Values.OrderBy(x => x.Place ?? int.MaxValue).Select(View).ToList()
        });
        await PersistAsync(live, a, b);
    }

    public async Task LeaveTeamRace(string code) =>
        await RemoveConnection(code.ToUpperInvariant(), Context.ConnectionId, immediate: true);

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var live = _state.FindByConnection(Context.ConnectionId);
        if (live is not null)
            await RemoveConnection(live.Code, Context.ConnectionId, immediate: false);
        await base.OnDisconnectedAsync(exception);
    }

    /// <param name="immediate">
    /// true — tugma orqali aniq chiqish (host darrov yopadi). false — uzilish (refresh/tarmoq):
    /// oddiy o'yinchiga grace, host uzilsa grace taymeri.
    /// </param>
    private async Task RemoveConnection(string code, string connectionId, bool immediate)
    {
        if (!_state.TryGet(code, out var live)) return;

        // Uzilish (immediate=false) bo'lsa oddiy o'yinchini DARROV o'chirmaymiz — qayta-ulanish bo'lishi mumkin.
        if (!immediate && live.Players.TryGetValue(connectionId, out var existing) && !existing.IsHost)
        {
            await Groups.RemoveFromGroupAsync(connectionId, code);
            ScheduleMemberGraceRemoval(code, connectionId);
            return;
        }

        if (live.Players.TryRemove(connectionId, out var p))
        {
            await Groups.RemoveFromGroupAsync(connectionId, code);
            await Clients.Group(code).SendAsync("PlayerLeft", new { connId = connectionId, name = p.Name, scores = Scores(live) });

            if (p.IsHost)
            {
                if (immediate)
                    await CloseRaceAsync(live, p.Name);
                else
                    ScheduleHostGraceClose(live, p.Name);
                return;
            }
        }
        _state.RemoveIfEmpty(code);
    }

    /// <summary>Oddiy o'yinchi uzilganda grace soniyalaridan keyin (qaytmasa) o'chiradi va kerak bo'lsa poygani yakunlaydi.</summary>
    private void ScheduleMemberGraceRemoval(string code, string connectionId)
    {
        var hub = _hub;
        var state = _state;
        var scopeFactory = _scopeFactory;

        _ = Task.Run(async () =>
        {
            try { await Task.Delay(TimeSpan.FromSeconds(GameConstants.RoomMemberReconnectGraceSeconds)); }
            catch { }

            if (!state.TryGet(code, out var live)) return;
            if (!live.Players.TryRemove(connectionId, out var p)) return;

            await hub.Clients.Group(code).SendAsync("PlayerLeft",
                new { connId = connectionId, name = p.Name, scores = Scores(live) });

            // Ketgan o'yinchi tufayli poyga "All Finished" ga yetmay qolgan bo'lishi mumkin — qayta tekshir.
            if (live.Status == RaceStatus.InProgress && !live.Players.IsEmpty &&
                live.Players.Values.All(x => x.Finished))
            {
                live.RaceTimeoutCts?.Cancel();
                live.Status = RaceStatus.Finished;
                double a = live.TeamScore(TeamSide.A), b = live.TeamScore(TeamSide.B);
                var winner = TeamRaceScoring.Winner(a, b);
                await hub.Clients.Group(code).SendAsync("TeamRaceFinished", new
                {
                    scores = new { a, b },
                    winner = winner?.ToString(),
                    players = live.Players.Values.OrderBy(x => x.Place ?? int.MaxValue).Select(View).ToList()
                });

                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
                var race = await db.TeamRaces.FirstOrDefaultAsync(r => r.Id == live.TeamRaceId);
                if (race is not null)
                {
                    race.Status = RaceStatus.Finished;
                    race.TeamAScore = a; race.TeamBScore = b; race.StartedAt ??= DateTime.UtcNow;
                    await db.SaveChangesAsync();
                }
            }

            state.RemoveIfEmpty(code);
        });
    }

    /// <summary>Host uzilganda grace soniyalari ichida qaytib ulansa musobaqa saqlanadi, aks holda yopiladi.</summary>
    private void ScheduleHostGraceClose(TeamRaceLive live, string hostName)
    {
        live.HostGraceCts?.Cancel();
        var cts = new CancellationTokenSource();
        live.HostGraceCts = cts;

        var hub = _hub;
        var scopeFactory = _scopeFactory;
        var state = _state;
        var code = live.Code;

        _ = Task.Run(async () =>
        {
            try { await Task.Delay(TimeSpan.FromSeconds(GameConstants.RoomHostReconnectGraceSeconds), cts.Token); }
            catch (OperationCanceledException) { return; } // host qaytdi (refresh)

            if (live.Players.Values.Any(x => x.IsHost)) return;

            live.RaceTimeoutCts?.Cancel();

            using var scope = scopeFactory.CreateScope();
            var cache = scope.ServiceProvider.GetRequiredService<ICacheService>();
            var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

            await cache.RemoveAsync(CreateTeamRaceCommandHandler.TeamKey(code));

            var race = await db.TeamRaces.FirstOrDefaultAsync(r => r.Id == live.TeamRaceId);
            if (race is not null && race.Status != RaceStatus.Finished)
            {
                race.Status = RaceStatus.Finished;
                await db.SaveChangesAsync();
            }

            await hub.Clients.Group(code).SendAsync("TeamRaceClosed", new
            {
                reason = $"Musobaqa egasi ({hostName}) chiqdi — musobaqa yopildi va kod o'chirildi."
            });

            state.Remove(code);
        });
    }

    /// <summary>Host chiqib musobaqa yopilganda: Redis kodini o'chiradi, DB Finished, o'yinchilarni xabardor qiladi.</summary>
    private async Task CloseRaceAsync(TeamRaceLive live, string hostName)
    {
        live.RaceTimeoutCts?.Cancel();
        live.HostGraceCts?.Cancel();

        await _cache.RemoveAsync(CreateTeamRaceCommandHandler.TeamKey(live.Code));

        var race = await _db.TeamRaces.FirstOrDefaultAsync(r => r.Id == live.TeamRaceId);
        if (race is not null && race.Status != RaceStatus.Finished)
        {
            race.Status = RaceStatus.Finished;
            await _db.SaveChangesAsync();
        }

        await Clients.Group(live.Code).SendAsync("TeamRaceClosed", new
        {
            reason = $"Musobaqa egasi ({hostName}) chiqdi — musobaqa yopildi va kod o'chirildi."
        });

        _state.Remove(live.Code);
    }

    /// <summary>Poyga 5 daqiqada tugamasa — musobaqa avtomatik yopiladi va o'yinchilar xabardor qilinadi.</summary>
    private void ScheduleRaceTimeout(TeamRaceLive live, string code)
    {
        live.RaceTimeoutCts?.Cancel();
        var cts = new CancellationTokenSource();
        live.RaceTimeoutCts = cts;

        var round = live.Round;
        var hub = _hub;
        var scopeFactory = _scopeFactory;
        var state = _state;

        _ = Task.Run(async () =>
        {
            try { await Task.Delay(TimeSpan.FromMinutes(GameConstants.RoomRaceTimeoutMinutes), cts.Token); }
            catch (OperationCanceledException) { return; }

            if (live.Round != round || live.Status != RaceStatus.InProgress) return;

            live.Status = RaceStatus.Finished;

            using var scope = scopeFactory.CreateScope();
            var cache = scope.ServiceProvider.GetRequiredService<ICacheService>();
            var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

            await cache.RemoveAsync(CreateTeamRaceCommandHandler.TeamKey(code));

            var race = await db.TeamRaces.FirstOrDefaultAsync(r => r.Id == live.TeamRaceId);
            if (race is not null && race.Status != RaceStatus.Finished)
            {
                race.Status = RaceStatus.Finished;
                await db.SaveChangesAsync();
            }

            await hub.Clients.Group(code).SendAsync("TeamRaceClosed", new
            {
                reason = $"Poyga {GameConstants.RoomRaceTimeoutMinutes} daqiqada tugamadi — musobaqa avtomatik o'chirildi."
            });

            state.Remove(code);
        });
    }

    private async Task PersistAsync(TeamRaceLive live, double scoreA, double scoreB)
    {
        var race = await _db.TeamRaces.FirstOrDefaultAsync(r => r.Id == live.TeamRaceId);
        if (race is null) return;
        race.Status = RaceStatus.Finished;
        race.TeamAScore = scoreA;
        race.TeamBScore = scoreB;
        race.StartedAt ??= DateTime.UtcNow;
        race.TextId = live.TextId;

        foreach (var p in live.Players.Values.Where(x => x.UserId.HasValue))
        {
            // Bir foydalanuvchi bir musobaqada bir marta (UserId+TeamRaceId unik) — dublikatdan saqlan.
            bool exists = await _db.TeamMembers
                .AnyAsync(m => m.TeamRaceId == race.Id && m.UserId == p.UserId!.Value);
            if (exists) continue;
            _db.TeamMembers.Add(new TeamMember
            {
                TeamRaceId = race.Id,
                UserId = p.UserId!.Value,
                Team = p.Side,
                Wpm = p.Wpm,
                Accuracy = p.Accuracy
            });
        }
        await _db.SaveChangesAsync();
    }

    private static TeamSide ParseSide(string? side) =>
        string.Equals(side, "B", StringComparison.OrdinalIgnoreCase) ? TeamSide.B : TeamSide.A;

    private string ResolveName(string? displayName)
    {
        var claimName = Context.User?.FindFirstValue(ClaimTypes.Name);
        if (!string.IsNullOrWhiteSpace(claimName)) return claimName;
        if (!string.IsNullOrWhiteSpace(displayName)) return displayName.Trim()[..Math.Min(displayName.Trim().Length, 24)];
        return "Mehmon-" + Context.ConnectionId[..4];
    }
}

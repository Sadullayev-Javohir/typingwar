using System.Security.Claims;
using System.Text.Json;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.DependencyInjection;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Application.Features.Rooms;
using TypingWar.Application.Features.Tournaments;
using TypingWar.Domain.Constants;
using TypingWar.Domain.Enums;
using TypingWar.Infrastructure.Realtime;

namespace TypingWar.Web.Hubs;

/// <summary>
/// Turnir — live playoff poyga, host boshqaruvi va tomoshabin rejimi.
/// Bracket DB da; bu hub real-time raqobat (countdown, progress, g'olib aniqlash) ni boshqaradi.
/// Mehmonlar (anonim) tomoshabin sifatida qo'shila oladi.
/// </summary>
[AllowAnonymous]
public class TournamentHub : Hub
{
    private readonly TournamentLiveState _state;
    private readonly ISender _mediator;
    private readonly ITextProvider _textProvider;
    private readonly IApplicationDbContext _db;
    private readonly IHubContext<TournamentHub> _hub;
    private readonly IServiceScopeFactory _scopeFactory;

    public TournamentHub(TournamentLiveState state, ISender mediator, ITextProvider textProvider,
        IApplicationDbContext db, IHubContext<TournamentHub> hub, IServiceScopeFactory scopeFactory)
    {
        _state = state;
        _mediator = mediator;
        _textProvider = textProvider;
        _db = db;
        _hub = hub;
        _scopeFactory = scopeFactory;
    }

    private static string Group(Guid id) => $"tour-{id}";
    private Guid? UserId =>
        Guid.TryParse(Context.User?.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
    private string UserName => Context.User?.FindFirstValue(ClaimTypes.Name) ?? "Mehmon";

    private async Task<TournamentLive?> EnsureLive(Guid id)
    {
        if (_state.TryGet(id, out var live)) return live;
        var t = await _db.Tournaments.FindAsync(id);
        if (t is null) return null;
        return _state.GetOrCreate(id, t.HostId, t.Settings);
    }

    private static object SlotView(MatchSlotLive s) => new
    {
        userId = s.UserId, name = s.Name, progress = s.Progress, wpm = s.Wpm,
        rawWpm = s.RawWpm, accuracy = s.Accuracy, finished = s.Finished, wpmSeries = s.WpmSeries
    };
    private static object MatchView(MatchLive m) => new
    {
        matchId = m.MatchId, round = m.Round, slot = m.Slot,
        p1 = SlotView(m.P1), p2 = SlotView(m.P2), decided = m.Decided, winnerId = m.WinnerId
    };

    // ── Qo'shilish (tomoshabin yoki ishtirokchi) ──
    public async Task JoinTournament(string tournamentId)
    {
        if (!Guid.TryParse(tournamentId, out var id)) return;
        await Groups.AddToGroupAsync(Context.ConnectionId, Group(id));

        var live = await EnsureLive(id);
        if (live is null) { await Clients.Caller.SendAsync("Error", "Turnir topilmadi."); return; }

        // Faol round bo'lsa — joriy holatni darrov yuboramiz (tomoshabin live ko'radi)
        if (live.ActiveRound > 0 && live.ActiveText is not null)
        {
            await Clients.Caller.SendAsync("RoundSnapshot", new
            {
                round = live.ActiveRound,
                roundName = live.RoundName,
                matches = live.Matches.Values.Select(MatchView).ToList()
            });

            // Agar shu o'yinchi tugatmagan faol o'yinning ishtirokchisi bo'lsa — yozishni davom ettirsin
            var uid = UserId;
            if (uid is Guid u)
            {
                var m = live.FindMatchForUser(u);
                if (m is { Decided: false } && m.SlotFor(u) is { Finished: false })
                    await Clients.Caller.SendAsync("RoundStarting", BuildRoundStartingPayload(live, 0));
            }
        }
    }

    // ── Tuzilmaviy o'zgarishdan keyin barchani qayta yuklashga undash (register/seed) ──
    public async Task Touch(string tournamentId)
    {
        if (!Guid.TryParse(tournamentId, out var id)) return;
        await Clients.Group(Group(id)).SendAsync("StateChanged");
    }

    // ── Host: turnirni boshlash (bracket quriladi) ──
    public async Task StartTournament(string tournamentId)
    {
        if (!Guid.TryParse(tournamentId, out var id)) return;
        var live = await EnsureLive(id);
        if (live is null) return;
        if (UserId is not Guid u || u != live.HostId)
        {
            await Clients.Caller.SendAsync("Error", "Faqat turnir egasi boshlay oladi.");
            return;
        }
        try
        {
            await _mediator.Send(new StartTournamentCommand(id));
            await Clients.Group(Group(id)).SendAsync("TournamentStarted");
            await Clients.Group(Group(id)).SendAsync("StateChanged");
        }
        catch (InvalidOperationException ex)
        {
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }

    // ── Host: keyingi raundni boshlash (poyga countdown) ──
    public async Task StartRound(string tournamentId)
    {
        if (!Guid.TryParse(tournamentId, out var id)) return;
        var live = await EnsureLive(id);
        if (live is null) return;
        if (UserId is not Guid u || u != live.HostId)
        {
            await Clients.Caller.SendAsync("Error", "Faqat turnir egasi raundni boshlay oladi.");
            return;
        }
        if (live.ActiveRound > 0 && live.Matches.Values.Any(m => !m.Decided))
        {
            await Clients.Caller.SendAsync("Error", "Joriy raund hali tugamadi.");
            return;
        }

        PrepareRoundResult prep;
        try { prep = await _mediator.Send(new PrepareRoundCommand(id)); }
        catch (InvalidOperationException ex) { await Clients.Caller.SendAsync("Error", ex.Message); return; }

        if (prep.Finished)
        {
            await BroadcastFinished(id);
            return;
        }

        var text = await _textProvider.GetAsync(BuildTextRequest(live.Settings));

        live.RoundTimeoutCts?.Cancel();
        live.Matches.Clear();
        live.ActiveRound = prep.Round;
        live.RoundName = prep.RoundName;
        live.ActiveText = text.Content;

        foreach (var m in prep.Matches)
        {
            var ml = new MatchLive
            {
                MatchId = m.MatchId, Round = m.Round, Slot = m.Slot,
                P1 = new MatchSlotLive { UserId = m.Player1Id, Name = m.Player1 },
                P2 = new MatchSlotLive { UserId = m.Player2Id, Name = m.Player2 }
            };
            live.Matches[m.MatchId] = ml;
        }

        await Clients.Group(Group(id)).SendAsync("RoundStarting", BuildRoundStartingPayload(live, 3));
        await Clients.Group(Group(id)).SendAsync("StateChanged");

        ScheduleRoundTimeout(live, id, prep.Round);
    }

    private static object BuildRoundStartingPayload(TournamentLive live, int countdown) => new
    {
        round = live.ActiveRound,
        roundName = live.RoundName,
        countdown,
        text = live.ActiveText,
        matches = live.Matches.Values.Select(m => new
        {
            matchId = m.MatchId,
            p1Id = m.P1.UserId, p1Name = m.P1.Name,
            p2Id = m.P2.UserId, p2Name = m.P2.Name
        }).ToList()
    };

    // ── O'yinchi: live progress ──
    public async Task ReportProgress(string tournamentId, double progress, double wpm)
    {
        if (!Guid.TryParse(tournamentId, out var id)) return;
        if (!_state.TryGet(id, out var live)) return;
        if (UserId is not Guid u) return;
        var m = live.FindMatchForUser(u);
        var s = m?.SlotFor(u);
        if (s is null || s.Finished) return;
        s.Progress = progress; s.Wpm = wpm;
        await Clients.OthersInGroup(Group(id)).SendAsync("LiveProgress", new
        {
            matchId = m!.MatchId, userId = u, progress, wpm
        });
    }

    // ── O'yinchi: o'yinni tugatdi ──
    public async Task FinishMatch(string tournamentId, double wpm, double rawWpm, double accuracy, double[]? wpmSeries)
    {
        if (!Guid.TryParse(tournamentId, out var id)) return;
        if (!_state.TryGet(id, out var live)) return;
        if (UserId is not Guid u) return;
        var m = live.FindMatchForUser(u);
        if (m is null || m.Decided) return;
        var s = m.SlotFor(u);
        if (s is null || s.Finished) return;

        s.Finished = true; s.Wpm = wpm; s.RawWpm = rawWpm; s.Accuracy = accuracy;
        s.Progress = 100;
        s.WpmSeries = wpmSeries is { Length: > 0 } ? wpmSeries.Take(300).ToArray() : Array.Empty<double>();

        await Clients.Group(Group(id)).SendAsync("PlayerFinished", new
        {
            matchId = m.MatchId, userId = u, wpm, accuracy
        });

        if (m.BothFinished) await DecideMatch(_mediator, _hub, id, live, m, null);
    }

    // ── Host: majburan g'olib belgilash (kelmagan/uzilgan o'yinchi uchun) ──
    public async Task ForceWinner(string tournamentId, string matchId, string winnerId)
    {
        if (!Guid.TryParse(tournamentId, out var id) ||
            !Guid.TryParse(matchId, out var mId) ||
            !Guid.TryParse(winnerId, out var wId)) return;
        var live = await EnsureLive(id);
        if (live is null) return;
        if (UserId is not Guid u || u != live.HostId)
        {
            await Clients.Caller.SendAsync("Error", "Faqat turnir egasi g'olibni belgilay oladi.");
            return;
        }
        if (!live.Matches.TryGetValue(mId, out var m) || m.Decided)
        {
            await Clients.Caller.SendAsync("Error", "Bu o'yin allaqachon hal qilingan.");
            return;
        }
        await DecideMatch(_mediator, _hub, id, live, m, wId);
    }

    /// <summary>O'yinni hal qiladi (DB ga yozadi, bracketni o'tkazadi, xabar beradi, raund/turnir holatini tekshiradi).</summary>
    private static async Task DecideMatch(ISender mediator, IHubContext<TournamentHub> hub,
        Guid id, TournamentLive live, MatchLive m, Guid? forcedWinner)
    {
        lock (m)
        {
            if (m.Decided) return;
            m.Decided = true;
        }

        TournamentMatchDto dto;
        try
        {
            dto = await mediator.Send(new RecordMatchOutcomeCommand(
                m.MatchId, forcedWinner,
                m.P1.Wpm, m.P1.Accuracy, m.P2.Wpm, m.P2.Accuracy));
        }
        catch (InvalidOperationException)
        {
            m.Decided = false;
            return;
        }

        m.WinnerId = dto.WinnerId;
        await hub.Clients.Group(Group(id)).SendAsync("MatchDecided", new
        {
            matchId = m.MatchId, round = m.Round, winnerId = dto.WinnerId, winnerName = dto.Winner,
            p1 = SlotView(m.P1), p2 = SlotView(m.P2)
        });
        await hub.Clients.Group(Group(id)).SendAsync("StateChanged");

        // Raund tugadimi?
        if (live.Matches.Values.All(x => x.Decided))
        {
            live.RoundTimeoutCts?.Cancel();
            await CheckRoundOrFinish(mediator, hub, id, live);
        }
    }

    private static async Task CheckRoundOrFinish(ISender mediator, IHubContext<TournamentHub> hub, Guid id, TournamentLive live)
    {
        var detail = await mediator.Send(new GetTournamentQuery(id));
        if (detail?.Info.Status == TournamentStatus.Finished)
        {
            live.ActiveRound = 0;
            await hub.Clients.Group(Group(id)).SendAsync("TournamentFinished", new
            {
                championId = detail.Info.ChampionId,
                champion = detail.Info.Champion,
                standings = detail.Standings
            });
        }
        else
        {
            await hub.Clients.Group(Group(id)).SendAsync("RoundComplete", new { round = live.ActiveRound });
        }
    }

    private async Task BroadcastFinished(Guid id)
    {
        var detail = await _mediator.Send(new GetTournamentQuery(id));
        if (detail is null) return;
        await Clients.Group(Group(id)).SendAsync("TournamentFinished", new
        {
            championId = detail.Info.ChampionId,
            champion = detail.Info.Champion,
            standings = detail.Standings
        });
        await Clients.Group(Group(id)).SendAsync("StateChanged");
    }

    /// <summary>Poyga belgilangan vaqtda tugamasa — tugatmagan o'yinlarni progress bo'yicha avtomatik hal qiladi.</summary>
    private void ScheduleRoundTimeout(TournamentLive live, Guid id, int round)
    {
        live.RoundTimeoutCts?.Cancel();
        var cts = new CancellationTokenSource();
        live.RoundTimeoutCts = cts;

        var hub = _hub;
        var scopeFactory = _scopeFactory;

        _ = Task.Run(async () =>
        {
            try { await Task.Delay(TimeSpan.FromMinutes(GameConstants.RoomRaceTimeoutMinutes), cts.Token); }
            catch (OperationCanceledException) { return; }

            if (live.ActiveRound != round) return;

            using var scope = scopeFactory.CreateScope();
            var mediator = scope.ServiceProvider.GetRequiredService<ISender>();

            foreach (var m in live.Matches.Values.Where(x => !x.Decided).ToList())
            {
                // Tugatgan / ko'proq yozgan tomon g'olib
                int Score(MatchSlotLive s) => (s.Finished ? 1 : 0);
                Guid winner;
                if (Score(m.P1) != Score(m.P2)) winner = Score(m.P1) > Score(m.P2) ? m.P1.UserId : m.P2.UserId;
                else if (m.P1.Progress != m.P2.Progress) winner = m.P1.Progress > m.P2.Progress ? m.P1.UserId : m.P2.UserId;
                else winner = m.P1.Wpm >= m.P2.Wpm ? m.P1.UserId : m.P2.UserId;

                await DecideMatch(mediator, hub, id, live, m, winner);
            }
        });
    }

    private static readonly JsonSerializerOptions CaseInsensitive = new() { PropertyNameCaseInsensitive = true };

    /// <summary>Host tanlagan sozlamalardan (JSON) matn so'rovini quradi (Rooms bilan bir xil).</summary>
    private static PracticeTextRequest BuildTextRequest(string settingsJson)
    {
        RoomRaceSettings s;
        try { s = JsonSerializer.Deserialize<RoomRaceSettings>(settingsJson, CaseInsensitive) ?? new RoomRaceSettings(); }
        catch { s = new RoomRaceSettings(); }

        var mode = Enum.TryParse<TextMode>(s.TextMode, true, out var m) ? m : TextMode.Sentences;
        var lang = Enum.TryParse<Language>(s.Language, true, out var l) ? l : Language.Uzbek;
        var count = s.WordCount is >= 5 and <= 200 ? s.WordCount : 25;
        return new PracticeTextRequest(mode, lang, Difficulty.Normal, count, s.QuoteLength);
    }
}

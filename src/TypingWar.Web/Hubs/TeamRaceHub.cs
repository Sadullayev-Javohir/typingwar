using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Application.Features.Teams;
using TypingWar.Domain.Constants;
using TypingWar.Domain.Entities;
using TypingWar.Domain.Enums;
using TypingWar.Domain.Services;
using TypingWar.Infrastructure.Realtime;

namespace TypingWar.Web.Hubs;

/// <summary>
/// 5x5 jamoaviy musobaqa: A/B tomonga qo'shilish, host boshlashi, 3-2-1,
/// live progress va jamoa WPM yig'indisi, natijalar.
/// </summary>
[AllowAnonymous]
public class TeamRaceHub : Hub
{
    private readonly TeamRaceLiveState _state;
    private readonly ISender _mediator;
    private readonly ITextProvider _textProvider;
    private readonly IApplicationDbContext _db;

    public TeamRaceHub(TeamRaceLiveState state, ISender mediator, ITextProvider textProvider, IApplicationDbContext db)
    {
        _state = state;
        _mediator = mediator;
        _textProvider = textProvider;
        _db = db;
    }

    private Guid? UserId =>
        Guid.TryParse(Context.User?.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private static object View(TeamPlayerLive p) => new
    {
        connId = p.ConnectionId,
        name = p.Name,
        side = p.Side.ToString(),
        isHost = p.IsHost,
        progress = p.Progress,
        wpm = p.Wpm,
        accuracy = p.Accuracy,
        finished = p.Finished
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
        var wanted = ParseSide(side);

        if (live.CountSide(wanted) >= GameConstants.TeamSize)
        {
            await Clients.Caller.SendAsync("Error", $"{wanted} jamoasi to'la (maks {GameConstants.TeamSize}).");
            return;
        }

        var uid = UserId;
        bool isHost = uid.HasValue && uid.Value == race.HostId;
        var player = new TeamPlayerLive
        {
            ConnectionId = Context.ConnectionId,
            UserId = uid,
            Name = ResolveName(displayName),
            Side = wanted,
            IsHost = isHost
        };
        live.Players[Context.ConnectionId] = player;
        await Groups.AddToGroupAsync(Context.ConnectionId, code);

        await Clients.Caller.SendAsync("TeamState", new
        {
            code,
            isHost,
            status = live.Status.ToString(),
            players = live.Players.Values.Select(View).ToList(),
            scores = Scores(live)
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

        var text = await _textProvider.GetAsync(
            new PracticeTextRequest(TextMode.Sentences, Language.Uzbek, Difficulty.Normal, 25));
        live.TextContent = text.Content;
        live.TextId = text.TextId;
        foreach (var p in live.Players.Values) { p.Finished = false; p.Progress = 0; p.Wpm = 0; p.Accuracy = 0; }

        live.Status = RaceStatus.Countdown;
        await Clients.Group(code).SendAsync("TeamRaceStarting", new { text = live.TextContent, countdown = 3 });
        live.Status = RaceStatus.InProgress;
    }

    public async Task ReportProgress(string code, double progress, double wpm)
    {
        code = code.ToUpperInvariant();
        if (!_state.TryGet(code, out var live)) return;
        if (!live.Players.TryGetValue(Context.ConnectionId, out var p)) return;

        p.Progress = progress;
        p.Wpm = wpm;
        await Clients.Group(code).SendAsync("ProgressUpdate", new
        {
            connId = Context.ConnectionId, progress, wpm, scores = Scores(live)
        });
    }

    public async Task FinishRace(string code, double wpm, double accuracy)
    {
        code = code.ToUpperInvariant();
        if (!_state.TryGet(code, out var live)) return;
        if (!live.Players.TryGetValue(Context.ConnectionId, out var p) || p.Finished) return;

        p.Finished = true;
        p.Wpm = wpm;
        p.Accuracy = accuracy;
        p.Progress = 100;

        await Clients.Group(code).SendAsync("PlayerFinished", new { connId = Context.ConnectionId, scores = Scores(live) });

        if (live.Players.Values.All(x => x.Finished))
        {
            live.Status = RaceStatus.Finished;
            double a = live.TeamScore(TeamSide.A), b = live.TeamScore(TeamSide.B);
            var winner = TeamRaceScoring.Winner(a, b);
            await Clients.Group(code).SendAsync("TeamRaceFinished", new
            {
                scores = new { a, b },
                winner = winner?.ToString(),
                players = live.Players.Values.OrderByDescending(x => x.Wpm).Select(View).ToList()
            });
            await PersistAsync(live, a, b);
        }
    }

    public async Task LeaveTeamRace(string code) => await RemoveConnection(code.ToUpperInvariant(), Context.ConnectionId);

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var live = _state.FindByConnection(Context.ConnectionId);
        if (live is not null) await RemoveConnection(live.Code, Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }

    private async Task RemoveConnection(string code, string connectionId)
    {
        if (!_state.TryGet(code, out var live)) return;
        if (live.Players.TryRemove(connectionId, out var p))
        {
            await Groups.RemoveFromGroupAsync(connectionId, code);
            await Clients.Group(code).SendAsync("PlayerLeft", new { connId = connectionId, scores = Scores(live) });
        }
        _state.RemoveIfEmpty(code);
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

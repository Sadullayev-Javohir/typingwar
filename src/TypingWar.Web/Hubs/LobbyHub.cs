using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Application.Features.Rooms;
using TypingWar.Domain.Enums;
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

    public LobbyHub(RoomLiveState state, ISender mediator, ITextProvider textProvider, IApplicationDbContext db)
    {
        _state = state;
        _mediator = mediator;
        _textProvider = textProvider;
        _db = db;
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
        accuracy = p.Accuracy,
        finished = p.Finished,
        place = p.Place
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

        var text = await _textProvider.GetAsync(
            new PracticeTextRequest(TextMode.Sentences, Language.Uzbek, Domain.Enums.Difficulty.Normal, 25));
        live.TextContent = text.Content;
        live.TextId = text.TextId;
        live.FinishOrder = 0;
        foreach (var p in live.Players.Values)
        {
            p.Finished = false; p.Progress = 0; p.Wpm = 0; p.Accuracy = 0; p.Place = null;
        }

        live.Status = RoomStatus.Countdown;
        await Clients.Group(code).SendAsync("RaceStarting", new { text = live.TextContent, countdown = 3 });
        live.Status = RoomStatus.InProgress;
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

    public async Task FinishRace(string code, double wpm, double accuracy)
    {
        code = code.ToUpperInvariant();
        if (!_state.TryGet(code, out var live)) return;
        if (!live.Players.TryGetValue(Context.ConnectionId, out var p) || p.Finished) return;

        p.Finished = true;
        p.Wpm = wpm;
        p.Accuracy = accuracy;
        p.Progress = 100;
        p.Place = Interlocked.Increment(ref live.FinishOrder);

        await Clients.Group(code).SendAsync("PlayerFinished", View(p));

        if (live.Players.Values.All(x => x.Finished))
        {
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
        }
        _state.RemoveIfEmpty(code);
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

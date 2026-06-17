using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using TypingWar.Application.Features.Tournaments;

namespace TypingWar.Web.Hubs;

/// <summary>
/// Turnir bracketi — live natijalar va tomoshabin rejimi.
/// Tomoshabinlar JoinTournament bilan guruhga qo'shiladi; natija kelganda
/// bracket yangilanishi barchaga uzatiladi.
/// </summary>
[AllowAnonymous]
public class TournamentHub : Hub
{
    private readonly ISender _mediator;

    public TournamentHub(ISender mediator) => _mediator = mediator;

    private static string Group(Guid tournamentId) => $"t-{tournamentId}";

    /// <summary>Turnir guruhiga qo'shilish (tomoshabin yoki ishtirokchi).</summary>
    public async Task JoinTournament(string tournamentId)
    {
        if (Guid.TryParse(tournamentId, out var id))
            await Groups.AddToGroupAsync(Context.ConnectionId, Group(id));
    }

    public async Task LeaveTournament(string tournamentId)
    {
        if (Guid.TryParse(tournamentId, out var id))
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, Group(id));
    }

    /// <summary>O'yin g'olibini xabar qiladi — bracket yangilanadi va guruhga uzatiladi.</summary>
    public async Task ReportResult(string tournamentId, string matchId, string winnerId)
    {
        if (Context.User?.FindFirstValue(ClaimTypes.NameIdentifier) is null)
        {
            await Clients.Caller.SendAsync("Error", "Natija qo'shish uchun tizimga kiring.");
            return;
        }
        if (!Guid.TryParse(tournamentId, out var tId) ||
            !Guid.TryParse(matchId, out var mId) ||
            !Guid.TryParse(winnerId, out var wId))
            return;

        try
        {
            var match = await _mediator.Send(new ReportMatchResultCommand(mId, wId));
            await Clients.Group(Group(tId)).SendAsync("MatchUpdated", match);

            var detail = await _mediator.Send(new GetTournamentQuery(tId));
            if (detail?.Info.Status == Domain.Enums.TournamentStatus.Finished)
                await Clients.Group(Group(tId)).SendAsync("TournamentFinished", detail.Info);
        }
        catch (InvalidOperationException ex)
        {
            await Clients.Caller.SendAsync("Error", ex.Message);
        }
    }
}

using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Entities;
using TypingWar.Domain.Enums;
using TypingWar.Domain.Services;

namespace TypingWar.Application.Features.Tournaments;

/// <summary>Bitta o'yin g'olibini belgilaydi va keyingi roundga o'tkazadi. Final bo'lsa — chempion.</summary>
public record ReportMatchResultCommand(Guid MatchId, Guid WinnerId) : IRequest<TournamentMatchDto>;

public class ReportMatchResultCommandHandler : IRequestHandler<ReportMatchResultCommand, TournamentMatchDto>
{
    private readonly IApplicationDbContext _db;

    public ReportMatchResultCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<TournamentMatchDto> Handle(ReportMatchResultCommand request, CancellationToken cancellationToken)
    {
        var match = await _db.TournamentMatches
            .FirstOrDefaultAsync(m => m.Id == request.MatchId, cancellationToken)
            ?? throw new InvalidOperationException("O'yin topilmadi.");

        var tournament = await _db.Tournaments
            .FirstOrDefaultAsync(t => t.Id == match.TournamentId, cancellationToken)
            ?? throw new InvalidOperationException("Turnir topilmadi.");

        if (tournament.Status != TournamentStatus.InProgress)
            throw new InvalidOperationException("Turnir faol emas.");
        if (match.WinnerId is not null)
            throw new InvalidOperationException("O'yin g'olibi allaqachon belgilangan.");
        if (request.WinnerId != match.Player1Id && request.WinnerId != match.Player2Id)
            throw new InvalidOperationException("G'olib bu o'yin ishtirokchisi emas.");

        match.WinnerId = request.WinnerId;

        if (match.Round >= TournamentBracket.Rounds(tournament.Capacity))
        {
            // Final — chempion
            tournament.ChampionId = request.WinnerId;
            tournament.Status = TournamentStatus.Finished;
        }
        else
        {
            var allMatches = await _db.TournamentMatches
                .Where(m => m.TournamentId == tournament.Id)
                .ToListAsync(cancellationToken);
            var byKey = allMatches.ToDictionary(m => (m.Round, m.Slot));
            StartTournamentCommandHandler.Advance(
                byKey, tournament.Capacity, match.Round, match.Slot, request.WinnerId);
        }

        await _db.SaveChangesAsync(cancellationToken);

        var players = await _db.TournamentPlayers
            .Where(p => p.TournamentId == tournament.Id)
            .ToDictionaryAsync(p => p.UserId, p => p.Username, cancellationToken);

        string? Name(Guid? id) => id is Guid g && players.TryGetValue(g, out var n) ? n : null;
        int matchesInRound = tournament.Capacity / (1 << match.Round);

        return new TournamentMatchDto(
            match.Id, match.Round, TournamentBracket.RoundName(matchesInRound), match.Slot,
            match.Player1Id, Name(match.Player1Id), match.Player2Id, Name(match.Player2Id),
            match.WinnerId, Name(match.WinnerId));
    }
}

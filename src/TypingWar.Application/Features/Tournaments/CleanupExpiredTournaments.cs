using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Tournaments;

/// <summary>
/// Tugagan (Finished) turnirlarni FinishedAt dan 1 soat o'tgach butunlay o'chiradi
/// (o'yinlar + ishtirokchilar bilan). Hangfire RecurringJob orqali chaqiriladi.
/// </summary>
public record CleanupExpiredTournamentsCommand : IRequest<int>;

public class CleanupExpiredTournamentsCommandHandler : IRequestHandler<CleanupExpiredTournamentsCommand, int>
{
    /// <summary>Tugaganidan keyin turnir necha soat saqlanadi.</summary>
    public const int RetentionHours = 1;

    private readonly IApplicationDbContext _db;

    public CleanupExpiredTournamentsCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<int> Handle(CleanupExpiredTournamentsCommand request, CancellationToken cancellationToken)
    {
        var cutoff = DateTime.UtcNow.AddHours(-RetentionHours);

        var expired = await _db.Tournaments
            .Where(t => t.Status == TournamentStatus.Finished
                        && t.FinishedAt != null && t.FinishedAt <= cutoff)
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);

        if (expired.Count == 0) return 0;

        var matches = await _db.TournamentMatches
            .Where(m => expired.Contains(m.TournamentId))
            .ToListAsync(cancellationToken);
        var players = await _db.TournamentPlayers
            .Where(p => expired.Contains(p.TournamentId))
            .ToListAsync(cancellationToken);
        var tournaments = await _db.Tournaments
            .Where(t => expired.Contains(t.Id))
            .ToListAsync(cancellationToken);

        _db.TournamentMatches.RemoveRange(matches);
        _db.TournamentPlayers.RemoveRange(players);
        _db.Tournaments.RemoveRange(tournaments);

        await _db.SaveChangesAsync(cancellationToken);
        return tournaments.Count;
    }
}

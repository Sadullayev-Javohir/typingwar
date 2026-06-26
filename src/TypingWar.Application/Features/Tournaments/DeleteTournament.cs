using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;

namespace TypingWar.Application.Features.Tournaments;

/// <summary>
/// Turnir egasi o'z turnirini butunlay o'chiradi (o'yinlar + ishtirokchilar bilan birga).
/// Istalgan bosqichda (ro'yxat / davom etmoqda / tugagan) ishlaydi — faqat host.
/// </summary>
public record DeleteTournamentCommand(Guid TournamentId) : IRequest<Unit>;

public class DeleteTournamentCommandHandler : IRequestHandler<DeleteTournamentCommand, Unit>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public DeleteTournamentCommandHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Unit> Handle(DeleteTournamentCommand request, CancellationToken cancellationToken)
    {
        var uid = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("Tizimga kiring.");

        var t = await _db.Tournaments
            .FirstOrDefaultAsync(x => x.Id == request.TournamentId, cancellationToken)
            ?? throw new InvalidOperationException("Turnir topilmadi.");
        if (t.HostId != uid)
            throw new InvalidOperationException("Faqat turnir egasi turnirni o'chira oladi.");

        var matches = await _db.TournamentMatches
            .Where(m => m.TournamentId == t.Id)
            .ToListAsync(cancellationToken);
        var players = await _db.TournamentPlayers
            .Where(p => p.TournamentId == t.Id)
            .ToListAsync(cancellationToken);

        _db.TournamentMatches.RemoveRange(matches);
        _db.TournamentPlayers.RemoveRange(players);
        _db.Tournaments.Remove(t);

        await _db.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}

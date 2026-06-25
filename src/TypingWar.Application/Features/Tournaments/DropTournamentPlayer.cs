using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Tournaments;

/// <summary>
/// Host turnirdan o'yinchini chiqaradi ("drop"). Faqat turnir egasi, faqat Registration bosqichida.
/// Qolgan o'yinchilar tartibi saqlanib qayta seed qilinadi (1..N).
/// </summary>
public record DropTournamentPlayerCommand(Guid TournamentId, Guid UserId) : IRequest<Unit>;

public class DropTournamentPlayerCommandHandler : IRequestHandler<DropTournamentPlayerCommand, Unit>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public DropTournamentPlayerCommandHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Unit> Handle(DropTournamentPlayerCommand request, CancellationToken cancellationToken)
    {
        var uid = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("Tizimga kiring.");

        var t = await _db.Tournaments
            .FirstOrDefaultAsync(x => x.Id == request.TournamentId, cancellationToken)
            ?? throw new InvalidOperationException("Turnir topilmadi.");
        if (t.HostId != uid)
            throw new InvalidOperationException("Faqat turnir egasi o'yinchini chiqara oladi.");
        if (t.Status != TournamentStatus.Registration)
            throw new InvalidOperationException("Turnir boshlangach o'yinchini chiqarib bo'lmaydi.");

        var players = await _db.TournamentPlayers
            .Where(p => p.TournamentId == t.Id)
            .OrderBy(p => p.Seed)
            .ToListAsync(cancellationToken);

        var target = players.FirstOrDefault(p => p.UserId == request.UserId);
        if (target is null) return Unit.Value;

        _db.TournamentPlayers.Remove(target);

        // Qolganlarni mavjud tartibda qayta seed qilamiz (1..N)
        int seed = 1;
        foreach (var p in players.Where(p => p.UserId != request.UserId))
            p.Seed = seed++;

        await _db.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}

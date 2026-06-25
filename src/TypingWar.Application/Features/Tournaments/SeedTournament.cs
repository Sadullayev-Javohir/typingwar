using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Tournaments;

/// <summary>
/// Host bracketdagi o'yinchilar tartibini (seed) belgilaydi — kim kim bilan o'ynashini hal qiladi.
/// Faqat host, faqat Registration bosqichida. orderedUserIds berilgan tartibda seed 1..N.
/// </summary>
public record SetSeedOrderCommand(Guid TournamentId, IReadOnlyList<Guid> OrderedUserIds) : IRequest<Unit>;

public class SetSeedOrderCommandHandler : IRequestHandler<SetSeedOrderCommand, Unit>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public SetSeedOrderCommandHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Unit> Handle(SetSeedOrderCommand request, CancellationToken cancellationToken)
    {
        var uid = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("Tizimga kiring.");

        var t = await _db.Tournaments
            .FirstOrDefaultAsync(x => x.Id == request.TournamentId, cancellationToken)
            ?? throw new InvalidOperationException("Turnir topilmadi.");
        if (t.HostId != uid)
            throw new InvalidOperationException("Faqat turnir egasi tartibni o'zgartira oladi.");
        if (t.Status != TournamentStatus.Registration)
            throw new InvalidOperationException("Turnir boshlangach tartibni o'zgartirib bo'lmaydi.");

        var players = await _db.TournamentPlayers
            .Where(p => p.TournamentId == t.Id)
            .ToListAsync(cancellationToken);
        var byId = players.ToDictionary(p => p.UserId);

        int seed = 1;
        var placed = new HashSet<Guid>();
        // Berilgan tartibda seed beramiz
        foreach (var id in request.OrderedUserIds)
            if (byId.TryGetValue(id, out var p) && placed.Add(id))
                p.Seed = seed++;
        // Ro'yxatda kelmagan o'yinchilar (agar bo'lsa) — oxiriga
        foreach (var p in players.Where(p => !placed.Contains(p.UserId)).OrderBy(p => p.Seed))
            p.Seed = seed++;

        await _db.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}

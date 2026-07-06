using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Tournaments;

/// <summary>
/// DEMO/SIMULYATSIYA: o'yinchilar tartibini (seed) belgilaydi — /Tournaments dagi host
/// boshqaruvi kabi. Auth talab qilinmaydi; FAQAT demo turnirlarga (HostId=Guid.Empty)
/// va faqat Registration bosqichida ta'sir qiladi (haqiqiy turnirlarga tegmaydi).
/// </summary>
public record SetDemoSeedOrderCommand(Guid TournamentId, IReadOnlyList<Guid> OrderedUserIds) : IRequest<Unit>;

public class SetDemoSeedOrderCommandHandler : IRequestHandler<SetDemoSeedOrderCommand, Unit>
{
    private readonly IApplicationDbContext _db;

    public SetDemoSeedOrderCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<Unit> Handle(SetDemoSeedOrderCommand request, CancellationToken cancellationToken)
    {
        var t = await _db.Tournaments
            .FirstOrDefaultAsync(x => x.Id == request.TournamentId && x.HostId == Guid.Empty, cancellationToken);
        // Demo emas, yo'q yoki allaqachon boshlangan — jim o'tkazib yuboramiz
        if (t is null || t.Status != TournamentStatus.Registration) return Unit.Value;

        var players = await _db.TournamentPlayers
            .Where(p => p.TournamentId == t.Id)
            .ToListAsync(cancellationToken);
        var byId = players.ToDictionary(p => p.UserId);

        int seed = 1;
        var placed = new HashSet<Guid>();
        foreach (var id in request.OrderedUserIds)
            if (byId.TryGetValue(id, out var p) && placed.Add(id))
                p.Seed = seed++;
        // Ro'yxatda kelmaganlar — oxiriga, mavjud tartibda
        foreach (var p in players.Where(p => !placed.Contains(p.UserId)).OrderBy(p => p.Seed))
            p.Seed = seed++;

        await _db.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}

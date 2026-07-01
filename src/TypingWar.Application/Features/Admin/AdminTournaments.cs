using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;

namespace TypingWar.Application.Features.Admin;

/// <summary>Admin paneli uchun turnir qatori.</summary>
public record AdminTournamentDto(
    Guid Id,
    string Name,
    string Status,
    bool IsPrivate,
    int Capacity,
    int PlayerCount,
    string HostName,
    DateTime CreatedAt);

/// <summary>Admin: barcha turnirlar (shaxsiy/ochiq, har qanday bosqich).</summary>
public record AdminListTournamentsQuery : IRequest<IReadOnlyList<AdminTournamentDto>>;

public class AdminListTournamentsQueryHandler
    : IRequestHandler<AdminListTournamentsQuery, IReadOnlyList<AdminTournamentDto>>
{
    private readonly IApplicationDbContext _db;
    private readonly IAdminService _users;

    public AdminListTournamentsQueryHandler(IApplicationDbContext db, IAdminService users)
    {
        _db = db;
        _users = users;
    }

    public async Task<IReadOnlyList<AdminTournamentDto>> Handle(
        AdminListTournamentsQuery request, CancellationToken cancellationToken)
    {
        var tournaments = await _db.Tournaments
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new
            {
                t.Id, t.Name, t.Status, t.IsPrivate, t.Capacity, t.HostId, t.CreatedAt,
                PlayerCount = t.Players.Count
            })
            .ToListAsync(cancellationToken);

        var hostIds = tournaments.Select(t => t.HostId).Distinct().ToList();
        var names = await _users.GetUsernamesAsync(hostIds, cancellationToken);

        return tournaments.Select(t => new AdminTournamentDto(
            t.Id, t.Name, t.Status.ToString(), t.IsPrivate, t.Capacity, t.PlayerCount,
            names.TryGetValue(t.HostId, out var n) ? n : "—",
            t.CreatedAt)).ToList();
    }
}

/// <summary>Admin: istalgan turnirni (o'yinlar + ishtirokchilar bilan) o'chiradi — host tekshiruvisiz.</summary>
public record AdminDeleteTournamentCommand(Guid TournamentId) : IRequest<Unit>;

public class AdminDeleteTournamentCommandHandler : IRequestHandler<AdminDeleteTournamentCommand, Unit>
{
    private readonly IApplicationDbContext _db;

    public AdminDeleteTournamentCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<Unit> Handle(AdminDeleteTournamentCommand request, CancellationToken cancellationToken)
    {
        var t = await _db.Tournaments
            .FirstOrDefaultAsync(x => x.Id == request.TournamentId, cancellationToken)
            ?? throw new InvalidOperationException("Turnir topilmadi.");

        var matches = await _db.TournamentMatches
            .Where(m => m.TournamentId == t.Id).ToListAsync(cancellationToken);
        var players = await _db.TournamentPlayers
            .Where(p => p.TournamentId == t.Id).ToListAsync(cancellationToken);

        _db.TournamentMatches.RemoveRange(matches);
        _db.TournamentPlayers.RemoveRange(players);
        _db.Tournaments.Remove(t);

        await _db.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}

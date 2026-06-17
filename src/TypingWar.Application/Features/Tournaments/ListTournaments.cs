using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;

namespace TypingWar.Application.Features.Tournaments;

/// <summary>Turnirlar ro'yxati (eng yangi birinchi).</summary>
public record ListTournamentsQuery : IRequest<IReadOnlyList<TournamentInfoDto>>;

public class ListTournamentsQueryHandler : IRequestHandler<ListTournamentsQuery, IReadOnlyList<TournamentInfoDto>>
{
    private readonly IApplicationDbContext _db;

    public ListTournamentsQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<IReadOnlyList<TournamentInfoDto>> Handle(ListTournamentsQuery request, CancellationToken cancellationToken)
    {
        var tournaments = await _db.Tournaments
            .OrderByDescending(t => t.StartAt)
            .Take(50)
            .Select(t => new
            {
                t.Id, t.Name, t.Status, t.StartAt, t.Capacity,
                Count = t.Players.Count
            })
            .ToListAsync(cancellationToken);

        return tournaments
            .Select(t => new TournamentInfoDto(t.Id, t.Name, t.Status, t.StartAt, t.Capacity, t.Count, null))
            .ToList();
    }
}

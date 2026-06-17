using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;

namespace TypingWar.Application.Features.Admin;

public record AdminStatsDto(
    int Users, int Texts, int Results, int Contests, int Tournaments, int Rooms);

/// <summary>Admin paneli uchun umumiy statistika.</summary>
public record GetAdminStatsQuery : IRequest<AdminStatsDto>;

public class GetAdminStatsQueryHandler : IRequestHandler<GetAdminStatsQuery, AdminStatsDto>
{
    private readonly IApplicationDbContext _db;
    private readonly IAdminStatsReader _stats;

    public GetAdminStatsQueryHandler(IApplicationDbContext db, IAdminStatsReader stats)
    {
        _db = db;
        _stats = stats;
    }

    public async Task<AdminStatsDto> Handle(GetAdminStatsQuery request, CancellationToken cancellationToken)
    {
        return new AdminStatsDto(
            Users: await _stats.CountUsersAsync(cancellationToken),
            Texts: await _db.RaceTexts.CountAsync(cancellationToken),
            Results: await _db.RaceResults.CountAsync(cancellationToken),
            Contests: await _db.DailyContests.CountAsync(cancellationToken),
            Tournaments: await _db.Tournaments.CountAsync(cancellationToken),
            Rooms: await _db.Rooms.CountAsync(cancellationToken));
    }
}

using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;

namespace TypingWar.Application.Features.Teams;

/// <summary>Kod bo'yicha jamoaviy musobaqani topadi (Redis). Topilmasa null.</summary>
public record GetTeamRaceQuery(string Code) : IRequest<TeamRaceDto?>;

public class GetTeamRaceQueryHandler : IRequestHandler<GetTeamRaceQuery, TeamRaceDto?>
{
    private readonly IApplicationDbContext _db;
    private readonly ICacheService _cache;
    private readonly ICurrentUserService _currentUser;

    public GetTeamRaceQueryHandler(IApplicationDbContext db, ICacheService cache, ICurrentUserService currentUser)
    {
        _db = db;
        _cache = cache;
        _currentUser = currentUser;
    }

    public async Task<TeamRaceDto?> Handle(GetTeamRaceQuery request, CancellationToken cancellationToken)
    {
        var code = request.Code.ToUpperInvariant();
        var raw = await _cache.GetStringAsync(CreateTeamRaceCommandHandler.TeamKey(code));
        if (raw is null) return null;

        // Format: "{id}|{hostId}|{settingsJson}" (settings ixtiyoriy — eski yozuvlarda yo'q).
        var parts = raw.Split('|', 3);
        if (parts.Length < 2 || !Guid.TryParse(parts[0], out var raceId) || !Guid.TryParse(parts[1], out var hostId))
            return null;
        var settings = parts.Length == 3 && !string.IsNullOrWhiteSpace(parts[2]) ? parts[2] : "{}";

        var race = await _db.TeamRaces.FirstOrDefaultAsync(r => r.Id == raceId, cancellationToken);
        if (race is null) return null;

        return new TeamRaceDto(race.Id, code, hostId, race.Status, _currentUser.UserId == hostId, settings);
    }
}

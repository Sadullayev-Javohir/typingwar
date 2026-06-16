using MediatR;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Constants;
using TypingWar.Domain.Entities;
using TypingWar.Domain.Enums;
using TypingWar.Domain.Services;

namespace TypingWar.Application.Features.Teams;

/// <summary>Yangi jamoaviy musobaqa yaratadi (host — tizimga kirgan foydalanuvchi).</summary>
public record CreateTeamRaceCommand : IRequest<TeamRaceDto>;

public class CreateTeamRaceCommandHandler : IRequestHandler<CreateTeamRaceCommand, TeamRaceDto>
{
    private readonly IApplicationDbContext _db;
    private readonly ICacheService _cache;
    private readonly ICurrentUserService _currentUser;

    public CreateTeamRaceCommandHandler(IApplicationDbContext db, ICacheService cache, ICurrentUserService currentUser)
    {
        _db = db;
        _cache = cache;
        _currentUser = currentUser;
    }

    public async Task<TeamRaceDto> Handle(CreateTeamRaceCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("Jamoaviy musobaqa yaratish uchun tizimga kiring.");

        string code;
        int attempts = 0;
        do { code = RoomCodeGenerator.Generate(); attempts++; }
        while (await _cache.KeyExistsAsync(TeamKey(code)) && attempts < 10);

        var race = new TeamRace { Status = RaceStatus.Waiting };
        _db.TeamRaces.Add(race);
        await _db.SaveChangesAsync(cancellationToken);

        // Kod faqat Redis da — TeamRaces jadvalida Code ustuni yo'q. Qiymat: "{id}|{hostId}".
        await _cache.SetStringAsync(TeamKey(code), $"{race.Id}|{userId}",
            TimeSpan.FromMinutes(GameConstants.RoomCodeTtlMinutes));

        return new TeamRaceDto(race.Id, code, userId, race.Status, true);
    }

    public static string TeamKey(string code) => $"tr:{code.ToUpperInvariant()}";
}

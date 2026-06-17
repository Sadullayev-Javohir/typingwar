using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Constants;

namespace TypingWar.Application.Features.Profile;

public record PbDto(string TimeMode, double BestWpm, double Accuracy, DateTime AchievedAt);
public record RecentResultDto(string TimeMode, double Wpm, double Accuracy, DateTime PlayedAt);
public record ProfileDto(
    string Username, string Region, int Elo, DateTime JoinedAt,
    IReadOnlyList<PbDto> PersonalBests, IReadOnlyList<RecentResultDto> Recent);

/// <summary>Joriy foydalanuvchi profili — PB lar, so'nggi natijalar, hudud, ELO.</summary>
public record GetProfileQuery : IRequest<ProfileDto?>;

public class GetProfileQueryHandler : IRequestHandler<GetProfileQuery, ProfileDto?>
{
    private readonly IApplicationDbContext _db;
    private readonly IUserProfileReader _profile;
    private readonly ICurrentUserService _currentUser;

    public GetProfileQueryHandler(IApplicationDbContext db, IUserProfileReader profile, ICurrentUserService currentUser)
    {
        _db = db;
        _profile = profile;
        _currentUser = currentUser;
    }

    public async Task<ProfileDto?> Handle(GetProfileQuery request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is not Guid uid) return null;

        var info = await _profile.GetProfileAsync(uid, cancellationToken);
        if (info is null) return null;

        var pbs = await _db.PersonalBests
            .Where(p => p.UserId == uid)
            .OrderBy(p => p.TimeMode)
            .Select(p => new PbDto(p.TimeMode.ToString(), p.BestWpm, p.Accuracy, p.AchievedAt))
            .ToListAsync(cancellationToken);

        var recent = await _db.RaceResults
            .Where(r => r.UserId == uid)
            .OrderByDescending(r => r.PlayedAt)
            .Take(10)
            .Select(r => new RecentResultDto(r.TimeMode.ToString(), r.Wpm, r.Accuracy, r.PlayedAt))
            .ToListAsync(cancellationToken);

        string region = info.RegionCode is not null && UzbekistanRegions.All.TryGetValue(info.RegionCode, out var name)
            ? name : "—";

        return new ProfileDto(info.Username, region, info.EloRating, info.CreatedAt, pbs, recent);
    }
}

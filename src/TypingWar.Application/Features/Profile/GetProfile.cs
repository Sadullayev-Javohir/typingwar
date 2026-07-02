using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Constants;
using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Profile;

public record PbDto(string ModeKey, double BestWpm, double Accuracy, DateTime AchievedAt);
public record RecentResultDto(string ModeKey, double Wpm, double Accuracy, DateTime PlayedAt);

/// <summary>Bir kunlik faollik (o'sish grafiklari + yillik faollik kalendari uchun).</summary>
public record DailyActivityDto(string Date, int Races, double AvgWpm, double BestWpm, int Seconds);

/// <summary>Profil statistikasi (umumiy ko'rsatkichlar).</summary>
public record ProfileStatsDto(
    int TotalRaces, double BestWpm, double AvgWpm, double AvgAccuracy,
    double BestAccuracy, int TotalSeconds, int PbCount);

public record ProfileDto(
    string Username, string Region, string? RegionCode, int Elo, DateTime JoinedAt,
    string? AvatarUrl, string ShareUrl, ProfileStatsDto Stats,
    IReadOnlyList<PbDto> PersonalBests, IReadOnlyList<RecentResultDto> Recent,
    IReadOnlyList<DailyActivityDto> Activity);

/// <summary>Joriy foydalanuvchi profili — to'liq statistika, PB lar, so'nggi natijalar.</summary>
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

        return await ProfileBuilder.BuildAsync(
            _db, uid, info.Username, info.EloRating, info.RegionCode, info.AvatarUrl, info.CreatedAt,
            includeRecent: true, cancellationToken);
    }
}

/// <summary>Ommaviy profil (/share/{username}) — username bo'yicha, anonim ko'rishi mumkin.</summary>
public record GetPublicProfileQuery(string Username) : IRequest<ProfileDto?>;

public class GetPublicProfileQueryHandler : IRequestHandler<GetPublicProfileQuery, ProfileDto?>
{
    private readonly IApplicationDbContext _db;
    private readonly IUserProfileReader _profile;

    public GetPublicProfileQueryHandler(IApplicationDbContext db, IUserProfileReader profile)
    {
        _db = db;
        _profile = profile;
    }

    public async Task<ProfileDto?> Handle(GetPublicProfileQuery request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Username)) return null;

        var p = await _profile.GetByUsernameAsync(request.Username.Trim(), cancellationToken);
        if (p is null) return null;

        return await ProfileBuilder.BuildAsync(
            _db, p.UserId, p.Username, p.EloRating, p.RegionCode, p.AvatarUrl, p.CreatedAt,
            includeRecent: true, cancellationToken);
    }
}

/// <summary>Profil DTO sini (statistika + PB + so'nggi natijalar) yig'uvchi umumiy yordamchi.</summary>
internal static class ProfileBuilder
{
    public static async Task<ProfileDto> BuildAsync(
        IApplicationDbContext db, Guid uid, string username, int elo,
        string? regionCode, string? avatarUrl, DateTime joinedAt,
        bool includeRecent, CancellationToken ct)
    {
        var pbs = await db.PersonalBests
            .Where(p => p.UserId == uid)
            .OrderBy(p => p.TimeMode)
            .Select(p => new PbDto(p.ModeKey, p.BestWpm, p.Accuracy, p.AchievedAt))
            .ToListAsync(ct);

        var results = await db.RaceResults
            .Where(r => r.UserId == uid)
            .Select(r => new { r.Wpm, r.Accuracy, r.TimeMode, r.ModeKey, r.PlayedAt })
            .ToListAsync(ct);

        var stats = new ProfileStatsDto(
            TotalRaces: results.Count,
            BestWpm: results.Count > 0 ? results.Max(r => r.Wpm) : 0,
            AvgWpm: results.Count > 0 ? Math.Round(results.Average(r => r.Wpm), 1) : 0,
            AvgAccuracy: results.Count > 0 ? Math.Round(results.Average(r => r.Accuracy), 1) : 0,
            BestAccuracy: results.Count > 0 ? results.Max(r => r.Accuracy) : 0,
            TotalSeconds: results.Sum(r => (int)r.TimeMode),
            PbCount: pbs.Count);

        var recent = includeRecent
            ? results.OrderByDescending(r => r.PlayedAt).Take(12)
                .Select(r => new RecentResultDto(
                    r.ModeKey ?? PracticeModes.FromTimeMode(r.TimeMode), r.Wpm, r.Accuracy, r.PlayedAt))
                .ToList()
            : new List<RecentResultDto>();

        // Kunlik faollik — o'sish grafiklari (kunlik/haftalik/oylik/yillik) va yillik
        // faollik kalendari (GitHub uslubidagi heat map) frontendda shundan quriladi.
        var activity = results
            .GroupBy(r => r.PlayedAt.Date)
            .OrderBy(g => g.Key)
            .Select(g => new DailyActivityDto(
                g.Key.ToString("yyyy-MM-dd"),
                g.Count(),
                Math.Round(g.Average(x => x.Wpm), 1),
                Math.Round(g.Max(x => x.Wpm), 1),
                g.Sum(x => (int)x.TimeMode)))
            .ToList();

        string region = regionCode is not null && UzbekistanRegions.All.TryGetValue(regionCode, out var name)
            ? name : "—";

        return new ProfileDto(
            username, region, regionCode, elo, joinedAt, avatarUrl,
            "/share/" + username, stats, pbs, recent, activity);
    }
}

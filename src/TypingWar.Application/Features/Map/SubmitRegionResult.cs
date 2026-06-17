using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Constants;
using TypingWar.Domain.Entities;
using TypingWar.Domain.Services;

namespace TypingWar.Application.Features.Map;

/// <summary>
/// Joriy foydalanuvchi natijasini uning hududi statistikasiga qo'shadi (bugungi RegionStats).
/// Hudud yo'q yoki WPM haqiqiy emas bo'lsa — null (e'tiborsiz).
/// </summary>
public record SubmitRegionResultCommand(double Wpm) : IRequest<RegionStatDto?>;

public class SubmitRegionResultCommandHandler : IRequestHandler<SubmitRegionResultCommand, RegionStatDto?>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;
    private readonly IUserProfileReader _profile;

    public SubmitRegionResultCommandHandler(
        IApplicationDbContext db, ICurrentUserService currentUser, IUserProfileReader profile)
    {
        _db = db;
        _currentUser = currentUser;
        _profile = profile;
    }

    public async Task<RegionStatDto?> Handle(SubmitRegionResultCommand request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is not Guid uid) return null;
        if (!TypingCalculator.IsPlausible(request.Wpm) || request.Wpm <= 0) return null;

        var code = await _profile.GetRegionCodeAsync(uid, cancellationToken);
        if (!UzbekistanRegions.IsValid(code)) return null;

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var stat = await _db.RegionStats
            .FirstOrDefaultAsync(r => r.RegionCode == code && r.Date == today, cancellationToken);

        if (stat is null)
        {
            stat = new RegionStats
            {
                RegionCode = code!,
                RegionName = UzbekistanRegions.All[code!],
                Date = today,
                TotalWpm = request.Wpm,
                PlayerCount = 1,
                AvgWpm = Math.Round(request.Wpm, 1)
            };
            _db.RegionStats.Add(stat);
        }
        else
        {
            stat.TotalWpm += request.Wpm;
            stat.PlayerCount += 1;
            stat.AvgWpm = Math.Round(stat.TotalWpm / stat.PlayerCount, 1);
        }

        await _db.SaveChangesAsync(cancellationToken);

        // Butun hudud (barcha kunlar) yig'masi — xaritadagi qiymat bilan mos
        var agg = await _db.RegionStats
            .Where(r => r.RegionCode == code)
            .GroupBy(r => r.RegionCode)
            .Select(g => new { Total = g.Sum(x => x.TotalWpm), Players = g.Sum(x => x.PlayerCount) })
            .FirstAsync(cancellationToken);

        double avg = agg.Players > 0 ? Math.Round(agg.Total / agg.Players, 1) : 0;
        return new RegionStatDto(code!, UzbekistanRegions.All[code!], avg, agg.Players);
    }
}

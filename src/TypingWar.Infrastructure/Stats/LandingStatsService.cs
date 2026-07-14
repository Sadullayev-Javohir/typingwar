using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Application.Features.Home;
using TypingWar.Domain.Constants;
using TypingWar.Infrastructure.Persistence;

namespace TypingWar.Infrastructure.Stats;

/// <summary>Landing statistikasini to'g'ridan-to'g'ri DB dan (AppDbContext) hisoblaydi.</summary>
public class LandingStatsService : ILandingStatsService
{
    private static readonly string Words10Key = PracticeModes.Words(10);

    private readonly AppDbContext _db;

    public LandingStatsService(AppDbContext db) => _db = db;

    public async Task<LandingStatsDto> GetAsync(CancellationToken ct = default)
    {
        var todayStartUtc = TashkentTodayStartUtc();

        var todayRegistrations = await _db.Users.AsNoTracking()
            .CountAsync(u => u.CreatedAt >= todayStartUtc, ct);

        // 10 so'z rejimidagi eng yuqori WPM rekordi + egasi
        var words10Record = await _db.PersonalBests.AsNoTracking()
            .Where(p => p.ModeKey == Words10Key)
            .OrderByDescending(p => p.BestWpm)
            .Join(_db.Users.AsNoTracking(),
                p => p.UserId, u => u.Id,
                (p, u) => new RecordHolderDto(u.UserName ?? "—", p.BestWpm, u.RegionCode))
            .FirstOrDefaultAsync(ct);

        // Elo reyting bo'yicha yetakchi
        var topUser = await _db.Users.AsNoTracking()
            .OrderByDescending(u => u.EloRating)
            .Select(u => new TopUserDto(u.UserName ?? "—", u.EloRating, u.RegionCode))
            .FirstOrDefaultAsync(ct);

        return new LandingStatsDto(todayRegistrations, words10Record, topUser);
    }

    /// <summary>Bugungi kun boshini (00:00 Toshkent, UTC+5) UTC ga aylantiradi.</summary>
    private static DateTime TashkentTodayStartUtc()
    {
        var tz = ResolveTashkentTz();
        var nowLocal = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
        var startLocal = DateTime.SpecifyKind(nowLocal.Date, DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(startLocal, tz);
    }

    private static TimeZoneInfo ResolveTashkentTz()
    {
        foreach (var id in new[] { "Asia/Tashkent", "Uzbekistan Standard Time" })
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
            catch (TimeZoneNotFoundException) { }
            catch (InvalidTimeZoneException) { }
        }
        // Zaxira: UTC+5 (Toshkent DST ishlatmaydi)
        return TimeZoneInfo.CreateCustomTimeZone("UZT", TimeSpan.FromHours(5), "UZT", "UZT");
    }
}

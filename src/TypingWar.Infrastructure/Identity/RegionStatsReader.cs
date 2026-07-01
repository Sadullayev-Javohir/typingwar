using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Enums;
using TypingWar.Infrastructure.Persistence;

namespace TypingWar.Infrastructure.Identity;

/// <summary>
/// Users (RegionCode) ni PersonalBests (TimeMode.Thirty) bilan birlashtirib, hudud bo'yicha
/// eng tez WPM / o'rtacha WPM / ishtirokchilar sonini hisoblaydi.
/// </summary>
public class RegionStatsReader : IRegionStatsReader
{
    private readonly AppDbContext _db;

    public RegionStatsReader(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<RegionAggregate>> GetThirtySecondStatsAsync(CancellationToken ct = default)
    {
        var rows = await BaseQuery()
            .GroupBy(x => x.RegionCode)
            .Select(g => new RegionAggregate(
                g.Key!,
                g.Max(x => x.BestWpm),
                Math.Round(g.Average(x => x.BestWpm), 1),
                g.Count()))
            .ToListAsync(ct);

        return rows;
    }

    public async Task<RegionAggregate?> GetRegionAsync(string regionCode, CancellationToken ct = default)
    {
        var rows = await BaseQuery()
            .Where(x => x.RegionCode == regionCode)
            .GroupBy(x => x.RegionCode)
            .Select(g => new RegionAggregate(
                g.Key!,
                g.Max(x => x.BestWpm),
                Math.Round(g.Average(x => x.BestWpm), 1),
                g.Count()))
            .FirstOrDefaultAsync(ct);

        return rows;
    }

    /// <summary>Hududi bor foydalanuvchilarning 30s shaxsiy rekordlari.</summary>
    private IQueryable<RegionRow> BaseQuery() =>
        from u in _db.Users
        where u.RegionCode != null
        join pb in _db.PersonalBests.Where(p => p.TimeMode == TimeMode.Thirty && p.ModeKey.StartsWith("time:"))
            on u.Id equals pb.UserId
        select new RegionRow { RegionCode = u.RegionCode, BestWpm = pb.BestWpm };

    private class RegionRow
    {
        public string? RegionCode { get; set; }
        public double BestWpm { get; set; }
    }
}

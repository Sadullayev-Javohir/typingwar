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
        var rows = await BaseQuery().ToListAsync(ct);
        return rows
            .GroupBy(x => x.RegionCode!)
            .Select(g => Aggregate(g.Key, g))
            .ToList();
    }

    public async Task<RegionAggregate?> GetRegionAsync(string regionCode, CancellationToken ct = default)
    {
        var rows = await BaseQuery()
            .Where(x => x.RegionCode == regionCode)
            .ToListAsync(ct);
        return rows.Count == 0 ? null : Aggregate(regionCode, rows);
    }

    /// <summary>Hudud satrlaridan yig'ma quradi — eng tez WPM, o'rtacha, soni va eng tez o'yinchi.</summary>
    private static RegionAggregate Aggregate(string regionCode, IEnumerable<RegionRow> rows)
    {
        var list = rows.ToList();
        var top = list.OrderByDescending(x => x.BestWpm).First();
        return new RegionAggregate(
            regionCode,
            top.BestWpm,
            Math.Round(list.Average(x => x.BestWpm), 1),
            list.Count,
            top.Username);
    }

    /// <summary>Hududi bor foydalanuvchilarning 30s shaxsiy rekordlari (ism bilan).</summary>
    private IQueryable<RegionRow> BaseQuery() =>
        from u in _db.Users
        where u.RegionCode != null
        join pb in _db.PersonalBests.Where(p => p.TimeMode == TimeMode.Thirty && p.ModeKey.StartsWith("time:"))
            on u.Id equals pb.UserId
        select new RegionRow { RegionCode = u.RegionCode, BestWpm = pb.BestWpm, Username = u.UserName };

    private class RegionRow
    {
        public string? RegionCode { get; set; }
        public double BestWpm { get; set; }
        public string? Username { get; set; }
    }
}

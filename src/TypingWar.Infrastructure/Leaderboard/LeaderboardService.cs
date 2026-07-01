using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Application.Features.Leaderboard;
using TypingWar.Domain.Enums;
using TypingWar.Infrastructure.Persistence;

namespace TypingWar.Infrastructure.Leaderboard;

/// <summary>Redis Sorted Set leaderboard. Key: lb:{timeMode}, member: userId, score: bestWpm.</summary>
public class LeaderboardService : ILeaderboardService
{
    private const int TopCount = 50;

    private readonly ICacheService _cache;
    private readonly AppDbContext _db;

    public LeaderboardService(ICacheService cache, AppDbContext db)
    {
        _cache = cache;
        _db = db;
    }

    private static string Key(TimeMode mode) => $"lb:{(int)mode}";

    public Task UpdateAsync(Guid userId, TimeMode timeMode, double bestWpm, CancellationToken ct = default)
        => _cache.SortedSetAddAsync(Key(timeMode), userId.ToString(), bestWpm);

    public async Task<LeaderboardDto> GetAsync(TimeMode timeMode, Guid? currentUserId, CancellationToken ct = default)
    {
        var key = Key(timeMode);

        var top = await _cache.SortedSetTopAsync(key, TopCount);
        if (top.Count == 0)
        {
            await RebuildAsync(timeMode, ct);
            top = await _cache.SortedSetTopAsync(key, TopCount);
        }

        // Top uchun foydalanuvchi ma'lumotlari
        var topIds = top.Select(t => Guid.TryParse(t.Member, out var g) ? g : Guid.Empty)
                        .Where(g => g != Guid.Empty).ToList();

        var users = await _db.Users.AsNoTracking()
            .Where(u => topIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, ct);

        var accuracies = await _db.PersonalBests.AsNoTracking()
            .Where(p => p.TimeMode == timeMode && p.ModeKey.StartsWith("time:") && topIds.Contains(p.UserId))
            .ToDictionaryAsync(p => p.UserId, p => p.Accuracy, ct);

        var entries = new List<LeaderboardEntryDto>(top.Count);
        long rank = 0;
        foreach (var (member, score) in top)
        {
            rank++;
            if (!Guid.TryParse(member, out var uid) || !users.TryGetValue(uid, out var u)) continue;
            entries.Add(new LeaderboardEntryDto(
                rank, uid, u.UserName ?? "—", score,
                accuracies.TryGetValue(uid, out var acc) ? acc : 0,
                u.RegionCode, u.AvatarUrl,
                currentUserId == uid));
        }

        // Joriy foydalanuvchi qatori
        LeaderboardEntryDto? current = null;
        bool inTop = false;
        if (currentUserId is Guid cid)
        {
            inTop = entries.Any(e => e.UserId == cid);
            var cRank = await _cache.SortedSetRankAsync(key, cid.ToString());
            if (cRank is long r)
            {
                var pb = await _db.PersonalBests.AsNoTracking()
                    .FirstOrDefaultAsync(p => p.UserId == cid && p.TimeMode == timeMode && p.ModeKey.StartsWith("time:"), ct);
                var u = await _db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == cid, ct);
                if (pb is not null && u is not null)
                    current = new LeaderboardEntryDto(
                        r + 1, cid, u.UserName ?? "—", pb.BestWpm, pb.Accuracy,
                        u.RegionCode, u.AvatarUrl, true);
            }
        }

        return new LeaderboardDto(timeMode, entries, current, inTop);
    }

    /// <summary>Redis bo'sh bo'lsa — DB dagi PersonalBest lardan qayta quradi.</summary>
    private async Task RebuildAsync(TimeMode timeMode, CancellationToken ct)
    {
        var pbs = await _db.PersonalBests.AsNoTracking()
            .Where(p => p.TimeMode == timeMode && p.ModeKey.StartsWith("time:"))
            .ToListAsync(ct);

        foreach (var pb in pbs)
            await _cache.SortedSetAddAsync(Key(timeMode), pb.UserId.ToString(), pb.BestWpm);
    }
}

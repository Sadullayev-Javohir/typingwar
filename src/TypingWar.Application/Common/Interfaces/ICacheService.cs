namespace TypingWar.Application.Common.Interfaces;

/// <summary>Redis cache abstraktsiyasi — leaderboard, room kodi, session.</summary>
public interface ICacheService
{
    Task<string?> GetStringAsync(string key);
    Task SetStringAsync(string key, string value, TimeSpan? expiry = null);
    Task<bool> KeyExistsAsync(string key);
    Task<bool> RemoveAsync(string key);

    /// <summary>Sorted Set ga element qo'shadi/yangilaydi (leaderboard uchun).</summary>
    Task SortedSetAddAsync(string key, string member, double score);

    /// <summary>Sorted Set dan top N ni (score kamayish tartibida) qaytaradi.</summary>
    Task<IReadOnlyList<(string Member, double Score)>> SortedSetTopAsync(string key, int count);

    /// <summary>A'zoning reytingdagi o'rni (0-based, kamayish tartibida).</summary>
    Task<long?> SortedSetRankAsync(string key, string member);
}

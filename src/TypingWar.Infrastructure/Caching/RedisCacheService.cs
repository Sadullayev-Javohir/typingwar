using StackExchange.Redis;
using TypingWar.Application.Common.Interfaces;

namespace TypingWar.Infrastructure.Caching;

/// <summary>StackExchange.Redis orqali ICacheService implementatsiyasi.</summary>
public class RedisCacheService : ICacheService
{
    private readonly IConnectionMultiplexer _redis;

    public RedisCacheService(IConnectionMultiplexer redis) => _redis = redis;

    private IDatabase Db => _redis.GetDatabase();

    public async Task<string?> GetStringAsync(string key)
    {
        var value = await Db.StringGetAsync(key);
        return value.HasValue ? value.ToString() : null;
    }

    public Task SetStringAsync(string key, string value, TimeSpan? expiry = null)
        => Db.StringSetAsync(key, value, expiry);

    public Task<bool> KeyExistsAsync(string key) => Db.KeyExistsAsync(key);

    public Task<bool> RemoveAsync(string key) => Db.KeyDeleteAsync(key);

    public async Task<long> IncrementAsync(string key, TimeSpan? expiryIfFirst = null)
    {
        var value = await Db.StringIncrementAsync(key);
        // Faqat birinchi marta yaratilganda TTL beramiz (oyna siljimasin)
        if (value == 1 && expiryIfFirst.HasValue)
            await Db.KeyExpireAsync(key, expiryIfFirst);
        return value;
    }

    public Task SortedSetAddAsync(string key, string member, double score)
        => Db.SortedSetAddAsync(key, member, score);

    public async Task<IReadOnlyList<(string Member, double Score)>> SortedSetTopAsync(string key, int count)
    {
        var entries = await Db.SortedSetRangeByRankWithScoresAsync(key, 0, count - 1, Order.Descending);
        return entries.Select(e => (e.Element.ToString(), e.Score)).ToList();
    }

    public async Task<long?> SortedSetRankAsync(string key, string member)
    {
        var rank = await Db.SortedSetRankAsync(key, member, Order.Descending);
        return rank;
    }
}

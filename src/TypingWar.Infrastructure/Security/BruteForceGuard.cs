using TypingWar.Application.Common.Interfaces;

namespace TypingWar.Infrastructure.Security;

/// <summary>
/// Redis asosidagi brute-force himoyasi. Standart: 15 daqiqa oynasida 10 xato →
/// mijoz (IP) 1 soatga bloklanadi. Hisoblagich va blok kalitlari TTL bilan o'z-o'zidan o'chadi.
/// </summary>
public sealed class BruteForceGuard : IBruteForceGuard
{
    private const int MaxFailures = 10;
    private static readonly TimeSpan FailureWindow = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan BlockDuration = TimeSpan.FromHours(1);

    private readonly ICacheService _cache;

    public BruteForceGuard(ICacheService cache) => _cache = cache;

    private static string CounterKey(string action, string clientId) => $"bf:{action}:{clientId}:count";
    private static string BlockKey(string action, string clientId) => $"bf:{action}:{clientId}:blocked";

    public Task<bool> IsBlockedAsync(string action, string clientId)
        => _cache.KeyExistsAsync(BlockKey(action, clientId));

    public async Task<bool> RegisterFailureAsync(string action, string clientId)
    {
        var count = await _cache.IncrementAsync(CounterKey(action, clientId), FailureWindow);
        if (count < MaxFailures)
            return false;

        // Chegaraga yetdi → bloklash va hisoblagichni tozalash (blok TTL boshqaradi)
        await _cache.SetStringAsync(BlockKey(action, clientId), "1", BlockDuration);
        await _cache.RemoveAsync(CounterKey(action, clientId));
        return true;
    }

    public Task ResetAsync(string action, string clientId)
        => _cache.RemoveAsync(CounterKey(action, clientId));
}

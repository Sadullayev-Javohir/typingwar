using System.Collections.Concurrent;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Infrastructure.Security;
using Xunit;

namespace TypingWar.UnitTests;

public class BruteForceGuardTests
{
    private const string Action = "room-code";
    private const string Ip = "1.2.3.4";

    // 10 ta xatogacha bloklanmaydi, 10-chisida bloklanadi.
    [Fact]
    public async Task Blocks_After_Ten_Failures()
    {
        var guard = new BruteForceGuard(new FakeCache());

        for (var i = 0; i < 9; i++)
        {
            var blocked = await guard.RegisterFailureAsync(Action, Ip);
            Assert.False(blocked);
            Assert.False(await guard.IsBlockedAsync(Action, Ip));
        }

        var nowBlocked = await guard.RegisterFailureAsync(Action, Ip);
        Assert.True(nowBlocked);
        Assert.True(await guard.IsBlockedAsync(Action, Ip));
    }

    // Muvaffaqiyatli urinish (Reset) hisoblagichni nolga qaytaradi.
    [Fact]
    public async Task Reset_Clears_Failure_Counter()
    {
        var guard = new BruteForceGuard(new FakeCache());

        for (var i = 0; i < 9; i++)
            await guard.RegisterFailureAsync(Action, Ip);

        await guard.ResetAsync(Action, Ip);

        // Hisoblagich tozalandi → yana 9 ta xato bloklamaydi
        for (var i = 0; i < 9; i++)
            Assert.False(await guard.RegisterFailureAsync(Action, Ip));
        Assert.False(await guard.IsBlockedAsync(Action, Ip));
    }

    // Har bir IP alohida hisoblanadi (bir IP bloki boshqasiga ta'sir qilmaydi).
    [Fact]
    public async Task Blocks_Are_Isolated_Per_Client()
    {
        var guard = new BruteForceGuard(new FakeCache());

        for (var i = 0; i < 10; i++)
            await guard.RegisterFailureAsync(Action, "10.0.0.1");

        Assert.True(await guard.IsBlockedAsync(Action, "10.0.0.1"));
        Assert.False(await guard.IsBlockedAsync(Action, "10.0.0.2"));
    }

    /// <summary>TTL'siz, dictionary asosidagi soddalashtirilgan ICacheService (test uchun).</summary>
    private sealed class FakeCache : ICacheService
    {
        private readonly ConcurrentDictionary<string, long> _counters = new();
        private readonly ConcurrentDictionary<string, string> _strings = new();

        public Task<long> IncrementAsync(string key, TimeSpan? expiryIfFirst = null)
            => Task.FromResult(_counters.AddOrUpdate(key, 1, (_, v) => v + 1));

        public Task<string?> GetStringAsync(string key)
            => Task.FromResult(_strings.TryGetValue(key, out var v) ? v : null);

        public Task SetStringAsync(string key, string value, TimeSpan? expiry = null)
        {
            _strings[key] = value;
            return Task.CompletedTask;
        }

        public Task<bool> KeyExistsAsync(string key)
            => Task.FromResult(_strings.ContainsKey(key) || _counters.ContainsKey(key));

        public Task<bool> RemoveAsync(string key)
        {
            var a = _strings.TryRemove(key, out _);
            var b = _counters.TryRemove(key, out _);
            return Task.FromResult(a || b);
        }

        public Task SortedSetAddAsync(string key, string member, double score) => Task.CompletedTask;
        public Task<IReadOnlyList<(string Member, double Score)>> SortedSetTopAsync(string key, int count)
            => Task.FromResult((IReadOnlyList<(string, double)>)new List<(string, double)>());
        public Task<long?> SortedSetRankAsync(string key, string member) => Task.FromResult<long?>(null);
    }
}

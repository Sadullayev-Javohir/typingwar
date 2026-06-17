using TypingWar.Domain.Services;
using Xunit;

namespace TypingWar.UnitTests;

public class ContestStreakTests
{
    private static readonly DateOnly Today = new(2026, 6, 16);

    [Fact]
    public void Current_NoDates_IsZero()
        => Assert.Equal(0, ContestStreak.Current(Array.Empty<DateOnly>(), Today));

    [Fact]
    public void Current_PlayedTodayOnly_IsOne()
        => Assert.Equal(1, ContestStreak.Current(new[] { Today }, Today));

    [Fact]
    public void Current_ConsecutiveDaysEndingToday()
    {
        var dates = new[] { Today, Today.AddDays(-1), Today.AddDays(-2) };
        Assert.Equal(3, ContestStreak.Current(dates, Today));
    }

    [Fact]
    public void Current_PlayedYesterdayNotToday_StillCounts()
    {
        var dates = new[] { Today.AddDays(-1), Today.AddDays(-2) };
        Assert.Equal(2, ContestStreak.Current(dates, Today));
    }

    [Fact]
    public void Current_GapBreaksStreak()
    {
        var dates = new[] { Today, Today.AddDays(-1), Today.AddDays(-3) };
        Assert.Equal(2, ContestStreak.Current(dates, Today));
    }

    [Fact]
    public void Current_NeitherTodayNorYesterday_IsZero()
    {
        var dates = new[] { Today.AddDays(-3), Today.AddDays(-4) };
        Assert.Equal(0, ContestStreak.Current(dates, Today));
    }

    [Theory]
    [InlineData(0, null)]
    [InlineData(2, null)]
    [InlineData(3, "✨ Boshlovchi")]
    [InlineData(7, "⭐ Yulduz")]
    [InlineData(14, "💎 Olmos")]
    [InlineData(30, "🔥 Afsona")]
    public void Badge_ByMilestone(int streak, string? expected)
        => Assert.Equal(expected, ContestStreak.Badge(streak));
}

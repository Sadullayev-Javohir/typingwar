using TypingWar.Domain.Services;
using Xunit;

namespace TypingWar.UnitTests;

public class AiTypingSimulatorTests
{
    [Fact]
    public void BuildSchedule_LengthMatchesCharCount()
    {
        var s = AiTypingSimulator.BuildSchedule(60, 50, new Random(1));
        Assert.Equal(50, s.Length);
    }

    [Fact]
    public void BuildSchedule_IsStrictlyIncreasing()
    {
        var s = AiTypingSimulator.BuildSchedule(50, 100, new Random(7));
        for (int i = 1; i < s.Length; i++)
            Assert.True(s[i] > s[i - 1], $"schedule[{i}]={s[i]} <= schedule[{i - 1}]={s[i - 1]}");
    }

    [Fact]
    public void BuildSchedule_ZeroChars_Empty()
    {
        Assert.Empty(AiTypingSimulator.BuildSchedule(40, 0));
    }

    [Fact]
    public void EstimatedFinish_FasterWpm_FinishesSooner()
    {
        Assert.True(AiTypingSimulator.EstimatedFinishMs(80, 100) < AiTypingSimulator.EstimatedFinishMs(40, 100));
    }

    [Fact]
    public void BuildSchedule_RoughlyMatchesTargetPace()
    {
        // 60 WPM, 300 belgi → ~ 300/(60*5)*60000 = 60000ms ± jitter. Keng tolerantlik.
        var s = AiTypingSimulator.BuildSchedule(60, 300, new Random(42));
        double total = s[^1];
        Assert.InRange(total, 50_000, 70_000);
    }
}

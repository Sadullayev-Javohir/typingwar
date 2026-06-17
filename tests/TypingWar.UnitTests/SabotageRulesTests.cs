using TypingWar.Domain.Enums;
using TypingWar.Domain.Services;
using Xunit;

namespace TypingWar.UnitTests;

public class SabotageRulesTests
{
    [Fact]
    public void All_ContainsFiveTypes()
    {
        Assert.Equal(5, SabotageRules.All.Count);
    }

    [Theory]
    [InlineData(SabotageType.Blackout)]
    [InlineData(SabotageType.Shuffle)]
    [InlineData(SabotageType.Shake)]
    [InlineData(SabotageType.Mirror)]
    [InlineData(SabotageType.Slowdown)]
    public void DurationSeconds_AlwaysPositive(SabotageType type)
    {
        Assert.True(SabotageRules.DurationSeconds(type) > 0);
    }

    [Theory]
    [InlineData("Blackout", SabotageType.Blackout)]
    [InlineData("shuffle", SabotageType.Shuffle)]
    [InlineData("SHAKE", SabotageType.Shake)]
    [InlineData("Mirror", SabotageType.Mirror)]
    [InlineData("Slowdown", SabotageType.Slowdown)]
    public void Parse_ValidValue_ReturnsType(string value, SabotageType expected)
    {
        Assert.Equal(expected, SabotageRules.Parse(value));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("nonsense")]
    [InlineData("999")]
    public void Parse_InvalidValue_FallsBackToBlackout(string? value)
    {
        Assert.Equal(SabotageType.Blackout, SabotageRules.Parse(value));
    }
}

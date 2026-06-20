using TypingWar.Domain.Services;
using Xunit;

namespace TypingWar.UnitTests;

public class TypingCalculatorTests
{
    [Fact]
    public void Calculate_60CorrectChars_In60Seconds_Gives12Wpm()
    {
        var m = TypingCalculator.Calculate(correctChars: 60, incorrectChars: 0, elapsedSeconds: 60);

        Assert.Equal(12, m.Wpm);
        Assert.Equal(12, m.RawWpm);
        Assert.Equal(100, m.Accuracy);
    }

    [Fact]
    public void Calculate_WithErrors_RawWpmHigherThanWpm()
    {
        var m = TypingCalculator.Calculate(correctChars: 50, incorrectChars: 10, elapsedSeconds: 60);

        Assert.Equal(10, m.Wpm);                 // (50/5)/1
        Assert.Equal(12, m.RawWpm);              // (60/5)/1
        Assert.Equal(83.33, m.Accuracy);         // 50/60*100
    }

    [Fact]
    public void Calculate_ZeroElapsed_ReturnsZeros()
    {
        var m = TypingCalculator.Calculate(10, 5, 0);

        Assert.Equal(0, m.Wpm);
        Assert.Equal(0, m.RawWpm);
        Assert.Equal(0, m.Accuracy);
    }

    [Fact]
    public void Calculate_NoKeystrokes_AccuracyZero()
    {
        var m = TypingCalculator.Calculate(0, 0, 30);
        Assert.Equal(0, m.Accuracy);
    }

    [Theory]
    [InlineData(0, true)]
    [InlineData(250, true)]
    [InlineData(250.01, false)]
    [InlineData(1000, false)]
    [InlineData(-1, false)]
    public void IsPlausible_RespectsMaxWpm(double wpm, bool expected)
    {
        Assert.Equal(expected, TypingCalculator.IsPlausible(wpm));
    }

    [Theory]
    [InlineData(100, true)]
    [InlineData(50, true)]      // chegara — qabul qilinadi
    [InlineData(49.99, false)]  // chegaradan past — rad etiladi
    [InlineData(10, false)]     // tasodifiy belgilar / bitta tugma — past aniqlik
    [InlineData(0, false)]
    public void IsPlausibleAccuracy_RejectsLowAccuracy(double accuracy, bool expected)
    {
        Assert.Equal(expected, TypingCalculator.IsPlausibleAccuracy(accuracy));
    }
}

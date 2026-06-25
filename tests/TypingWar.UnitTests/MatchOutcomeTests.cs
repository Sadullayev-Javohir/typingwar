using TypingWar.Domain.Services;
using Xunit;

namespace TypingWar.UnitTests;

public class MatchOutcomeTests
{
    private const double MinAcc = 50;

    [Fact]
    public void HigherWpm_WhenBothValid_Wins()
        => Assert.Equal(2, MatchOutcome.WinnerSide(60, 95, 80, 90, MinAcc));

    [Fact]
    public void Player1_HigherWpm_WhenBothValid_Wins()
        => Assert.Equal(1, MatchOutcome.WinnerSide(90, 95, 80, 99, MinAcc));

    [Fact]
    public void ValidPlayer_BeatsHigherWpmButInvalidAccuracy()
        // P2 tezroq (120) lekin aniqligi past (30%) — aldash; P1 (70 wpm, 95%) g'olib
        => Assert.Equal(1, MatchOutcome.WinnerSide(70, 95, 120, 30, MinAcc));

    [Fact]
    public void Player2_Valid_BeatsInvalidPlayer1()
        => Assert.Equal(2, MatchOutcome.WinnerSide(120, 20, 70, 95, MinAcc));

    [Fact]
    public void BothInvalid_FallsBackToHigherWpm()
        => Assert.Equal(2, MatchOutcome.WinnerSide(40, 10, 55, 15, MinAcc));

    [Fact]
    public void EqualWpm_Player1Wins()
        => Assert.Equal(1, MatchOutcome.WinnerSide(80, 90, 80, 90, MinAcc));

    [Fact]
    public void NoShow_OpponentWins()
        // P2 umuman yozmagan (0 wpm) — P1 g'olib
        => Assert.Equal(1, MatchOutcome.WinnerSide(50, 95, 0, 0, MinAcc));
}

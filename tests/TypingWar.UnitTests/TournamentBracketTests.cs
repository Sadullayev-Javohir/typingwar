using TypingWar.Domain.Services;
using Xunit;

namespace TypingWar.UnitTests;

public class TournamentBracketTests
{
    [Theory]
    [InlineData(2, true)]
    [InlineData(4, true)]
    [InlineData(8, true)]
    [InlineData(16, true)]
    [InlineData(32, true)]
    [InlineData(6, false)]
    [InlineData(0, false)]
    [InlineData(64, false)]
    public void IsValidCapacity_Works(int capacity, bool expected)
        => Assert.Equal(expected, TournamentBracket.IsValidCapacity(capacity));

    [Theory]
    [InlineData(4, 2)]
    [InlineData(8, 3)]
    [InlineData(16, 4)]
    [InlineData(32, 5)]
    public void Rounds_IsLog2(int capacity, int expected)
        => Assert.Equal(expected, TournamentBracket.Rounds(capacity));

    [Theory]
    [InlineData(1, "Final")]
    [InlineData(2, "Yarim final")]
    [InlineData(4, "Chorak final")]
    [InlineData(8, "1/8 final")]
    [InlineData(16, "1/16 final")]
    public void RoundName_ByMatchesInRound(int matches, string expected)
        => Assert.Equal(expected, TournamentBracket.RoundName(matches));

    [Fact]
    public void Build_TotalMatchesIsCapacityMinusOne()
    {
        var players = Enumerable.Range(0, 8).Select(_ => Guid.NewGuid()).ToList();
        var slots = TournamentBracket.Build(8, players);
        Assert.Equal(7, slots.Count);
    }

    [Fact]
    public void Build_FirstRoundFillsPlayersInOrder()
    {
        var players = Enumerable.Range(0, 4).Select(_ => Guid.NewGuid()).ToList();
        var slots = TournamentBracket.Build(4, players);
        var first = slots.Where(s => s.Round == 1).OrderBy(s => s.Index).ToList();

        Assert.Equal(players[0], first[0].Player1Id);
        Assert.Equal(players[1], first[0].Player2Id);
        Assert.Equal(players[2], first[1].Player1Id);
        Assert.Equal(players[3], first[1].Player2Id);
    }

    [Fact]
    public void Build_FewerPlayers_LeavesByes()
    {
        var players = Enumerable.Range(0, 3).Select(_ => Guid.NewGuid()).ToList();
        var slots = TournamentBracket.Build(4, players);
        var second = slots.First(s => s.Round == 1 && s.Index == 1);
        Assert.Equal(players[2], second.Player1Id);
        Assert.Null(second.Player2Id); // bye
    }

    [Fact]
    public void Parent_MapsChildToParentSlot()
    {
        // round 1, slot 0 -> round 2 slot 0 as P1; slot 1 -> round 2 slot 0 as P2
        Assert.Equal((2, 0, true), TournamentBracket.Parent(1, 0));
        Assert.Equal((2, 0, false), TournamentBracket.Parent(1, 1));
        Assert.Equal((2, 1, true), TournamentBracket.Parent(1, 2));
    }

    [Fact]
    public void Build_InvalidCapacity_Throws()
        => Assert.Throws<ArgumentException>(() => TournamentBracket.Build(6, new List<Guid>()));
}

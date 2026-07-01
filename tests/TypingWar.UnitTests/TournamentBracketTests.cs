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
    [InlineData(64, true)]
    [InlineData(6, false)]
    [InlineData(0, false)]
    [InlineData(128, false)]
    public void IsValidCapacity_Works(int capacity, bool expected)
        => Assert.Equal(expected, TournamentBracket.IsValidCapacity(capacity));

    [Theory]
    [InlineData(4, 2)]
    [InlineData(8, 3)]
    [InlineData(16, 4)]
    [InlineData(32, 5)]
    [InlineData(64, 6)]
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
    public void Build_FirstRoundUsesStandardSeeding()
    {
        // Standart seeding (4lik): slotlar [1,4] va [2,3] — seed 1 va 2 qarama-qarshi yarmida.
        var players = Enumerable.Range(0, 4).Select(_ => Guid.NewGuid()).ToList();
        var slots = TournamentBracket.Build(4, players);
        var first = slots.Where(s => s.Round == 1).OrderBy(s => s.Index).ToList();

        Assert.Equal(players[0], first[0].Player1Id); // seed 1
        Assert.Equal(players[3], first[0].Player2Id); // seed 4
        Assert.Equal(players[1], first[1].Player1Id); // seed 2
        Assert.Equal(players[2], first[1].Player2Id); // seed 3
    }

    [Fact]
    public void Build_FewerPlayers_TopSeedGetsBye()
    {
        // 3 o'yinchi, 4lik bracket: eng kuchli seed (1) bye oladi, seed 2 va 3 o'zaro o'ynaydi.
        var players = Enumerable.Range(0, 3).Select(_ => Guid.NewGuid()).ToList();
        var slots = TournamentBracket.Build(4, players);
        var m0 = slots.First(s => s.Round == 1 && s.Index == 0);
        var m1 = slots.First(s => s.Round == 1 && s.Index == 1);

        Assert.Equal(players[0], m0.Player1Id); // seed 1
        Assert.Null(m0.Player2Id);              // bye
        Assert.Equal(players[1], m1.Player1Id); // seed 2
        Assert.Equal(players[2], m1.Player2Id); // seed 3 — 2 va 3 o'zaro, g'olib finalda seed 1 bilan
    }

    [Theory]
    [InlineData(2, 2)]
    [InlineData(3, 4)]
    [InlineData(4, 4)]
    [InlineData(5, 8)]
    [InlineData(8, 8)]
    [InlineData(9, 16)]
    [InlineData(16, 16)]
    [InlineData(31, 32)]
    [InlineData(33, 64)]
    [InlineData(64, 64)]
    [InlineData(1, 2)]
    public void EffectiveCapacity_RoundsUpToPowerOfTwo(int playerCount, int expected)
        => Assert.Equal(expected, TournamentBracket.EffectiveCapacity(playerCount));

    [Fact]
    public void Build_FivePlayers_ByesSplitAcrossBothHalves()
    {
        // 5 o'yinchi, 8lik bracket: byelar o'ng va chap yarmiga taqsimlanadi (bir tomonga to'planmaydi).
        var players = Enumerable.Range(0, 5).Select(_ => Guid.NewGuid()).ToList();
        var slots = TournamentBracket.Build(8, players).Where(s => s.Round == 1).OrderBy(s => s.Index).ToList();

        bool HasBye(TournamentBracket.Slot s) => s.Player1Id is null || s.Player2Id is null;
        // Chap yarim = slot 0,1 ; o'ng yarim = slot 2,3
        Assert.True(HasBye(slots[0]) || HasBye(slots[1]), "Chap yarmida kamida bitta bye bo'lishi kerak.");
        Assert.True(HasBye(slots[2]) || HasBye(slots[3]), "O'ng yarmida kamida bitta bye bo'lishi kerak.");
    }

    [Theory]
    [InlineData(2)]
    [InlineData(4)]
    [InlineData(8)]
    [InlineData(16)]
    [InlineData(32)]
    [InlineData(64)]
    public void SeedOrder_IsPermutationOfAllSeeds(int capacity)
    {
        var order = TournamentBracket.SeedOrder(capacity);
        Assert.Equal(capacity, order.Length);
        Assert.Equal(Enumerable.Range(1, capacity).OrderBy(x => x), order.OrderBy(x => x));
        // Seed 1 va seed 2 har doim qarama-qarshi yarmida (faqat finalda uchrashadi)
        if (capacity >= 4)
        {
            int i1 = Array.IndexOf(order, 1), i2 = Array.IndexOf(order, 2);
            Assert.True((i1 < capacity / 2) != (i2 < capacity / 2));
        }
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

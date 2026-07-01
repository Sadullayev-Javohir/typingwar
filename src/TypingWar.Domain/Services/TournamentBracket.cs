namespace TypingWar.Domain.Services;

/// <summary>
/// Single-elimination bracket qurish (sof, holatsiz). Sig'im 2 darajasi bo'lishi shart (4/8/16/32/64).
/// Birinchi round o'yinchilar bilan to'ldiriladi, qolgan roundlar bo'sh yaratiladi (live to'ladi).
/// </summary>
public static class TournamentBracket
{
    public const int MinCapacity = 2;
    public const int MaxCapacity = 64;

    /// <summary>Sig'im to'g'rimi — 2 ning darajasi va [2..64] oralig'ida.</summary>
    public static bool IsValidCapacity(int capacity) =>
        capacity is >= MinCapacity and <= MaxCapacity && (capacity & (capacity - 1)) == 0;

    /// <summary>
    /// Ro'yxatdan o'tgan o'yinchilar soniga MOS keladigan eng kichik bracket sig'imi (2 darajasi).
    /// 3→4, 5→8, 9→16 ... Host belgilagan sig'imdan qat'i nazar, haqiqiy ishtirokchilarga moslanadi.
    /// Yetishmagan joylar "bye" bo'lib, o'ng/chap yarmiga teng taqsimlanadi (SeedOrder orqali).
    /// </summary>
    public static int EffectiveCapacity(int playerCount)
    {
        if (playerCount <= MinCapacity) return MinCapacity;
        int cap = MinCapacity;
        while (cap < playerCount) cap <<= 1;
        return Math.Min(cap, MaxCapacity);
    }

    /// <summary>
    /// Standart playoff seeding tartibi: slot pozitsiyasi → seed raqami (1-based).
    /// Eng kuchli seedlar (1, 2) bracketning qarama-qarshi yarmiga tushadi va faqat finalda
    /// uchrashadi; yetishmagan seedlar (bye) o'ng/chap tomonlarga teng tarqaladi.
    /// </summary>
    public static int[] SeedOrder(int capacity)
    {
        if (!IsValidCapacity(capacity))
            throw new ArgumentException($"Sig'im 2 darajasi bo'lishi kerak (2..64), berilgan: {capacity}.");
        var seeds = new List<int> { 1 };
        while (seeds.Count < capacity)
        {
            int mirror = seeds.Count * 2 + 1;
            var next = new List<int>(seeds.Count * 2);
            foreach (var s in seeds) { next.Add(s); next.Add(mirror - s); }
            seeds = next;
        }
        return seeds.ToArray();
    }

    /// <summary>Roundlar soni (log2).</summary>
    public static int Rounds(int capacity) => (int)Math.Log2(capacity);

    /// <summary>Rounddagi o'yinlar soniga qarab nom.</summary>
    public static string RoundName(int matchesInRound) => matchesInRound switch
    {
        1 => "Final",
        2 => "Yarim final",
        4 => "Chorak final",
        _ => $"1/{matchesInRound} final"
    };

    /// <summary>Bracket daraxtidagi bitta uya.</summary>
    public readonly record struct Slot(int Round, int Index, Guid? Player1Id, Guid? Player2Id);

    /// <summary>
    /// Butun bracketni quradi. Round 1 — o'yinchilar standart seeding tartibida joylanadi
    /// (kuchli seedlar qarama-qarshi yarmiga, byelar teng taqsimlanadi), keyingi roundlar bo'sh.
    /// <paramref name="players"/> seed bo'yicha tartiblangan bo'lishi kerak (index 0 = seed 1).
    /// Jami o'yinlar = capacity - 1.
    /// </summary>
    public static IReadOnlyList<Slot> Build(int capacity, IReadOnlyList<Guid> players)
    {
        if (!IsValidCapacity(capacity))
            throw new ArgumentException($"Sig'im 2 darajasi bo'lishi kerak (4/8/16/32/64), berilgan: {capacity}.");

        var slots = new List<Slot>();
        int rounds = Rounds(capacity);
        var order = SeedOrder(capacity);
        Guid? BySeed(int seed) => seed - 1 < players.Count ? players[seed - 1] : (Guid?)null;

        int firstRoundMatches = capacity / 2;
        for (int i = 0; i < firstRoundMatches; i++)
        {
            Guid? p1 = BySeed(order[2 * i]);
            Guid? p2 = BySeed(order[2 * i + 1]);
            slots.Add(new Slot(1, i, p1, p2));
        }

        for (int r = 2; r <= rounds; r++)
        {
            int matches = capacity / (1 << r);
            for (int i = 0; i < matches; i++)
                slots.Add(new Slot(r, i, null, null));
        }

        return slots;
    }

    /// <summary>(round, index) o'yini g'olibi qaysi keyingi o'yinning qaysi slotiga o'tadi.</summary>
    public static (int Round, int Index, bool AsPlayer1) Parent(int round, int index)
        => (round + 1, index / 2, index % 2 == 0);
}

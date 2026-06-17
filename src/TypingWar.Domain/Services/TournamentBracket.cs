namespace TypingWar.Domain.Services;

/// <summary>
/// Single-elimination bracket qurish (sof, holatsiz). Sig'im 2 darajasi bo'lishi shart (4/8/16/32).
/// Birinchi round o'yinchilar bilan to'ldiriladi, qolgan roundlar bo'sh yaratiladi (live to'ladi).
/// </summary>
public static class TournamentBracket
{
    public const int MinCapacity = 2;
    public const int MaxCapacity = 32;

    /// <summary>Sig'im to'g'rimi — 2 ning darajasi va [2..32] oralig'ida.</summary>
    public static bool IsValidCapacity(int capacity) =>
        capacity is >= MinCapacity and <= MaxCapacity && (capacity & (capacity - 1)) == 0;

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
    /// Butun bracketni quradi. Round 1 — o'yinchilar (yetishmasa null = bye),
    /// keyingi roundlar bo'sh. Jami o'yinlar = capacity - 1.
    /// </summary>
    public static IReadOnlyList<Slot> Build(int capacity, IReadOnlyList<Guid> players)
    {
        if (!IsValidCapacity(capacity))
            throw new ArgumentException($"Sig'im 2 darajasi bo'lishi kerak (4/8/16/32), berilgan: {capacity}.");

        var slots = new List<Slot>();
        int rounds = Rounds(capacity);

        int firstRoundMatches = capacity / 2;
        for (int i = 0; i < firstRoundMatches; i++)
        {
            Guid? p1 = 2 * i < players.Count ? players[2 * i] : null;
            Guid? p2 = 2 * i + 1 < players.Count ? players[2 * i + 1] : null;
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

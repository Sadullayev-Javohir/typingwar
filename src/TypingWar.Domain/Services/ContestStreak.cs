namespace TypingWar.Domain.Services;

/// <summary>Kunlik musobaqa streak (ketma-ket kunlar) va badge hisoblash (sof).</summary>
public static class ContestStreak
{
    /// <summary>
    /// Ishtirok etilgan sanalar bo'yicha joriy streak — bugun (yoki kecha) bilan tugaydigan
    /// ketma-ket kunlar soni. Bugun ham, kecha ham yo'q bo'lsa → 0.
    /// </summary>
    public static int Current(IEnumerable<DateOnly> playedDates, DateOnly today)
    {
        var set = playedDates as HashSet<DateOnly> ?? playedDates.ToHashSet();
        if (set.Count == 0) return 0;

        var day = today;
        if (!set.Contains(day)) day = today.AddDays(-1); // kechagacha ham streak hisoblanadi
        if (!set.Contains(day)) return 0;

        int streak = 0;
        while (set.Contains(day))
        {
            streak++;
            day = day.AddDays(-1);
        }
        return streak;
    }

    /// <summary>Streak bo'yicha badge (yetmasa null).</summary>
    public static string? Badge(int streak) => streak switch
    {
        >= 30 => "🔥 Afsona",
        >= 14 => "💎 Olmos",
        >= 7 => "⭐ Yulduz",
        >= 3 => "✨ Boshlovchi",
        _ => null
    };
}

using TypingWar.Domain.Enums;

namespace TypingWar.Domain.Constants;

/// <summary>
/// Mashq rejimi kaliti (ModeKey) — shaxsiy rekord (PersonalBest) qaysi rejimga tegishli ekanini
/// aniqlaydi. Avval PB faqat TimeMode bo'yicha saqlanardi (so'z rejimidagi natijalar eng yaqin
/// vaqt rejimiga "yopishtirilardi"). Endi vaqt rejimlari va so'z sonlari ALOHIDA rekord sifatida
/// saqlanadi. Format: "time:{soniya}" yoki "words:{son}" (iqtibos — "quote").
/// </summary>
public static class PracticeModes
{
    /// <summary>Vaqt rejimlari (soniya) — /Profile da ko'rsatiladigan rekordlar.</summary>
    public static readonly int[] TimeSeconds = { 15, 30, 60, 120 };

    /// <summary>So'z sonlari — /Profile da ko'rsatiladigan rekordlar.</summary>
    public static readonly int[] WordCounts = { 10, 30, 50, 100 };

    public const string QuoteKey = "quote";

    public static string Time(int seconds) => $"time:{seconds}";
    public static string Words(int count) => $"words:{count}";

    /// <summary>Kanonik tartibdagi barcha ko'rsatiladigan rekord kalitlari (vaqt → so'z).</summary>
    public static IEnumerable<string> DisplayOrder()
    {
        foreach (var s in TimeSeconds) yield return Time(s);
        foreach (var w in WordCounts) yield return Words(w);
    }

    /// <summary>Vaqtga asoslangan rejimmi (leaderboard/hudud statistikasi faqat shularni hisoblaydi).</summary>
    public static bool IsTimed(string? modeKey) => modeKey is not null && modeKey.StartsWith("time:");

    /// <summary>ModeKey haqiqiy (ruxsat etilgan) formatdami — server validatsiyasi.</summary>
    public static bool IsValid(string? modeKey)
    {
        if (string.IsNullOrWhiteSpace(modeKey)) return false;
        if (modeKey == QuoteKey) return true;
        if (modeKey.StartsWith("time:") && int.TryParse(modeKey[5..], out var s) && Array.IndexOf(TimeSeconds, s) >= 0)
            return true;
        if (modeKey.StartsWith("words:") && int.TryParse(modeKey[6..], out var w) && Array.IndexOf(WordCounts, w) >= 0)
            return true;
        return false;
    }

    /// <summary>Eski yozuvlar uchun: TimeMode dan vaqt-rejim kalitini quradi.</summary>
    public static string FromTimeMode(TimeMode mode) => Time((int)mode);
}

using TypingWar.Domain.Enums;

namespace TypingWar.Domain.Services;

/// <summary>
/// Sabotaj qoidalari (sof, holatsiz) — 3+ o'yinchili poygada raqibga qarshi effekt.
/// Effekt faqat vizual (klient qo'llaydi), server hisoblamaydi.
/// </summary>
public static class SabotageRules
{
    /// <summary>Barcha mavjud sabotaj turlari.</summary>
    public static IReadOnlyList<SabotageType> All { get; } = Enum.GetValues<SabotageType>();

    /// <summary>Har bir effekt necha soniya davom etadi.</summary>
    public static int DurationSeconds(SabotageType type) => type switch
    {
        SabotageType.Blackout => 3,   // ekran qorayadi
        SabotageType.Shuffle => 5,    // harflar chalkashadi
        SabotageType.Shake => 4,      // matn silkinadi
        SabotageType.Mirror => 5,     // matn ko'zguda
        SabotageType.Slowdown => 4,   // matn xiralashadi (sekinlashtiradi)
        _ => 4
    };

    /// <summary>Matndan turini xavfsiz o'qiydi — noto'g'ri qiymat → Blackout.</summary>
    public static SabotageType Parse(string? value) =>
        Enum.TryParse<SabotageType>(value, ignoreCase: true, out var t) && Enum.IsDefined(t)
            ? t : SabotageType.Blackout;
}

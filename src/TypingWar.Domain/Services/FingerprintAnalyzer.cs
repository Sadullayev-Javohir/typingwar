namespace TypingWar.Domain.Services;

/// <summary>
/// "Yozish Pasporti" tahlili (sof, holatsiz). Tugma/bigram timinglarini birlashtiradi
/// (eksponensial o'rtacha) va eng sekinlarini ajratadi.
/// </summary>
public static class FingerprintAnalyzer
{
    /// <summary>Yangi o'lchovning og'irligi (0..1). Eski profil sekin yangilanadi.</summary>
    public const double DefaultAlpha = 0.3;

    /// <summary>
    /// Mavjud va yangi timing xaritalarini birlashtiradi. Ikkalasida bor kalit uchun
    /// eksponensial o'rtacha; faqat bittasida bor kalit o'sha qiymat bilan qoladi.
    /// </summary>
    public static Dictionary<string, double> Merge(
        IReadOnlyDictionary<string, double> existing,
        IReadOnlyDictionary<string, double> incoming,
        double alpha = DefaultAlpha)
    {
        alpha = Math.Clamp(alpha, 0, 1);
        var result = new Dictionary<string, double>(existing);

        foreach (var (key, value) in incoming)
        {
            result[key] = result.TryGetValue(key, out var old)
                ? Math.Round(alpha * value + (1 - alpha) * old, 2)
                : Math.Round(value, 2);
        }
        return result;
    }

    /// <summary>Eng sekin <paramref name="count"/> kalit (timing kattaroq = sekinroq).</summary>
    public static IReadOnlyList<KeyValuePair<string, double>> Slowest(
        IReadOnlyDictionary<string, double> timings, int count)
        => timings
            .OrderByDescending(kv => kv.Value)
            .Take(Math.Max(0, count))
            .ToList();
}

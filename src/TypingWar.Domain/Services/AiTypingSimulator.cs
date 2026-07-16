using TypingWar.Domain.Constants;

namespace TypingWar.Domain.Services;

/// <summary>
/// AI raqibning belgi-belgi yozish jadvalini quradi:
/// har belgi (60000/wpm/5)ms = 12000/wpm ms, ±15ms jitter, ±3 WPM og'ish.
/// Natija — boshlanishdan kumulyativ ms (har belgi qachon "yoziladi").
/// </summary>
public static class AiTypingSimulator
{
    private const int JitterMs = 15;
    private const int WpmDeviation = 3;
    private const int MinIntervalMs = 10;

    public static int[] BuildSchedule(int targetWpm, int charCount, Random? rng = null)
    {
        rng ??= Random.Shared;
        targetWpm = Math.Max(5, targetWpm);
        charCount = Math.Max(0, charCount);

        var schedule = new int[charCount];
        double cumulative = 0;

        for (int i = 0; i < charCount; i++)
        {
            // ±3 WPM og'ish (har belgida biroz o'zgaradi)
            double effectiveWpm = Math.Max(5, targetWpm + rng.Next(-WpmDeviation, WpmDeviation + 1));
            // 1 so'z = 5 belgi → belgi uchun ms
            double perChar = 60_000.0 / (effectiveWpm * GameConstants.CharsPerWord);
            // ±15ms jitter
            double interval = Math.Max(MinIntervalMs, perChar + rng.Next(-JitterMs, JitterMs + 1));
            cumulative += interval;
            schedule[i] = (int)Math.Round(cumulative);
        }

        return schedule;
    }

    /// <summary>Berilgan WPM da matnni yozib tugatish uchun taxminiy vaqt (ms).</summary>
    public static double EstimatedFinishMs(int targetWpm, int charCount)
        => charCount * (60_000.0 / (Math.Max(5, targetWpm) * GameConstants.CharsPerWord));
}

using TypingWar.Domain.Constants;

namespace TypingWar.Domain.Services;

/// <summary>Bitta typing testi hisoblangan ko'rsatkichlari.</summary>
public readonly record struct TypingMetrics(double Wpm, double RawWpm, double Accuracy);

/// <summary>
/// WPM, Raw WPM va aniqlikni hisoblaydi (CLAUDE.md §8 formulalari).
/// 5 harf = 1 so'z. Backspace xatoni to'g'irlaydi, lekin Raw WPM ga ta'sir qilmaydi.
/// </summary>
public static class TypingCalculator
{
    /// <summary>
    /// <paramref name="correctChars"/> — to'g'ri yozilgan harflar soni.
    /// <paramref name="incorrectChars"/> — xato yozilgan harf bosishlari (to'g'irlangan bo'lsa ham hisobga olinadi).
    /// Backspace bosishlari bu yerga kirmaydi.
    /// </summary>
    public static TypingMetrics Calculate(int correctChars, int incorrectChars, double elapsedSeconds)
    {
        if (correctChars < 0 || incorrectChars < 0)
            throw new ArgumentOutOfRangeException(nameof(correctChars), "Harf soni manfiy bo'lishi mumkin emas.");
        if (elapsedSeconds <= 0)
            return new TypingMetrics(0, 0, 0);

        double minutes = elapsedSeconds / 60.0;
        int rawKeystrokes = correctChars + incorrectChars;

        double wpm = (correctChars / (double)GameConstants.CharsPerWord) / minutes;
        double rawWpm = (rawKeystrokes / (double)GameConstants.CharsPerWord) / minutes;
        double accuracy = rawKeystrokes == 0 ? 0 : correctChars / (double)rawKeystrokes * 100.0;

        return new TypingMetrics(
            Math.Round(wpm, 2),
            Math.Round(rawWpm, 2),
            Math.Round(accuracy, 2));
    }

    /// <summary>WPM aldash himoyasi — bundan yuqori natija haqiqiy emas.</summary>
    public static bool IsPlausible(double wpm) => wpm is >= 0 and <= GameConstants.MaxValidWpm;

    /// <summary>
    /// Aniqlik aldash himoyasi — bundan past natija haqiqiy emas.
    /// Bitta tugmani bosib turish yoki turli xil tasodifiy belgilarni yozish past aniqlik beradi:
    /// to'g'ri belgilar soni kam bo'lgani uchun WPM ham past chiqadi va poyga "yutib olinmaydi".
    /// </summary>
    public static bool IsPlausibleAccuracy(double accuracy) => accuracy >= GameConstants.MinValidAccuracy;
}

namespace TypingWar.Domain.Services;

/// <summary>
/// O'yin g'olibini ballardan aniqlash (sof, holatsiz). Adolat qoidasi:
/// aniqlik darvozasidan (minAccuracy) o'tgan o'yinchi ustun; ikkalasi o'tsa (yoki ikkalasi
/// o'tmasa) — WPM yuqori bo'lgan g'olib; teng bo'lsa — 1-o'yinchi.
/// </summary>
public static class MatchOutcome
{
    /// <summary>Qaysi tomon g'olib: 1 (Player1) yoki 2 (Player2).</summary>
    public static int WinnerSide(
        double p1Wpm, double p1Accuracy,
        double p2Wpm, double p2Accuracy,
        double minAccuracy)
    {
        bool p1Valid = p1Accuracy >= minAccuracy && p1Wpm > 0;
        bool p2Valid = p2Accuracy >= minAccuracy && p2Wpm > 0;

        if (p1Valid && !p2Valid) return 1;
        if (p2Valid && !p1Valid) return 2;
        return p2Wpm > p1Wpm ? 2 : 1;
    }
}

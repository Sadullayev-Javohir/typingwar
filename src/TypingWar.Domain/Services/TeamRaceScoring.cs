using TypingWar.Domain.Enums;

namespace TypingWar.Domain.Services;

/// <summary>Jamoaviy musobaqa hisoblash — a'zolar WPM lari qo'shiladi, jamoalar solishtiriladi.</summary>
public static class TeamRaceScoring
{
    /// <summary>Yutgan jamoa (teng bo'lsa null).</summary>
    public static TeamSide? Winner(double teamAScore, double teamBScore)
    {
        if (teamAScore > teamBScore) return TeamSide.A;
        if (teamBScore > teamAScore) return TeamSide.B;
        return null;
    }
}

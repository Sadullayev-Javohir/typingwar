using TypingWar.Domain.Enums;

namespace TypingWar.Domain.Entities;

/// <summary>
/// Foydalanuvchining mashq rejimi bo'yicha shaxsiy rekordi (PK: UserId + ModeKey).
/// ModeKey — "time:30" / "words:50" / "quote" (qarang: PracticeModes). TimeMode ustuni
/// vaqt rejimlari uchun saqlanadi (leaderboard/hudud statistikasi shu bo'yicha hisoblaydi).
/// </summary>
public class PersonalBest
{
    public Guid UserId { get; set; }
    /// <summary>Rejim kaliti — "time:{soniya}" / "words:{son}" / "quote".</summary>
    public string ModeKey { get; set; } = string.Empty;
    public TimeMode TimeMode { get; set; }
    public double BestWpm { get; set; }
    public double Accuracy { get; set; }
    public DateTime AchievedAt { get; set; } = DateTime.UtcNow;
}

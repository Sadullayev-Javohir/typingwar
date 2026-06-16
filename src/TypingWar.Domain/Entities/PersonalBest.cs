using TypingWar.Domain.Enums;

namespace TypingWar.Domain.Entities;

/// <summary>Foydalanuvchining vaqt rejimi bo'yicha shaxsiy rekordi (PK: UserId + TimeMode).</summary>
public class PersonalBest
{
    public Guid UserId { get; set; }
    public TimeMode TimeMode { get; set; }
    public double BestWpm { get; set; }
    public double Accuracy { get; set; }
    public DateTime AchievedAt { get; set; } = DateTime.UtcNow;
}

namespace TypingWar.Domain.Common;

/// <summary>Barcha entitylar uchun umumiy asos — Guid Id va yaratilgan vaqt.</summary>
public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

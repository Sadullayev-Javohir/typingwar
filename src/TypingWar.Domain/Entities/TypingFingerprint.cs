namespace TypingWar.Domain.Entities;

/// <summary>Foydalanuvchining "Yozish Pasporti" — keystroke timing statistikasi.</summary>
public class TypingFingerprint
{
    public Guid UserId { get; set; }
    /// <summary>Bigram statistikasi (JSON).</summary>
    public string BigramStats { get; set; } = "{}";
    /// <summary>Sekin tugmalar (JSON).</summary>
    public string SlowKeys { get; set; } = "{}";
    public double AvgWpm { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

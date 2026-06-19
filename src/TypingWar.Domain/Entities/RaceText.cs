using TypingWar.Domain.Common;
using TypingWar.Domain.Enums;

namespace TypingWar.Domain.Entities;

/// <summary>Typing testi uchun matn.</summary>
public class RaceText : BaseEntity
{
    public string Content { get; set; } = string.Empty;
    /// <summary>Iqtibos manbasi (kitob, muallif yoki film). Iqtibos rejimida natijada ko'rsatiladi.</summary>
    public string? Source { get; set; }
    public Language Language { get; set; } = Language.Uzbek;
    public int WordCount { get; set; }
    public Difficulty Difficulty { get; set; } = Difficulty.Normal;
    public TextMode Category { get; set; } = TextMode.Words;
    public bool IsActive { get; set; } = true;
}

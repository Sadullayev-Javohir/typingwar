using TypingWar.Domain.Common;
using TypingWar.Domain.Enums;

namespace TypingWar.Domain.Entities;

/// <summary>Typing testi uchun matn.</summary>
public class RaceText : BaseEntity
{
    public string Content { get; set; } = string.Empty;
    public Language Language { get; set; } = Language.Uzbek;
    public int WordCount { get; set; }
    public Difficulty Difficulty { get; set; } = Difficulty.Normal;
    public TextMode Category { get; set; } = TextMode.Words;
    public bool IsActive { get; set; } = true;
}

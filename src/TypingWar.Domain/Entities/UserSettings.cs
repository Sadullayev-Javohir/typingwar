using TypingWar.Domain.Enums;

namespace TypingWar.Domain.Entities;

/// <summary>Foydalanuvchi typing sozlamalari (15 ta). PK: UserId.</summary>
public class UserSettings
{
    public Guid UserId { get; set; }

    // Test rejimi
    public TextMode TextMode { get; set; } = TextMode.Words;
    public int WordCount { get; set; } = 25;            // 10 / 25 / 50 / 100
    public bool TimedMode { get; set; } = false;
    public int TimeLimitSeconds { get; set; } = 30;     // 10 / 15 / 30 / 60 / 120
    public Difficulty Difficulty { get; set; } = Difficulty.Normal;
    public Language Language { get; set; } = Language.Uzbek;

    // Ko'rinish
    public Theme Theme { get; set; } = Theme.Dark;
    public string FontFamily { get; set; } = "JetBrains Mono";
    public int FontSize { get; set; } = 18;             // 14–24 px
    public CaretStyle CaretStyle { get; set; } = CaretStyle.Line;
    public bool SmoothCaret { get; set; } = true;

    // Xulq-atvor
    public bool ShowLiveWpm { get; set; } = true;
    public bool BlindMode { get; set; } = false;
    public bool StopOnError { get; set; } = false;
    public SoundOnClick SoundOnClick { get; set; } = SoundOnClick.Off;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

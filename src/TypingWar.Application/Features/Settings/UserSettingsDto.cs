using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Settings;

/// <summary>Foydalanuvchi sozlamalari (20 ta) — DB va LocalStorage o'rtasida sinxronlash uchun.</summary>
public record UserSettingsDto
{
    public TextMode TextMode { get; init; } = TextMode.Words;
    public int WordCount { get; init; } = 25;
    public bool TimedMode { get; init; }
    public int TimeLimitSeconds { get; init; } = 30;
    public Difficulty Difficulty { get; init; } = Difficulty.Normal;
    public Language Language { get; init; } = Language.Uzbek;

    public Theme Theme { get; init; } = Theme.Monokai;
    public string FontFamily { get; init; } = "JetBrains Mono";
    public int FontSize { get; init; } = 18;
    public CaretStyle CaretStyle { get; init; } = CaretStyle.Line;
    public bool SmoothCaret { get; init; } = true;
    public string Background { get; init; } = "nextjs";

    public bool ShowLiveWpm { get; init; } = true;
    public bool ShowLiveAcc { get; init; } = true;
    public bool ShowLiveTimer { get; init; } = true;
    public bool ShowStatsPanel { get; init; } = true;
    public bool ShowCheetah { get; init; } = true;
    public bool ShowKeyboard { get; init; } = true;
    public bool BlindMode { get; init; }
    public bool StopOnError { get; init; }
    public SoundOnClick SoundOnClick { get; init; } = SoundOnClick.Off;
}

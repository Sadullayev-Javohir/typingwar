using TypingWar.Domain.Enums;

namespace TypingWar.Application.Common.Interfaces;

/// <summary>Typing testi uchun matn so'rovi.</summary>
public record PracticeTextRequest(TextMode Mode, Language Language, Difficulty Difficulty, int WordCount);

/// <summary>Tayyorlangan matn (generatsiya qilingan yoki bazadan olingan). Source — iqtibos manbasi.</summary>
public record PracticeText(Guid? TextId, string Content, int WordCount, string? Source = null);

/// <summary>Solo practice uchun matn yetkazib beradi (words/numbers/code — generatsiya, sentences — bazadan).</summary>
public interface ITextProvider
{
    Task<PracticeText> GetAsync(PracticeTextRequest request, CancellationToken ct = default);
}

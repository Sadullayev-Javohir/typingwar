using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Practice;

/// <summary>Frontend ga yuboriladigan typing matni.</summary>
public record PracticeTextDto(Guid? TextId, string Content, int WordCount, Language Language, TextMode Mode, Difficulty Difficulty);

/// <summary>Saqlangan natija javobi.</summary>
public record RaceResultDto(Guid Id, double Wpm, double RawWpm, double Accuracy, TimeMode TimeMode, bool IsNewPersonalBest, DateTime PlayedAt);

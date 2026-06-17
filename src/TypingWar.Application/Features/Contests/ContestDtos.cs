using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Contests;

/// <summary>Kunlik musobaqa asosiy ma'lumoti.</summary>
public record DailyContestInfoDto(
    Guid Id, DateOnly Date, string Text, Guid TextId,
    ContestStatus Status, int TotalParticipants, string? WinnerName);

/// <summary>Musobaqa natijalar jadvalidagi qatori.</summary>
public record ContestEntryDto(int Place, string Username, double Wpm, double Accuracy);

/// <summary>Joriy foydalanuvchining bugungi musobaqadagi holati.</summary>
public record MyContestDto(bool Played, double? Wpm, int? Rank, int Streak, string? Badge);

/// <summary>Bugungi musobaqa to'liq ko'rinishi (sahifa uchun).</summary>
public record TodayContestDto(
    DailyContestInfoDto Contest,
    IReadOnlyList<ContestEntryDto> Top,
    MyContestDto Me);

/// <summary>Natija topshirilgandan keyingi javob.</summary>
public record ContestSubmitResultDto(
    double Wpm, double RawWpm, double Accuracy, int Rank, int Streak, string? Badge, bool IsWinner);

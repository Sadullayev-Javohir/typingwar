using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Leaderboard;

/// <summary>Leaderboard qatori.</summary>
public record LeaderboardEntryDto(
    long Rank,
    Guid UserId,
    string Username,
    double Wpm,
    double Accuracy,
    string? RegionCode,
    string? AvatarUrl,
    bool IsCurrentUser);

/// <summary>Bitta vaqt rejimi uchun leaderboard (top 50 + joriy foydalanuvchi).</summary>
public record LeaderboardDto(
    TimeMode TimeMode,
    IReadOnlyList<LeaderboardEntryDto> Top,
    LeaderboardEntryDto? CurrentUser,
    bool CurrentUserInTop);

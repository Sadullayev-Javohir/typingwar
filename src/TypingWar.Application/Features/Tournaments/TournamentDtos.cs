using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Tournaments;

/// <summary>Turnir asosiy ma'lumoti (ro'yxat + sarlavha uchun).</summary>
public record TournamentInfoDto(
    Guid Id, string Name, TournamentStatus Status, DateTime StartAt,
    int Capacity, int PlayerCount, string? Champion);

/// <summary>Bracketdagi bitta o'yin (ko'rinish uchun).</summary>
public record TournamentMatchDto(
    Guid Id, int Round, string RoundName, int Slot,
    Guid? Player1Id, string? Player1, Guid? Player2Id, string? Player2,
    Guid? WinnerId, string? Winner);

/// <summary>Turnir to'liq ko'rinishi (bracket sahifasi uchun).</summary>
public record TournamentDetailDto(
    TournamentInfoDto Info,
    IReadOnlyList<string> Players,
    IReadOnlyList<TournamentMatchDto> Matches,
    bool IsRegistered);

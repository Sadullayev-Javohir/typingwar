using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Tournaments;

/// <summary>Turnir asosiy ma'lumoti (ro'yxat + sarlavha uchun).</summary>
public record TournamentInfoDto(
    Guid Id, string Name, TournamentStatus Status, DateTime StartAt,
    int Capacity, int PlayerCount, Guid? ChampionId, string? Champion, string Settings);

/// <summary>Bracketdagi bitta o'yin (ko'rinish uchun).</summary>
public record TournamentMatchDto(
    Guid Id, int Round, string RoundName, int Slot,
    Guid? Player1Id, string? Player1, Guid? Player2Id, string? Player2,
    Guid? WinnerId, string? Winner,
    double Player1Wpm, double Player2Wpm, double Player1Accuracy, double Player2Accuracy);

/// <summary>Turnirga ro'yxatdan o'tgan o'yinchi (seed bilan).</summary>
public record TournamentPlayerDto(Guid UserId, string Username, int Seed);

/// <summary>Yakuniy joy (turnir tugagach statistika).</summary>
public record TournamentStandingDto(
    int Rank, Guid UserId, string Username, double BestWpm, double BestAccuracy,
    int EliminatedRound, string EliminatedRoundName, bool IsChampion);

/// <summary>Turnir to'liq ko'rinishi (bracket sahifasi uchun).</summary>
public record TournamentDetailDto(
    TournamentInfoDto Info,
    IReadOnlyList<TournamentPlayerDto> Players,
    IReadOnlyList<TournamentMatchDto> Matches,
    IReadOnlyList<TournamentStandingDto> Standings,
    bool IsRegistered,
    bool IsHost,
    Guid? MyUserId);

namespace TypingWar.Application.Features.Online;

/// <summary>Onlayn foydalanuvchi qisqacha ma'lumoti (frontendga yuboriladi).</summary>
public record OnlineUserDto(
    Guid UserId, string Username, double AvgWpm, string? AvatarUrl, string? RegionCode);

/// <summary>Partiya a'zosi (frontendga yuboriladi).</summary>
public record PartyMemberDto(
    string UserId, string Username, double AvgWpm, string? AvatarUrl, string? RegionCode, bool IsOwner);

namespace TypingWar.Application.Features.Auth;

/// <summary>Profilni to'ldirish so'rovi (Google'dan keyin): username + hudud.</summary>
public record CompleteProfileRequest(string Username, string RegionCode);

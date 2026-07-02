namespace TypingWar.Application.Features.Auth;

/// <summary>Profilni to'ldirish so'rovi (Google'dan keyin): username + hudud.</summary>
public record CompleteProfileRequest(string Username, string RegionCode);

/// <summary>Foydalanuvchi nomini o'zgartirish so'rovi (/Profile sahifasidan).</summary>
public record RenameUsernameRequest(string Username);

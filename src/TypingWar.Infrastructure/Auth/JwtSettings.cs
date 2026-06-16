namespace TypingWar.Infrastructure.Auth;

/// <summary>JWT konfiguratsiyasi (appsettings: "Jwt").</summary>
public class JwtSettings
{
    public const string SectionName = "Jwt";

    public string Issuer { get; set; } = "typingwar.uz";
    public string Audience { get; set; } = "typingwar.uz";
    /// <summary>Imzo kaliti — kamida 32 belgi (HMAC-SHA256). Production da secret store dan keladi.</summary>
    public string Key { get; set; } = string.Empty;
    public int ExpiryMinutes { get; set; } = 60 * 24 * 7; // 7 kun
}

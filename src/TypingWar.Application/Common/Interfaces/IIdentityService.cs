namespace TypingWar.Application.Common.Interfaces;

/// <summary>Google bilan kirish/ro'yxatdan o'tish natijasi.</summary>
public record GoogleAuthResult(
    Guid UserId,
    string Username,
    string Email,
    bool ProfileCompleted,
    IReadOnlyList<string> Roles);

/// <summary>Profilni to'ldirish (username + hudud) natijasi.</summary>
public record ProfileSetupResult(
    bool Succeeded,
    string Username,
    IReadOnlyList<string> Errors)
{
    public static ProfileSetupResult Fail(params string[] errors) =>
        new(false, string.Empty, errors);

    public static ProfileSetupResult Ok(string username) =>
        new(true, username, Array.Empty<string>());
}

/// <summary>
/// ASP.NET Identity ustida ishlovchi auth xizmati (UserManager — Infrastructure da).
/// Faqat Google OAuth — email/parol yo'q.
/// </summary>
public interface IIdentityService
{
    /// <summary>Google subject bo'yicha foydalanuvchini topadi yoki yangisini yaratadi (parolsiz).</summary>
    Task<GoogleAuthResult> FindOrCreateGoogleUserAsync(string googleId, string email, CancellationToken ct = default);

    /// <summary>Google'dan keyin profilni to'ldiradi: username (unikal) + hudud.</summary>
    Task<ProfileSetupResult> CompleteProfileAsync(Guid userId, string username, string regionCode, CancellationToken ct = default);

    /// <summary>Username bo'sh (band emas)mi — joriy foydalanuvchini hisobga olmagan holda.</summary>
    Task<bool> IsUsernameAvailableAsync(string username, Guid excludeUserId, CancellationToken ct = default);
}

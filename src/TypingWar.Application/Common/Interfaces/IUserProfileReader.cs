namespace TypingWar.Application.Common.Interfaces;

/// <summary>
/// Identity (ApplicationUser) profilidan ma'lumot o'qiydi. Application qatlami
/// Infrastructure dagi ApplicationUser ga to'g'ridan-to'g'ri bog'lanmasligi uchun abstraktsiya.
/// </summary>
public interface IUserProfileReader
{
    /// <summary>Foydalanuvchining hudud kodi (yo'q bo'lsa null).</summary>
    Task<string?> GetRegionCodeAsync(Guid userId, CancellationToken ct = default);

    /// <summary>Foydalanuvchi profili (Identity) — yo'q bo'lsa null.</summary>
    Task<UserProfileInfo?> GetProfileAsync(Guid userId, CancellationToken ct = default);

    /// <summary>Username bo'yicha ommaviy profil (Identity) — yo'q bo'lsa null. Username katta-kichik harfga sezgir emas.</summary>
    Task<UserPublicProfile?> GetByUsernameAsync(string username, CancellationToken ct = default);

    /// <summary>Foydalanuvchining o'rtacha WPM darajasi (RaceResults o'rtachasi). Natija yo'q bo'lsa 0.</summary>
    Task<double> GetAvgWpmAsync(Guid userId, CancellationToken ct = default);
}

/// <summary>Identity dan o'qilgan profil ma'lumoti.</summary>
public record UserProfileInfo(string Username, int EloRating, string? RegionCode, string? AvatarUrl, DateTime CreatedAt);

/// <summary>Username bo'yicha ommaviy profil (UserId bilan — natijalarni o'qish uchun).</summary>
public record UserPublicProfile(Guid UserId, string Username, int EloRating, string? RegionCode, string? AvatarUrl, DateTime CreatedAt);

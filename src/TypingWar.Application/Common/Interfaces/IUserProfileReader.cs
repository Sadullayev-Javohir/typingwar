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
}

/// <summary>Identity dan o'qilgan profil ma'lumoti.</summary>
public record UserProfileInfo(string Username, int EloRating, string? RegionCode, string? AvatarUrl, DateTime CreatedAt);

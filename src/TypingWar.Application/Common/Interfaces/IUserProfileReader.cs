namespace TypingWar.Application.Common.Interfaces;

/// <summary>
/// Identity (ApplicationUser) profilidan ma'lumot o'qiydi. Application qatlami
/// Infrastructure dagi ApplicationUser ga to'g'ridan-to'g'ri bog'lanmasligi uchun abstraktsiya.
/// </summary>
public interface IUserProfileReader
{
    /// <summary>Foydalanuvchining hudud kodi (yo'q bo'lsa null).</summary>
    Task<string?> GetRegionCodeAsync(Guid userId, CancellationToken ct = default);
}

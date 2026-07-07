namespace TypingWar.Application.Common.Interfaces;

/// <summary>Admin paneli uchun foydalanuvchi (Identity) ma'lumotlari.</summary>
public record AdminUserDto(
    Guid Id,
    string Username,
    string Email,
    string? RegionCode,
    int EloRating,
    DateTime CreatedAt,
    DateTime? LastLoginAt,
    DateTime? LastSeenAt,
    bool ProfileCompleted,
    IReadOnlyList<string> Roles,
    int RaceCount,
    double BestWpm);

/// <summary>
/// Admin paneli uchun Identity (Users) + bog'liq domen ma'lumotlarini boshqarish.
/// Users ASP.NET Identity da bo'lgani uchun bu abstraktsiya Infrastructure da amalga oshiriladi.
/// </summary>
public interface IAdminService
{
    /// <summary>Barcha foydalanuvchilar (ixtiyoriy qidiruv: username/email bo'yicha).</summary>
    Task<IReadOnlyList<AdminUserDto>> ListUsersAsync(string? search, CancellationToken ct = default);

    /// <summary>
    /// Foydalanuvchini va uning barcha bog'liq ma'lumotlarini (natijalar, rekordlar, sozlamalar...)
    /// butunlay o'chiradi. SuperAdmin foydalanuvchisini o'chirib bo'lmaydi.
    /// </summary>
    Task DeleteUserAsync(Guid userId, CancellationToken ct = default);

    /// <summary>Foydalanuvchiga Admin rolini beradi yoki olib tashlaydi. Yangilangan rollarni qaytaradi.</summary>
    Task<IReadOnlyList<string>> SetAdminRoleAsync(Guid userId, bool isAdmin, CancellationToken ct = default);

    /// <summary>Berilgan id'lar uchun username'lar (id → username). Topilmaganlar tushib qoladi.</summary>
    Task<IReadOnlyDictionary<Guid, string>> GetUsernamesAsync(IEnumerable<Guid> userIds, CancellationToken ct = default);
}

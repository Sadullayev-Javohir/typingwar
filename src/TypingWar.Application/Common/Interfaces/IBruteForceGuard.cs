namespace TypingWar.Application.Common.Interfaces;

/// <summary>
/// Brute-force himoyasi (Redis): ma'lum bir amal (masalan xona kodini topish) bo'yicha
/// bir mijoz (IP) qancha marta xato qilganini sanaydi va chegaradan oshsa bloklaydi.
/// </summary>
public interface IBruteForceGuard
{
    /// <summary>Mijoz shu amal uchun bloklanganmi?</summary>
    Task<bool> IsBlockedAsync(string action, string clientId);

    /// <summary>
    /// Bitta muvaffaqiyatsiz urinishni qayd etadi. Chegaraga yetganda mijozni bloklaydi.
    /// Blok holatini qaytaradi (true = endi bloklangan).
    /// </summary>
    Task<bool> RegisterFailureAsync(string action, string clientId);

    /// <summary>Muvaffaqiyatli urinishdan keyin xatolar hisoblagichini tozalaydi.</summary>
    Task ResetAsync(string action, string clientId);
}

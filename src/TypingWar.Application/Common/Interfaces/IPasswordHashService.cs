namespace TypingWar.Application.Common.Interfaces;

/// <summary>
/// Umumiy parol xeshlash xizmati (turnir paroli kabi obyekt parollari uchun).
/// Identity dan mustaqil — BCrypt orqali Infrastructure da implementatsiya qilinadi.
/// </summary>
public interface IPasswordHashService
{
    /// <summary>Ochiq parolni xeshlaydi (saqlash uchun).</summary>
    string Hash(string password);

    /// <summary>Ochiq parolni xesh bilan solishtiradi.</summary>
    bool Verify(string password, string hash);
}

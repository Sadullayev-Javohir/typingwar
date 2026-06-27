using TypingWar.Application.Common.Interfaces;

namespace TypingWar.Infrastructure.Auth;

/// <summary>
/// <see cref="IPasswordHashService"/> ning BCrypt.Net-Next implementatsiyasi
/// (turnir paroli kabi obyekt parollari uchun). Buzilgan xesh — Verify=false.
/// </summary>
public class BCryptPasswordHashService : IPasswordHashService
{
    private const int WorkFactor = 12;

    public string Hash(string password) => BCrypt.Net.BCrypt.HashPassword(password, WorkFactor);

    public bool Verify(string password, string hash)
    {
        if (string.IsNullOrEmpty(hash)) return false;
        try { return BCrypt.Net.BCrypt.Verify(password, hash); }
        catch (BCrypt.Net.SaltParseException) { return false; }
    }
}

using Microsoft.AspNetCore.Identity;
using TypingWar.Infrastructure.Identity;

namespace TypingWar.Infrastructure.Auth;

/// <summary>
/// ASP.NET Identity ning IPasswordHasher implementatsiyasi — BCrypt.Net-Next orqali
/// (CLAUDE.md talabi: parol xeshlash BCrypt bilan).
/// </summary>
public class BCryptPasswordHasher : IPasswordHasher<ApplicationUser>
{
    private const int WorkFactor = 12;

    public string HashPassword(ApplicationUser user, string password)
        => BCrypt.Net.BCrypt.HashPassword(password, WorkFactor);

    public PasswordVerificationResult VerifyHashedPassword(ApplicationUser user, string hashedPassword, string providedPassword)
    {
        try
        {
            return BCrypt.Net.BCrypt.Verify(providedPassword, hashedPassword)
                ? PasswordVerificationResult.Success
                : PasswordVerificationResult.Failed;
        }
        catch (BCrypt.Net.SaltParseException)
        {
            return PasswordVerificationResult.Failed;
        }
    }
}

using Microsoft.AspNetCore.Identity;

namespace TypingWar.Infrastructure.Identity;

/// <summary>
/// Users jadvali. ASP.NET Core Identity infra concern bo'lgani uchun bu yerda joylashgan
/// (Domain qatlami bog'liqliksiz qoladi). UserName, Email, PasswordHash IdentityUser dan keladi.
/// </summary>
public class ApplicationUser : IdentityUser<Guid>
{
    public int EloRating { get; set; } = 1000;
    public string? RegionCode { get; set; }
    public string? AvatarUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Foydalanuvchi oxirgi marta tizimga (Google orqali) kirgan vaqt. Hech kirmagan bo'lsa null.</summary>
    public DateTime? LastLoginAt { get; set; }

    /// <summary>Google OAuth subject (sub) — faqat Google orqali kirish uchun.</summary>
    public string? GoogleId { get; set; }

    /// <summary>
    /// Google bilan kirgandan keyin foydalanuvchi nom + hududni to'ldirdimi.
    /// false bo'lsa — /CompleteProfile sahifasiga yo'naltiriladi.
    /// </summary>
    public bool ProfileCompleted { get; set; }
}

namespace TypingWar.Application.Common.Interfaces;

/// <summary>JWT token yaratish xizmati (HttpOnly cookie da saqlanadi).</summary>
public interface IJwtTokenService
{
    /// <summary>Foydalanuvchi uchun JWT access token yaratadi.</summary>
    string GenerateToken(Guid userId, string username, string? email, IEnumerable<string>? roles = null, bool profileCompleted = true);

    /// <summary>Token amal qilish muddati (cookie expiry uchun).</summary>
    DateTime GetExpiry();
}

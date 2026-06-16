namespace TypingWar.Application.Common.Interfaces;

/// <summary>Joriy autentifikatsiya qilingan foydalanuvchi konteksti.</summary>
public interface ICurrentUserService
{
    Guid? UserId { get; }
    string? Username { get; }
    bool IsAuthenticated { get; }
}

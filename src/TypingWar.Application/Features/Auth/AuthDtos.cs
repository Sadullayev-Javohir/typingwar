namespace TypingWar.Application.Features.Auth;

/// <summary>Muvaffaqiyatli auth javobi (controller cookie o'rnatadi).</summary>
public record AuthResultDto(Guid UserId, string Username, string Email);

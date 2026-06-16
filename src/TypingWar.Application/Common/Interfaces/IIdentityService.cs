namespace TypingWar.Application.Common.Interfaces;

/// <summary>Auth amali natijasi.</summary>
public record AuthUserResult(
    bool Succeeded,
    Guid UserId,
    string Username,
    string Email,
    IReadOnlyList<string> Errors,
    bool IsLockedOut = false)
{
    public static AuthUserResult Fail(params string[] errors) =>
        new(false, Guid.Empty, string.Empty, string.Empty, errors);

    public static AuthUserResult LockedOut() =>
        new(false, Guid.Empty, string.Empty, string.Empty,
            new[] { "Hisob vaqtincha bloklangan. 15 daqiqadan keyin urinib ko'ring." }, true);

    public static AuthUserResult Ok(Guid id, string username, string email) =>
        new(true, id, username, email, Array.Empty<string>());
}

/// <summary>ASP.NET Identity ustida ishlovchi auth xizmati (UserManager — Infrastructure da).</summary>
public interface IIdentityService
{
    Task<AuthUserResult> RegisterAsync(string username, string email, string password, string? regionCode, CancellationToken ct = default);
    Task<AuthUserResult> LoginAsync(string usernameOrEmail, string password, CancellationToken ct = default);
}

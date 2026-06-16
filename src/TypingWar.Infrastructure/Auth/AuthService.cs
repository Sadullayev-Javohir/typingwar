using Microsoft.AspNetCore.Identity;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Infrastructure.Identity;

namespace TypingWar.Infrastructure.Auth;

/// <summary>ASP.NET Identity UserManager ustida auth (BCrypt hasher, lockout 5 urinish/15 daqiqa).</summary>
public class AuthService : IIdentityService
{
    private readonly UserManager<ApplicationUser> _userManager;

    public AuthService(UserManager<ApplicationUser> userManager) => _userManager = userManager;

    public async Task<AuthUserResult> RegisterAsync(string username, string email, string password, string? regionCode, CancellationToken ct = default)
    {
        if (await _userManager.FindByNameAsync(username) is not null)
            return AuthUserResult.Fail("Bu foydalanuvchi nomi band.");
        if (await _userManager.FindByEmailAsync(email) is not null)
            return AuthUserResult.Fail("Bu email allaqachon ro'yxatdan o'tgan.");

        var user = new ApplicationUser
        {
            UserName = username,
            Email = email,
            RegionCode = string.IsNullOrWhiteSpace(regionCode) ? null : regionCode
        };

        var result = await _userManager.CreateAsync(user, password);
        if (!result.Succeeded)
            return AuthUserResult.Fail(result.Errors.Select(e => e.Description).ToArray());

        return AuthUserResult.Ok(user.Id, user.UserName!, user.Email!);
    }

    public async Task<AuthUserResult> LoginAsync(string usernameOrEmail, string password, CancellationToken ct = default)
    {
        var user = await _userManager.FindByNameAsync(usernameOrEmail)
                   ?? await _userManager.FindByEmailAsync(usernameOrEmail);

        if (user is null)
            return AuthUserResult.Fail("Login yoki parol noto'g'ri.");

        if (await _userManager.IsLockedOutAsync(user))
            return AuthUserResult.LockedOut();

        if (await _userManager.CheckPasswordAsync(user, password))
        {
            await _userManager.ResetAccessFailedCountAsync(user);
            return AuthUserResult.Ok(user.Id, user.UserName!, user.Email!);
        }

        // Noto'g'ri parol — urinishlar sonini oshirish (lockout uchun)
        await _userManager.AccessFailedAsync(user);
        if (await _userManager.IsLockedOutAsync(user))
            return AuthUserResult.LockedOut();

        return AuthUserResult.Fail("Login yoki parol noto'g'ri.");
    }
}

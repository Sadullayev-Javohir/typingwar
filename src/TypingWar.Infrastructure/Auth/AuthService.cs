using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Constants;
using TypingWar.Infrastructure.Identity;

namespace TypingWar.Infrastructure.Auth;

/// <summary>
/// ASP.NET Identity UserManager ustida Google OAuth auth (parolsiz).
/// Email/parol bilan ro'yxatdan o'tish/kirish olib tashlandi — faqat Google.
/// </summary>
public class AuthService : IIdentityService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IConfiguration _config;

    public AuthService(UserManager<ApplicationUser> userManager, IConfiguration config)
    {
        _userManager = userManager;
        _config = config;
    }

    public async Task<GoogleAuthResult> FindOrCreateGoogleUserAsync(string googleId, string email, CancellationToken ct = default)
    {
        // 1) Avval Google subject bo'yicha qidiramiz
        var user = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions
            .FirstOrDefaultAsync(_userManager.Users.Where(u => u.GoogleId == googleId), ct);

        // 2) Topilmasa — email bo'yicha (mavjud hisobni bog'lash)
        if (user is null && !string.IsNullOrWhiteSpace(email))
        {
            user = await _userManager.FindByEmailAsync(email);
            if (user is not null)
            {
                user.GoogleId = googleId;
                await _userManager.UpdateAsync(user);
            }
        }

        // 3) Hali ham yo'q — yangi foydalanuvchi (profil to'ldirilmagan)
        if (user is null)
        {
            user = new ApplicationUser
            {
                UserName = await GenerateTempUsernameAsync(email),
                Email = string.IsNullOrWhiteSpace(email) ? null : email,
                EmailConfirmed = true,
                GoogleId = googleId,
                ProfileCompleted = false
            };
            await _userManager.CreateAsync(user);   // parolsiz
        }

        // Oxirgi kirish vaqtini yozamiz (admin panelida ko'rsatiladi)
        user.LastLoginAt = DateTime.UtcNow;
        await _userManager.UpdateAsync(user);

        // Sozlangan email bo'yicha admin rollarini ta'minlash (birinchi kirishda ham)
        await EnsureConfiguredAdminRolesAsync(user);

        var roles = await _userManager.GetRolesAsync(user);
        return new GoogleAuthResult(user.Id, user.UserName!, user.Email ?? string.Empty, user.ProfileCompleted, roles.ToList());
    }

    /// <summary>
    /// appsettings (Admin:SuperEmail / Admin:Email) ga mos kelsa, foydalanuvchiga tegishli rollarni beradi.
    /// Rollar startupda yaratilgan bo'ladi; bu yerda faqat tayinlaymiz.
    /// </summary>
    private async Task EnsureConfiguredAdminRolesAsync(ApplicationUser user)
    {
        var email = user.Email;
        if (string.IsNullOrWhiteSpace(email)) return;

        var superEmail = _config["Admin:SuperEmail"];
        var adminEmail = _config["Admin:Email"];

        async Task AddIfMissing(string role)
        {
            if (!await _userManager.IsInRoleAsync(user, role))
                await _userManager.AddToRoleAsync(user, role);
        }

        if (!string.IsNullOrWhiteSpace(superEmail) && string.Equals(email, superEmail, StringComparison.OrdinalIgnoreCase))
        {
            await AddIfMissing("Admin");
            await AddIfMissing("SuperAdmin");
        }
        else if (!string.IsNullOrWhiteSpace(adminEmail) && string.Equals(email, adminEmail, StringComparison.OrdinalIgnoreCase))
        {
            await AddIfMissing("Admin");
        }
    }

    public async Task<ProfileSetupResult> CompleteProfileAsync(Guid userId, string username, string regionCode, CancellationToken ct = default)
    {
        username = username.Trim();

        var nameError = ValidateUsername(username);
        if (nameError is not null)
            return ProfileSetupResult.Fail(nameError);
        if (!UzbekistanRegions.IsValid(regionCode))
            return ProfileSetupResult.Fail("Hududni tanlang.");

        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null)
            return ProfileSetupResult.Fail("Foydalanuvchi topilmadi.");

        var existing = await _userManager.FindByNameAsync(username);
        if (existing is not null && existing.Id != userId)
            return ProfileSetupResult.Fail("Bu foydalanuvchi nomi band.");

        user.RegionCode = regionCode;
        user.ProfileCompleted = true;
        return await ApplyUsernameAsync(user, username);
    }

    public async Task<ProfileSetupResult> RenameUsernameAsync(Guid userId, string username, CancellationToken ct = default)
    {
        username = username.Trim();

        var nameError = ValidateUsername(username);
        if (nameError is not null)
            return ProfileSetupResult.Fail(nameError);

        var user = await _userManager.FindByIdAsync(userId.ToString());
        if (user is null)
            return ProfileSetupResult.Fail("Foydalanuvchi topilmadi.");

        // Aynan o'sha nom (registri bilan) — ortiqcha yozuvga hojat yo'q
        if (string.Equals(user.UserName, username, StringComparison.Ordinal))
            return ProfileSetupResult.Ok(user.UserName!);

        var existing = await _userManager.FindByNameAsync(username);
        if (existing is not null && existing.Id != userId)
            return ProfileSetupResult.Fail("Bu foydalanuvchi nomi band.");

        return await ApplyUsernameAsync(user, username);
    }

    /// <summary>Username uchun umumiy validatsiya. Xato bo'lsa xabar, aks holda null.</summary>
    private static string? ValidateUsername(string username)
    {
        if (string.IsNullOrWhiteSpace(username) || username.Length is < 3 or > 32)
            return "Foydalanuvchi nomi 3–32 belgidan iborat bo'lsin.";
        if (!System.Text.RegularExpressions.Regex.IsMatch(username, "^[a-zA-Z0-9_]+$"))
            return "Foydalanuvchi nomi faqat harf, raqam va _ dan iborat bo'lsin.";
        return null;
    }

    /// <summary>Username ni Identity'ga yozadi (NormalizedUserName ham yangilanadi).</summary>
    private async Task<ProfileSetupResult> ApplyUsernameAsync(ApplicationUser user, string username)
    {
        var setName = await _userManager.SetUserNameAsync(user, username);
        if (!setName.Succeeded)
            return ProfileSetupResult.Fail(setName.Errors.Select(e => e.Description).ToArray());

        var update = await _userManager.UpdateAsync(user);
        if (!update.Succeeded)
            return ProfileSetupResult.Fail(update.Errors.Select(e => e.Description).ToArray());

        return ProfileSetupResult.Ok(user.UserName!);
    }

    public async Task<bool> IsUsernameAvailableAsync(string username, Guid excludeUserId, CancellationToken ct = default)
    {
        var existing = await _userManager.FindByNameAsync(username.Trim());
        return existing is null || existing.Id == excludeUserId;
    }

    /// <summary>email local-part dan unikal vaqtinchalik username yasaydi (profil to'ldirilгунча).</summary>
    private async Task<string> GenerateTempUsernameAsync(string? email)
    {
        var baseName = "user";
        if (!string.IsNullOrWhiteSpace(email))
        {
            var local = email.Split('@')[0];
            var cleaned = new string(local.Where(c => char.IsLetterOrDigit(c) || c == '_').ToArray());
            if (cleaned.Length >= 3) baseName = cleaned.Length > 24 ? cleaned[..24] : cleaned;
        }

        var candidate = baseName;
        while (await _userManager.FindByNameAsync(candidate) is not null)
            candidate = baseName + Random.Shared.Next(1000, 9999);

        return candidate;
    }
}

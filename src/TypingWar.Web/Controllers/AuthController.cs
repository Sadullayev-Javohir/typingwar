using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Google;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Application.Features.Auth;

namespace TypingWar.Web.Controllers;

/// <summary>Faqat Google OAuth orqali kirish/ro'yxatdan o'tish — JWT HttpOnly cookie da.</summary>
public class AuthController : ApiControllerBase
{
    public const string AccessTokenCookie = "access_token";
    private const string ExternalScheme = "External";

    private readonly IJwtTokenService _jwt;
    private readonly IIdentityService _identity;
    private readonly IAuthenticationSchemeProvider _schemes;

    public AuthController(IJwtTokenService jwt, IIdentityService identity, IAuthenticationSchemeProvider schemes)
    {
        _jwt = jwt;
        _identity = identity;
        _schemes = schemes;
    }

    /// <summary>Google bilan kirishni boshlaydi (Google sahifasiga yo'naltiradi).</summary>
    [HttpGet("google")]
    public async Task<IActionResult> Google([FromQuery] string? returnUrl = null)
    {
        if (await _schemes.GetSchemeAsync(GoogleDefaults.AuthenticationScheme) is null)
            return Redirect("/Login?error=google_not_configured");

        var props = new AuthenticationProperties
        {
            RedirectUri = Url.Action(nameof(GoogleCallback), "Auth", new { returnUrl }) ?? "/api/auth/google/callback"
        };
        return Challenge(props, GoogleDefaults.AuthenticationScheme);
    }

    /// <summary>Google qaytgandan keyin: foydalanuvchini topadi/yaratadi, JWT cookie beradi.</summary>
    [HttpGet("google/callback")]
    public async Task<IActionResult> GoogleCallback([FromQuery] string? returnUrl = null)
    {
        var ext = await HttpContext.AuthenticateAsync(ExternalScheme);
        if (!ext.Succeeded || ext.Principal is null)
            return Redirect("/Login?error=google_failed");

        var googleId = ext.Principal.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = ext.Principal.FindFirstValue(ClaimTypes.Email) ?? string.Empty;
        if (string.IsNullOrWhiteSpace(googleId))
            return Redirect("/Login?error=google_failed");

        var result = await _identity.FindOrCreateGoogleUserAsync(googleId, email);

        // Tashqi (correlation) cookie endi kerak emas
        await HttpContext.SignOutAsync(ExternalScheme);

        IssueCookie(result.UserId, result.Username, result.Email, result.Roles);

        if (!result.ProfileCompleted)
            return Redirect("/CompleteProfile");

        return Redirect(string.IsNullOrWhiteSpace(returnUrl) || !Url.IsLocalUrl(returnUrl) ? "/Practice" : returnUrl);
    }

    /// <summary>Google'dan keyin profilni to'ldiradi (username + hudud) va cookie ni yangilaydi.</summary>
    [Authorize]
    [HttpPost("complete-profile")]
    public async Task<IActionResult> CompleteProfile([FromBody] CompleteProfileRequest req)
    {
        if (User.FindFirstValue(ClaimTypes.NameIdentifier) is not string idStr || !Guid.TryParse(idStr, out var uid))
            return Unauthorized();

        var result = await _identity.CompleteProfileAsync(uid, req.Username, req.RegionCode);
        if (!result.Succeeded)
            return BadRequest(new { error = string.Join("; ", result.Errors) });

        var email = User.FindFirstValue(ClaimTypes.Email);
        var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        IssueCookie(uid, result.Username, email, roles);

        return Ok(new { username = result.Username });
    }

    /// <summary>Joriy foydalanuvchi nomini o'zgartiradi va JWT cookie ni yangilaydi (hamma joyga tarqaydi).</summary>
    [Authorize]
    [HttpPost("rename-username")]
    public async Task<IActionResult> RenameUsername([FromBody] RenameUsernameRequest req)
    {
        if (User.FindFirstValue(ClaimTypes.NameIdentifier) is not string idStr || !Guid.TryParse(idStr, out var uid))
            return Unauthorized();

        var result = await _identity.RenameUsernameAsync(uid, req.Username);
        if (!result.Succeeded)
            return BadRequest(new { error = string.Join("; ", result.Errors) });

        // Yangi username bilan cookie ni qayta beramiz (nav, JWT claim — barchasi yangilanadi)
        var email = User.FindFirstValue(ClaimTypes.Email);
        var roles = User.FindAll(ClaimTypes.Role).Select(c => c.Value).ToList();
        IssueCookie(uid, result.Username, email, roles);

        return Ok(new { username = result.Username });
    }

    /// <summary>Username band emasligini tekshiradi (CompleteProfile sahifasida jonli).</summary>
    [Authorize]
    [HttpGet("username-available")]
    public async Task<IActionResult> UsernameAvailable([FromQuery] string username)
    {
        if (User.FindFirstValue(ClaimTypes.NameIdentifier) is not string idStr || !Guid.TryParse(idStr, out var uid))
            return Unauthorized();
        if (string.IsNullOrWhiteSpace(username) || username.Trim().Length < 3)
            return Ok(new { available = false });

        var available = await _identity.IsUsernameAvailableAsync(username, uid);
        return Ok(new { available });
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete(AccessTokenCookie);
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public IActionResult Me() => Ok(new
    {
        userId = User.FindFirstValue(ClaimTypes.NameIdentifier),
        username = User.FindFirstValue(ClaimTypes.Name),
        email = User.FindFirstValue(ClaimTypes.Email)
    });

    private void IssueCookie(Guid userId, string username, string? email, IEnumerable<string>? roles)
    {
        var token = _jwt.GenerateToken(userId, username, email, roles);
        Response.Cookies.Append(AccessTokenCookie, token, new CookieOptions
        {
            HttpOnly = true,                       // JS dan o'qib bo'lmaydi (XSS himoya)
            Secure = Request.IsHttps,              // prod (HTTPS) da Secure
            SameSite = SameSiteMode.Lax,           // CSRF yumshatish + OAuth redirect uchun
            Expires = _jwt.GetExpiry()
        });
    }
}

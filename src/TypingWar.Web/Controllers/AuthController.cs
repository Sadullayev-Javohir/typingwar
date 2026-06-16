using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Application.Features.Auth;

namespace TypingWar.Web.Controllers;

/// <summary>Ro'yxatdan o'tish, kirish, chiqish — JWT HttpOnly cookie da.</summary>
public class AuthController : ApiControllerBase
{
    public const string AccessTokenCookie = "access_token";

    private readonly IJwtTokenService _jwt;

    public AuthController(IJwtTokenService jwt) => _jwt = jwt;

    [HttpPost("register")]
    public async Task<ActionResult<AuthResultDto>> Register([FromBody] RegisterCommand command)
    {
        var dto = await Mediator.Send(command);
        IssueCookie(dto);
        return Ok(dto);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResultDto>> Login([FromBody] LoginCommand command)
    {
        var dto = await Mediator.Send(command);
        IssueCookie(dto);
        return Ok(dto);
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

    private void IssueCookie(AuthResultDto dto)
    {
        var token = _jwt.GenerateToken(dto.UserId, dto.Username, dto.Email);
        Response.Cookies.Append(AccessTokenCookie, token, new CookieOptions
        {
            HttpOnly = true,                       // JS dan o'qib bo'lmaydi (XSS himoya)
            Secure = Request.IsHttps,              // prod (HTTPS) da Secure
            SameSite = SameSiteMode.Lax,           // CSRF yumshatish
            Expires = _jwt.GetExpiry()
        });
    }
}

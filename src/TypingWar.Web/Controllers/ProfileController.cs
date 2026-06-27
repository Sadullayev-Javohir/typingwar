using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TypingWar.Application.Features.Profile;

namespace TypingWar.Web.Controllers;

/// <summary>Foydalanuvchi profili.</summary>
public class ProfileController : ApiControllerBase
{
    /// <summary>Joriy foydalanuvchi profili (to'liq statistika).</summary>
    [Authorize]
    [HttpGet]
    public async Task<ActionResult<ProfileDto>> Get()
    {
        var p = await Mediator.Send(new GetProfileQuery());
        return p is null ? NotFound() : Ok(p);
    }

    /// <summary>Username bo'yicha ommaviy profil (/share/{username}) — anonim ko'rishi mumkin.</summary>
    [AllowAnonymous]
    [HttpGet("{username}")]
    public async Task<ActionResult<ProfileDto>> Public(string username)
    {
        var p = await Mediator.Send(new GetPublicProfileQuery(username));
        return p is null ? NotFound() : Ok(p);
    }
}

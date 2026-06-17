using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TypingWar.Application.Features.Profile;

namespace TypingWar.Web.Controllers;

/// <summary>Foydalanuvchi profili.</summary>
[Authorize]
public class ProfileController : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ProfileDto>> Get()
    {
        var p = await Mediator.Send(new GetProfileQuery());
        return p is null ? NotFound() : Ok(p);
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TypingWar.Application.Features.Teams;

namespace TypingWar.Web.Controllers;

/// <summary>5x5 jamoaviy musobaqa — yaratish va kod bo'yicha tekshirish.</summary>
public class TeamRacesController : ApiControllerBase
{
    [Authorize]
    [HttpPost]
    public async Task<ActionResult<TeamRaceDto>> Create()
        => Ok(await Mediator.Send(new CreateTeamRaceCommand()));

    [HttpGet("{code}")]
    public async Task<ActionResult<TeamRaceDto>> Get(string code)
    {
        var race = await Mediator.Send(new GetTeamRaceQuery(code));
        return race is null ? NotFound(new { error = "Musobaqa topilmadi yoki muddati tugagan." }) : Ok(race);
    }
}

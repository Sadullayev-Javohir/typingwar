using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TypingWar.Application.Features.Rooms;
using TypingWar.Application.Features.Teams;

namespace TypingWar.Web.Controllers;

/// <summary>5x5 jamoaviy musobaqa — yaratish va kod bo'yicha tekshirish.</summary>
public class TeamRacesController : ApiControllerBase
{
    /// <summary>
    /// Yangi jamoaviy musobaqa yaratish (faqat tizimga kirgan foydalanuvchi).
    /// Host tanlagan poyga sozlamalari (til/rejim/so'z soni/uzunlik) musobaqa bilan saqlanadi.
    /// </summary>
    [Authorize]
    [HttpPost]
    public async Task<ActionResult<TeamRaceDto>> Create([FromBody] RoomRaceSettings? settings = null)
    {
        var json = settings is null ? null : JsonSerializer.Serialize(settings);
        return Ok(await Mediator.Send(new CreateTeamRaceCommand(json)));
    }

    [HttpGet("{code}")]
    public async Task<ActionResult<TeamRaceDto>> Get(string code)
    {
        var race = await Mediator.Send(new GetTeamRaceQuery(code));
        return race is null ? NotFound(new { error = "Musobaqa topilmadi yoki muddati tugagan." }) : Ok(race);
    }
}

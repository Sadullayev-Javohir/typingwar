using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Application.Features.Rooms;
using TypingWar.Application.Features.Teams;

namespace TypingWar.Web.Controllers;

/// <summary>5x5 jamoaviy musobaqa — yaratish va kod bo'yicha tekshirish.</summary>
public class TeamRacesController : ApiControllerBase
{
    private const string BruteForceAction = "team-code";
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

    /// <summary>
    /// Kod bo'yicha musobaqani tekshirish — brute-force himoyasi bilan
    /// (bir IP'dan 10 ta / 15 daqiqa noto'g'ri kod → 1 soatga blok).
    /// </summary>
    [HttpGet("{code}")]
    public async Task<ActionResult<TeamRaceDto>> Get(string code, [FromServices] IBruteForceGuard guard)
    {
        var clientId = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        if (await guard.IsBlockedAsync(BruteForceAction, clientId))
            return StatusCode(StatusCodes.Status429TooManyRequests,
                new { error = "Juda ko'p noto'g'ri kod kiritildi. Birozdan keyin urinib ko'ring." });

        var race = await Mediator.Send(new GetTeamRaceQuery(code));
        if (race is null)
        {
            await guard.RegisterFailureAsync(BruteForceAction, clientId);
            return NotFound(new { error = "Musobaqa topilmadi yoki muddati tugagan." });
        }

        await guard.ResetAsync(BruteForceAction, clientId);
        return Ok(race);
    }
}

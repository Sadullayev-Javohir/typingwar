using Microsoft.AspNetCore.Mvc;
using TypingWar.Application.Features.Leaderboard;
using TypingWar.Domain.Enums;

namespace TypingWar.Web.Controllers;

/// <summary>Leaderboard — top 50 + joriy foydalanuvchi qatori (vaqt rejimi bo'yicha).</summary>
public class LeaderboardController : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<LeaderboardDto>> Get([FromQuery] TimeMode timeMode = TimeMode.Thirty)
        => Ok(await Mediator.Send(new GetLeaderboardQuery(timeMode)));
}

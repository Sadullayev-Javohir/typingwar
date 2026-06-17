using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TypingWar.Application.Features.Contests;

namespace TypingWar.Web.Controllers;

/// <summary>Kunlik musobaqa — bugungi holat va natija topshirish.</summary>
public class ContestsController : ApiControllerBase
{
    [HttpGet("today")]
    public async Task<ActionResult<TodayContestDto>> Today()
        => Ok(await Mediator.Send(new GetTodayContestQuery()));

    [Authorize]
    [HttpPost("submit")]
    public async Task<ActionResult<ContestSubmitResultDto>> Submit([FromBody] SubmitContestResultCommand command)
        => Ok(await Mediator.Send(command));
}

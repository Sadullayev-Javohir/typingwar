using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TypingWar.Application.Features.Tournaments;

namespace TypingWar.Web.Controllers;

/// <summary>Turnirlar — ro'yxat, yaratish, ro'yxatdan o'tish, boshlash, ko'rish.</summary>
public class TournamentsController : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TournamentInfoDto>>> List()
        => Ok(await Mediator.Send(new ListTournamentsQuery()));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TournamentDetailDto>> Get(Guid id)
    {
        var t = await Mediator.Send(new GetTournamentQuery(id));
        return t is null ? NotFound(new { error = "Turnir topilmadi." }) : Ok(t);
    }

    public record CreateTournamentRequest(string Name, int Capacity, DateTime StartAt);

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<object>> Create([FromBody] CreateTournamentRequest req)
    {
        var id = await Mediator.Send(new CreateTournamentCommand(req.Name, req.Capacity, req.StartAt));
        return Ok(new { id });
    }

    [Authorize]
    [HttpPost("{id:guid}/register")]
    public async Task<IActionResult> Register(Guid id)
    {
        await Mediator.Send(new RegisterTournamentCommand(id));
        return Ok();
    }

    [Authorize]
    [HttpPost("{id:guid}/start")]
    public async Task<IActionResult> Start(Guid id)
    {
        await Mediator.Send(new StartTournamentCommand(id));
        return Ok();
    }
}

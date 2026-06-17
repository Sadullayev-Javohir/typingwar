using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TypingWar.Application.Features.Admin;
using TypingWar.Domain.Enums;

namespace TypingWar.Web.Controllers;

/// <summary>Admin paneli — statistika va matn boshqaruvi (faqat Admin roli).</summary>
[Authorize(Roles = "Admin")]
public class AdminController : ApiControllerBase
{
    [HttpGet("stats")]
    public async Task<ActionResult<AdminStatsDto>> Stats()
        => Ok(await Mediator.Send(new GetAdminStatsQuery()));

    public record AddTextRequest(string Content, Difficulty Difficulty);

    [HttpPost("texts")]
    public async Task<ActionResult<object>> AddText([FromBody] AddTextRequest req)
    {
        var id = await Mediator.Send(new AddRaceTextCommand(req.Content, req.Difficulty));
        return Ok(new { id });
    }
}

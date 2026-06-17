using Microsoft.AspNetCore.Mvc;
using TypingWar.Application.Features.Map;

namespace TypingWar.Web.Controllers;

/// <summary>O'zbekiston xaritasi — hududlar statistikasi.</summary>
public class RegionsController : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<RegionMapDto>> Get()
        => Ok(await Mediator.Send(new GetRegionStatsQuery()));
}

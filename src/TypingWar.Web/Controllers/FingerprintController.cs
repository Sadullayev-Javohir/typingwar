using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TypingWar.Application.Features.Fingerprint;

namespace TypingWar.Web.Controllers;

/// <summary>Yozish Pasporti — keystroke timing statistikasi.</summary>
[Authorize]
public class FingerprintController : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<FingerprintDto>> Get()
        => Ok(await Mediator.Send(new GetFingerprintQuery()));

    [HttpPost]
    public async Task<ActionResult<FingerprintDto>> Update([FromBody] UpdateFingerprintCommand command)
        => Ok(await Mediator.Send(command));
}

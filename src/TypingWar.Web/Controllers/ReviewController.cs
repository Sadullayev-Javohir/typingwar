using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TypingWar.Application.Features.Review;

namespace TypingWar.Web.Controllers;

/// <summary>Takroriy mashq — sekin tugmalarga fokuslangan matn.</summary>
[Authorize]
public class ReviewController : ApiControllerBase
{
    [HttpGet("text")]
    public async Task<ActionResult<ReviewTextDto>> Text()
        => Ok(await Mediator.Send(new GetReviewTextQuery()));
}

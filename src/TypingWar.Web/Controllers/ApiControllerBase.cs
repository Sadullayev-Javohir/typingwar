using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace TypingWar.Web.Controllers;

/// <summary>MediatR ga ulangan API kontrollerlari uchun asos.</summary>
[ApiController]
[Route("api/[controller]")]
public abstract class ApiControllerBase : ControllerBase
{
    private ISender? _mediator;
    protected ISender Mediator =>
        _mediator ??= HttpContext.RequestServices.GetRequiredService<ISender>();
}

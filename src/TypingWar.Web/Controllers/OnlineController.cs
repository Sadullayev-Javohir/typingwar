using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TypingWar.Application.Features.Online;
using TypingWar.Web.Hubs;

namespace TypingWar.Web.Controllers;

/// <summary>Onlayn foydalanuvchilar ro'yxati (real-time PresenceHub bilan to'ldiriladi).</summary>
[Authorize]
public class OnlineController : ApiControllerBase
{
    /// <summary>Hozir onlayn bo'lgan foydalanuvchilar (ID, username, o'rtacha WPM, hudud).</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<OnlineUserDto>>> List()
        => Ok(await Mediator.Send(new GetOnlineUsersQuery()));
}

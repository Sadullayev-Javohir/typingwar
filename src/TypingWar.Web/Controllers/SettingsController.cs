using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TypingWar.Application.Features.Settings;

namespace TypingWar.Web.Controllers;

/// <summary>Foydalanuvchi sozlamalari (DB ⇄ LocalStorage sinxronlash).</summary>
public class SettingsController : ApiControllerBase
{
    /// <summary>Joriy sozlamalar (anonim — default qaytadi).</summary>
    [HttpGet]
    public async Task<ActionResult<UserSettingsDto>> Get()
        => Ok(await Mediator.Send(new GetUserSettingsQuery()));

    /// <summary>Sozlamalarni saqlash (faqat tizimga kirgan foydalanuvchi).</summary>
    [Authorize]
    [HttpPut]
    public async Task<ActionResult<UserSettingsDto>> Save([FromBody] UserSettingsDto settings)
        => Ok(await Mediator.Send(new SaveUserSettingsCommand(settings)));
}

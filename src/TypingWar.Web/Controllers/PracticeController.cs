using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Application.Features.Map;
using TypingWar.Application.Features.Practice;
using TypingWar.Domain.Constants;
using TypingWar.Domain.Enums;
using TypingWar.Web.Hubs;

namespace TypingWar.Web.Controllers;

/// <summary>Solo practice — matn olish va natija topshirish.</summary>
public class PracticeController : ApiControllerBase
{
    /// <summary>Test uchun matn (anonim foydalanuvchiga ham ochiq).</summary>
    [HttpGet("text")]
    public async Task<ActionResult<PracticeTextDto>> GetText(
        [FromQuery] TextMode mode = TextMode.Words,
        [FromQuery] Language language = Language.Uzbek,
        [FromQuery] Difficulty difficulty = Difficulty.Normal,
        [FromQuery] int wordCount = 25,
        [FromQuery] string? quoteLength = null)
    {
        var dto = await Mediator.Send(new GetPracticeTextQuery(mode, language, difficulty, wordCount, quoteLength));
        return Ok(dto);
    }

    /// <summary>Tugagan test natijasini saqlash (faqat tizimga kirgan foydalanuvchi).</summary>
    [Authorize]
    [HttpPost("result")]
    public async Task<ActionResult<RaceResultDto>> SubmitResult(
        [FromBody] SubmitResultCommand command,
        [FromServices] ICurrentUserService currentUser,
        [FromServices] IUserProfileReader profile,
        [FromServices] IHubContext<UzMapHub> mapHub,
        CancellationToken ct)
    {
        var dto = await Mediator.Send(command);

        // 30s rejimida yangi shaxsiy rekord → foydalanuvchi hududini xaritada jonli yangilash.
        if (dto.IsNewPersonalBest && command.TimeMode == TimeMode.Thirty && currentUser.UserId is Guid uid)
        {
            var code = await profile.GetRegionCodeAsync(uid, ct);
            if (UzbekistanRegions.IsValid(code))
            {
                var stat = await Mediator.Send(new GetRegionStatQuery(code!), ct);
                if (stat is not null)
                    await mapHub.Clients.Group(UzMapHub.MapGroup).SendAsync("RegionUpdated", stat, ct);
            }
        }

        return Ok(dto);
    }

    /// <summary>Ghost rejimi uchun shaxsiy rekord WPM (anonim — 0).</summary>
    [HttpGet("personalbest")]
    public async Task<ActionResult<object>> PersonalBest([FromQuery] TimeMode timeMode = TimeMode.Thirty)
    {
        var wpm = await Mediator.Send(new GetPersonalBestQuery(timeMode));
        return Ok(new { bestWpm = wpm });
    }
}

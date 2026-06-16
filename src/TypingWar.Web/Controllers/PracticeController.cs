using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TypingWar.Application.Features.Practice;
using TypingWar.Domain.Enums;

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
        [FromQuery] int wordCount = 25)
    {
        var dto = await Mediator.Send(new GetPracticeTextQuery(mode, language, difficulty, wordCount));
        return Ok(dto);
    }

    /// <summary>Tugagan test natijasini saqlash (faqat tizimga kirgan foydalanuvchi).</summary>
    [Authorize]
    [HttpPost("result")]
    public async Task<ActionResult<RaceResultDto>> SubmitResult([FromBody] SubmitResultCommand command)
    {
        var dto = await Mediator.Send(command);
        return Ok(dto);
    }
}

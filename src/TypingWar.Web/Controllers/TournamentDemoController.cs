using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TypingWar.Application.Features.Tournaments;

namespace TypingWar.Web.Controllers;

/// <summary>
/// DEMO/SIMULYATSIYA turniri — 64 ta soxta o'yinchi bilan bracket jarayonini ko'rsatish uchun.
/// Hammasi server tomonida simulyatsiya qilinadi (brauzerda yozuvchi haqiqiy o'yinchi kerak emas),
/// shuning uchun login talab qilinmaydi. /TournamentDemo sahifasi shu endpointlardan foydalanadi.
/// </summary>
[AllowAnonymous]
[Route("api/tournamentdemo")]
public class TournamentDemoController : ApiControllerBase
{
    public record CreateDemoRequest(int? PlayerCount, string? Name);

    /// <summary>64 (yoki berilgan son) soxta o'yinchi bilan yangi demo turnir yaratadi.</summary>
    [HttpPost]
    public async Task<ActionResult<object>> Create([FromBody] CreateDemoRequest? req = null)
    {
        var id = await Mediator.Send(new CreateDemoTournamentCommand(req?.PlayerCount ?? 64, req?.Name));
        return Ok(new { id });
    }

    /// <summary>Turnirni boshlaydi — bracket quriladi (Registration → InProgress).</summary>
    [HttpPost("{id:guid}/start")]
    public async Task<IActionResult> Start(Guid id)
    {
        try { await Mediator.Send(new StartTournamentCommand(id)); return Ok(); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    /// <summary>Joriy raundni simulyatsiya qiladi (har o'yinga tasodifiy WPM, g'olib aniqlanadi).</summary>
    [HttpPost("{id:guid}/round")]
    public async Task<ActionResult<SimulateRoundResult>> Round(Guid id)
    {
        try { return Ok(await Mediator.Send(new SimulateRoundCommand(id))); }
        catch (InvalidOperationException ex) { return BadRequest(new { error = ex.Message }); }
    }

    /// <summary>Demo turnirni o'chiradi (faqat demo turnirlar — haqiqiylariga ta'sir qilmaydi).</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await Mediator.Send(new DeleteDemoTournamentCommand(id));
        return Ok();
    }
}

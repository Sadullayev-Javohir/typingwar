using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Text.Json;
using TypingWar.Application.Features.Tournaments;
using TypingWar.Infrastructure.Realtime;
using TypingWar.Web.Hubs;

namespace TypingWar.Web.Controllers;

/// <summary>Turnirlar — ro'yxat, yaratish, ro'yxatdan o'tish, seed tartibi, ko'rish.
/// Boshlash/raund/g'olib aniqlash real-time TournamentHub orqali (host tekshiruvi bilan).</summary>
public class TournamentsController : ApiControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TournamentInfoDto>>> List()
        => Ok(await Mediator.Send(new ListTournamentsQuery()));

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TournamentDetailDto>> Get(Guid id)
    {
        var t = await Mediator.Send(new GetTournamentQuery(id));
        return t is null ? NotFound(new { error = "Turnir topilmadi." }) : Ok(t);
    }

    public record CreateTournamentRequest(string Name, int Capacity, DateTime StartAt, object? Settings);

    [Authorize]
    [HttpPost]
    public async Task<ActionResult<object>> Create([FromBody] CreateTournamentRequest req)
    {
        var settingsJson = req.Settings is null ? null : JsonSerializer.Serialize(req.Settings);
        var id = await Mediator.Send(new CreateTournamentCommand(req.Name, req.Capacity, req.StartAt, settingsJson));
        return Ok(new { id });
    }

    [Authorize]
    [HttpPost("{id:guid}/register")]
    public async Task<IActionResult> Register(Guid id)
    {
        await Mediator.Send(new RegisterTournamentCommand(id));
        return Ok();
    }

    public record SeedOrderRequest(List<Guid> OrderedUserIds);

    [Authorize]
    [HttpPost("{id:guid}/seed")]
    public async Task<IActionResult> Seed(Guid id, [FromBody] SeedOrderRequest req)
    {
        await Mediator.Send(new SetSeedOrderCommand(id, req.OrderedUserIds ?? new List<Guid>()));
        return Ok();
    }

    public record DropPlayerRequest(Guid UserId);

    /// <summary>Host bracketdan o'yinchini chiqaradi (faqat ro'yxat bosqichida).</summary>
    [Authorize]
    [HttpPost("{id:guid}/drop")]
    public async Task<IActionResult> Drop(Guid id, [FromBody] DropPlayerRequest req)
    {
        await Mediator.Send(new DropTournamentPlayerCommand(id, req.UserId));
        return Ok();
    }

    /// <summary>Host o'z turnirini butunlay o'chiradi (istalgan bosqichda). Tomoshabinlar xabardor qilinadi.</summary>
    [Authorize]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await Mediator.Send(new DeleteTournamentCommand(id));

        // Live holatni tozalash + ulangan tomoshabinlarni xabardor qilish
        var state = HttpContext.RequestServices.GetService<TournamentLiveState>();
        state?.Remove(id);
        var hub = HttpContext.RequestServices.GetService<IHubContext<TournamentHub>>();
        if (hub is not null)
            await hub.Clients.Group($"tour-{id}").SendAsync("TournamentDeleted");

        return Ok();
    }
}

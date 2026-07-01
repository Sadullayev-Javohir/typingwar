using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Application.Features.Admin;
using TypingWar.Domain.Enums;

namespace TypingWar.Web.Controllers;

/// <summary>
/// Admin paneli — statistika, matn, foydalanuvchi va turnir boshqaruvi.
/// Umumiy amallar Admin roli uchun; xavfli amallar (o'chirish, rol berish) faqat SuperAdmin uchun.
/// </summary>
[Authorize(Roles = "Admin")]
public class AdminController : ApiControllerBase
{
    [HttpGet("stats")]
    public async Task<ActionResult<AdminStatsDto>> Stats()
        => Ok(await Mediator.Send(new GetAdminStatsQuery()));

    public record AddTextRequest(string Content, Difficulty Difficulty, string? Source, Language Language = Language.Uzbek);

    [HttpPost("texts")]
    public async Task<ActionResult<object>> AddText([FromBody] AddTextRequest req)
    {
        var id = await Mediator.Send(new AddRaceTextCommand(req.Content, req.Difficulty, req.Source, req.Language));
        return Ok(new { id });
    }

    // ── Foydalanuvchilar ──────────────────────────────────────────

    [HttpGet("users")]
    public async Task<ActionResult<IReadOnlyList<AdminUserDto>>> Users([FromQuery] string? search)
        => Ok(await Mediator.Send(new ListUsersQuery(search)));

    /// <summary>Foydalanuvchini o'chirish — faqat SuperAdmin.</summary>
    [Authorize(Roles = "SuperAdmin")]
    [HttpDelete("users/{id:guid}")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        await Mediator.Send(new DeleteUserCommand(id));
        return Ok(new { ok = true });
    }

    public record SetRoleRequest(bool IsAdmin);

    /// <summary>Admin rolini berish/olib tashlash — faqat SuperAdmin.</summary>
    [Authorize(Roles = "SuperAdmin")]
    [HttpPost("users/{id:guid}/role")]
    public async Task<ActionResult<object>> SetRole(Guid id, [FromBody] SetRoleRequest req)
    {
        var roles = await Mediator.Send(new SetUserRoleCommand(id, req.IsAdmin));
        return Ok(new { roles });
    }

    // ── Turnirlar ─────────────────────────────────────────────────

    [HttpGet("tournaments")]
    public async Task<ActionResult<IReadOnlyList<AdminTournamentDto>>> Tournaments()
        => Ok(await Mediator.Send(new AdminListTournamentsQuery()));

    [HttpDelete("tournaments/{id:guid}")]
    public async Task<IActionResult> DeleteTournament(Guid id)
    {
        await Mediator.Send(new AdminDeleteTournamentCommand(id));
        return Ok(new { ok = true });
    }
}

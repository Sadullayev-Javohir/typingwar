using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Application.Features.Rooms;

namespace TypingWar.Web.Controllers;

/// <summary>Do'stlar xonasi — yaratish va kod bo'yicha tekshirish.</summary>
public class RoomsController : ApiControllerBase
{
    private const string BruteForceAction = "room-code";

    /// <summary>
    /// Yangi xona yaratish (faqat tizimga kirgan foydalanuvchi).
    /// Host tanlagan poyga sozlamalari (til/rejim/so'z soni/uzunlik) xona bilan saqlanadi.
    /// </summary>
    [Authorize]
    [HttpPost]
    public async Task<ActionResult<RoomDto>> Create([FromBody] RoomRaceSettings? settings = null)
    {
        var json = settings is null ? null : JsonSerializer.Serialize(settings);
        return Ok(await Mediator.Send(new CreateRoomCommand(json)));
    }

    /// <summary>
    /// Kod bo'yicha xona mavjudligini tekshirish.
    /// Brute-force himoyasi: kod 4 xonali (10 000 variant) bo'lgani uchun bir IP'dan
    /// ketma-ket xato urinishlar (10 ta / 15 daqiqa) → IP 1 soatga bloklanadi.
    /// </summary>
    [HttpGet("{code}")]
    public async Task<ActionResult<RoomDto>> Get(string code, [FromServices] IBruteForceGuard guard)
    {
        var clientId = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        if (await guard.IsBlockedAsync(BruteForceAction, clientId))
            return StatusCode(StatusCodes.Status429TooManyRequests,
                new { error = "Juda ko'p noto'g'ri kod kiritildi. Birozdan keyin urinib ko'ring." });

        var room = await Mediator.Send(new GetRoomQuery(code));
        if (room is null)
        {
            await guard.RegisterFailureAsync(BruteForceAction, clientId);
            return NotFound(new { error = "Xona topilmadi yoki muddati tugagan." });
        }

        await guard.ResetAsync(BruteForceAction, clientId);
        return Ok(room);
    }
}

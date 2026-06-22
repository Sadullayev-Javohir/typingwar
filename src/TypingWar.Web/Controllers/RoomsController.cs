using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TypingWar.Application.Features.Rooms;

namespace TypingWar.Web.Controllers;

/// <summary>Do'stlar xonasi — yaratish va kod bo'yicha tekshirish.</summary>
public class RoomsController : ApiControllerBase
{
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

    /// <summary>Kod bo'yicha xona mavjudligini tekshirish.</summary>
    [HttpGet("{code}")]
    public async Task<ActionResult<RoomDto>> Get(string code)
    {
        var room = await Mediator.Send(new GetRoomQuery(code));
        return room is null ? NotFound(new { error = "Xona topilmadi yoki muddati tugagan." }) : Ok(room);
    }
}

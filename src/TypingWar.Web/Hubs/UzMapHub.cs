using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using TypingWar.Application.Features.Map;

namespace TypingWar.Web.Hubs;

/// <summary>
/// O'zbekiston xaritasi — hududlar statistikasi real-time. Tomoshabinlar JoinMap bilan
/// guruhga qo'shiladi; natija kelganda o'sha hudud yangilanishi barchaga uzatiladi.
/// </summary>
[AllowAnonymous]
public class UzMapHub : Hub
{
    private const string MapGroup = "uzmap";

    private readonly ISender _mediator;

    public UzMapHub(ISender mediator) => _mediator = mediator;

    public Task JoinMap() => Groups.AddToGroupAsync(Context.ConnectionId, MapGroup);

    /// <summary>Natijani foydalanuvchi hududiga qo'shadi va xaritani yangilaydi.</summary>
    public async Task ReportResult(double wpm)
    {
        if (Context.User?.FindFirstValue(ClaimTypes.NameIdentifier) is null) return; // anonim — saqlanmaydi

        var updated = await _mediator.Send(new SubmitRegionResultCommand(wpm));
        if (updated is not null)
            await Clients.Group(MapGroup).SendAsync("RegionUpdated", updated);
    }
}

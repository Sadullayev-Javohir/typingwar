using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace TypingWar.Web.Hubs;

/// <summary>
/// O'zbekiston xaritasi — hududlar statistikasi real-time. Tomoshabinlar JoinMap bilan
/// guruhga qo'shiladi; kimdir 30s testni tugatganda o'sha hudud yangilanishi (server tomonidan,
/// MapBroadcaster orqali) barchaga uzatiladi. Xaritada yozish maydoni yo'q.
/// </summary>
[AllowAnonymous]
public class UzMapHub : Hub
{
    public const string MapGroup = "uzmap";

    public Task JoinMap() => Groups.AddToGroupAsync(Context.ConnectionId, MapGroup);
}

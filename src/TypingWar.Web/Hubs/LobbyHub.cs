using System.Security.Claims;
using System.Text.Json;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Application.Features.Rooms;
using TypingWar.Domain.Constants;
using TypingWar.Domain.Enums;
using TypingWar.Domain.Services;
using TypingWar.Infrastructure.Realtime;

namespace TypingWar.Web.Hubs;

/// <summary>
/// Do'stlar xonasi: qo'shilish, kutish, host boshlashi, 3-2-1 countdown,
/// live progress va natijalar. Mehmonlar (anonim) ham qo'shila oladi.
/// </summary>
[AllowAnonymous]
public class LobbyHub : Hub
{
    private readonly RoomLiveState _state;
    private readonly ISender _mediator;
    private readonly ITextProvider _textProvider;
    private readonly IApplicationDbContext _db;
    private readonly ICacheService _cache;
    private readonly IHubContext<LobbyHub> _hub;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IOnlineUserProvider _online;

    public LobbyHub(RoomLiveState state, ISender mediator, ITextProvider textProvider,
        IApplicationDbContext db, ICacheService cache,
        IHubContext<LobbyHub> hub, IServiceScopeFactory scopeFactory, IOnlineUserProvider online)
    {
        _state = state;
        _mediator = mediator;
        _textProvider = textProvider;
        _db = db;
        _cache = cache;
        _hub = hub;
        _scopeFactory = scopeFactory;
        _online = online;
    }

    private Guid? UserId =>
        Guid.TryParse(Context.User?.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;

    private static object View(RoomPlayerLive p) => new
    {
        connId = p.ConnectionId,
        name = p.Name,
        isHost = p.IsHost,
        colorIndex = p.ColorIndex,
        progress = p.Progress,
        wpm = p.Wpm,
        rawWpm = p.RawWpm,
        accuracy = p.Accuracy,
        finished = p.Finished,
        place = p.Place,
        wpmSeries = p.WpmSeries
    };

    public async Task JoinRoom(string code, string? displayName)
    {
        code = code.ToUpperInvariant();

        var room = await _mediator.Send(new GetRoomQuery(code));
        if (room is null)
        {
            await Clients.Caller.SendAsync("Error", "Xona topilmadi yoki muddati tugagan.");
            return;
        }

        var live = _state.GetOrCreate(code, room.RoomId, room.HostId);
        live.Settings = room.Settings; // host tanlagan poyga sozlamalari (matn turi/til/uzunlik)

        var uid = UserId;
        bool isHost = uid.HasValue && uid.Value == room.HostId;
        var name = ResolveName(displayName, isHost);

        // Host qaytib ulandi (masalan sahifani yangiladi) — kutilayotgan yopishni bekor qil
        if (isHost)
        {
            live.HostGraceCts?.Cancel();
            live.HostGraceCts = null;
        }

        // Refresh seamless bo'lishi uchun: shu foydalanuvchining eski (uzilayotgan) ulanishlarini
        // olib tashlaymiz va boshqalarni xabardor qilamiz — aks holda dublikat mushuk qoladi.
        int? reuseColor = null;
        if (uid.HasValue)
        {
            foreach (var kv in live.Players.Where(x => x.Value.UserId == uid && x.Key != Context.ConnectionId).ToList())
            {
                if (live.Players.TryRemove(kv.Key, out var old))
                {
                    reuseColor ??= old.ColorIndex; // refreshda rang o'zgarmasin
                    await Groups.RemoveFromGroupAsync(kv.Key, code);
                    await Clients.Group(code).SendAsync("PlayerLeft", new { connId = kv.Key, name = old.Name });
                }
            }
        }

        var player = new RoomPlayerLive
        {
            ConnectionId = Context.ConnectionId,
            UserId = uid,
            Name = name,
            IsHost = isHost
        };

        // Rangni ATOMAR tayinlash + qo'shish — bir vaqtda kirgan o'yinchilar bir xil rang
        // OLMASLIGI uchun (har birida alohida rang kafolatlanadi). Lock ichida await yo'q.
        lock (live.ColorLock)
        {
            var used = live.Players.Values.Select(p => p.ColorIndex).ToHashSet();
            if (isHost)
                player.ColorIndex = 0;                       // host doim oltin slot
            else if (reuseColor is int rc && !used.Contains(rc))
                player.ColorIndex = rc;                      // refreshda eski rang (agar hali bo'sh)
            else
            {
                var idx = 1;                                 // 0 — host uchun band
                while (used.Contains(idx)) idx++;            // eng kichik bo'sh slot
                player.ColorIndex = idx;
            }
            live.Players[Context.ConnectionId] = player;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, code);

        await Clients.Caller.SendAsync("RoomState", new
        {
            code,
            isHost,
            status = live.Status.ToString(),
            // Poyga allaqachon ketayotgan bo'lsa — joriy matnni ham yuboramiz. Shunda kech
            // qo'shilgan / qayta ulangan o'yinchi lobbyda qotib qolmasdan poygaga ulanadi
            // (host "Boshlash"ni bosgan lahzada guruhda bo'lmagan bo'lsa ham).
            text = live.Status is RoomStatus.Countdown or RoomStatus.InProgress ? live.TextContent : null,
            players = live.Players.Values.Select(View).ToList()
        });
        await Clients.OthersInGroup(code).SendAsync("PlayerJoined", View(player));
    }

    public async Task StartRace(string code)
    {
        code = code.ToUpperInvariant();
        if (!_state.TryGet(code, out var live)) return;

        if (!live.Players.TryGetValue(Context.ConnectionId, out var me) || !me.IsHost)
        {
            await Clients.Caller.SendAsync("Error", "Faqat host poygani boshlay oladi.");
            return;
        }
        // Host istalgan vaqtda YANGI poyga boshlay oladi — masalan, kimdir umuman yozmay
        // tursa va poyga "tugamay" qolsa, host "Qaytadan boshlash"ni bosib hammani yangi
        // poygaga o'tkazadi. Countdown — bir lahzalik o'tish oynasi, takror bosishdan himoya.
        if (live.Status is RoomStatus.Countdown) return;

        var text = await _textProvider.GetAsync(BuildTextRequest(live.Settings));
        live.TextContent = text.Content;
        live.TextId = text.TextId;
        live.FinishOrder = 0;
        live.Round++;   // yangi poyga — sabotaj guard yangilanadi
        foreach (var p in live.Players.Values)
        {
            p.Finished = false; p.Progress = 0; p.Wpm = 0; p.RawWpm = 0; p.Accuracy = 0; p.Place = null;
            p.WpmSeries = Array.Empty<double>();
        }

        live.Status = RoomStatus.Countdown;
        await Clients.Group(code).SendAsync("RaceStarting", new { text = live.TextContent, countdown = 3 });
        live.Status = RoomStatus.InProgress;

        // Poyga 5 daqiqada tugamasa — xona avtomatik o'chadi (taymerni qayta o'rnatamiz)
        ScheduleRaceTimeout(live, code);
    }

    /// <summary>Host tanlagan sozlamalardan (JSON) matn so'rovini quradi. Xatolik bo'lsa — standart (o'zbek iqtibos).</summary>
    private static PracticeTextRequest BuildTextRequest(string settingsJson)
    {
        RoomRaceSettings s;
        try { s = JsonSerializer.Deserialize<RoomRaceSettings>(settingsJson) ?? new RoomRaceSettings(); }
        catch { s = new RoomRaceSettings(); }

        var mode = Enum.TryParse<TextMode>(s.TextMode, true, out var m) ? m : TextMode.Sentences;
        var lang = Enum.TryParse<Language>(s.Language, true, out var l) ? l : Language.Uzbek;
        var count = s.WordCount is >= 5 and <= 200 ? s.WordCount : 25;
        return new PracticeTextRequest(mode, lang, Difficulty.Normal, count, s.QuoteLength);
    }

    public async Task ReportProgress(string code, double progress, double wpm)
    {
        code = code.ToUpperInvariant();
        if (!_state.TryGet(code, out var live)) return;
        if (!live.Players.TryGetValue(Context.ConnectionId, out var p)) return;

        p.Progress = progress;
        p.Wpm = wpm;
        await Clients.OthersInGroup(code).SendAsync("ProgressUpdate", new
        {
            connId = Context.ConnectionId, name = p.Name, progress, wpm
        });
    }

    /// <summary>
    /// Raqibga sabotaj effekti yuboradi. Faqat poyga davomida, 3+ o'yinchi bo'lsa,
    /// har o'yinchi poygada faqat 1 marta (Redis guard). Effekt vizual — klient qo'llaydi.
    /// </summary>
    public async Task SabotageAttack(string code, string targetConnId, string sabotageType)
    {
        code = code.ToUpperInvariant();
        if (!_state.TryGet(code, out var live)) return;

        if (live.Status != RoomStatus.InProgress)
        {
            await Clients.Caller.SendAsync("Error", "Sabotaj faqat poyga davomida ishlaydi.");
            return;
        }
        if (live.Players.Count < GameConstants.MinPlayersForSabotage)
        {
            await Clients.Caller.SendAsync("Error",
                $"Sabotaj uchun kamida {GameConstants.MinPlayersForSabotage} o'yinchi kerak.");
            return;
        }
        if (!live.Players.TryGetValue(Context.ConnectionId, out var attacker) || attacker.Finished)
            return;
        if (targetConnId == Context.ConnectionId)
        {
            await Clients.Caller.SendAsync("Error", "O'zingizga sabotaj qila olmaysiz.");
            return;
        }
        if (!live.Players.TryGetValue(targetConnId, out var target) || target.Finished)
        {
            await Clients.Caller.SendAsync("Error", "Nishon mavjud emas yoki poygani tugatgan.");
            return;
        }

        // Redis guard — bitta poyga (round) = bitta sabotaj
        var guardKey = $"sab:{live.RoomId}:{live.Round}:{Context.ConnectionId}";
        if (await _cache.KeyExistsAsync(guardKey))
        {
            await Clients.Caller.SendAsync("Error", "Bu poygada sabotajni allaqachon ishlatdingiz.");
            return;
        }
        await _cache.SetStringAsync(guardKey, "1", TimeSpan.FromMinutes(GameConstants.RoomCodeTtlMinutes));

        var type = SabotageRules.Parse(sabotageType);
        var duration = SabotageRules.DurationSeconds(type);

        // Nishonga effekt
        await Clients.Client(targetConnId).SendAsync("Sabotaged", new
        {
            type = type.ToString(),
            durationSeconds = duration,
            from = attacker.Name
        });
        // Hammaga e'lon (lenta) — yuboruvchining tugmasi bloklanadi
        await Clients.Group(code).SendAsync("SabotageUsed", new
        {
            from = attacker.Name,
            fromConn = Context.ConnectionId,
            to = target.Name,
            toConn = targetConnId,
            type = type.ToString()
        });
    }

    public async Task FinishRace(string code, double wpm, double rawWpm, double accuracy, double[]? wpmSeries = null)
    {
        code = code.ToUpperInvariant();
        if (!_state.TryGet(code, out var live)) return;
        if (!live.Players.TryGetValue(Context.ConnectionId, out var p) || p.Finished) return;

        p.Finished = true;
        p.Wpm = wpm;
        p.RawWpm = rawWpm;
        p.Accuracy = accuracy;
        // Soniyalik WPM qatori (natija grafigi) — ishonchsiz uzunlikni cheklaymiz (5 daqiqa = 300s)
        p.WpmSeries = wpmSeries is { Length: > 0 } ? wpmSeries.Take(300).ToArray() : Array.Empty<double>();
        p.Progress = 100;
        p.Place = Interlocked.Increment(ref live.FinishOrder);   // vaqtinchalik: kelish tartibi (teng holatda tiebreak)

        await Clients.Group(code).SendAsync("PlayerFinished", View(p));

        if (live.Players.Values.All(x => x.Finished))
        {
            live.RaceTimeoutCts?.Cancel();   // hamma tugatdi — taymer kerak emas
            live.Status = RoomStatus.Finished;
            var results = RankedResults(live).Select(View).ToList();
            await Clients.Group(code).SendAsync("RaceFinished", results);
            await PersistFinishedAsync(live);
        }
    }

    /// <summary>
    /// Yakuniy o'rinlarni ADOLATLI belgilaydi (kelish tartibi bo'yicha EMAS): aniqlik
    /// darvozasidan (&gt;={minAcc}%) o'tib, to'g'ri belgi yozgan o'yinchilar oldinda — WPM
    /// bo'yicha; keyin o'tmaganlar. Shunday qilib "Xatoda to'xtash" o'chiq bo'lsa, hammasini
    /// xato yozib tez "tugatgan" o'yinchi birinchi o'rinni OLMAYDI. Teng bo'lsa avval tugatgan.
    /// </summary>
    private static List<RoomPlayerLive> RankedResults(RoomLive live)
    {
        var ranked = live.Players.Values
            .OrderByDescending(p => p.Accuracy >= GameConstants.MinValidAccuracy && p.Wpm > 0)
            .ThenByDescending(p => p.Wpm)
            .ThenByDescending(p => p.Accuracy)
            .ThenBy(p => p.Place ?? int.MaxValue)
            .ToList();
        for (int i = 0; i < ranked.Count; i++) ranked[i].Place = i + 1;
        return ranked;
    }

    public async Task LeaveRoom(string code)
    {
        code = code.ToUpperInvariant();
        // Tugma orqali chiqish — bu aniq tark etish, darrov yopamiz (refresh emas).
        await RemoveConnection(code, Context.ConnectionId, immediate: true);
    }

    /// <summary>
    /// Xona ichida ishtirokchilar o'rtasida umumiy chat xabari. Barcha a'zolarga
    /// (yuboruvchi ham) <c>RoomMessage</c> sifatida yuboriladi.
    /// </summary>
    public async Task SendRoomMessage(string code, string text)
    {
        code = code.ToUpperInvariant();
        if (!_state.TryGet(code, out var live)) return;
        if (!live.Players.TryGetValue(Context.ConnectionId, out var me)) return;

        var clean = (text ?? "").Trim();
        if (clean.Length == 0) return;
        if (clean.Length > 280) clean = clean[..280];

        string? avatar = null;
        if (me.UserId is Guid uid)
            avatar = _online.Get(uid)?.AvatarUrl;

        await Clients.Group(code).SendAsync("RoomMessage", new
        {
            userId = me.UserId?.ToString(),
            name = me.Name,
            avatar,
            text = clean,
            at = DateTime.UtcNow.ToString("HH:mm")
        });
    }

    /// <summary>
    /// Mehmonga (host emas) "qaytadan boshlash" so'rovi: host ga <c>OpponentWantsRestart</c>
    /// xabari yuboriladi ("X qaytadan boshlashni xohlaydi"). Host o'zining "Boshlash"
    /// tugmasini bosib yangi poyga boshlaydi. Hostning o'zi bu orqali emas, to'g'ridan-to'g'ri
    /// <c>StartRace</c> chaqiradi.
    /// </summary>
    public async Task RequestRestart(string code)
    {
        code = code.ToUpperInvariant();
        if (!_state.TryGet(code, out var live)) return;
        if (!live.Players.TryGetValue(Context.ConnectionId, out var me)) return;
        if (me.IsHost) return; // host o'zi boshlashi kerak

        var host = live.Players.Values.FirstOrDefault(p => p.IsHost);
        if (host is null) return;

        await Clients.Client(host.ConnectionId).SendAsync("OpponentWantsRestart", new
        {
            fromUserId = me.UserId?.ToString(),
            fromName = me.Name
        });
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var live = _state.FindByConnection(Context.ConnectionId);
        if (live is not null)
            // Uzilish refresh/tarmoq bo'lishi mumkin — host bo'lsa grace beramiz.
            await RemoveConnection(live.Code, Context.ConnectionId, immediate: false);
        await base.OnDisconnectedAsync(exception);
    }

    /// <param name="immediate">
    /// true — host darrov xonani yopadi (tugma orqali chiqish). false — host uzildi
    /// (refresh/tarmoq bo'lishi mumkin): grace taymeri qo'yiladi, host qaytib ulansa xona saqlanadi.
    /// </param>
    private async Task RemoveConnection(string code, string connectionId, bool immediate)
    {
        if (!_state.TryGet(code, out var live)) return;

        // Tugma orqali emas, uzilish (immediate=false) bo'lsa: oddiy o'yinchini DARROV o'chirmaymiz —
        // bu SignalR avto-qayta ulanishi / refresh / qisqa tarmoq uzilishi bo'lishi mumkin. Grace
        // soniyalari ichida o'yinchi qaytib ulansa (yangi connId bilan) eski connId baribir grace
        // tugagach tozalanadi, lekin o'yinchi poygadan tushib qolmaydi va natija ro'yxatidan yo'qolmaydi.
        if (!immediate && live.Players.TryGetValue(connectionId, out var existing) && !existing.IsHost)
        {
            await Groups.RemoveFromGroupAsync(connectionId, code);
            ScheduleMemberGraceRemoval(code, connectionId);
            return;
        }

        if (live.Players.TryRemove(connectionId, out var p))
        {
            await Groups.RemoveFromGroupAsync(connectionId, code);
            await Clients.Group(code).SendAsync("PlayerLeft", new { connId = connectionId, name = p.Name });

            // Host xonani tark etsa — kod butunlay o'chadi va qayta ishlatib bo'lmaydi.
            if (p.IsHost)
            {
                if (immediate)
                    await CloseRoomAsync(live, p.Name);
                else
                    ScheduleHostGraceClose(live, p.Name);   // refresh bo'lishi mumkin — kutamiz
                return;
            }
        }
        _state.RemoveIfEmpty(code);
    }

    /// <summary>
    /// Oddiy o'yinchi uzilganda darrov o'chirmaydi: grace soniyalaridan keyin (agar shu connId hali
    /// xonada bo'lsa — ya'ni qaytib ulanmagan bo'lsa) o'chiradi va xabardor qiladi. Agar bu paytda
    /// poyga davom etayotgan bo'lib, qolganlar allaqachon tugatgan bo'lsa — natija oynasini chiqaradi
    /// (aks holda ketgan o'yinchi tufayli poyga hech qachon "tugamasdi"). Hub instansiyasi transient,
    /// shuning uchun fire-and-forget Task + _hub + yangi DI scope ishlatamiz.
    /// </summary>
    private void ScheduleMemberGraceRemoval(string code, string connectionId)
    {
        var hub = _hub;
        var state = _state;
        var scopeFactory = _scopeFactory;

        _ = Task.Run(async () =>
        {
            try { await Task.Delay(TimeSpan.FromSeconds(GameConstants.RoomMemberReconnectGraceSeconds)); }
            catch { }

            if (!state.TryGet(code, out var live)) return;
            // O'yinchi shu vaqt ichida qaytib ulanmadi? (qaytsa eski connId JoinRoom'da olib tashlanadi)
            if (!live.Players.TryRemove(connectionId, out var p)) return;

            await hub.Clients.Group(code).SendAsync("PlayerLeft", new { connId = connectionId, name = p.Name });

            // Ketgan o'yinchi tufayli poyga "All Finished" ga yetmay qolgan bo'lishi mumkin — qayta tekshir.
            if (live.Status == RoomStatus.InProgress && !live.Players.IsEmpty &&
                live.Players.Values.All(x => x.Finished))
            {
                live.RaceTimeoutCts?.Cancel();
                live.Status = RoomStatus.Finished;
                var results = RankedResults(live).Select(View).ToList();
                await hub.Clients.Group(code).SendAsync("RaceFinished", results);

                using var scope = scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
                var room = await db.Rooms.FirstOrDefaultAsync(r => r.Id == live.RoomId);
                if (room is not null) { room.Status = RoomStatus.Finished; await db.SaveChangesAsync(); }
            }

            state.RemoveIfEmpty(code);
        });
    }

    /// <summary>
    /// Host uzilganda (refresh/tarmoq) xonani darrov yopmaydi: grace soniyalari ichida
    /// host qaytib ulansa (JoinRoom HostGraceCts ni bekor qiladi) xona saqlanadi.
    /// Aks holda — xona yopiladi (Redis kod o'chadi, DB Expired, o'yinchilar xabardor).
    /// </summary>
    private void ScheduleHostGraceClose(RoomLive live, string hostName)
    {
        live.HostGraceCts?.Cancel();
        var cts = new CancellationTokenSource();
        live.HostGraceCts = cts;

        var hub = _hub;
        var scopeFactory = _scopeFactory;
        var state = _state;
        var code = live.Code;

        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(GameConstants.RoomHostReconnectGraceSeconds), cts.Token);
            }
            catch (OperationCanceledException) { return; } // host qaytib keldi (refresh) — yopmaymiz

            // Host shu vaqt ichida qaytib ulanmadi? (qaytsa Players da host bo'lardi)
            if (live.Players.Values.Any(x => x.IsHost)) return;

            live.RaceTimeoutCts?.Cancel();

            using var scope = scopeFactory.CreateScope();
            var cache = scope.ServiceProvider.GetRequiredService<ICacheService>();
            var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

            await cache.RemoveAsync(CreateRoomCommandHandler.RoomKey(code));

            var room = await db.Rooms.FirstOrDefaultAsync(r => r.Id == live.RoomId);
            if (room is not null && room.Status != RoomStatus.Finished)
            {
                room.Status = RoomStatus.Expired;
                await db.SaveChangesAsync();
            }

            await hub.Clients.Group(code).SendAsync("RoomClosed", new
            {
                reason = $"Xona egasi ({hostName}) chiqdi — xona yopildi va kod o'chirildi."
            });

            state.Remove(code);
        });
    }

    /// <summary>
    /// Host chiqib xona yopilganda: Redis kodini o'chiradi (yangi qo'shilish to'xtaydi),
    /// DB da xonani Expired deb belgilaydi (GetRoom endi null qaytaradi), qolgan
    /// o'yinchilarni xabardor qiladi va live holatdan o'chiradi.
    /// </summary>
    private async Task CloseRoomAsync(RoomLive live, string hostName)
    {
        live.RaceTimeoutCts?.Cancel();   // xona yopildi — poyga taymeri kerak emas
        live.HostGraceCts?.Cancel();     // grace taymeri ham kerak emas

        // 1) Redis kodini o'chir — bu kod orqali boshqa hech kim qo'shila olmaydi
        await _cache.RemoveAsync(CreateRoomCommandHandler.RoomKey(live.Code));

        // 2) DB da xonani Expired deb belgila (yakunlangan poyga holatiga tegmaymiz)
        var room = await _db.Rooms.FirstOrDefaultAsync(r => r.Id == live.RoomId);
        if (room is not null && room.Status != RoomStatus.Finished)
        {
            room.Status = RoomStatus.Expired;
            await _db.SaveChangesAsync();
        }

        // 3) Qolgan o'yinchilarni xabardor qil (klient ularni xonadan chiqaradi)
        await Clients.Group(live.Code).SendAsync("RoomClosed", new
        {
            reason = $"Xona egasi ({hostName}) chiqdi — xona yopildi va kod o'chirildi."
        });

        // 4) Live registrdan butunlay olib tashla
        _state.Remove(live.Code);
    }

    /// <summary>
    /// Poyga boshlangach 5 daqiqalik taymer qo'yadi. Bu vaqtda hamma tugatmasa
    /// (kimdir yozib bo'lmasa) — xona avtomatik o'chiriladi va o'yinchilar xabardor qilinadi.
    /// Hub instansiyasi har chaqiruvda yangilanadi, shuning uchun taymer fire-and-forget
    /// Task sifatida ishlaydi va yopish ishlarini yangi DI scope ichida bajaradi.
    /// </summary>
    private void ScheduleRaceTimeout(RoomLive live, string code)
    {
        live.RaceTimeoutCts?.Cancel();
        var cts = new CancellationTokenSource();
        live.RaceTimeoutCts = cts;

        var round = live.Round;                 // shu poyga uchun amal qiladi
        var hub = _hub;
        var scopeFactory = _scopeFactory;
        var state = _state;

        _ = Task.Run(async () =>
        {
            try
            {
                await Task.Delay(TimeSpan.FromMinutes(GameConstants.RoomRaceTimeoutMinutes), cts.Token);
            }
            catch (OperationCanceledException) { return; } // hamma tugatdi / xona yopildi

            // Hali ham o'sha poyga davom etyaptimi?
            if (live.Round != round || live.Status != RoomStatus.InProgress) return;

            live.Status = RoomStatus.Expired;

            using var scope = scopeFactory.CreateScope();
            var cache = scope.ServiceProvider.GetRequiredService<ICacheService>();
            var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();

            await cache.RemoveAsync(CreateRoomCommandHandler.RoomKey(code));

            var room = await db.Rooms.FirstOrDefaultAsync(r => r.Id == live.RoomId);
            if (room is not null && room.Status != RoomStatus.Finished)
            {
                room.Status = RoomStatus.Expired;
                await db.SaveChangesAsync();
            }

            await hub.Clients.Group(code).SendAsync("RoomClosed", new
            {
                reason = $"Poyga {GameConstants.RoomRaceTimeoutMinutes} daqiqada tugamadi — xona avtomatik o'chirildi."
            });

            state.Remove(code);
        });
    }

    private async Task PersistFinishedAsync(RoomLive live)
    {
        var room = await _db.Rooms.FirstOrDefaultAsync(r => r.Id == live.RoomId);
        if (room is null) return;
        room.Status = RoomStatus.Finished;
        await _db.SaveChangesAsync();
    }

    private string ResolveName(string? displayName, bool isHost)
    {
        var claimName = Context.User?.FindFirstValue(ClaimTypes.Name);
        if (!string.IsNullOrWhiteSpace(claimName)) return claimName;
        if (!string.IsNullOrWhiteSpace(displayName)) return displayName.Trim()[..Math.Min(displayName.Trim().Length, 24)];
        return "Mehmon-" + Context.ConnectionId[..4];
    }
}

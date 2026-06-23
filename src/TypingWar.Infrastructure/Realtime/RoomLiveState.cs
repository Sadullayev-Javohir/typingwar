using System.Collections.Concurrent;
using TypingWar.Domain.Enums;

namespace TypingWar.Infrastructure.Realtime;

/// <summary>Live xonadagi bitta o'yinchi (ephemeral — SignalR sessiyasi davomida).</summary>
public class RoomPlayerLive
{
    public string ConnectionId { get; init; } = string.Empty;
    public Guid? UserId { get; init; }
    public string Name { get; set; } = "Mehmon";
    public bool IsHost { get; set; }
    public double Progress { get; set; }
    public double Wpm { get; set; }
    public double RawWpm { get; set; }
    public double Accuracy { get; set; }
    public bool Finished { get; set; }
    public int? Place { get; set; }
    /// <summary>Soniyalik net WPM qatori (natija grafigi uchun — klient yuboradi).</summary>
    public double[] WpmSeries { get; set; } = Array.Empty<double>();
}

/// <summary>Live xona holati (in-memory).</summary>
public class RoomLive
{
    public Guid RoomId { get; init; }
    public string Code { get; init; } = string.Empty;
    public Guid HostId { get; init; }
    public RoomStatus Status { get; set; } = RoomStatus.Waiting;
    public string Settings { get; set; } = "{}"; // host tanlagan poyga sozlamalari (JSON)
    public string? TextContent { get; set; }
    public Guid? TextId { get; set; }
    public int FinishOrder; // Interlocked bilan oshiriladi
    public int Round;        // har StartRace da oshadi — sabotaj guard ni poygaga bog'laydi
    public CancellationTokenSource? RaceTimeoutCts; // poyga 5 daqiqada tugamasa — xona o'chadi
    public CancellationTokenSource? HostGraceCts;   // host uzilgach grace taymeri (refresh bo'lishi mumkin)
    public ConcurrentDictionary<string, RoomPlayerLive> Players { get; } = new();
}

/// <summary>
/// Barcha live xonalar registri (singleton, in-memory). Bitta server instansiyasi uchun.
/// Ko'p instansiya kerak bo'lsa — Redis backplane.
/// </summary>
public class RoomLiveState
{
    public ConcurrentDictionary<string, RoomLive> Rooms { get; } = new(StringComparer.OrdinalIgnoreCase);

    public RoomLive GetOrCreate(string code, Guid roomId, Guid hostId)
        => Rooms.GetOrAdd(code, _ => new RoomLive { RoomId = roomId, Code = code, HostId = hostId });

    public bool TryGet(string code, out RoomLive room) => Rooms.TryGetValue(code, out room!);

    /// <summary>Berilgan connection qaysi xonada ekanini topadi (disconnect uchun).</summary>
    public RoomLive? FindByConnection(string connectionId)
        => Rooms.Values.FirstOrDefault(r => r.Players.ContainsKey(connectionId));

    public void RemoveIfEmpty(string code)
    {
        if (Rooms.TryGetValue(code, out var r) && r.Players.IsEmpty)
            Rooms.TryRemove(code, out _);
    }

    /// <summary>Xonani live registrdan butunlay olib tashlaydi (host chiqib xona yopilganda).</summary>
    public void Remove(string code) => Rooms.TryRemove(code, out _);
}

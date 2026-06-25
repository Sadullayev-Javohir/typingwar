using System.Collections.Concurrent;

namespace TypingWar.Infrastructure.Realtime;

/// <summary>Live o'yindagi bitta tomon (ephemeral — round davomida).</summary>
public class MatchSlotLive
{
    public Guid UserId { get; init; }
    public string Name { get; set; } = "—";
    public double Progress { get; set; }
    public double Wpm { get; set; }
    public double RawWpm { get; set; }
    public double Accuracy { get; set; }
    public bool Finished { get; set; }
    public double[] WpmSeries { get; set; } = Array.Empty<double>();
}

/// <summary>Live raceable o'yin (joriy round davomida ikkala tomon yozadi).</summary>
public class MatchLive
{
    public Guid MatchId { get; init; }
    public int Round { get; init; }
    public int Slot { get; init; }
    public MatchSlotLive P1 { get; init; } = new();
    public MatchSlotLive P2 { get; init; } = new();
    public bool Decided { get; set; }
    public Guid? WinnerId { get; set; }

    public MatchSlotLive? SlotFor(Guid userId) =>
        P1.UserId == userId ? P1 : P2.UserId == userId ? P2 : null;
    public bool BothFinished => P1.Finished && P2.Finished;
}

/// <summary>Bitta turnirning live holati (in-memory, SignalR sessiyasi davomida).</summary>
public class TournamentLive
{
    public Guid TournamentId { get; init; }
    public Guid HostId { get; set; }
    public string Settings { get; set; } = "{}";

    /// <summary>Joriy faol round (0 = hech qaysi round faol emas).</summary>
    public int ActiveRound { get; set; }
    public string RoundName { get; set; } = string.Empty;
    public string? ActiveText { get; set; }

    /// <summary>Joriy roundning raceable o'yinlari (matchId → live).</summary>
    public ConcurrentDictionary<Guid, MatchLive> Matches { get; } = new();

    /// <summary>O'yinchining grafik rangi (barqaror, UserId bo'yicha).</summary>
    public ConcurrentDictionary<Guid, int> ColorByUser { get; } = new();
    public int ColorCounter;

    public CancellationTokenSource? RoundTimeoutCts;
    public object Lock { get; } = new();

    /// <summary>Berilgan o'yinchi joriy roundda qaysi o'yinda (yo'q bo'lsa null).</summary>
    public MatchLive? FindMatchForUser(Guid userId) =>
        Matches.Values.FirstOrDefault(m => m.P1.UserId == userId || m.P2.UserId == userId);

    public int ColorFor(Guid userId) =>
        ColorByUser.GetOrAdd(userId, _ => Interlocked.Increment(ref ColorCounter) - 1);
}

/// <summary>
/// Barcha turnirlarning live holatlari registri (singleton, in-memory). Bitta server uchun.
/// Turnirning o'zi DB da saqlanadi; bu faqat real-time poyga holatini ushlaydi.
/// </summary>
public class TournamentLiveState
{
    public ConcurrentDictionary<Guid, TournamentLive> Tournaments { get; } = new();

    public TournamentLive GetOrCreate(Guid id, Guid hostId, string settings)
        => Tournaments.GetOrAdd(id, _ => new TournamentLive { TournamentId = id, HostId = hostId, Settings = settings });

    public bool TryGet(Guid id, out TournamentLive live) => Tournaments.TryGetValue(id, out live!);

    public void Remove(Guid id) => Tournaments.TryRemove(id, out _);
}

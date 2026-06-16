using System.Collections.Concurrent;
using TypingWar.Domain.Enums;

namespace TypingWar.Infrastructure.Realtime;

/// <summary>Jamoaviy musobaqadagi live o'yinchi.</summary>
public class TeamPlayerLive
{
    public string ConnectionId { get; init; } = string.Empty;
    public Guid? UserId { get; init; }
    public string Name { get; set; } = "Mehmon";
    public TeamSide Side { get; set; } = TeamSide.A;
    public bool IsHost { get; set; }
    public double Progress { get; set; }
    public double Wpm { get; set; }
    public double Accuracy { get; set; }
    public bool Finished { get; set; }
}

/// <summary>Live jamoaviy musobaqa holati (in-memory).</summary>
public class TeamRaceLive
{
    public Guid TeamRaceId { get; init; }
    public string Code { get; init; } = string.Empty;
    public Guid HostId { get; init; }
    public RaceStatus Status { get; set; } = RaceStatus.Waiting;
    public string? TextContent { get; set; }
    public Guid? TextId { get; set; }
    public ConcurrentDictionary<string, TeamPlayerLive> Players { get; } = new();

    public int CountSide(TeamSide side) => Players.Values.Count(p => p.Side == side);
    public double TeamScore(TeamSide side) => Players.Values.Where(p => p.Side == side).Sum(p => p.Wpm);
}

/// <summary>Barcha live jamoaviy musobaqalar registri (singleton, in-memory).</summary>
public class TeamRaceLiveState
{
    public ConcurrentDictionary<string, TeamRaceLive> Races { get; } = new(StringComparer.OrdinalIgnoreCase);

    public TeamRaceLive GetOrCreate(string code, Guid raceId, Guid hostId)
        => Races.GetOrAdd(code, _ => new TeamRaceLive { TeamRaceId = raceId, Code = code, HostId = hostId });

    public bool TryGet(string code, out TeamRaceLive race) => Races.TryGetValue(code, out race!);

    public TeamRaceLive? FindByConnection(string connectionId)
        => Races.Values.FirstOrDefault(r => r.Players.ContainsKey(connectionId));

    public void RemoveIfEmpty(string code)
    {
        if (Races.TryGetValue(code, out var r) && r.Players.IsEmpty)
            Races.TryRemove(code, out _);
    }
}

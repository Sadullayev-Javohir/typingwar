using TypingWar.Domain.Common;
using TypingWar.Domain.Enums;

namespace TypingWar.Domain.Entities;

/// <summary>Turnir (16/32 kishilik bracket).</summary>
public class Tournament : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public TournamentStatus Status { get; set; } = TournamentStatus.Registration;
    public BracketType BracketType { get; set; } = BracketType.SingleElimination;
    public DateTime StartAt { get; set; }
    /// <summary>Bracket sig'imi — 2 darajasi (4/8/16/32).</summary>
    public int Capacity { get; set; } = 16;
    /// <summary>G'olib (turnir tugagach).</summary>
    public Guid? ChampionId { get; set; }
    /// <summary>Turnir sozlamalari (JSON).</summary>
    public string Settings { get; set; } = "{}";

    public ICollection<TournamentMatch> Matches { get; set; } = new List<TournamentMatch>();
    public ICollection<TournamentPlayer> Players { get; set; } = new List<TournamentPlayer>();
}

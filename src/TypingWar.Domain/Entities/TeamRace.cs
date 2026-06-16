using TypingWar.Domain.Common;
using TypingWar.Domain.Enums;

namespace TypingWar.Domain.Entities;

/// <summary>5x5 jamoaviy musobaqa.</summary>
public class TeamRace : BaseEntity
{
    public RaceStatus Status { get; set; } = RaceStatus.Waiting;
    public double TeamAScore { get; set; }
    public double TeamBScore { get; set; }
    public Guid? TextId { get; set; }
    public DateTime? StartedAt { get; set; }

    public ICollection<TeamMember> Members { get; set; } = new List<TeamMember>();
}

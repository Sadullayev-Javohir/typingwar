using TypingWar.Domain.Enums;

namespace TypingWar.Domain.Entities;

/// <summary>Jamoaviy musobaqa a'zosi.</summary>
public class TeamMember
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TeamRaceId { get; set; }
    public TeamRace? TeamRace { get; set; }
    public Guid UserId { get; set; }
    public TeamSide Team { get; set; }
    public double Wpm { get; set; }
    public double Accuracy { get; set; }
}

namespace TypingWar.Domain.Entities;

/// <summary>Turnir bracketidagi bitta o'yin.</summary>
public class TournamentMatch
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TournamentId { get; set; }
    public Tournament? Tournament { get; set; }
    public int Round { get; set; }
    public Guid? Player1Id { get; set; }
    public Guid? Player2Id { get; set; }
    public Guid? WinnerId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

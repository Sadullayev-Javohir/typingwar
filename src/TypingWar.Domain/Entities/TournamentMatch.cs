namespace TypingWar.Domain.Entities;

/// <summary>Turnir bracketidagi bitta o'yin.</summary>
public class TournamentMatch
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TournamentId { get; set; }
    public Tournament? Tournament { get; set; }
    public int Round { get; set; }
    /// <summary>Round ichidagi pozitsiya (0-based) — bracket daraxtida ota-bola bog'lanishi uchun.</summary>
    public int Slot { get; set; }
    public Guid? Player1Id { get; set; }
    public Guid? Player2Id { get; set; }
    public Guid? WinnerId { get; set; }
    /// <summary>O'yin natijasi (poyga tugagach saqlanadi).</summary>
    public double Player1Wpm { get; set; }
    public double Player2Wpm { get; set; }
    public double Player1Accuracy { get; set; }
    public double Player2Accuracy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

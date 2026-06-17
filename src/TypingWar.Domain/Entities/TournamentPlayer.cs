namespace TypingWar.Domain.Entities;

/// <summary>Turnirga ro'yxatdan o'tgan o'yinchi.</summary>
public class TournamentPlayer
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TournamentId { get; set; }
    public Tournament? Tournament { get; set; }
    public Guid UserId { get; set; }
    /// <summary>Ko'rsatish uchun denormalizatsiya.</summary>
    public string Username { get; set; } = string.Empty;
    public int Seed { get; set; }
    public DateTime RegisteredAt { get; set; } = DateTime.UtcNow;
}

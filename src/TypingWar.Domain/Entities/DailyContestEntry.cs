namespace TypingWar.Domain.Entities;

/// <summary>Kunlik musobaqadagi bitta ishtirokchi natijasi (har user uchun 1 ta — eng yaxshisi).</summary>
public class DailyContestEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid DailyContestId { get; set; }
    public DailyContest? DailyContest { get; set; }
    public Guid UserId { get; set; }
    /// <summary>Ko'rsatish uchun denormalizatsiya (cross-layer join dan qochish).</summary>
    public string Username { get; set; } = string.Empty;
    public double Wpm { get; set; }
    public double Accuracy { get; set; }
    public DateTime PlayedAt { get; set; } = DateTime.UtcNow;
}

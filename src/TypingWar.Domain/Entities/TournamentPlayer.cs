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
    /// <summary>O'yinchi qaysi roundda tushib qoldi (0 = hali o'yinda / chempion).</summary>
    public int EliminatedRound { get; set; }
    /// <summary>Turnir davomidagi eng yaxshi WPM (yakuniy statistika uchun).</summary>
    public double BestWpm { get; set; }
    public double BestAccuracy { get; set; }
}

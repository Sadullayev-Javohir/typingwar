namespace TypingWar.Domain.Entities;

/// <summary>O'zbekiston hududi bo'yicha typing statistikasi (xarita uchun).</summary>
public class RegionStats
{
    public Guid Id { get; set; } = Guid.NewGuid();
    /// <summary>Hudud kodi, masalan "SAMARKAND".</summary>
    public string RegionCode { get; set; } = string.Empty;
    public string RegionName { get; set; } = string.Empty;
    public double TotalWpm { get; set; }
    public int PlayerCount { get; set; }
    public double AvgWpm { get; set; }
    public DateOnly Date { get; set; }
}

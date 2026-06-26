namespace TypingWar.Application.Common.Interfaces;

/// <summary>
/// Hududlar bo'yicha 30 soniyalik shaxsiy rekordlardan yig'ma statistika o'qiydi.
/// Users (Identity, RegionCode) + PersonalBests (30s) ni birlashtirishni talab qiladi —
/// shuning uchun Infrastructure da, AppDbContext ustida amalga oshiriladi.
/// </summary>
public interface IRegionStatsReader
{
    /// <summary>Barcha hududlar uchun 30s rekord yig'masi (faqat ishtirokchisi bor hududlar).</summary>
    Task<IReadOnlyList<RegionAggregate>> GetThirtySecondStatsAsync(CancellationToken ct = default);

    /// <summary>Bitta hudud uchun 30s rekord yig'masi (ishtirokchi yo'q bo'lsa null).</summary>
    Task<RegionAggregate?> GetRegionAsync(string regionCode, CancellationToken ct = default);
}

/// <summary>Hudud bo'yicha yig'ma: eng tez 30s WPM, o'rtacha WPM, ishtirokchilar soni.</summary>
public record RegionAggregate(string RegionCode, double BestWpm, double AvgWpm, int PlayerCount);

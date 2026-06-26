namespace TypingWar.Application.Features.Map;

/// <summary>Bitta hudud statistikasi (xarita uchun) — 30s rejimidagi rekordlar asosida.</summary>
/// <param name="Code">Hudud kodi (masalan "SAMARKAND").</param>
/// <param name="Name">Hudud nomi.</param>
/// <param name="BestWpm">Hududda 30s rejimida eng tez yozilgan WPM.</param>
/// <param name="AvgWpm">Hudud ishtirokchilarining o'rtacha 30s WPM.</param>
/// <param name="PlayerCount">Hududda 30s natijasi bor foydalanuvchilar soni.</param>
public record RegionStatDto(string Code, string Name, double BestWpm, double AvgWpm, int PlayerCount);

/// <summary>Butun xarita — 14 hudud + rang shkalasi uchun eng yuqori WPM.</summary>
public record RegionMapDto(IReadOnlyList<RegionStatDto> Regions, double MaxBestWpm);

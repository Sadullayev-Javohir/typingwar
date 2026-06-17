namespace TypingWar.Application.Features.Map;

/// <summary>Bitta hudud statistikasi (xarita uchun).</summary>
public record RegionStatDto(string Code, string Name, double AvgWpm, int PlayerCount);

/// <summary>Butun xarita — 14 hudud + rang shkalasi uchun maksimal WPM.</summary>
public record RegionMapDto(IReadOnlyList<RegionStatDto> Regions, double MaxAvgWpm);

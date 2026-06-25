using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Teams;

/// <summary>
/// Jamoaviy musobaqa ma'lumoti (lobby uchun). Kod faqat Redis da (30 daqiqa).
/// Settings — host tanlagan poyga sozlamalari (matn turi/til/uzunlik, /Rooms bilan bir xil JSON).
/// </summary>
public record TeamRaceDto(Guid TeamRaceId, string Code, Guid HostId, RaceStatus Status, bool IsHost, string Settings = "{}");

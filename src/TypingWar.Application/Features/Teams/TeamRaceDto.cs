using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Teams;

/// <summary>Jamoaviy musobaqa ma'lumoti (lobby uchun). Kod faqat Redis da (30 daqiqa).</summary>
public record TeamRaceDto(Guid TeamRaceId, string Code, Guid HostId, RaceStatus Status, bool IsHost);

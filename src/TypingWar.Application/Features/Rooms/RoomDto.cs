using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Rooms;

/// <summary>Xona ma'lumoti (lobby uchun).</summary>
public record RoomDto(Guid RoomId, string Code, Guid HostId, RoomStatus Status, bool IsHost);

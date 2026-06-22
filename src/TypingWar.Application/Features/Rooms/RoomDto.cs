using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Rooms;

/// <summary>Xona ma'lumoti (lobby uchun). Settings — host tanlagan poyga sozlamalari (JSON).</summary>
public record RoomDto(Guid RoomId, string Code, Guid HostId, RoomStatus Status, bool IsHost, string Settings = "{}");

/// <summary>
/// Host tanlaydigan poyga sozlamalari (matn turi, til, so'z soni, iqtibos uzunligi).
/// /Rooms sahifasida tanlanadi va xona bilan birga saqlanadi.
/// </summary>
public record RoomRaceSettings(
    string Language = "Uzbek",
    string TextMode = "Sentences",
    int WordCount = 25,
    string QuoteLength = "all");

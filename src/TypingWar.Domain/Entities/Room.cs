using TypingWar.Domain.Common;
using TypingWar.Domain.Enums;

namespace TypingWar.Domain.Entities;

/// <summary>Do'stlar musobaqasi xonasi.</summary>
public class Room : BaseEntity
{
    /// <summary>8 xonali noyob kod (I, O, 0, 1 ishlatilmaydi).</summary>
    public string Code { get; set; } = string.Empty;
    public Guid HostId { get; set; }
    public RoomStatus Status { get; set; } = RoomStatus.Waiting;
    /// <summary>Xona sozlamalari (JSON).</summary>
    public string Settings { get; set; } = "{}";
    public Guid? TextId { get; set; }

    public ICollection<RoomPlayer> Players { get; set; } = new List<RoomPlayer>();
}

using TypingWar.Domain.Common;
using TypingWar.Domain.Enums;

namespace TypingWar.Domain.Entities;

/// <summary>Do'stlik aloqasi (so'rov yuborgan ⇄ qabul qiluvchi).</summary>
public class Friendship : BaseEntity
{
    public Guid RequesterId { get; set; }
    public Guid AddresseeId { get; set; }
    public FriendshipStatus Status { get; set; } = FriendshipStatus.Pending;
}

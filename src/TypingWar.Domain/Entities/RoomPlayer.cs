namespace TypingWar.Domain.Entities;

/// <summary>Xonadagi o'yinchi (Room ⇄ User bog'lovchi).</summary>
public class RoomPlayer
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RoomId { get; set; }
    public Room? Room { get; set; }
    public Guid UserId { get; set; }
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public bool IsHost { get; set; }
    public double FinalWpm { get; set; }
}

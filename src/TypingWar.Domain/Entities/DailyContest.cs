using TypingWar.Domain.Common;
using TypingWar.Domain.Enums;

namespace TypingWar.Domain.Entities;

/// <summary>Kunlik musobaqa (Hangfire har kuni 20:00 da yaratadi).</summary>
public class DailyContest : BaseEntity
{
    public DateOnly Date { get; set; }
    public Guid TextId { get; set; }
    public ContestStatus Status { get; set; } = ContestStatus.Scheduled;
    public Guid? WinnerId { get; set; }
    public int TotalParticipants { get; set; }
}

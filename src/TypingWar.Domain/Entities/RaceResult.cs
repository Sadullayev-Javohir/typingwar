using TypingWar.Domain.Common;
using TypingWar.Domain.Enums;

namespace TypingWar.Domain.Entities;

/// <summary>Bitta typing poyga natijasi.</summary>
public class RaceResult : BaseEntity
{
    public Guid UserId { get; set; }
    public TimeMode TimeMode { get; set; }
    public double Wpm { get; set; }
    public double RawWpm { get; set; }
    public double Accuracy { get; set; }
    public Guid TextId { get; set; }
    public RaceText? Text { get; set; }
    public DateTime PlayedAt { get; set; } = DateTime.UtcNow;
}

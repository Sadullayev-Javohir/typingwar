using TypingWar.Application.Features.Leaderboard;
using TypingWar.Domain.Enums;

namespace TypingWar.Application.Common.Interfaces;

/// <summary>Redis Sorted Set ga asoslangan leaderboard (faqat PersonalBest tushadi).</summary>
public interface ILeaderboardService
{
    /// <summary>PersonalBest yangilanganda reytingni yangilaydi.</summary>
    Task UpdateAsync(Guid userId, TimeMode timeMode, double bestWpm, CancellationToken ct = default);

    /// <summary>Berilgan vaqt rejimi uchun top 50 + joriy foydalanuvchi qatori.</summary>
    Task<LeaderboardDto> GetAsync(TimeMode timeMode, Guid? currentUserId, CancellationToken ct = default);
}

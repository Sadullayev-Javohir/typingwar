using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;

namespace TypingWar.Infrastructure.Ai;

/// <summary>
/// Adaptiv AI raqib: so'nggi 10 poyga avg WPM + delta (Redis ai_delta_{userId}).
/// </summary>
public class AiOpponentService : IAiOpponentService
{
    private const int BaseWpm = 40;      // tarix yo'q bo'lsa boshlang'ich
    private const int MinTarget = 15;
    private const int MaxDelta = 10;
    private const int Step = 2;

    private readonly IApplicationDbContext _db;
    private readonly ICacheService _cache;

    public AiOpponentService(IApplicationDbContext db, ICacheService cache)
    {
        _db = db;
        _cache = cache;
    }

    private static string DeltaKey(Guid userId) => $"ai_delta_{userId}";

    public async Task<int> GetTargetWpmAsync(Guid userId, CancellationToken ct = default)
    {
        var recent = await _db.RaceResults
            .AsNoTracking()
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.PlayedAt)
            .Take(10)
            .Select(r => r.Wpm)
            .ToListAsync(ct);

        double avg = recent.Count > 0 ? recent.Average() : BaseWpm;
        int delta = await GetDeltaAsync(userId);

        // AI foydalanuvchidan USTUN bo'lishi kerak — bazaviy maqsad avg dan biroz yuqori.
        // (Jonli poygada klient AI ni foydalanuvchining joriy WPM iga moslaydi; bu — boshlang'ich/zamin.)
        return Math.Max(MinTarget, (int)Math.Round(avg * 1.05 + delta));
    }

    public async Task UpdateAfterRaceAsync(Guid userId, bool userWon, CancellationToken ct = default)
    {
        int delta = await GetDeltaAsync(userId);
        delta += userWon ? Step : -Step;          // user yutsa AI tezlashadi
        delta = Math.Clamp(delta, -MaxDelta, MaxDelta);
        await _cache.SetStringAsync(DeltaKey(userId), delta.ToString());
    }

    private async Task<int> GetDeltaAsync(Guid userId)
    {
        var raw = await _cache.GetStringAsync(DeltaKey(userId));
        return int.TryParse(raw, out var d) ? d : 0;
    }
}

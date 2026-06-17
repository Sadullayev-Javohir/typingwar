using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Application.Features.Contests;
using TypingWar.Application.Features.Tournaments;
using TypingWar.Domain.Enums;

namespace TypingWar.Web.Jobs;

/// <summary>
/// Hangfire fon vazifalari. Har birini Hangfire DI scope da bajaradi.
/// daily-contest (har kuni 20:00) va tournament-starter (har daqiqa) RecurringJob lar.
/// </summary>
public class ScheduledJobs
{
    private readonly ISender _mediator;
    private readonly IApplicationDbContext _db;

    public ScheduledJobs(ISender mediator, IApplicationDbContext db)
    {
        _mediator = mediator;
        _db = db;
    }

    /// <summary>Bugungi kunlik musobaqani yaratadi (idempotent).</summary>
    public Task EnsureDailyContestAsync() => _mediator.Send(new EnsureDailyContestCommand());

    /// <summary>Vaqti kelgan (StartAt o'tgan) ro'yxatdagi turnirlarni avtomatik boshlaydi.</summary>
    public async Task StartDueTournamentsAsync()
    {
        var now = DateTime.UtcNow;
        var due = await _db.Tournaments
            .Where(t => t.Status == TournamentStatus.Registration && t.StartAt <= now)
            .Select(t => t.Id)
            .ToListAsync();

        foreach (var id in due)
        {
            try { await _mediator.Send(new StartTournamentCommand(id)); }
            catch (InvalidOperationException) { /* yetarli o'yinchi yo'q — keyingi safar */ }
        }
    }
}

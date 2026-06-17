using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Services;

namespace TypingWar.Application.Features.Contests;

/// <summary>Bugungi musobaqani (matn + top natijalar + mening holatim) qaytaradi.</summary>
public record GetTodayContestQuery : IRequest<TodayContestDto>;

public class GetTodayContestQueryHandler : IRequestHandler<GetTodayContestQuery, TodayContestDto>
{
    private const int TopCount = 20;

    private readonly IApplicationDbContext _db;
    private readonly ISender _mediator;
    private readonly ICurrentUserService _currentUser;

    public GetTodayContestQueryHandler(IApplicationDbContext db, ISender mediator, ICurrentUserService currentUser)
    {
        _db = db;
        _mediator = mediator;
        _currentUser = currentUser;
    }

    public async Task<TodayContestDto> Handle(GetTodayContestQuery request, CancellationToken cancellationToken)
    {
        var contestId = await _mediator.Send(new EnsureDailyContestCommand(), cancellationToken);

        var contest = await _db.DailyContests.FirstAsync(c => c.Id == contestId, cancellationToken);
        var text = await _db.RaceTexts
            .Where(t => t.Id == contest.TextId)
            .Select(t => t.Content)
            .FirstOrDefaultAsync(cancellationToken) ?? string.Empty;

        var entries = await _db.DailyContestEntries
            .Where(e => e.DailyContestId == contestId)
            .OrderByDescending(e => e.Wpm)
            .ToListAsync(cancellationToken);

        var top = entries
            .Take(TopCount)
            .Select((e, i) => new ContestEntryDto(i + 1, e.Username, e.Wpm, e.Accuracy))
            .ToList();

        string? winnerName = entries.Count > 0 ? entries[0].Username : null;

        var info = new DailyContestInfoDto(
            contest.Id, contest.Date, text, contest.TextId,
            contest.Status, entries.Count, winnerName);

        var me = await BuildMyStatusAsync(contestId, entries, cancellationToken);
        return new TodayContestDto(info, top, me);
    }

    private async Task<MyContestDto> BuildMyStatusAsync(
        Guid contestId, List<Domain.Entities.DailyContestEntry> entries, CancellationToken ct)
    {
        var uid = _currentUser.UserId;
        if (uid is null) return new MyContestDto(false, null, null, 0, null);

        var dates = await _db.DailyContestEntries
            .Where(e => e.UserId == uid.Value)
            .Join(_db.DailyContests, e => e.DailyContestId, c => c.Id, (e, c) => c.Date)
            .ToListAsync(ct);

        int streak = ContestStreak.Current(dates, DateOnly.FromDateTime(DateTime.UtcNow));
        string? badge = ContestStreak.Badge(streak);

        var idx = entries.FindIndex(e => e.UserId == uid.Value);
        if (idx < 0) return new MyContestDto(false, null, null, streak, badge);

        return new MyContestDto(true, entries[idx].Wpm, idx + 1, streak, badge);
    }
}

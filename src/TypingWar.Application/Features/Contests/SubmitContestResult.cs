using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Entities;
using TypingWar.Domain.Services;

namespace TypingWar.Application.Features.Contests;

/// <summary>Bugungi musobaqaga natija topshiradi (har user uchun eng yaxshisi saqlanadi).</summary>
public record SubmitContestResultCommand(int CorrectChars, int IncorrectChars, double ElapsedSeconds)
    : IRequest<ContestSubmitResultDto>;

public class SubmitContestResultCommandHandler
    : IRequestHandler<SubmitContestResultCommand, ContestSubmitResultDto>
{
    private readonly IApplicationDbContext _db;
    private readonly ISender _mediator;
    private readonly ICurrentUserService _currentUser;

    public SubmitContestResultCommandHandler(IApplicationDbContext db, ISender mediator, ICurrentUserService currentUser)
    {
        _db = db;
        _mediator = mediator;
        _currentUser = currentUser;
    }

    public async Task<ContestSubmitResultDto> Handle(SubmitContestResultCommand request, CancellationToken cancellationToken)
    {
        var uid = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("Musobaqada qatnashish uchun tizimga kiring.");
        var username = _currentUser.Username ?? "Foydalanuvchi";

        var metrics = TypingCalculator.Calculate(request.CorrectChars, request.IncorrectChars, request.ElapsedSeconds);
        if (!TypingCalculator.IsPlausible(metrics.Wpm) || !TypingCalculator.IsPlausible(metrics.RawWpm))
            throw new InvalidOperationException($"Natija haqiqiy emas (WPM={metrics.Wpm}). Maksimal: 250.");

        var contestId = await _mediator.Send(new EnsureDailyContestCommand(), cancellationToken);
        var contest = await _db.DailyContests.FirstAsync(c => c.Id == contestId, cancellationToken);

        var entry = await _db.DailyContestEntries
            .FirstOrDefaultAsync(e => e.DailyContestId == contestId && e.UserId == uid, cancellationToken);

        if (entry is null)
        {
            entry = new DailyContestEntry
            {
                DailyContestId = contestId,
                UserId = uid,
                Username = username,
                Wpm = metrics.Wpm,
                Accuracy = metrics.Accuracy,
                PlayedAt = DateTime.UtcNow
            };
            _db.DailyContestEntries.Add(entry);
        }
        else if (metrics.Wpm > entry.Wpm)
        {
            entry.Wpm = metrics.Wpm;
            entry.Accuracy = metrics.Accuracy;
            entry.Username = username;
            entry.PlayedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(cancellationToken);

        // Ishtirokchilar soni + g'olibni yangilash
        var ordered = await _db.DailyContestEntries
            .Where(e => e.DailyContestId == contestId)
            .OrderByDescending(e => e.Wpm)
            .ToListAsync(cancellationToken);

        contest.TotalParticipants = ordered.Count;
        contest.WinnerId = ordered.Count > 0 ? ordered[0].UserId : null;
        await _db.SaveChangesAsync(cancellationToken);

        int rank = ordered.FindIndex(e => e.UserId == uid) + 1;

        // Streak
        var dates = await _db.DailyContestEntries
            .Where(e => e.UserId == uid)
            .Join(_db.DailyContests, e => e.DailyContestId, c => c.Id, (e, c) => c.Date)
            .ToListAsync(cancellationToken);
        int streak = ContestStreak.Current(dates, DateOnly.FromDateTime(DateTime.UtcNow));

        bool isWinner = ordered.Count > 0 && ordered[0].UserId == uid;
        return new ContestSubmitResultDto(
            metrics.Wpm, metrics.RawWpm, metrics.Accuracy, rank, streak, ContestStreak.Badge(streak), isWinner);
    }
}

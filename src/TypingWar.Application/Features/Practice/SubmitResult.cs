using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Entities;
using TypingWar.Domain.Enums;
using TypingWar.Domain.Services;

namespace TypingWar.Application.Features.Practice;

/// <summary>Tugagan testning natijasini saqlaydi (RaceResult + PersonalBest).</summary>
public record SubmitResultCommand(
    TimeMode TimeMode,
    int CorrectChars,
    int IncorrectChars,
    double ElapsedSeconds,
    Guid? TextId) : IRequest<RaceResultDto>;

public class SubmitResultCommandValidator : AbstractValidator<SubmitResultCommand>
{
    public SubmitResultCommandValidator()
    {
        RuleFor(x => x.ElapsedSeconds).GreaterThan(0);
        RuleFor(x => x.CorrectChars).GreaterThanOrEqualTo(0);
        RuleFor(x => x.IncorrectChars).GreaterThanOrEqualTo(0);
        RuleFor(x => x.TimeMode).IsInEnum();
    }
}

public class SubmitResultCommandHandler : IRequestHandler<SubmitResultCommand, RaceResultDto>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public SubmitResultCommandHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<RaceResultDto> Handle(SubmitResultCommand request, CancellationToken cancellationToken)
    {
        var userId = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("Natijani saqlash uchun tizimga kiring.");

        var metrics = TypingCalculator.Calculate(request.CorrectChars, request.IncorrectChars, request.ElapsedSeconds);

        // Aldash himoyasi (CLAUDE.md §12: >250 WPM rad etiladi)
        if (!TypingCalculator.IsPlausible(metrics.Wpm) || !TypingCalculator.IsPlausible(metrics.RawWpm))
            throw new InvalidOperationException($"Natija haqiqiy emas (WPM={metrics.Wpm}). Maksimal ruxsat etilgan: 250.");

        var result = new RaceResult
        {
            UserId = userId,
            TimeMode = request.TimeMode,
            Wpm = metrics.Wpm,
            RawWpm = metrics.RawWpm,
            Accuracy = metrics.Accuracy,
            TextId = request.TextId,
            PlayedAt = DateTime.UtcNow
        };
        _db.RaceResults.Add(result);

        // PersonalBest upsert (faqat PersonalBest leaderboard ga tushadi)
        bool isNewPb = false;
        var pb = await _db.PersonalBests
            .FirstOrDefaultAsync(p => p.UserId == userId && p.TimeMode == request.TimeMode, cancellationToken);

        if (pb is null)
        {
            _db.PersonalBests.Add(new PersonalBest
            {
                UserId = userId,
                TimeMode = request.TimeMode,
                BestWpm = metrics.Wpm,
                Accuracy = metrics.Accuracy,
                AchievedAt = DateTime.UtcNow
            });
            isNewPb = true;
        }
        else if (metrics.Wpm > pb.BestWpm)
        {
            pb.BestWpm = metrics.Wpm;
            pb.Accuracy = metrics.Accuracy;
            pb.AchievedAt = DateTime.UtcNow;
            isNewPb = true;
        }

        await _db.SaveChangesAsync(cancellationToken);

        return new RaceResultDto(result.Id, metrics.Wpm, metrics.RawWpm, metrics.Accuracy,
            request.TimeMode, isNewPb, result.PlayedAt);
    }
}

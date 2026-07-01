using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Constants;
using TypingWar.Domain.Entities;
using TypingWar.Domain.Enums;
using TypingWar.Domain.Services;

namespace TypingWar.Application.Features.Practice;

/// <summary>
/// Natijani saqlaydi (RaceResult + PersonalBest + leaderboard). UserId aniq beriladi,
/// shuning uchun ICurrentUserService ga bog'liq emas — SignalR hub lardan ham chaqirsa bo'ladi.
/// </summary>
public record RecordResultCommand(
    Guid UserId,
    TimeMode TimeMode,
    int CorrectChars,
    int IncorrectChars,
    double ElapsedSeconds,
    Guid? TextId,
    string? ModeKey = null) : IRequest<RaceResultDto>;

public class RecordResultCommandHandler : IRequestHandler<RecordResultCommand, RaceResultDto>
{
    private readonly IApplicationDbContext _db;
    private readonly ILeaderboardService _leaderboard;

    public RecordResultCommandHandler(IApplicationDbContext db, ILeaderboardService leaderboard)
    {
        _db = db;
        _leaderboard = leaderboard;
    }

    public async Task<RaceResultDto> Handle(RecordResultCommand request, CancellationToken cancellationToken)
    {
        var metrics = TypingCalculator.Calculate(request.CorrectChars, request.IncorrectChars, request.ElapsedSeconds);

        // Aldash himoyasi (CLAUDE.md §12: >250 WPM rad etiladi)
        if (!TypingCalculator.IsPlausible(metrics.Wpm) || !TypingCalculator.IsPlausible(metrics.RawWpm))
            throw new InvalidOperationException($"Natija haqiqiy emas (WPM={metrics.Wpm}). Maksimal ruxsat etilgan: 250.");

        // Aldash himoyasi: juda past aniqlik (bitta tugmani bosib turish yoki tasodifiy belgilar)
        // — to'g'ri yozilgan belgi bo'lmasa yoki aniqlik {MinValidAccuracy}% dan past bo'lsa rad etiladi.
        if (request.CorrectChars <= 0 || !TypingCalculator.IsPlausibleAccuracy(metrics.Accuracy))
            throw new InvalidOperationException(
                $"Natija haqiqiy emas (aniqlik={metrics.Accuracy}%). Kamida {GameConstants.MinValidAccuracy}% talab etiladi.");

        // ModeKey berilmasa (eski chaqiruvlar) — vaqt rejimiga moslab quramiz.
        var modeKey = PracticeModes.IsValid(request.ModeKey)
            ? request.ModeKey!
            : PracticeModes.FromTimeMode(request.TimeMode);

        var result = new RaceResult
        {
            UserId = request.UserId,
            TimeMode = request.TimeMode,
            ModeKey = modeKey,
            Wpm = metrics.Wpm,
            RawWpm = metrics.RawWpm,
            Accuracy = metrics.Accuracy,
            TextId = request.TextId,
            PlayedAt = DateTime.UtcNow
        };
        _db.RaceResults.Add(result);

        bool isNewPb = false;
        var pb = await _db.PersonalBests
            .FirstOrDefaultAsync(p => p.UserId == request.UserId && p.ModeKey == modeKey, cancellationToken);

        if (pb is null)
        {
            _db.PersonalBests.Add(new PersonalBest
            {
                UserId = request.UserId,
                ModeKey = modeKey,
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

        // Leaderboard faqat vaqt rejimlaridan iborat (so'z/iqtibos rekordlari kirmaydi).
        if (isNewPb && PracticeModes.IsTimed(modeKey))
            await _leaderboard.UpdateAsync(request.UserId, request.TimeMode, metrics.Wpm, cancellationToken);

        return new RaceResultDto(result.Id, metrics.Wpm, metrics.RawWpm, metrics.Accuracy,
            request.TimeMode, isNewPb, result.PlayedAt);
    }
}

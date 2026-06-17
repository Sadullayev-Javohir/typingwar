using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Entities;
using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Contests;

/// <summary>
/// Bugungi kunlik musobaqani mavjud bo'lmasa yaratadi (matn tanlaydi, Active qiladi).
/// Hangfire job har kuni 20:00 da, hamda sahifa ochilganda chaqiriladi. Idempotent.
/// </summary>
public record EnsureDailyContestCommand : IRequest<Guid>;

public class EnsureDailyContestCommandHandler : IRequestHandler<EnsureDailyContestCommand, Guid>
{
    private readonly IApplicationDbContext _db;
    private readonly ITextProvider _textProvider;

    public EnsureDailyContestCommandHandler(IApplicationDbContext db, ITextProvider textProvider)
    {
        _db = db;
        _textProvider = textProvider;
    }

    public async Task<Guid> Handle(EnsureDailyContestCommand request, CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var existing = await _db.DailyContests
            .FirstOrDefaultAsync(c => c.Date == today, cancellationToken);
        if (existing is not null) return existing.Id;

        var text = await _textProvider.GetAsync(
            new PracticeTextRequest(TextMode.Sentences, Language.Uzbek, Difficulty.Normal, 30), cancellationToken);

        // Generatsiya qilingan matn (TextId yo'q) bo'lsa — RaceText sifatida saqlaymiz
        Guid textId;
        if (text.TextId is Guid existingTextId)
        {
            textId = existingTextId;
        }
        else
        {
            var rt = new RaceText
            {
                Content = text.Content,
                Language = Language.Uzbek,
                WordCount = text.WordCount,
                Difficulty = Difficulty.Normal,
                Category = TextMode.Sentences
            };
            _db.RaceTexts.Add(rt);
            textId = rt.Id;
        }

        var contest = new DailyContest
        {
            Date = today,
            TextId = textId,
            Status = ContestStatus.Active
        };
        _db.DailyContests.Add(contest);
        await _db.SaveChangesAsync(cancellationToken);
        return contest.Id;
    }
}

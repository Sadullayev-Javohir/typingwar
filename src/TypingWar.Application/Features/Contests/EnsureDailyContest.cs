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
        if (existing is not null)
        {
            // Eski musobaqa matni 25 so'zlik "Words" rejimida bo'lmasa — yangilab qo'yamiz
            // (TextId o'zgarmaydi, mavjud natijalar saqlanadi).
            var existingText = await _db.RaceTexts
                .FirstOrDefaultAsync(t => t.Id == existing.TextId, cancellationToken);
            if (existingText is not null && existingText.Category != TextMode.Words)
            {
                var fresh = await _textProvider.GetAsync(
                    new PracticeTextRequest(TextMode.Words, Language.Uzbek, Difficulty.Normal, 25), cancellationToken);
                existingText.Content = fresh.Content;
                existingText.WordCount = fresh.WordCount;
                existingText.Category = TextMode.Words;
                await _db.SaveChangesAsync(cancellationToken);
            }
            return existing.Id;
        }

        // Kunlik musobaqa — 25 ta so'z (barcha o'yinchilar bir xil so'zlarni yozadi)
        var text = await _textProvider.GetAsync(
            new PracticeTextRequest(TextMode.Words, Language.Uzbek, Difficulty.Normal, 25), cancellationToken);

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
                Category = TextMode.Words
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

using System.Text;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Enums;

namespace TypingWar.Infrastructure.Text;

/// <summary>
/// Solo practice uchun matn yetkazib beradi:
/// Words/Numbers/Code — generatsiya (TextId = null), Sentences — bazadan (seeded RaceText).
/// </summary>
public class TextProvider : ITextProvider
{
    private readonly IApplicationDbContext _db;

    public TextProvider(IApplicationDbContext db) => _db = db;

    public async Task<PracticeText> GetAsync(PracticeTextRequest request, CancellationToken ct = default)
    {
        int wordCount = Math.Clamp(request.WordCount, 5, 200);

        return request.Mode switch
        {
            TextMode.Sentences => await GetSentencesAsync(request, ct),
            TextMode.Numbers => Generate(GenerateNumbers(wordCount), wordCount),
            TextMode.Code => GetCode(),
            _ => Generate(GenerateWords(request.Language, request.Difficulty, wordCount), wordCount)
        };
    }

    private static readonly Random Rng = Random.Shared;

    private static PracticeText Generate(string content, int wordCount)
        => new(null, content, wordCount);

    private static string GenerateWords(Language language, Difficulty difficulty, int count)
    {
        var bank = WordBanks.ForLanguage(language);
        int maxLen = WordBanks.MaxWordLength(difficulty);
        var pool = bank.Where(w => w.Length <= maxLen).ToArray();
        if (pool.Length == 0) pool = bank;

        var sb = new StringBuilder();
        for (int i = 0; i < count; i++)
        {
            if (i > 0) sb.Append(' ');
            sb.Append(pool[Rng.Next(pool.Length)]);
        }
        return sb.ToString();
    }

    private static string GenerateNumbers(int count)
    {
        var sb = new StringBuilder();
        for (int i = 0; i < count; i++)
        {
            if (i > 0) sb.Append(' ');
            sb.Append(Rng.Next(1, 10_000));
        }
        return sb.ToString();
    }

    private static PracticeText GetCode()
    {
        var snippet = WordBanks.CodeSnippets[Rng.Next(WordBanks.CodeSnippets.Length)];
        int words = snippet.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
        return new PracticeText(null, snippet, words);
    }

    private async Task<PracticeText> GetSentencesAsync(PracticeTextRequest request, CancellationToken ct)
    {
        var query = _db.RaceTexts
            .AsNoTracking()
            .Where(t => t.IsActive && t.Language == request.Language && t.Category == TextMode.Sentences);

        // Iqtibos rejimida uzunlik filtri (all/short/medium/long/thick) — belgilar soni bo'yicha.
        var lengthFiltered = ApplyQuoteLengthFilter(query, request.QuoteLength);

        var matches = await lengthFiltered.ToListAsync(ct);

        // Tanlangan uzunlikda iqtibos topilmasa — istalgan (shu tildagi) iqtibosga qaytamiz
        if (matches.Count == 0)
            matches = await query.ToListAsync(ct);

        if (matches.Count == 0)
            return Generate(GenerateWords(request.Language, request.Difficulty, request.WordCount), request.WordCount);

        var chosen = matches[Rng.Next(matches.Count)];
        return new PracticeText(chosen.Id, chosen.Content, chosen.WordCount, chosen.Source);
    }

    // QuoteBank chegaralari (short <= 130, medium <= 280, long <= 550, undan ortig'i — thick).
    private static IQueryable<Domain.Entities.RaceText> ApplyQuoteLengthFilter(
        IQueryable<Domain.Entities.RaceText> query, string? quoteLength) =>
        (quoteLength?.ToLowerInvariant()) switch
        {
            "short" => query.Where(t => t.Content.Length <= QuoteBank.ShortMax),
            "medium" => query.Where(t => t.Content.Length > QuoteBank.ShortMax && t.Content.Length <= QuoteBank.MediumMax),
            "long" => query.Where(t => t.Content.Length > QuoteBank.MediumMax && t.Content.Length <= QuoteBank.LongMax),
            "thick" => query.Where(t => t.Content.Length > QuoteBank.LongMax),
            _ => query   // "all" yoki null — filtrlanmaydi
        };
}

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

        var matches = await query
            .Where(t => t.Difficulty == request.Difficulty)
            .ToListAsync(ct);

        if (matches.Count == 0)
            matches = await query.ToListAsync(ct);   // qiyinlik mos kelmasa — istalgan sentences

        if (matches.Count == 0)
            return Generate(GenerateWords(request.Language, request.Difficulty, request.WordCount), request.WordCount);

        var chosen = matches[Rng.Next(matches.Count)];
        return new PracticeText(chosen.Id, chosen.Content, chosen.WordCount);
    }
}

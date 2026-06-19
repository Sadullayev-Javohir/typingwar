using Microsoft.EntityFrameworkCore;
using TypingWar.Domain.Entities;
using TypingWar.Domain.Enums;
using TypingWar.Infrastructure.Text;

namespace TypingWar.Infrastructure.Persistence;

/// <summary>
/// Boshlang'ich ma'lumotlar — Iqtibos rejimi uchun RaceTexts (idempotent, additive).
/// QuoteBank dagi yangi iqtiboslar har ishga tushishda DB ga qo'shiladi (mavjudlari o'tkazib yuboriladi).
/// </summary>
public static class DataSeeder
{
    public static async Task SeedAsync(AppDbContext db, CancellationToken ct = default)
    {
        // Mavjud iqtiboslar matni (takror qo'shmaslik uchun)
        var existing = await db.RaceTexts
            .Where(t => t.Category == TextMode.Sentences)
            .Select(t => t.Content)
            .ToListAsync(ct);
        var seen = new HashSet<string>(existing);

        var toAdd = new List<RaceText>();
        foreach (var q in QuoteBank.All())
        {
            if (!seen.Add(q.Content)) continue;   // allaqachon bor
            toAdd.Add(new RaceText
            {
                Content = q.Content,
                Source = q.Source,
                Language = q.Language,
                Category = TextMode.Sentences,
                Difficulty = QuoteBank.DifficultyFor(q.Content),
                WordCount = q.Content.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length,
                IsActive = true
            });
        }

        // Iqtibos rejimi faqat manbali iqtiboslarni ko'rsatsin —
        // eski manbasiz "gap"larni deaktivatsiya qilamiz (idempotent).
        var legacy = await db.RaceTexts
            .Where(t => t.Category == TextMode.Sentences && t.IsActive && (t.Source == null || t.Source == ""))
            .ToListAsync(ct);
        foreach (var t in legacy) t.IsActive = false;

        if (toAdd.Count == 0 && legacy.Count == 0) return;

        db.RaceTexts.AddRange(toAdd);
        await db.SaveChangesAsync(ct);
    }
}

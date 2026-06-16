using Microsoft.EntityFrameworkCore;
using TypingWar.Domain.Entities;
using TypingWar.Domain.Enums;

namespace TypingWar.Infrastructure.Persistence;

/// <summary>Boshlang'ich ma'lumotlar — Sentences rejimi uchun RaceTexts (idempotent).</summary>
public static class DataSeeder
{
    public static async Task SeedAsync(AppDbContext db, CancellationToken ct = default)
    {
        if (await db.RaceTexts.AnyAsync(ct))
            return;

        var texts = new List<RaceText>();

        void Add(string content, Language lang, Difficulty diff)
            => texts.Add(new RaceText
            {
                Content = content,
                Language = lang,
                Category = TextMode.Sentences,
                Difficulty = diff,
                WordCount = content.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length,
                IsActive = true
            });

        // Uzbek
        Add("Eng tez barmoqlar gʻalaba qozonadi va har bir soniya ahamiyatli.", Language.Uzbek, Difficulty.Easy);
        Add("Tezlik bilan birga aniqlik ham muhim, chunki xatolar natijani pasaytiradi.", Language.Uzbek, Difficulty.Normal);
        Add("Klaviaturada mashq qilish orqali siz oʻz tezligingizni va aniqligingizni sezilarli darajada oshirishingiz mumkin.", Language.Uzbek, Difficulty.Hard);

        // English
        Add("The quick brown fox jumps over the lazy dog near the river.", Language.English, Difficulty.Easy);
        Add("Practice every day and your typing speed will steadily improve over time.", Language.English, Difficulty.Normal);
        Add("Consistency combined with deliberate practice transforms an average typist into a remarkably fast and accurate one.", Language.English, Difficulty.Hard);

        // Russian
        Add("Быстрые пальцы выигрывают гонку, и каждая секунда имеет значение.", Language.Russian, Difficulty.Easy);
        Add("Регулярная практика помогает увеличить скорость печати и снизить количество ошибок.", Language.Russian, Difficulty.Normal);

        db.RaceTexts.AddRange(texts);
        await db.SaveChangesAsync(ct);
    }
}

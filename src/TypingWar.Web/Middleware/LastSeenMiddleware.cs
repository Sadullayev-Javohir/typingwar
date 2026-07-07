using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using TypingWar.Infrastructure.Identity;
using TypingWar.Infrastructure.Persistence;

namespace TypingWar.Web.Middleware;

/// <summary>
/// Autentifikatsiyalangan foydalanuvchining LastSeenAt (oxirgi online) vaqtini yangilaydi.
/// Har so'rovda DB yozuvi qilmaslik uchun IMemoryCache bilan throttle qilinadi:
/// bir foydalanuvchi uchun ko'pi bilan <see cref="ThrottleMinutes"/> daqiqada bir marta yoziladi.
/// </summary>
public class LastSeenMiddleware
{
    private const int ThrottleMinutes = 2;

    private readonly RequestDelegate _next;

    public LastSeenMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, IMemoryCache cache)
    {
        await _next(context);

        // Faqat autentifikatsiyalangan foydalanuvchilar uchun (statik fayllar/anonim so'rovlar tegmaydi)
        if (context.User?.Identity?.IsAuthenticated != true)
            return;

        if (!Guid.TryParse(context.User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
            return;

        var cacheKey = $"lastseen:{userId}";
        if (cache.TryGetValue(cacheKey, out _))
            return; // yaqinda yangilangan — qayta yozmaymiz

        // Throttle oynasini darhol band qilamiz (parallel so'rovlar takror yozmasin)
        cache.Set(cacheKey, true, TimeSpan.FromMinutes(ThrottleMinutes));

        try
        {
            var db = context.RequestServices.GetRequiredService<AppDbContext>();
            await db.Set<ApplicationUser>()
                .Where(u => u.Id == userId)
                .ExecuteUpdateAsync(s => s.SetProperty(u => u.LastSeenAt, DateTime.UtcNow),
                    context.RequestAborted);
        }
        catch
        {
            // Oxirgi online vaqti yangilanmasligi so'rovni buzmasligi kerak — jim o'tkazib yuboramiz.
            cache.Remove(cacheKey); // keyingi so'rovda qayta urinilsin
        }
    }
}

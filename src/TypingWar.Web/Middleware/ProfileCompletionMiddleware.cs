using System.Security.Claims;

namespace TypingWar.Web.Middleware;

/// <summary>
/// Google bilan kirgan, lekin hali nom + hududni (Manzil) to'ldirmagan foydalanuvchini
/// HAR sahifa navigatsiyasida /CompleteProfile ga majburan yo'naltiradi. Foydalanuvchi
/// bu qadamni chetlab o'tib (masalan to'g'ridan-to'g'ri /Practice ga kirib) saytdan
/// foydalana olmasligi kerak — hudud kiritish majburiy.
/// </summary>
public class ProfileCompletionMiddleware
{
    private readonly RequestDelegate _next;

    public ProfileCompletionMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        if (ShouldGate(context))
        {
            context.Response.Redirect("/CompleteProfile");
            return;
        }

        await _next(context);
    }

    private static bool ShouldGate(HttpContext context)
    {
        // Faqat autentifikatsiyalangan foydalanuvchilar
        if (context.User?.Identity?.IsAuthenticated != true)
            return false;

        // Profil to'ldirilgan bo'lsa — tegmaymiz (claim yo'q = eski token = to'ldirilgan deb hisoblaymiz)
        if (context.User.FindFirstValue("profile_completed") != "false")
            return false;

        // Faqat GET sahifa navigatsiyasini ushlaymiz (POST/api ga tegmaymiz)
        if (!HttpMethods.IsGet(context.Request.Method))
            return false;

        var path = context.Request.Path.Value ?? string.Empty;

        // CompleteProfile sahifasi, auth (Google callback/complete-profile/logout),
        // API/hub/static endpointlar va xatolik sahifasi cheklovdan ozod
        if (path.StartsWith("/CompleteProfile", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/api/", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/hubs/", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/Error", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/lib/", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/js/", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/css/", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/images/", StringComparison.OrdinalIgnoreCase) ||
            path.Equals("/favicon.ico", StringComparison.OrdinalIgnoreCase) ||
            path.Equals("/manifest.webmanifest", StringComparison.OrdinalIgnoreCase) ||
            path.Equals("/sw.js", StringComparison.OrdinalIgnoreCase))
            return false;

        return true;
    }
}

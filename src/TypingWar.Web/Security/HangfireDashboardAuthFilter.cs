using Hangfire.Dashboard;

namespace TypingWar.Web.Security;

/// <summary>
/// Hangfire dashboard'ni faqat <c>Admin</c> roliga ega (JWT cookie orqali
/// autentifikatsiyadan o'tgan) foydalanuvchilarga ochadi. Ruxsatsizlar 401 oladi.
/// </summary>
public sealed class HangfireDashboardAuthFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var http = context.GetHttpContext();
        return http.User.Identity?.IsAuthenticated == true && http.User.IsInRole("Admin");
    }
}

using System.Security.Claims;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace TypingWar.Web.Pages;

public class TournamentModel : PageModel
{
    public bool IsAuthenticated { get; private set; }
    public string Username { get; private set; } = string.Empty;
    public string UserId { get; private set; } = string.Empty;

    public void OnGet()
    {
        IsAuthenticated = User.Identity?.IsAuthenticated == true;
        Username = User.Identity?.Name ?? string.Empty;
        UserId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
    }
}

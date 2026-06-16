using Microsoft.AspNetCore.Mvc.RazorPages;

namespace TypingWar.Web.Pages;

public class RoomModel : PageModel
{
    public bool IsAuthenticated { get; private set; }
    public string Username { get; private set; } = string.Empty;

    public void OnGet()
    {
        IsAuthenticated = User.Identity?.IsAuthenticated == true;
        Username = User.Identity?.Name ?? string.Empty;
    }
}

using Microsoft.AspNetCore.Mvc.RazorPages;

namespace TypingWar.Web.Pages;

public class ShareModel : PageModel
{
    public string Username { get; private set; } = string.Empty;

    public void OnGet(string username) => Username = username ?? string.Empty;
}

using Microsoft.AspNetCore.Mvc.RazorPages;

namespace TypingWar.Web.Pages;

public class ContestModel : PageModel
{
    public bool IsAuthenticated { get; private set; }

    public void OnGet() => IsAuthenticated = User.Identity?.IsAuthenticated == true;
}

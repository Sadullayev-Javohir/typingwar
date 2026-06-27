using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using TypingWar.Domain.Constants;

namespace TypingWar.Web.Pages;

public class CompleteProfileModel : PageModel
{
    public IReadOnlyDictionary<string, string> Regions => UzbekistanRegions.All;
    public string SuggestedUsername { get; private set; } = string.Empty;

    public IActionResult OnGet()
    {
        if (User.Identity?.IsAuthenticated != true)
            return RedirectToPage("/Login");

        SuggestedUsername = User.Identity?.Name ?? string.Empty;
        return Page();
    }
}

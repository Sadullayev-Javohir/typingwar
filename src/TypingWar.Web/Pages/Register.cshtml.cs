using Microsoft.AspNetCore.Mvc.RazorPages;
using TypingWar.Domain.Constants;

namespace TypingWar.Web.Pages;

public class RegisterModel : PageModel
{
    public IReadOnlyDictionary<string, string> Regions => UzbekistanRegions.All;

    public void OnGet() { }
}

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace TypingWar.Web.Pages;

public class RegisterModel : PageModel
{
    public IActionResult OnGet() => RedirectToPage("/Login");
}

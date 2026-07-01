using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace TypingWar.Web.Pages;

[Authorize(Roles = "Admin")]
public class AdminModel : PageModel
{
    /// <summary>SuperAdmin huquqlari (foydalanuvchi/rol boshqaruvi) UI da ko'rsatiladimi.</summary>
    public bool IsSuperAdmin { get; private set; }

    public void OnGet() => IsSuperAdmin = User.IsInRole("SuperAdmin");
}

using Microsoft.AspNetCore.Mvc.RazorPages;

namespace TypingWar.Web.Pages;

public class LoginModel : PageModel
{
    public bool HasError { get; private set; }
    public string ErrorMessage { get; private set; } = string.Empty;

    public void OnGet(string? error)
    {
        if (string.IsNullOrEmpty(error)) return;
        HasError = true;
        ErrorMessage = error switch
        {
            "google_not_configured" => "Google bilan kirish hozircha sozlanmagan. Administrator bilan bog'laning.",
            "google_failed" => "Google bilan kirishda xatolik yuz berdi. Qayta urinib ko'ring.",
            _ => "Kirishda xatolik yuz berdi. Qayta urinib ko'ring."
        };
    }
}

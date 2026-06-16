namespace TypingWar.Domain.Constants;

/// <summary>O'zbekistonning 14 ta hududi — RegionStats va xarita uchun.</summary>
public static class UzbekistanRegions
{
    /// <summary>Region kodi → hudud nomi.</summary>
    public static readonly IReadOnlyDictionary<string, string> All = new Dictionary<string, string>
    {
        ["TASHKENT_CITY"] = "Toshkent shahri",
        ["TASHKENT_REGION"] = "Toshkent viloyati",
        ["ANDIJAN"] = "Andijon viloyati",
        ["FERGANA"] = "Farg'ona viloyati",
        ["NAMANGAN"] = "Namangan viloyati",
        ["SAMARKAND"] = "Samarqand viloyati",
        ["BUKHARA"] = "Buxoro viloyati",
        ["NAVOI"] = "Navoiy viloyati",
        ["KASHKADARYA"] = "Qashqadaryo viloyati",
        ["SURKHANDARYA"] = "Surxondaryo viloyati",
        ["JIZZAKH"] = "Jizzax viloyati",
        ["SYRDARYA"] = "Sirdaryo viloyati",
        ["KHOREZM"] = "Xorazm viloyati",
        ["KARAKALPAKSTAN"] = "Qoraqalpog'iston Respublikasi"
    };

    public static bool IsValid(string? code) => code is not null && All.ContainsKey(code);
}

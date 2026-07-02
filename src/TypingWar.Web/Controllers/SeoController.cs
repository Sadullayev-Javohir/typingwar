using System.Text;
using System.Xml.Linq;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace TypingWar.Web.Controllers;

/// <summary>
/// SEO uchun robots.txt va sitemap.xml ni dinamik xizmat qiladi.
/// Bazaviy URL Site:BaseUrl konfiguratsiyasidan (standart https://typingwar.uz) olinadi.
/// </summary>
[AllowAnonymous]
public class SeoController : Controller
{
    private readonly IConfiguration _config;

    public SeoController(IConfiguration config) => _config = config;

    private string BaseUrl =>
        (_config["Site:BaseUrl"] ?? "https://typingwar.uz").TrimEnd('/');

    /// <summary>Qidiruv robotlari uchun ko'rsatma + sitemap havolasi.</summary>
    [HttpGet("/robots.txt")]
    [ResponseCache(Duration = 86400)]
    public ContentResult Robots()
    {
        var sb = new StringBuilder();
        sb.AppendLine("User-agent: *");
        sb.AppendLine("Allow: /");
        // Shaxsiy / dinamik bo'limlar indekslanmasin
        sb.AppendLine("Disallow: /api/");
        sb.AppendLine("Disallow: /hubs/");
        sb.AppendLine("Disallow: /hangfire");
        sb.AppendLine("Disallow: /Admin");
        sb.AppendLine("Disallow: /Settings");
        sb.AppendLine("Disallow: /Profile");
        sb.AppendLine("Disallow: /CompleteProfile");
        sb.AppendLine("Disallow: /Room");
        sb.AppendLine("Disallow: /Team");
        sb.AppendLine("Disallow: /TournamentDemo");
        sb.AppendLine();
        sb.AppendLine($"Sitemap: {BaseUrl}/sitemap.xml");
        return Content(sb.ToString(), "text/plain; charset=utf-8");
    }

    /// <summary>Ommaviy sahifalar ro'yxati (XML sitemap).</summary>
    [HttpGet("/sitemap.xml")]
    [ResponseCache(Duration = 86400)]
    public ContentResult Sitemap()
    {
        // (yo'l, muhimlik, yangilanish chastotasi)
        var pages = new (string Path, string Priority, string ChangeFreq)[]
        {
            ("/", "1.0", "daily"),
            ("/Practice", "0.9", "weekly"),
            ("/Race", "0.9", "weekly"),
            ("/Leaderboard", "0.8", "daily"),
            ("/Tournaments", "0.8", "daily"),
            ("/Contest", "0.8", "daily"),
            ("/Rooms", "0.7", "weekly"),
            ("/Teams", "0.7", "weekly"),
            ("/Map", "0.7", "weekly"),
            ("/Review", "0.6", "monthly"),
            ("/Login", "0.4", "monthly"),
            ("/Privacy", "0.3", "yearly"),
        };

        XNamespace ns = "http://www.sitemaps.org/schemas/sitemap/0.9";
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        var urlset = new XElement(ns + "urlset",
            pages.Select(p => new XElement(ns + "url",
                new XElement(ns + "loc", BaseUrl + p.Path),
                new XElement(ns + "lastmod", today),
                new XElement(ns + "changefreq", p.ChangeFreq),
                new XElement(ns + "priority", p.Priority))));

        var doc = new XDocument(new XDeclaration("1.0", "utf-8", null), urlset);
        return Content(doc.Declaration + "\n" + doc, "application/xml; charset=utf-8");
    }
}

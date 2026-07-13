using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace TypingWar.Infrastructure.Persistence;

/// <summary>
/// Faqat DESIGN-TIME uchun (dotnet ef migrations add / database update). Web hostini
/// qurmasdan AppDbContext yaratadi — shu bois Redis eager-connect ishga tushmaydi va
/// migratsiya Docker'siz ham generatsiya qilinadi. Runtime'da ishlatilmaydi.
/// </summary>
public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var conn = Environment.GetEnvironmentVariable("ConnectionStrings__Postgres")
            ?? "Host=localhost;Port=5434;Database=typingwar;Username=typingwar;Password=typingwar_dev";

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(conn)
            .Options;

        return new AppDbContext(options);
    }
}

using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Infrastructure.Auth;
using TypingWar.Infrastructure.Caching;
using TypingWar.Infrastructure.Identity;
using TypingWar.Infrastructure.Persistence;

namespace TypingWar.Infrastructure;

/// <summary>Infrastructure qatlami xizmatlarini DI ga ro'yxatdan o'tkazadi.</summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        // EF Core — PostgreSQL (parametrli query)
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("Postgres")));
        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        // Typing matn provayderi
        services.AddScoped<ITextProvider, Text.TextProvider>();

        // ASP.NET Core Identity — Users menejment
        services.AddIdentityCore<ApplicationUser>(options =>
            {
                options.User.RequireUniqueEmail = true;
                options.Password.RequiredLength = 8;
                options.Password.RequireNonAlphanumeric = false;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            })
            .AddRoles<Microsoft.AspNetCore.Identity.IdentityRole<Guid>>()
            .AddEntityFrameworkStores<AppDbContext>();

        // Parol xeshlash — BCrypt (Identity default PBKDF2 emas)
        services.AddScoped<IPasswordHasher<ApplicationUser>, BCryptPasswordHasher>();

        // JWT + Auth
        services.Configure<JwtSettings>(configuration.GetSection(JwtSettings.SectionName));
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IIdentityService, AuthService>();

        // Leaderboard (Redis Sorted Set)
        services.AddScoped<ILeaderboardService, Leaderboard.LeaderboardService>();

        // Real-time xona holati (in-memory singleton)
        services.AddSingleton<Realtime.RoomLiveState>();

        // Redis
        var redisConn = configuration.GetConnectionString("Redis") ?? "localhost:6380";
        services.AddSingleton<IConnectionMultiplexer>(
            ConnectionMultiplexer.Connect(redisConn));
        services.AddScoped<ICacheService, RedisCacheService>();

        return services;
    }
}

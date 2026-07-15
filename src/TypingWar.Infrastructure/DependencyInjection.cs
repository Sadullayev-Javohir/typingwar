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
        // Obyekt parollari (turnir paroli kabi) uchun umumiy xeshlash xizmati
        services.AddScoped<IPasswordHashService, BCryptPasswordHashService>();

        // JWT + Auth
        services.Configure<JwtSettings>(configuration.GetSection(JwtSettings.SectionName));
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IIdentityService, AuthService>();

        // Leaderboard (Redis Sorted Set)
        services.AddScoped<ILeaderboardService, Leaderboard.LeaderboardService>();

        // Landing (bosh sahifa) statistikasi
        services.AddScoped<ILandingStatsService, Stats.LandingStatsService>();

        // Real-time holat (in-memory singletonlar)
        services.AddSingleton<Realtime.RoomLiveState>();
        services.AddSingleton<Realtime.TeamRaceLiveState>();
        services.AddSingleton<Realtime.TournamentLiveState>();
        // Onlayn foydalanuvchilar + do'stlar partiyasi (presence / duel lobby)
        services.AddSingleton<Realtime.OnlineUserService>();
        services.AddSingleton<Realtime.PartyService>();
        // IOnlineUserProvider bitta OnlineUserService nusxasiga ulanadi — PresenceHub,
        // REST (/api/online) va LobbyHub bir xil ma'lumotdan foydalansin (ikki nusxa bo'lmasin).
        services.AddSingleton<IOnlineUserProvider>(sp => sp.GetRequiredService<Realtime.OnlineUserService>());

        // Adaptiv AI raqib
        services.AddScoped<IAiOpponentService, Ai.AiOpponentService>();

        // Hudud profili (xarita statistikasi uchun)
        services.AddScoped<IUserProfileReader, Identity.UserProfileReader>();
        services.AddScoped<IRegionStatsReader, Identity.RegionStatsReader>();

        // Admin statistika + foydalanuvchi boshqaruvi
        services.AddScoped<IAdminStatsReader, Identity.AdminStatsReader>();
        services.AddScoped<IAdminService, Identity.AdminService>();
        services.AddScoped<IServerStatsReader, Diagnostics.ServerStatsReader>();

        // Redis
        var redisConn = configuration.GetConnectionString("Redis") ?? "localhost:6380";
        services.AddSingleton<IConnectionMultiplexer>(
            ConnectionMultiplexer.Connect(redisConn));
        services.AddScoped<ICacheService, RedisCacheService>();

        // Brute-force himoyasi (xona kodi enumeratsiyasi va h.k.)
        services.AddScoped<IBruteForceGuard, Security.BruteForceGuard>();

        return services;
    }
}

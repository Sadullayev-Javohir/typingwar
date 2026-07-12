using System.Text;
using System.Threading.RateLimiting;
using Hangfire;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.IdentityModel.Tokens;
using Serilog;
using TypingWar.Application;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Infrastructure;
using TypingWar.Infrastructure.Persistence;
using TypingWar.Web.Jobs;
using TypingWar.Web.Middleware;
using TypingWar.Web.Services;

var builder = WebApplication.CreateBuilder(args);

// Kestrel server versiyasini oshkor qilmaslik (axborot tarqalishi himoyasi)
builder.WebHost.ConfigureKestrel(o => o.AddServerHeader = false);

// ── Serilog (structured logging) ──────────────────────────────
builder.Host.UseSerilog((ctx, cfg) => cfg
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console());

// ── Qatlam DI ─────────────────────────────────────────────────
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddHttpContextAccessor();
builder.Services.AddMemoryCache();   // LastSeen throttle uchun
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

// ── Authentication: JWT (HttpOnly cookie) + Google OAuth ──────
const string AccessTokenCookie = "access_token";
var jwt = builder.Configuration.GetSection("Jwt");
var jwtKey = jwt["Key"] ?? throw new InvalidOperationException("Jwt:Key sozlanmagan.");

var authBuilder = builder.Services.AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt["Issuer"],
            ValidAudience = jwt["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromSeconds(30)
        };
        // Token Authorization header da EMAS — HttpOnly cookie dan o'qiladi
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                if (ctx.Request.Cookies.TryGetValue(AccessTokenCookie, out var token))
                    ctx.Token = token;
                return Task.CompletedTask;
            }
        };
    })
    // Google OAuth correlation uchun tashqi cookie sxemasi
    .AddCookie("External");

// Google OAuth — faqat ClientId mavjud bo'lsa ro'yxatdan o'tkaziladi
var googleId = builder.Configuration["Authentication:Google:ClientId"];
var googleSecret = builder.Configuration["Authentication:Google:ClientSecret"];
if (!string.IsNullOrWhiteSpace(googleId) && !string.IsNullOrWhiteSpace(googleSecret))
{
    authBuilder.AddGoogle(options =>
    {
        options.ClientId = googleId;
        options.ClientSecret = googleSecret;
        options.SignInScheme = "External";
    });
}

builder.Services.AddAuthorization();

// ── Razor Pages / Controllers / SignalR ───────────────────────
builder.Services.AddRazorPages();
builder.Services.AddControllers().AddJsonOptions(o =>
    o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));
builder.Services.AddSignalR();
builder.Services.AddAntiforgery(o => o.HeaderName = "X-CSRF-TOKEN");

// ── Rate limiting (DDoS / brute-force himoyasi, defense-in-depth) ──
// Asosiy hajmli (volumetric) DDoS himoyasi nginx chekkasida (limit_req/limit_conn),
// bu esa ilova qatlamidagi qo'shimcha qatlam — nginx chetlab o'tilsa ham ishlaydi.
static string ClientIp(HttpContext ctx) =>
    ctx.Connection.RemoteIpAddress?.ToString() ?? "unknown";

builder.Services.AddRateLimiter(options =>
{
    // 429 — JSON, Retry-After bilan
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = async (context, token) =>
    {
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
            context.HttpContext.Response.Headers.RetryAfter =
                ((int)retryAfter.TotalSeconds).ToString();
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsJsonAsync(
            new { error = "Juda ko'p so'rov yuborildi. Birozdan keyin urinib ko'ring." }, token);
    };

    // Global — har IP uchun umumiy oqim chegarasi (flood himoyasi).
    // SignalR doimiy ulanishlari websocket freymlari orqali ishlaydi (alohida HTTP
    // so'rov sanalmaydi), shuning uchun bu chegara odatdagi o'yinni cheklamaydi.
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(ctx =>
        RateLimitPartition.GetFixedWindowLimiter(ClientIp(ctx), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 240,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        }));

    // "auth" — kirish / OAuth callback brute-force himoyasi (har IP: 20 / daqiqa)
    options.AddPolicy("auth", ctx =>
        RateLimitPartition.GetFixedWindowLimiter(ClientIp(ctx), _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 20,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0
        }));
});

// ── Hangfire (fon vazifalari) — in-memory storage (DB ga bog'liq emas) ──
builder.Services.AddHangfire(cfg => cfg
    .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
    .UseSimpleAssemblyNameTypeSerializer()
    .UseRecommendedSerializerSettings()
    .UseInMemoryStorage());
builder.Services.AddHangfireServer();
builder.Services.AddScoped<ScheduledJobs>();

// Nginx orqasidagi haqiqiy IP uchun (rate limiting)
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    o.KnownNetworks.Clear();
    o.KnownProxies.Clear();
});

var app = builder.Build();

// ── Boshlang'ich ma'lumotlarni seed qilish ────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await DataSeeder.SeedAsync(db);

    // Admin + SuperAdmin rollari + (sozlangan email bo'yicha) tayinlash
    var roleManager = scope.ServiceProvider
        .GetRequiredService<Microsoft.AspNetCore.Identity.RoleManager<Microsoft.AspNetCore.Identity.IdentityRole<Guid>>>();
    foreach (var role in new[] { "Admin", "SuperAdmin" })
        if (!await roleManager.RoleExistsAsync(role))
            await roleManager.CreateAsync(new Microsoft.AspNetCore.Identity.IdentityRole<Guid>(role));

    var userManager = scope.ServiceProvider
        .GetRequiredService<Microsoft.AspNetCore.Identity.UserManager<TypingWar.Infrastructure.Identity.ApplicationUser>>();

    async Task EnsureRoleByEmailAsync(string? email, params string[] roles)
    {
        if (string.IsNullOrWhiteSpace(email)) return;
        var u = await userManager.FindByEmailAsync(email);
        if (u is null) return;
        foreach (var r in roles)
            if (!await userManager.IsInRoleAsync(u, r))
                await userManager.AddToRoleAsync(u, r);
    }

    // SuperAdmin email — Admin + SuperAdmin rollari
    await EnsureRoleByEmailAsync(builder.Configuration["Admin:SuperEmail"], "Admin", "SuperAdmin");
    // Oddiy admin email — faqat Admin roli
    await EnsureRoleByEmailAsync(builder.Configuration["Admin:Email"], "Admin");
}

// ── Middleware pipeline ───────────────────────────────────────
app.UseForwardedHeaders();
app.UseSerilogRequestLogging();   // tashqarida — API exception handler 400 ni toza loglaydi

// Reverse proxy (nginx) orqasida HTTP→HTTPS redirect'ni nginx bajaradi.
// Local/dev da true (appsettings), prod konteynerda Hosting__UseHttpsRedirection=false.
var useHttpsRedirection = builder.Configuration.GetValue("Hosting:UseHttpsRedirection", true);

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    if (useHttpsRedirection)
        app.UseHsts();
}

// API xatolarini (ValidationException→400, Unauthorized→401) JSON ko'rinishida
app.UseMiddleware<ApiExceptionMiddleware>();

if (useHttpsRedirection)
    app.UseHttpsRedirection();

// ── Xavfsizlik header'lari (XSS / clickjacking / sniffing himoya) ──
// CSP har so'rovda yangi nonce bilan: inline <script> faqat shu nonce bilan ishlaydi
// → tashqaridan in'ektsiya qilingan skript bajarilmaydi (XSS himoyasi).
app.Use(async (ctx, next) =>
{
    var nonceBytes = new byte[16];
    System.Security.Cryptography.RandomNumberGenerator.Fill(nonceBytes);
    var nonce = Convert.ToBase64String(nonceBytes);
    ctx.Items["csp-nonce"] = nonce;

    var h = ctx.Response.Headers;
    h.Append("X-Content-Type-Options", "nosniff");
    h.Append("X-Frame-Options", "DENY");
    h.Append("Referrer-Policy", "no-referrer");
    h.Append("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=(), usb=()");
    h.Append("Cross-Origin-Opener-Policy", "same-origin");
    h.Append("Content-Security-Policy",
        "default-src 'self'; " +
        "base-uri 'self'; " +
        "object-src 'none'; " +
        "frame-ancestors 'none'; " +
        "form-action 'self'; " +
        "img-src 'self' data: https:; " +
        "media-src 'self'; " +
        "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net data:; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; " +
        $"script-src 'self' 'nonce-{nonce}' https://cdnjs.cloudflare.com https://static.cloudflareinsights.com; " +
        "connect-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://static.cloudflareinsights.com; " +
        "worker-src 'self'; " +
        "manifest-src 'self'");
    await next();
});

// PWA manifest MIME (.webmanifest static files default da noma'lum)
var contentTypes = new Microsoft.AspNetCore.StaticFiles.FileExtensionContentTypeProvider();
contentTypes.Mappings[".webmanifest"] = "application/manifest+json";
app.UseStaticFiles(new StaticFileOptions
{
    ContentTypeProvider = contentTypes,
    OnPrepareResponse = ctx =>
    {
        // Service Worker'ni HECH QACHON cache'lamaslik: aks holda Cloudflare/brauzer
        // eski sw.js'ni soatlab ushlab, yangilanish (yangi CSP/cache versiya) kechikadi.
        // no-store => Cloudflare edge'da ham saqlamaydi, har safar origin'dan oladi.
        var path = ctx.File.Name;
        if (path.Equals("sw.js", StringComparison.OrdinalIgnoreCase) ||
            path.Equals("manifest.webmanifest", StringComparison.OrdinalIgnoreCase))
        {
            ctx.Context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
            ctx.Context.Response.Headers["Pragma"] = "no-cache";
            ctx.Context.Response.Headers["Expires"] = "0";
        }
    }
});

app.UseRouting();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Profilni (nom + hudud) to'ldirmagan foydalanuvchini /CompleteProfile ga majburlaydi
app.UseMiddleware<TypingWar.Web.Middleware.ProfileCompletionMiddleware>();

// Foydalanuvchining "oxirgi online" vaqtini yangilaydi (autentifikatsiyadan keyin)
app.UseMiddleware<TypingWar.Web.Middleware.LastSeenMiddleware>();

app.MapRazorPages();
app.MapControllers();
app.MapHub<TypingWar.Web.Hubs.LobbyHub>("/hubs/lobby");
app.MapHub<TypingWar.Web.Hubs.RaceHub>("/hubs/race");
app.MapHub<TypingWar.Web.Hubs.TeamRaceHub>("/hubs/teamrace");
app.MapHub<TypingWar.Web.Hubs.TournamentHub>("/hubs/tournament");
app.MapHub<TypingWar.Web.Hubs.UzMapHub>("/hubs/uzmap");

// ── Hangfire dashboard (/hangfire) — faqat Admin roli (JWT cookie) ──
app.UseHangfireDashboard("/hangfire", new DashboardOptions
{
    Authorization = new[] { new TypingWar.Web.Security.HangfireDashboardAuthFilter() },
    DashboardTitle = "TypingWar — Fon vazifalari",
    // Reverse proxy (nginx) orqasidagi HTTPS so'rovlar uchun lokal cheklov shart emas.
    IgnoreAntiforgeryToken = true
});

// Statik RecurringJob/BackgroundJob API JobStorage.Current ga tayanadi va toza startda
// (konteyner) hali o'rnatilmagan bo'lishi mumkin → DI orqali ishlatamiz (tavsiya etilgan usul).
using (var jobScope = app.Services.CreateScope())
{
    var recurring = jobScope.ServiceProvider.GetRequiredService<IRecurringJobManager>();
    recurring.AddOrUpdate<ScheduledJobs>("daily-contest",
        x => x.EnsureDailyContestAsync(), "0 20 * * *");          // har kuni 20:00
    recurring.AddOrUpdate<ScheduledJobs>("tournament-starter",
        x => x.StartDueTournamentsAsync(), "* * * * *");          // har daqiqa
    recurring.AddOrUpdate<ScheduledJobs>("tournament-cleanup",
        x => x.CleanupExpiredTournamentsAsync(), "*/10 * * * *"); // har 10 daqiqada (tugaganidan 1 soat keyin o'chiradi)

    var background = jobScope.ServiceProvider.GetRequiredService<IBackgroundJobClient>();
    background.Enqueue<ScheduledJobs>(x => x.EnsureDailyContestAsync()); // bugungisi darhol
}

app.Run();

/// <summary>Integration testlar uchun ochiq entry point.</summary>
public partial class Program { }

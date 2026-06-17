using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Entities;
using TypingWar.Infrastructure.Identity;

namespace TypingWar.Infrastructure.Persistence;

/// <summary>
/// Asosiy EF Core konteksti. Identity (Users, Roles) + barcha domen jadvallari.
/// PostgreSQL, parametrli query (xom SQL ishlatilmaydi).
/// </summary>
public class AppDbContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>, IApplicationDbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<RaceText> RaceTexts => Set<RaceText>();
    public DbSet<RaceResult> RaceResults => Set<RaceResult>();
    public DbSet<PersonalBest> PersonalBests => Set<PersonalBest>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<RoomPlayer> RoomPlayers => Set<RoomPlayer>();
    public DbSet<Tournament> Tournaments => Set<Tournament>();
    public DbSet<TournamentMatch> TournamentMatches => Set<TournamentMatch>();
    public DbSet<TeamRace> TeamRaces => Set<TeamRace>();
    public DbSet<TeamMember> TeamMembers => Set<TeamMember>();
    public DbSet<TypingFingerprint> TypingFingerprints => Set<TypingFingerprint>();
    public DbSet<DailyContest> DailyContests => Set<DailyContest>();
    public DbSet<DailyContestEntry> DailyContestEntries => Set<DailyContestEntry>();
    public DbSet<TournamentPlayer> TournamentPlayers => Set<TournamentPlayer>();
    public DbSet<RegionStats> RegionStats => Set<RegionStats>();
    public DbSet<Friendship> Friendships => Set<Friendship>();
    public DbSet<UserSettings> UserSettings => Set<UserSettings>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Identity jadvallari nomlarini qisqartirish
        builder.Entity<ApplicationUser>(b =>
        {
            b.ToTable("Users");
            b.Property(u => u.RegionCode).HasMaxLength(32);
            b.Property(u => u.AvatarUrl).HasMaxLength(512);
            b.HasIndex(u => u.EloRating);
        });
        builder.Entity<IdentityRole<Guid>>().ToTable("Roles");

        // Konfiguratsiyalarni shu assembly dan qo'llash
        builder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}

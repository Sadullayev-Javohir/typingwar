using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using TypingWar.Domain.Entities;

namespace TypingWar.Infrastructure.Persistence.Configurations;

public class RaceTextConfiguration : IEntityTypeConfiguration<RaceText>
{
    public void Configure(EntityTypeBuilder<RaceText> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Content).IsRequired();
        b.HasIndex(x => new { x.Language, x.Category, x.Difficulty });
    }
}

public class RaceResultConfiguration : IEntityTypeConfiguration<RaceResult>
{
    public void Configure(EntityTypeBuilder<RaceResult> b)
    {
        b.HasKey(x => x.Id);
        b.HasIndex(x => x.UserId);
        b.HasIndex(x => new { x.UserId, x.TimeMode });
        b.HasOne(x => x.Text)
            .WithMany()
            .HasForeignKey(x => x.TextId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class PersonalBestConfiguration : IEntityTypeConfiguration<PersonalBest>
{
    public void Configure(EntityTypeBuilder<PersonalBest> b)
    {
        // Composite PK: UserId + TimeMode
        b.HasKey(x => new { x.UserId, x.TimeMode });
    }
}

public class RoomConfiguration : IEntityTypeConfiguration<Room>
{
    public void Configure(EntityTypeBuilder<Room> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Code).IsRequired().HasMaxLength(8);
        b.HasIndex(x => x.Code).IsUnique();
        b.Property(x => x.Settings).HasColumnType("jsonb");
        b.HasMany(x => x.Players)
            .WithOne(p => p.Room)
            .HasForeignKey(p => p.RoomId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class RoomPlayerConfiguration : IEntityTypeConfiguration<RoomPlayer>
{
    public void Configure(EntityTypeBuilder<RoomPlayer> b)
    {
        b.HasKey(x => x.Id);
        b.HasIndex(x => new { x.RoomId, x.UserId }).IsUnique();
    }
}

public class TournamentConfiguration : IEntityTypeConfiguration<Tournament>
{
    public void Configure(EntityTypeBuilder<Tournament> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.Name).IsRequired().HasMaxLength(128);
        b.Property(x => x.Settings).HasColumnType("jsonb");
        b.HasMany(x => x.Matches)
            .WithOne(m => m.Tournament)
            .HasForeignKey(m => m.TournamentId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class TournamentMatchConfiguration : IEntityTypeConfiguration<TournamentMatch>
{
    public void Configure(EntityTypeBuilder<TournamentMatch> b)
    {
        b.HasKey(x => x.Id);
        b.HasIndex(x => new { x.TournamentId, x.Round });
    }
}

public class TeamRaceConfiguration : IEntityTypeConfiguration<TeamRace>
{
    public void Configure(EntityTypeBuilder<TeamRace> b)
    {
        b.HasKey(x => x.Id);
        b.HasMany(x => x.Members)
            .WithOne(m => m.TeamRace)
            .HasForeignKey(m => m.TeamRaceId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class TeamMemberConfiguration : IEntityTypeConfiguration<TeamMember>
{
    public void Configure(EntityTypeBuilder<TeamMember> b)
    {
        b.HasKey(x => x.Id);
        b.HasIndex(x => new { x.TeamRaceId, x.UserId }).IsUnique();
    }
}

public class TypingFingerprintConfiguration : IEntityTypeConfiguration<TypingFingerprint>
{
    public void Configure(EntityTypeBuilder<TypingFingerprint> b)
    {
        b.HasKey(x => x.UserId);
        b.Property(x => x.BigramStats).HasColumnType("jsonb");
        b.Property(x => x.SlowKeys).HasColumnType("jsonb");
    }
}

public class DailyContestConfiguration : IEntityTypeConfiguration<DailyContest>
{
    public void Configure(EntityTypeBuilder<DailyContest> b)
    {
        b.HasKey(x => x.Id);
        b.HasIndex(x => x.Date).IsUnique();
    }
}

public class RegionStatsConfiguration : IEntityTypeConfiguration<RegionStats>
{
    public void Configure(EntityTypeBuilder<RegionStats> b)
    {
        b.HasKey(x => x.Id);
        b.Property(x => x.RegionCode).IsRequired().HasMaxLength(32);
        b.HasIndex(x => new { x.RegionCode, x.Date }).IsUnique();
    }
}

public class FriendshipConfiguration : IEntityTypeConfiguration<Friendship>
{
    public void Configure(EntityTypeBuilder<Friendship> b)
    {
        b.HasKey(x => x.Id);
        b.HasIndex(x => new { x.RequesterId, x.AddresseeId }).IsUnique();
    }
}

public class UserSettingsConfiguration : IEntityTypeConfiguration<UserSettings>
{
    public void Configure(EntityTypeBuilder<UserSettings> b)
    {
        b.HasKey(x => x.UserId);
        b.Property(x => x.FontFamily).HasMaxLength(64);
    }
}

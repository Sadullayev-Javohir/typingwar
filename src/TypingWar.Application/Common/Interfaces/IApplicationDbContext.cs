using Microsoft.EntityFrameworkCore;
using TypingWar.Domain.Entities;

namespace TypingWar.Application.Common.Interfaces;

/// <summary>Application qatlami uchun DbContext abstraktsiyasi (Infrastructure ga to'g'ridan-to'g'ri bog'lanmaslik uchun).</summary>
public interface IApplicationDbContext
{
    DbSet<RaceText> RaceTexts { get; }
    DbSet<RaceResult> RaceResults { get; }
    DbSet<PersonalBest> PersonalBests { get; }
    DbSet<UserSettings> UserSettings { get; }
    DbSet<Room> Rooms { get; }
    DbSet<RoomPlayer> RoomPlayers { get; }
    DbSet<TeamRace> TeamRaces { get; }
    DbSet<TeamMember> TeamMembers { get; }
    DbSet<DailyContest> DailyContests { get; }
    DbSet<DailyContestEntry> DailyContestEntries { get; }
    DbSet<Tournament> Tournaments { get; }
    DbSet<TournamentMatch> TournamentMatches { get; }
    DbSet<TournamentPlayer> TournamentPlayers { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

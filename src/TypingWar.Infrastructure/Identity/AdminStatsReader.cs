using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Infrastructure.Persistence;

namespace TypingWar.Infrastructure.Identity;

/// <summary>Identity (Users) tomonidagi sanoqlar — admin paneli uchun.</summary>
public class AdminStatsReader : IAdminStatsReader
{
    private readonly AppDbContext _db;

    public AdminStatsReader(AppDbContext db) => _db = db;

    public Task<int> CountUsersAsync(CancellationToken ct = default) => _db.Users.CountAsync(ct);
}

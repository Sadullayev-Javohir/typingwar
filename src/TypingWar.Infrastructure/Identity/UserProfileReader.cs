using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Infrastructure.Persistence;

namespace TypingWar.Infrastructure.Identity;

/// <summary>ApplicationUser (Identity) dan hudud kodini o'qiydi.</summary>
public class UserProfileReader : IUserProfileReader
{
    private readonly AppDbContext _db;

    public UserProfileReader(AppDbContext db) => _db = db;

    public async Task<string?> GetRegionCodeAsync(Guid userId, CancellationToken ct = default)
        => await _db.Users
            .Where(u => u.Id == userId)
            .Select(u => u.RegionCode)
            .FirstOrDefaultAsync(ct);
}

using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Infrastructure.Persistence;

namespace TypingWar.Infrastructure.Identity;

/// <summary>
/// Admin paneli uchun foydalanuvchi (Identity) boshqaruvi. UserManager (rollar) +
/// AppDbContext (bog'liq domen ma'lumotlarini tozalash) ustida ishlaydi.
/// </summary>
public class AdminService : IAdminService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AppDbContext _db;

    public AdminService(UserManager<ApplicationUser> userManager, AppDbContext db)
    {
        _userManager = userManager;
        _db = db;
    }

    public async Task<IReadOnlyList<AdminUserDto>> ListUsersAsync(string? search, CancellationToken ct = default)
    {
        var q = _userManager.Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            q = q.Where(u =>
                (u.UserName != null && u.UserName.ToLower().Contains(s)) ||
                (u.Email != null && u.Email.ToLower().Contains(s)));
        }

        var users = await q.OrderByDescending(u => u.CreatedAt).Take(500).ToListAsync(ct);
        var ids = users.Select(u => u.Id).ToList();

        // Har bir foydalanuvchining poyga soni va eng yuqori WPM si (bitta so'rovda)
        var raceCounts = await _db.RaceResults.AsNoTracking()
            .Where(r => ids.Contains(r.UserId))
            .GroupBy(r => r.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Count, ct);

        var bestWpms = await _db.PersonalBests.AsNoTracking()
            .Where(p => ids.Contains(p.UserId))
            .GroupBy(p => p.UserId)
            .Select(g => new { UserId = g.Key, Best = g.Max(p => p.BestWpm) })
            .ToDictionaryAsync(x => x.UserId, x => x.Best, ct);

        var result = new List<AdminUserDto>(users.Count);
        foreach (var u in users)
        {
            var roles = await _userManager.GetRolesAsync(u);
            result.Add(new AdminUserDto(
                u.Id, u.UserName ?? "—", u.Email ?? "—", u.RegionCode, u.EloRating,
                u.CreatedAt, u.LastLoginAt, u.LastSeenAt, u.ProfileCompleted, roles.ToList(),
                raceCounts.TryGetValue(u.Id, out var c) ? c : 0,
                bestWpms.TryGetValue(u.Id, out var w) ? w : 0));
        }
        return result;
    }

    public async Task DeleteUserAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString())
            ?? throw new InvalidOperationException("Foydalanuvchi topilmadi.");

        if (await _userManager.IsInRoleAsync(user, "SuperAdmin"))
            throw new InvalidOperationException("SuperAdmin foydalanuvchisini o'chirib bo'lmaydi.");

        // Bog'liq domen ma'lumotlarini tozalash (FK yo'q — UserId oddiy Guid)
        await _db.RaceResults.Where(r => r.UserId == userId).ExecuteDeleteAsync(ct);
        await _db.PersonalBests.Where(p => p.UserId == userId).ExecuteDeleteAsync(ct);
        await _db.UserSettings.Where(p => p.UserId == userId).ExecuteDeleteAsync(ct);
        await _db.TypingFingerprints.Where(p => p.UserId == userId).ExecuteDeleteAsync(ct);
        await _db.DailyContestEntries.Where(p => p.UserId == userId).ExecuteDeleteAsync(ct);
        await _db.RoomPlayers.Where(p => p.UserId == userId).ExecuteDeleteAsync(ct);
        await _db.TeamMembers.Where(p => p.UserId == userId).ExecuteDeleteAsync(ct);
        await _db.TournamentPlayers.Where(p => p.UserId == userId).ExecuteDeleteAsync(ct);
        await _db.Friendships.Where(f => f.RequesterId == userId || f.AddresseeId == userId).ExecuteDeleteAsync(ct);

        var del = await _userManager.DeleteAsync(user);
        if (!del.Succeeded)
            throw new InvalidOperationException(string.Join("; ", del.Errors.Select(e => e.Description)));
    }

    public async Task<IReadOnlyList<string>> SetAdminRoleAsync(Guid userId, bool isAdmin, CancellationToken ct = default)
    {
        var user = await _userManager.FindByIdAsync(userId.ToString())
            ?? throw new InvalidOperationException("Foydalanuvchi topilmadi.");

        if (await _userManager.IsInRoleAsync(user, "SuperAdmin"))
            throw new InvalidOperationException("SuperAdmin rolini o'zgartirib bo'lmaydi.");

        var inRole = await _userManager.IsInRoleAsync(user, "Admin");
        if (isAdmin && !inRole)
            await _userManager.AddToRoleAsync(user, "Admin");
        else if (!isAdmin && inRole)
            await _userManager.RemoveFromRoleAsync(user, "Admin");

        var roles = await _userManager.GetRolesAsync(user);
        return roles.ToList();
    }

    public async Task<IReadOnlyDictionary<Guid, string>> GetUsernamesAsync(
        IEnumerable<Guid> userIds, CancellationToken ct = default)
    {
        var ids = userIds.Distinct().ToList();
        return await _userManager.Users.AsNoTracking()
            .Where(u => ids.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.UserName ?? "—", ct);
    }
}

using System.Collections.Concurrent;
using TypingWar.Application.Features.Online;

namespace TypingWar.Infrastructure.Realtime;

/// <summary>
/// Onlayn foydalanuvchilar ro'yxati (real-time). Har autentifikatsiyalangan
/// ulanishda foydalanuvchi qo'shiladi, uzilganda o'chiriladi. Bir foydalanuvchi
/// bir nechta tab/device da bo'lishi mumkin — ulanishlar soni sanab boriladi.
/// Xotira ichidagi (in-memory) singleton — ilova qayta ishga tushsa tozalanadi
/// (onlayn holat uchun qabul qilinadi, RoomLiveState kabi).
/// </summary>
public class OnlineUserService : TypingWar.Application.Common.Interfaces.IOnlineUserProvider
{
    private sealed class Entry
    {
        public string Username { get; init; } = "";
        public double AvgWpm { get; init; }
        public string? AvatarUrl { get; init; }
        public string? RegionCode { get; init; }
        public HashSet<string> ConnectionIds { get; } = new();
    }

    private readonly ConcurrentDictionary<Guid, Entry> _users = new();

    /// <summary>Foydalanuvchini onlayn ro'yxatga qo'shadi (ulanish bo'yicha).</summary>
    public void Add(Guid userId, string connId, string username, double avgWpm,
        string? avatarUrl, string? regionCode)
    {
        var entry = _users.AddOrUpdate(userId,
            _ => new Entry { Username = username, AvgWpm = avgWpm, AvatarUrl = avatarUrl, RegionCode = regionCode },
            (_, e) => e);
        lock (entry.ConnectionIds) entry.ConnectionIds.Add(connId);
    }

    /// <summary>Ulanishni o'chiradi. Foydalanuvchining boshqa ulanishi qolmasa — ro'yxatdan o'chiriladi.</summary>
    /// <returns>true — agar foydalanuvchi butunlay offlayn bo'lsa (oxirgi ulanish).</returns>
    public bool Remove(Guid userId, string connId)
    {
        if (!_users.TryGetValue(userId, out var entry)) return false;
        bool empty;
        lock (entry.ConnectionIds)
        {
            entry.ConnectionIds.Remove(connId);
            empty = entry.ConnectionIds.Count == 0;
        }
        if (empty) _users.TryRemove(userId, out _);
        return empty;
    }

    public bool IsOnline(Guid userId) => _users.ContainsKey(userId);

    public TypingWar.Application.Features.Online.OnlineUserDto? Get(Guid userId)
    {
        if (!_users.TryGetValue(userId, out var e)) return null;
        return new OnlineUserDto(userId, e.Username, Math.Round(e.AvgWpm, 1), e.AvatarUrl, e.RegionCode);
    }

    public IReadOnlyList<TypingWar.Application.Features.Online.OnlineUserDto> GetList()
         => _users.Select(kv => new OnlineUserDto(
             kv.Key, kv.Value.Username, Math.Round(kv.Value.AvgWpm, 1),
             kv.Value.AvatarUrl, kv.Value.RegionCode)).ToList();
}



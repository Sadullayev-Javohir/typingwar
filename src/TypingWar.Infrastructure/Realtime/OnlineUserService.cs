using System.Collections.Concurrent;
using System.Threading;
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
        public string Username { get; set; } = "";
        public double AvgWpm { get; set; }
        public string? AvatarUrl { get; set; }
        public string? RegionCode { get; set; }
        public HashSet<string> ConnectionIds { get; } = new();
    }

    private readonly ConcurrentDictionary<Guid, Entry> _users = new();

    /// <summary>
    /// Uzilgan ulanish uchun "inchamlik" oyna (millisekund). Brauzer fon-tab'ga o'tkazganda
    /// WebSocket'ni yopishi mumkin — bu holda foydalanuvchi "onlayn bo'lsa-da" ro'yxatdan
    /// bir zumda o'chib ketmasin. Uzilishdan keyin shu vaqt ichida qayta ulanilsa
    /// (yangi tab/yangi ulanish) o'chirish bekor qilinadi.
    /// </summary>
    private static readonly int GraceMilliseconds = 30_000;

    /// <summary>Har foydalanuvchi uchun rejalashtirilgan kechikkan o'chirish taymeri.</summary>
    private readonly ConcurrentDictionary<Guid, System.Threading.Timer> _pendingRemoval = new();

    /// <summary>Foydalanuvchini onlayn ro'yxatga qo'shadi (ulanish bo'yicha).</summary>
    public void Add(Guid userId, string connId, string username, double avgWpm,
        string? avatarUrl, string? regionCode)
    {
        var entry = _users.AddOrUpdate(userId,
            _ => new Entry { Username = username, AvgWpm = avgWpm, AvatarUrl = avatarUrl, RegionCode = regionCode },
            (_, e) =>
            {
                // Profil yangilanishi (username/avatar o'zgargan bo'lishi mumkin)
                e.Username = username;
                e.AvgWpm = avgWpm;
                e.AvatarUrl = avatarUrl;
                e.RegionCode = regionCode;
                return e;
            });
        lock (entry.ConnectionIds) entry.ConnectionIds.Add(connId);

        // Rejalashtirilgan o'chirishni bekor qil (foydalanuvchi qayta ulandi)
        if (_pendingRemoval.TryRemove(userId, out var t)) t.Dispose();
    }

    /// <summary>
    /// Ulanishni o'chiradi. Foydalanuvchining boshqa ulanishi qolmasa — ro'yxatdan
    /// darhol emas, balki <see cref="GraceMilliseconds"/> o'tgach o'chiriladi
    /// (shu vaqt ichida qayta ulanish bo'lsa o'chirish bekor qilinadi).
    /// </summary>
    public void Remove(Guid userId, string connId)
    {
        if (!_users.TryGetValue(userId, out var entry)) return;
        bool empty;
        lock (entry.ConnectionIds)
        {
            entry.ConnectionIds.Remove(connId);
            empty = entry.ConnectionIds.Count == 0;
        }
        if (!empty) return;

        // Barcha ulanishlar uzildi — kechikkan o'chirishni rejalashtiramiz
        var timer = new Timer(_ =>
        {
            if (_users.TryGetValue(userId, out var e))
            {
                lock (e.ConnectionIds)
                {
                    if (e.ConnectionIds.Count == 0)
                    {
                        Entry? removed = null;
                        _users.TryRemove(userId, out removed);
                    }
                }
            }
            System.Threading.Timer? pending = null;
            _pendingRemoval.TryRemove(userId, out pending);
            pending?.Dispose();
        }, null, GraceMilliseconds, Timeout.Infinite);
        _pendingRemoval[userId] = timer;
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



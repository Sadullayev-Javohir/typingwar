using System.Collections.Concurrent;
using TypingWar.Application.Features.Online;
using TypingWar.Domain.Constants;
using TypingWar.Domain.Services;

namespace TypingWar.Infrastructure.Realtime;

/// <summary>
/// Do'stlar "partiyasi" (hangout/duel lobby) — kimdir boshqasini invite qilganda
/// yaratiladi. Egasi (invite qilgan) + uning taklif qilgan do'stlari bitta partiyada
/// yig'iladi. Qabul qilgandan keyin foydalanuvchi shu partiyaga qo'shiladi va
/// barcha a'zolar (egasi + oldin kelgan do'stlar) unga ko'rinadi. Xotira ichidagi
/// singleton — ilova qayta ishga tushsa tozalanadi (onlayn sessiya uchun qabul qilinadi).
/// </summary>
public class PartyService
{
    private sealed class Party
    {
        public string Code { get; init; } = "";
        public Guid OwnerId { get; init; }
        public ConcurrentDictionary<Guid, TypingWar.Application.Features.Online.PartyMemberDto> Members { get; } = new();
    }

    private readonly ConcurrentDictionary<string, Party> _byCode = new();
    private readonly ConcurrentDictionary<Guid, string> _codeByOwner = new();

    private Party GetOrCreate(Guid ownerId)
    {
        if (_codeByOwner.TryGetValue(ownerId, out var existing) &&
            _byCode.TryGetValue(existing, out var p)) return p;

        string code;
        int attempt = 0;
        do { code = RoomCodeGenerator.Generate(); attempt++; }
        while (_byCode.ContainsKey(code) && attempt < 10);

        var party = new Party { Code = code, OwnerId = ownerId };
        _byCode[code] = party;
        _codeByOwner[ownerId] = code;
        return party;
    }

    /// <summary>Invite yuboruvchining partiyasini qaytaradi (yo'q bo'lsa yaratadi).</summary>
    public string GetOrCreateCode(Guid ownerId,
        string? ownerName = null, double ownerAvgWpm = 0, string? ownerAvatar = null, string? ownerRegion = null)
    {
        var p = GetOrCreate(ownerId);
        // Egasi har doim a'zo bo'lsin — ma'lumot bo'lsa haqiqiy profil bilan
        // (aks holda placeholder "(egasi)").
        p.Members.AddOrUpdate(ownerId,
            _ => new TypingWar.Application.Features.Online.PartyMemberDto(
                ownerId.ToString(), ownerName ?? "(egasi)", ownerAvgWpm, ownerAvatar, ownerRegion, true),
            (_, existing) => existing with
            {
                Username = ownerName ?? existing.Username,
                AvgWpm = ownerName != null ? ownerAvgWpm : existing.AvgWpm,
                AvatarUrl = ownerName != null ? ownerAvatar : existing.AvatarUrl,
                RegionCode = ownerName != null ? ownerRegion : existing.RegionCode,
                IsOwner = true
            });
        return p.Code;
    }

    public bool Exists(string code) => _byCode.ContainsKey(code.ToUpperInvariant());

    /// <summary>Foydalanuvchini partiyaga qo'shadi. Qaytgan qiymat — yangilangan a'zolar ro'yxati.</summary>
    public IReadOnlyList<TypingWar.Application.Features.Online.PartyMemberDto> Join(string code, TypingWar.Application.Features.Online.PartyMemberDto member)
    {
        code = code.ToUpperInvariant();
        if (!_byCode.TryGetValue(code, out var p)) return new List<TypingWar.Application.Features.Online.PartyMemberDto>();
        var userId = Guid.Parse(member.UserId);
        // Qo'shilayotgan a'zo egaga teng bo'lsa isOwner saqlab qolinsin (hub har doim false yuboradi).
        var m = member with { IsOwner = userId == p.OwnerId };
        p.Members[userId] = m;
        return p.Members.Values.ToList();
    }

    public IReadOnlyList<TypingWar.Application.Features.Online.PartyMemberDto> GetMembers(string code)
    {
        code = code.ToUpperInvariant();
        return _byCode.TryGetValue(code, out var p)
            ? p.Members.Values.ToList()
            : new List<TypingWar.Application.Features.Online.PartyMemberDto>();
    }

    public void Leave(string code, Guid userId)
    {
        code = code.ToUpperInvariant();
        if (_byCode.TryGetValue(code, out var p)) p.Members.TryRemove(userId, out _);
    }

    /// <summary>
    /// Foydalanuvchini a'zo bo'lgan BARCHA partiyalardan chiqaradi (ulanish uzilganda).
    /// Qaytadi: har bir ta'sirlangan partiya kodi + yangilangan a'zolar ro'yxati —
    /// hub ularni guruhga qayta broadcast qilishi uchun.
    /// </summary>
    public IReadOnlyList<(string Code, IReadOnlyList<TypingWar.Application.Features.Online.PartyMemberDto> Members)> RemoveEverywhere(Guid userId)
    {
        var affected = new List<(string, IReadOnlyList<TypingWar.Application.Features.Online.PartyMemberDto>)>();
        foreach (var p in _byCode.Values)
        {
            if (p.Members.TryRemove(userId, out _))
                affected.Add((p.Code, p.Members.Values.ToList()));
        }
        return affected;
    }
}

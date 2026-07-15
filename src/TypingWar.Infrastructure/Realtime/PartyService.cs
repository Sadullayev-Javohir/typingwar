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
    public string GetOrCreateCode(Guid ownerId)
    {
        var p = GetOrCreate(ownerId);
        // Egasi har doim a'zo bo'lsin
        p.Members.TryAdd(ownerId, new TypingWar.Application.Features.Online.PartyMemberDto(ownerId.ToString(), "(egasi)", 0, null, null, true));
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
}

using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Domain.Entities;
using TypingWar.Domain.Enums;
using TypingWar.Application.Common.Interfaces;

namespace TypingWar.Application.Features.Tournaments;

/// <summary>
/// DEMO/SIMULYATSIYA: N ta soxta o'yinchi bilan ochiq turnir yaratadi (host yo'q, parolsiz).
/// Maqsad — bracket jarayonini (raundlar, g'oliblar, chempion) ko'rsatish. Haqiqiy User talab qilinmaydi
/// (TournamentPlayer.UserId Users jadvaliga FK emas — denormalizatsiya qilingan Username bilan).
/// </summary>
public record CreateDemoTournamentCommand(int PlayerCount = 32, string? Name = null) : IRequest<Guid>;

public class CreateDemoTournamentCommandHandler : IRequestHandler<CreateDemoTournamentCommand, Guid>
{
    private readonly IApplicationDbContext _db;

    public CreateDemoTournamentCommandHandler(IApplicationDbContext db) => _db = db;

    // Soxta o'yinchilar uchun o'zbekcha ism poydevori (32+ noyob kombinatsiya chiqadi).
    private static readonly string[] FirstNames =
    {
        "Javohir", "Diyor", "Sardor", "Bekzod", "Aziz", "Jasur", "Otabek", "Doston",
        "Sherzod", "Ulug'bek", "Akmal", "Bobur", "Temur", "Shoxrux", "Islom", "Quvonch",
        "Madina", "Sevara", "Dilnoza", "Malika", "Nilufar", "Gulnoza", "Zarina", "Shahnoza",
        "Kamol", "Rustam", "Sanjar", "Farrux", "Olim", "Murod", "Davron", "Eldor",
        "Nodira", "Laziz", "Behruz", "Mirjalol", "Asadbek", "Xusan", "Sirojiddin", "Anvar"
    };

    public async Task<Guid> Handle(CreateDemoTournamentCommand request, CancellationToken cancellationToken)
    {
        int count = request.PlayerCount is >= 2 and <= 32 ? request.PlayerCount : 32;

        var tournament = new Tournament
        {
            Name = string.IsNullOrWhiteSpace(request.Name) ? $"Demo turnir ({count} o'yinchi)" : request.Name.Trim(),
            HostId = Guid.Empty,                 // simulyatsiya — egasi yo'q
            Capacity = 32,
            StartAt = DateTime.UtcNow,
            // So'z rejimi, o'zbekcha, qisqa — simulyatsiyada matn ishlatilmaydi, lekin mosligi uchun
            Settings = "{\"Language\":\"Uzbek\",\"TextMode\":\"Words\",\"WordCount\":25}",
            Status = TournamentStatus.Registration,
            IsPrivate = false
        };
        _db.Tournaments.Add(tournament);

        var rnd = new Random();
        var used = new HashSet<string>();
        for (int i = 0; i < count; i++)
        {
            string name;
            do
            {
                var first = FirstNames[rnd.Next(FirstNames.Length)];
                name = $"{first}_{rnd.Next(10, 99)}";
            } while (!used.Add(name));

            _db.TournamentPlayers.Add(new TournamentPlayer
            {
                TournamentId = tournament.Id,
                UserId = Guid.NewGuid(),
                Username = name,
                Seed = i + 1
            });
        }

        await _db.SaveChangesAsync(cancellationToken);
        return tournament.Id;
    }
}

/// <summary>
/// DEMO: simulyatsiya turnirini o'chiradi. XAVFSIZLIK — faqat HostId=Guid.Empty bo'lgan
/// (ya'ni demo) turnirlar o'chiriladi, haqiqiy turnirlarga ta'sir qilmaydi.
/// </summary>
public record DeleteDemoTournamentCommand(Guid TournamentId) : IRequest<Unit>;

public class DeleteDemoTournamentCommandHandler : IRequestHandler<DeleteDemoTournamentCommand, Unit>
{
    private readonly IApplicationDbContext _db;

    public DeleteDemoTournamentCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<Unit> Handle(DeleteDemoTournamentCommand request, CancellationToken cancellationToken)
    {
        var t = await _db.Tournaments
            .FirstOrDefaultAsync(x => x.Id == request.TournamentId && x.HostId == Guid.Empty, cancellationToken);
        if (t is null) return Unit.Value;   // demo emas yoki yo'q — jim o'tkazib yuboramiz

        var matches = await _db.TournamentMatches.Where(m => m.TournamentId == t.Id).ToListAsync(cancellationToken);
        var players = await _db.TournamentPlayers.Where(p => p.TournamentId == t.Id).ToListAsync(cancellationToken);
        _db.TournamentMatches.RemoveRange(matches);
        _db.TournamentPlayers.RemoveRange(players);
        _db.Tournaments.Remove(t);
        await _db.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }
}

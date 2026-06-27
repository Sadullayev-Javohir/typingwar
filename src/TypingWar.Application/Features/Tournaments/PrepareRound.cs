using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Enums;
using TypingWar.Domain.Services;

namespace TypingWar.Application.Features.Tournaments;

/// <summary>Raqobatlashadigan bitta o'yin (ikkala ishtirokchi aniq).</summary>
public record RaceMatchInfo(
    Guid MatchId, int Round, int Slot,
    Guid Player1Id, string Player1, Guid Player2Id, string Player2);

/// <summary>Keyingi round natijasi — yo raceable o'yinlar, yo turnir tugadi.</summary>
public record PrepareRoundResult(
    bool Finished, Guid? ChampionId, string? ChampionName,
    int Round, string RoundName, IReadOnlyList<RaceMatchInfo> Matches);

/// <summary>
/// Keyingi raceable roundni topadi: yo'l-yo'lakay "bye"larni (bitta ishtirokchili o'yin)
/// avtomatik o'tkazadi. Hech qaysi roundda raceable o'yin qolmasa — turnir tugadi (chempion).
/// </summary>
public record PrepareRoundCommand(Guid TournamentId) : IRequest<PrepareRoundResult>;

public class PrepareRoundCommandHandler : IRequestHandler<PrepareRoundCommand, PrepareRoundResult>
{
    private readonly IApplicationDbContext _db;

    public PrepareRoundCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<PrepareRoundResult> Handle(PrepareRoundCommand request, CancellationToken cancellationToken)
    {
        var t = await _db.Tournaments
            .FirstOrDefaultAsync(x => x.Id == request.TournamentId, cancellationToken)
            ?? throw new InvalidOperationException("Turnir topilmadi.");
        if (t.Status != TournamentStatus.InProgress)
            throw new InvalidOperationException("Turnir faol emas.");

        var matches = await _db.TournamentMatches
            .Where(m => m.TournamentId == t.Id)
            .ToListAsync(cancellationToken);
        var byKey = matches.ToDictionary(m => (m.Round, m.Slot));
        var players = await _db.TournamentPlayers
            .Where(p => p.TournamentId == t.Id)
            .ToDictionaryAsync(p => p.UserId, p => p.Username, cancellationToken);
        string Name(Guid id) => players.TryGetValue(id, out var n) ? n : "—";

        int finalRound = TournamentBracket.Rounds(t.Capacity);

        for (int r = 1; r <= finalRound; r++)
        {
            // 1) Bye'larni o'tkazish: bitta ishtirokchili, g'olibsiz o'yin → o'sha o'yinchi o'tadi
            foreach (var m in matches.Where(m => m.Round == r && m.WinnerId is null))
            {
                Guid? solo = (m.Player1Id, m.Player2Id) switch
                {
                    ({ } p1, null) => p1,
                    (null, { } p2) => p2,
                    _ => null
                };
                if (solo is Guid w)
                {
                    m.WinnerId = w;
                    if (r >= finalRound) { t.ChampionId = w; t.Status = TournamentStatus.Finished; t.FinishedAt = DateTime.UtcNow; }
                    else StartTournamentCommandHandler.Advance(byKey, t.Capacity, m.Round, m.Slot, w);
                }
            }

            // 2) Bu roundda raceable (ikkala ishtirokchi aniq, g'olib yo'q) o'yinlar
            var raceable = matches
                .Where(m => m.Round == r && m.WinnerId is null &&
                            m.Player1Id is not null && m.Player2Id is not null)
                .OrderBy(m => m.Slot)
                .Select(m => new RaceMatchInfo(
                    m.Id, m.Round, m.Slot,
                    m.Player1Id!.Value, Name(m.Player1Id!.Value),
                    m.Player2Id!.Value, Name(m.Player2Id!.Value)))
                .ToList();

            if (raceable.Count > 0)
            {
                await _db.SaveChangesAsync(cancellationToken);
                int matchesInRound = t.Capacity / (1 << r);
                return new PrepareRoundResult(false, null, null, r,
                    TournamentBracket.RoundName(matchesInRound), raceable);
            }
        }

        // Hech qayerda raceable yo'q — turnir tugadi
        var finalMatch = matches.FirstOrDefault(m => m.Round == finalRound);
        var champ = finalMatch?.WinnerId ?? t.ChampionId;
        if (champ is Guid c && t.Status != TournamentStatus.Finished)
        {
            t.ChampionId = c;
            t.Status = TournamentStatus.Finished;
            t.FinishedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync(cancellationToken);
        return new PrepareRoundResult(true, champ, champ is Guid g ? Name(g) : null,
            finalRound, "Final", Array.Empty<RaceMatchInfo>());
    }
}

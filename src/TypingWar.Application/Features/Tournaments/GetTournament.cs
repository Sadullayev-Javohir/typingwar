using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Entities;
using TypingWar.Domain.Enums;
using TypingWar.Domain.Services;

namespace TypingWar.Application.Features.Tournaments;

/// <summary>Turnir to'liq ko'rinishi — o'yinchilar, bracket, yakuniy joylar, mening rolim.</summary>
public record GetTournamentQuery(Guid Id) : IRequest<TournamentDetailDto?>;

public class GetTournamentQueryHandler : IRequestHandler<GetTournamentQuery, TournamentDetailDto?>
{
    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GetTournamentQueryHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<TournamentDetailDto?> Handle(GetTournamentQuery request, CancellationToken cancellationToken)
    {
        var t = await _db.Tournaments.FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);
        if (t is null) return null;

        var players = await _db.TournamentPlayers
            .Where(p => p.TournamentId == t.Id)
            .OrderBy(p => p.Seed)
            .ToListAsync(cancellationToken);
        var nameById = players.ToDictionary(p => p.UserId, p => p.Username);
        string? Name(Guid? id) => id is Guid g && nameById.TryGetValue(g, out var n) ? n : null;

        var matches = await _db.TournamentMatches
            .Where(m => m.TournamentId == t.Id)
            .OrderBy(m => m.Round).ThenBy(m => m.Slot)
            .ToListAsync(cancellationToken);

        var matchDtos = matches.Select(m =>
        {
            int matchesInRound = t.Capacity / (1 << m.Round);
            return new TournamentMatchDto(
                m.Id, m.Round, TournamentBracket.RoundName(matchesInRound), m.Slot,
                m.Player1Id, Name(m.Player1Id), m.Player2Id, Name(m.Player2Id),
                m.WinnerId, Name(m.WinnerId),
                m.Player1Wpm, m.Player2Wpm, m.Player1Accuracy, m.Player2Accuracy);
        }).ToList();

        var uid = _currentUser.UserId;
        bool isRegistered = uid.HasValue && nameById.ContainsKey(uid.Value);
        bool isHost = uid.HasValue && uid.Value == t.HostId;

        var info = new TournamentInfoDto(
            t.Id, t.Name, t.Status, t.StartAt, t.Capacity, players.Count,
            t.ChampionId, Name(t.ChampionId), t.Settings);

        var standings = BuildStandings(t, players);

        return new TournamentDetailDto(
            info,
            players.Select(p => new TournamentPlayerDto(p.UserId, p.Username, p.Seed)).ToList(),
            matchDtos, standings, isRegistered, isHost, uid);
    }

    /// <summary>Yakuniy joylar: chempion 1-o'rin, keyin kechroq tushib qolganlar yuqorida, so'ng eng yaxshi WPM bo'yicha.</summary>
    internal static IReadOnlyList<TournamentStandingDto> BuildStandings(Tournament t, IReadOnlyList<TournamentPlayer> players)
    {
        if (t.Status != TournamentStatus.Finished || players.Count == 0)
            return Array.Empty<TournamentStandingDto>();

        int rounds = TournamentBracket.Rounds(t.Capacity);

        // Tartib: chempion birinchi, keyin EliminatedRound kamayish bo'yicha (kechroq = yaxshiroq), so'ng BestWpm.
        var ordered = players
            .OrderByDescending(p => p.UserId == t.ChampionId)
            .ThenByDescending(p => p.EliminatedRound == 0 ? int.MaxValue : p.EliminatedRound)
            .ThenByDescending(p => p.BestWpm)
            .ToList();

        var result = new List<TournamentStandingDto>(ordered.Count);
        for (int i = 0; i < ordered.Count; i++)
        {
            var p = ordered[i];
            bool champ = p.UserId == t.ChampionId;
            int elimRound = champ ? rounds : p.EliminatedRound;
            int matchesInRound = elimRound > 0 ? t.Capacity / (1 << elimRound) : 0;
            string roundName = champ ? "Chempion"
                : elimRound > 0 ? TournamentBracket.RoundName(matchesInRound)
                : "—";
            result.Add(new TournamentStandingDto(
                i + 1, p.UserId, p.Username, p.BestWpm, p.BestAccuracy, elimRound, roundName, champ));
        }
        return result;
    }
}

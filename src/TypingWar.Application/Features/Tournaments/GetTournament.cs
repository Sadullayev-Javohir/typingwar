using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Services;

namespace TypingWar.Application.Features.Tournaments;

/// <summary>Turnir to'liq ko'rinishi — o'yinchilar, bracket, mening holatim.</summary>
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
                m.WinnerId, Name(m.WinnerId));
        }).ToList();

        var uid = _currentUser.UserId;
        bool isRegistered = uid.HasValue && nameById.ContainsKey(uid.Value);

        var info = new TournamentInfoDto(
            t.Id, t.Name, t.Status, t.StartAt, t.Capacity, players.Count, Name(t.ChampionId));

        return new TournamentDetailDto(info, players.Select(p => p.Username).ToList(), matchDtos, isRegistered);
    }
}

using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Entities;
using TypingWar.Domain.Enums;
using TypingWar.Domain.Services;

namespace TypingWar.Application.Features.Tournaments;

/// <summary>Turnirni boshlaydi — bracketni quradi, byelarni avtomatik o'tkazadi, InProgress qiladi.</summary>
public record StartTournamentCommand(Guid TournamentId) : IRequest<Unit>;

public class StartTournamentCommandHandler : IRequestHandler<StartTournamentCommand, Unit>
{
    private readonly IApplicationDbContext _db;

    public StartTournamentCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<Unit> Handle(StartTournamentCommand request, CancellationToken cancellationToken)
    {
        var tournament = await _db.Tournaments
            .FirstOrDefaultAsync(t => t.Id == request.TournamentId, cancellationToken)
            ?? throw new InvalidOperationException("Turnir topilmadi.");

        if (tournament.Status != TournamentStatus.Registration)
            throw new InvalidOperationException("Turnir allaqachon boshlangan yoki tugagan.");

        var players = await _db.TournamentPlayers
            .Where(p => p.TournamentId == tournament.Id)
            .OrderBy(p => p.Seed)
            .ToListAsync(cancellationToken);

        if (players.Count < 2)
            throw new InvalidOperationException("Turnir uchun kamida 2 o'yinchi kerak.");

        var playerIds = players.Select(p => p.UserId).ToList();
        var slots = TournamentBracket.Build(tournament.Capacity, playerIds);

        // Slotlardan match entity lar
        var matches = slots.Select(s => new TournamentMatch
        {
            TournamentId = tournament.Id,
            Round = s.Round,
            Slot = s.Index,
            Player1Id = s.Player1Id,
            Player2Id = s.Player2Id
        }).ToList();

        var byKey = matches.ToDictionary(m => (m.Round, m.Slot));

        // Round 1 byelarni avtomatik o'tkazish (bitta o'yinchi bo'lsa)
        foreach (var m in matches.Where(m => m.Round == 1))
        {
            Guid? solo = (m.Player1Id, m.Player2Id) switch
            {
                ({ } p1, null) => p1,
                (null, { } p2) => p2,
                _ => null
            };
            if (solo is Guid winner)
            {
                m.WinnerId = winner;
                Advance(byKey, tournament.Capacity, m.Round, m.Slot, winner);
            }
        }

        _db.TournamentMatches.AddRange(matches);
        tournament.Status = TournamentStatus.InProgress;
        await _db.SaveChangesAsync(cancellationToken);
        return Unit.Value;
    }

    /// <summary>G'olibni keyingi round slotiga joylaydi (final bo'lmasa).</summary>
    internal static void Advance(
        Dictionary<(int, int), TournamentMatch> byKey, int capacity, int round, int slot, Guid winnerId)
    {
        if (round >= TournamentBracket.Rounds(capacity)) return; // final — keyingi yo'q
        var (pr, pi, asP1) = TournamentBracket.Parent(round, slot);
        if (!byKey.TryGetValue((pr, pi), out var parent)) return;
        if (asP1) parent.Player1Id = winnerId;
        else parent.Player2Id = winnerId;
    }
}

using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Constants;
using TypingWar.Domain.Entities;
using TypingWar.Domain.Enums;
using TypingWar.Domain.Services;

namespace TypingWar.Application.Features.Tournaments;

/// <summary>
/// Bitta o'yin natijasini yozadi: ballarni saqlaydi, g'olibni aniqlaydi (yoki host majburan
/// belgilaydi), yutqazganni tushib qolgan deb belgilaydi, g'olibni keyingi roundga o'tkazadi.
/// Final bo'lsa — chempion va turnir tugaydi.
/// </summary>
public record RecordMatchOutcomeCommand(
    Guid MatchId,
    Guid? ForcedWinnerId,
    double P1Wpm, double P1Accuracy,
    double P2Wpm, double P2Accuracy) : IRequest<TournamentMatchDto>;

public class RecordMatchOutcomeCommandHandler : IRequestHandler<RecordMatchOutcomeCommand, TournamentMatchDto>
{
    private readonly IApplicationDbContext _db;

    public RecordMatchOutcomeCommandHandler(IApplicationDbContext db) => _db = db;

    public async Task<TournamentMatchDto> Handle(RecordMatchOutcomeCommand request, CancellationToken cancellationToken)
    {
        var match = await _db.TournamentMatches
            .FirstOrDefaultAsync(m => m.Id == request.MatchId, cancellationToken)
            ?? throw new InvalidOperationException("O'yin topilmadi.");

        var tournament = await _db.Tournaments
            .FirstOrDefaultAsync(t => t.Id == match.TournamentId, cancellationToken)
            ?? throw new InvalidOperationException("Turnir topilmadi.");

        if (tournament.Status != TournamentStatus.InProgress)
            throw new InvalidOperationException("Turnir faol emas.");
        if (match.WinnerId is not null)
            throw new InvalidOperationException("O'yin g'olibi allaqachon belgilangan.");
        if (match.Player1Id is null || match.Player2Id is null)
            throw new InvalidOperationException("O'yinda ikkala ishtirokchi yo'q.");

        match.Player1Wpm = request.P1Wpm;
        match.Player2Wpm = request.P2Wpm;
        match.Player1Accuracy = request.P1Accuracy;
        match.Player2Accuracy = request.P2Accuracy;

        Guid winnerId = DetermineWinner(match, request);
        if (winnerId != match.Player1Id && winnerId != match.Player2Id)
            throw new InvalidOperationException("G'olib bu o'yin ishtirokchisi emas.");

        match.WinnerId = winnerId;
        Guid loserId = winnerId == match.Player1Id ? match.Player2Id.Value : match.Player1Id.Value;

        // O'yinchilarning eng yaxshi statistikasi + yutqazganning tushib qolgan roundi
        var roster = await _db.TournamentPlayers
            .Where(p => p.TournamentId == tournament.Id &&
                       (p.UserId == match.Player1Id || p.UserId == match.Player2Id))
            .ToListAsync(cancellationToken);

        UpdateBest(roster.FirstOrDefault(p => p.UserId == match.Player1Id), request.P1Wpm, request.P1Accuracy);
        UpdateBest(roster.FirstOrDefault(p => p.UserId == match.Player2Id), request.P2Wpm, request.P2Accuracy);

        var loser = roster.FirstOrDefault(p => p.UserId == loserId);
        if (loser is not null) loser.EliminatedRound = match.Round;

        if (match.Round >= TournamentBracket.Rounds(tournament.Capacity))
        {
            tournament.ChampionId = winnerId;
            tournament.Status = TournamentStatus.Finished;
        }
        else
        {
            var allMatches = await _db.TournamentMatches
                .Where(m => m.TournamentId == tournament.Id)
                .ToListAsync(cancellationToken);
            var byKey = allMatches.ToDictionary(m => (m.Round, m.Slot));
            StartTournamentCommandHandler.Advance(byKey, tournament.Capacity, match.Round, match.Slot, winnerId);
        }

        await _db.SaveChangesAsync(cancellationToken);

        var players = await _db.TournamentPlayers
            .Where(p => p.TournamentId == tournament.Id)
            .ToDictionaryAsync(p => p.UserId, p => p.Username, cancellationToken);
        string? Name(Guid? id) => id is Guid g && players.TryGetValue(g, out var n) ? n : null;
        int matchesInRound = tournament.Capacity / (1 << match.Round);

        return new TournamentMatchDto(
            match.Id, match.Round, TournamentBracket.RoundName(matchesInRound), match.Slot,
            match.Player1Id, Name(match.Player1Id), match.Player2Id, Name(match.Player2Id),
            match.WinnerId, Name(match.WinnerId),
            match.Player1Wpm, match.Player2Wpm, match.Player1Accuracy, match.Player2Accuracy);
    }

    private static void UpdateBest(TournamentPlayer? p, double wpm, double acc)
    {
        if (p is null) return;
        if (wpm > p.BestWpm) { p.BestWpm = wpm; p.BestAccuracy = acc; }
    }

    /// <summary>
    /// Host majburan belgilagan bo'lsa — o'sha. Aks holda: aniqlik darvozasidan (>=50%) o'tgan
    /// o'yinchilar ichida WPM yuqori bo'lgan. Hech kim o'tmasa — baribir WPM yuqori bo'lgan.
    /// Teng bo'lsa — Player1.
    /// </summary>
    private static Guid DetermineWinner(TournamentMatch m, RecordMatchOutcomeCommand r)
    {
        if (r.ForcedWinnerId is Guid forced) return forced;

        int side = MatchOutcome.WinnerSide(
            r.P1Wpm, r.P1Accuracy, r.P2Wpm, r.P2Accuracy, GameConstants.MinValidAccuracy);
        return side == 2 ? m.Player2Id!.Value : m.Player1Id!.Value;
    }
}

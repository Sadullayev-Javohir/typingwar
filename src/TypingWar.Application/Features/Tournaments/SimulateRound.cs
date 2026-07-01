using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Enums;

namespace TypingWar.Application.Features.Tournaments;

/// <summary>
/// DEMO/SIMULYATSIYA: turnirning joriy raundini server tomonida o'ynaydi —
/// har bir o'yin uchun tasodifiy WPM/aniqlik tayinlaydi va g'olibni yozadi (RecordMatchOutcome orqali).
/// Bir chaqiruv = bitta raund. Final tugagach Finished=true va chempion qaytadi.
/// </summary>
public record SimulateRoundCommand(Guid TournamentId) : IRequest<SimulateRoundResult>;

public record SimulatedMatch(
    Guid MatchId, string Player1, string Player2,
    double P1Wpm, double P2Wpm, double P1Accuracy, double P2Accuracy,
    Guid WinnerId, string Winner);

public record SimulateRoundResult(
    bool Finished,
    int Round,
    string RoundName,
    Guid? ChampionId,
    string? ChampionName,
    IReadOnlyList<SimulatedMatch> Matches);

public class SimulateRoundCommandHandler : IRequestHandler<SimulateRoundCommand, SimulateRoundResult>
{
    private readonly ISender _mediator;
    private readonly IApplicationDbContext _db;

    public SimulateRoundCommandHandler(ISender mediator, IApplicationDbContext db)
    {
        _mediator = mediator;
        _db = db;
    }

    public async Task<SimulateRoundResult> Handle(SimulateRoundCommand request, CancellationToken cancellationToken)
    {
        var t = await _db.Tournaments.FirstOrDefaultAsync(x => x.Id == request.TournamentId, cancellationToken)
            ?? throw new InvalidOperationException("Turnir topilmadi.");
        if (t.Status == TournamentStatus.Registration)
            throw new InvalidOperationException("Turnir hali boshlanmagan.");

        // Turnir allaqachon tugagan bo'lsa — chempionni qaytaramiz (qayta o'ynamaymiz)
        if (t.Status == TournamentStatus.Finished)
            return await FinishedResult(t, Array.Empty<SimulatedMatch>(), cancellationToken);

        // Keyingi o'ynaladigan raundni topadi (bye'larni avtomatik o'tkazadi)
        var prep = await _mediator.Send(new PrepareRoundCommand(request.TournamentId), cancellationToken);

        if (prep.Finished)
            return new SimulateRoundResult(true, prep.Round, prep.RoundName,
                prep.ChampionId, prep.ChampionName, Array.Empty<SimulatedMatch>());

        var rnd = new Random();
        var results = new List<SimulatedMatch>(prep.Matches.Count);

        foreach (var m in prep.Matches)
        {
            var (p1Wpm, p1Acc) = RandomScore(rnd);
            var (p2Wpm, p2Acc) = RandomScore(rnd);

            var dto = await _mediator.Send(new RecordMatchOutcomeCommand(
                m.MatchId, null, p1Wpm, p1Acc, p2Wpm, p2Acc), cancellationToken);

            results.Add(new SimulatedMatch(
                m.MatchId, m.Player1, m.Player2,
                p1Wpm, p2Wpm, p1Acc, p2Acc,
                dto.WinnerId ?? Guid.Empty, dto.Winner ?? "—"));
        }

        // Final o'yini RecordMatchOutcome orqali turnirni darrov Finished qilishi mumkin —
        // shu javobning o'zida o'ynalgan o'yinlar BILAN BIRGA chempionni ham qaytaramiz.
        // (Bir scopeli DbContext — `t` RecordMatchOutcome o'zgartirgan o'sha tracked obyekt.)
        if (t.Status == TournamentStatus.Finished)
            return await FinishedResult(t, results, cancellationToken, prep.Round, prep.RoundName);

        return new SimulateRoundResult(false, prep.Round, prep.RoundName, null, null, results);
    }

    /// <summary>Tugagan turnir uchun chempion ismini topib finished natija quradi.</summary>
    private async Task<SimulateRoundResult> FinishedResult(
        Domain.Entities.Tournament t, IReadOnlyList<SimulatedMatch> matches,
        CancellationToken ct, int round = 0, string roundName = "Final")
    {
        string? champ = null;
        if (t.ChampionId is Guid c)
            champ = await _db.TournamentPlayers
                .Where(p => p.TournamentId == t.Id && p.UserId == c)
                .Select(p => p.Username)
                .FirstOrDefaultAsync(ct);
        return new SimulateRoundResult(true, round, roundName, t.ChampionId, champ, matches);
    }

    /// <summary>Ishonarli tasodifiy natija: WPM 45–135, aniqlik 90–100%.</summary>
    private static (double Wpm, double Accuracy) RandomScore(Random rnd)
    {
        double wpm = Math.Round(45 + rnd.NextDouble() * 90, 1);
        double acc = Math.Round(90 + rnd.NextDouble() * 10, 1);
        return (wpm, acc);
    }
}

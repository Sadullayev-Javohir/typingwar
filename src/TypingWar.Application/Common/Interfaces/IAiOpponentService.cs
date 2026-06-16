namespace TypingWar.Application.Common.Interfaces;

/// <summary>
/// Adaptiv AI raqib (haqiqiy AI emas). So'nggi 10 poyga avg WPM + delta.
/// User yutsa AI tezlashadi (delta +2, max +10), yutqazsa sekinlashadi (-2, min -10).
/// </summary>
public interface IAiOpponentService
{
    /// <summary>Joriy AI maqsadli WPM si (avg + delta).</summary>
    Task<int> GetTargetWpmAsync(Guid userId, CancellationToken ct = default);

    /// <summary>Poyga tugagach delta ni moslaydi (Redis ai_delta_{userId}).</summary>
    Task UpdateAfterRaceAsync(Guid userId, bool userWon, CancellationToken ct = default);
}

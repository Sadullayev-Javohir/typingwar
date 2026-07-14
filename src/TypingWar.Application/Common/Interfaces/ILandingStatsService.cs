using TypingWar.Application.Features.Home;

namespace TypingWar.Application.Common.Interfaces;

/// <summary>Bosh sahifa (landing) uchun jonli statistikani hisoblaydi.</summary>
public interface ILandingStatsService
{
    Task<LandingStatsDto> GetAsync(CancellationToken ct = default);
}

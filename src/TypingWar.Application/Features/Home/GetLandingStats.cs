using MediatR;
using TypingWar.Application.Common.Interfaces;

namespace TypingWar.Application.Features.Home;

/// <summary>Bosh sahifa statistikasi: bugungi ro'yxatdan o'tishlar, 10 so'z rekordi, Elo yetakchisi.</summary>
public record GetLandingStatsQuery() : IRequest<LandingStatsDto>;

public class GetLandingStatsQueryHandler : IRequestHandler<GetLandingStatsQuery, LandingStatsDto>
{
    private readonly ILandingStatsService _stats;

    public GetLandingStatsQueryHandler(ILandingStatsService stats) => _stats = stats;

    public Task<LandingStatsDto> Handle(GetLandingStatsQuery request, CancellationToken cancellationToken)
        => _stats.GetAsync(cancellationToken);
}

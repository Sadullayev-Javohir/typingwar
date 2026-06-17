using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Constants;

namespace TypingWar.Application.Features.Map;

/// <summary>Barcha 14 hudud statistikasini qaytaradi (ma'lumot yo'q hududlar 0 bilan).</summary>
public record GetRegionStatsQuery : IRequest<RegionMapDto>;

public class GetRegionStatsQueryHandler : IRequestHandler<GetRegionStatsQuery, RegionMapDto>
{
    private readonly IApplicationDbContext _db;

    public GetRegionStatsQueryHandler(IApplicationDbContext db) => _db = db;

    public async Task<RegionMapDto> Handle(GetRegionStatsQuery request, CancellationToken cancellationToken)
    {
        // Hudud bo'yicha yig'ma (barcha kunlar): jami WPM va o'yinchilar
        var aggregates = await _db.RegionStats
            .GroupBy(r => r.RegionCode)
            .Select(g => new
            {
                Code = g.Key,
                TotalWpm = g.Sum(x => x.TotalWpm),
                Players = g.Sum(x => x.PlayerCount)
            })
            .ToListAsync(cancellationToken);

        var byCode = aggregates.ToDictionary(a => a.Code);

        var regions = UzbekistanRegions.All.Select(kv =>
        {
            if (byCode.TryGetValue(kv.Key, out var a) && a.Players > 0)
                return new RegionStatDto(kv.Key, kv.Value, Math.Round(a.TotalWpm / a.Players, 1), a.Players);
            return new RegionStatDto(kv.Key, kv.Value, 0, 0);
        }).ToList();

        double max = regions.Count > 0 ? regions.Max(r => r.AvgWpm) : 0;
        return new RegionMapDto(regions, max);
    }
}

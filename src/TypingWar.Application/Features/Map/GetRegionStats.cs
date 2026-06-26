using MediatR;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Constants;

namespace TypingWar.Application.Features.Map;

/// <summary>
/// Barcha 14 hudud statistikasini qaytaradi (ishtirokchisi yo'q hududlar 0 bilan).
/// Qiymatlar foydalanuvchilarning 30 soniyalik shaxsiy rekordlaridan hisoblanadi.
/// </summary>
public record GetRegionStatsQuery : IRequest<RegionMapDto>;

public class GetRegionStatsQueryHandler : IRequestHandler<GetRegionStatsQuery, RegionMapDto>
{
    private readonly IRegionStatsReader _reader;

    public GetRegionStatsQueryHandler(IRegionStatsReader reader) => _reader = reader;

    public async Task<RegionMapDto> Handle(GetRegionStatsQuery request, CancellationToken cancellationToken)
    {
        var aggregates = await _reader.GetThirtySecondStatsAsync(cancellationToken);
        var byCode = aggregates.ToDictionary(a => a.RegionCode);

        var regions = UzbekistanRegions.All.Select(kv =>
        {
            if (byCode.TryGetValue(kv.Key, out var a))
                return new RegionStatDto(kv.Key, kv.Value, a.BestWpm, a.AvgWpm, a.PlayerCount);
            return new RegionStatDto(kv.Key, kv.Value, 0, 0, 0);
        }).ToList();

        double max = regions.Count > 0 ? regions.Max(r => r.BestWpm) : 0;
        return new RegionMapDto(regions, max);
    }
}

/// <summary>Bitta hudud statistikasi (live yangilanish uchun).</summary>
public record GetRegionStatQuery(string Code) : IRequest<RegionStatDto?>;

public class GetRegionStatQueryHandler : IRequestHandler<GetRegionStatQuery, RegionStatDto?>
{
    private readonly IRegionStatsReader _reader;

    public GetRegionStatQueryHandler(IRegionStatsReader reader) => _reader = reader;

    public async Task<RegionStatDto?> Handle(GetRegionStatQuery request, CancellationToken cancellationToken)
    {
        if (!UzbekistanRegions.IsValid(request.Code)) return null;

        var a = await _reader.GetRegionAsync(request.Code, cancellationToken);
        var name = UzbekistanRegions.All[request.Code];
        return a is null
            ? new RegionStatDto(request.Code, name, 0, 0, 0)
            : new RegionStatDto(request.Code, name, a.BestWpm, a.AvgWpm, a.PlayerCount);
    }
}

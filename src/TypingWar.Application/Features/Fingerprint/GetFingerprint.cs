using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Services;

namespace TypingWar.Application.Features.Fingerprint;

/// <summary>Joriy foydalanuvchining Yozish Pasportini qaytaradi (yo'q bo'lsa bo'sh).</summary>
public record GetFingerprintQuery : IRequest<FingerprintDto>;

public class GetFingerprintQueryHandler : IRequestHandler<GetFingerprintQuery, FingerprintDto>
{
    internal const int SlowCount = 8;

    private readonly IApplicationDbContext _db;
    private readonly ICurrentUserService _currentUser;

    public GetFingerprintQueryHandler(IApplicationDbContext db, ICurrentUserService currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<FingerprintDto> Handle(GetFingerprintQuery request, CancellationToken cancellationToken)
    {
        if (_currentUser.UserId is not Guid uid)
            return Empty();

        var fp = await _db.TypingFingerprints
            .FirstOrDefaultAsync(f => f.UserId == uid, cancellationToken);
        if (fp is null) return Empty();

        var keys = Parse(fp.SlowKeys);
        var bigrams = Parse(fp.BigramStats);

        return new FingerprintDto(
            HasData: keys.Count > 0 || bigrams.Count > 0,
            AvgWpm: fp.AvgWpm,
            KeyTimings: keys,
            SlowKeys: ToSlow(FingerprintAnalyzer.Slowest(keys, SlowCount)),
            SlowBigrams: ToSlow(FingerprintAnalyzer.Slowest(bigrams, SlowCount)),
            UpdatedAt: fp.UpdatedAt);
    }

    internal static Dictionary<string, double> Parse(string json)
    {
        if (string.IsNullOrWhiteSpace(json) || json == "{}") return new();
        try
        {
            return JsonSerializer.Deserialize<Dictionary<string, double>>(json) ?? new();
        }
        catch (JsonException)
        {
            return new();
        }
    }

    private static IReadOnlyList<SlowItemDto> ToSlow(IReadOnlyList<KeyValuePair<string, double>> items)
        => items.Select(kv => new SlowItemDto(kv.Key, kv.Value)).ToList();

    private static FingerprintDto Empty()
        => new(false, 0, new Dictionary<string, double>(), Array.Empty<SlowItemDto>(), Array.Empty<SlowItemDto>(), null);
}

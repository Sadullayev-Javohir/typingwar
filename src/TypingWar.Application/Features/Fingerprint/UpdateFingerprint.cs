using System.Text.Json;
using MediatR;
using Microsoft.EntityFrameworkCore;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Domain.Entities;
using TypingWar.Domain.Services;

namespace TypingWar.Application.Features.Fingerprint;

/// <summary>
/// Yangi keystroke timinglarni mavjud pasportga birlashtiradi (eksponensial o'rtacha).
/// KeyTimings/BigramTimings — kalit → o'rtacha ms.
/// </summary>
public record UpdateFingerprintCommand(
    Dictionary<string, double> KeyTimings,
    Dictionary<string, double> BigramTimings,
    double AvgWpm) : IRequest<FingerprintDto>;

public class UpdateFingerprintCommandHandler : IRequestHandler<UpdateFingerprintCommand, FingerprintDto>
{
    private readonly IApplicationDbContext _db;
    private readonly ISender _mediator;
    private readonly ICurrentUserService _currentUser;

    public UpdateFingerprintCommandHandler(IApplicationDbContext db, ISender mediator, ICurrentUserService currentUser)
    {
        _db = db;
        _mediator = mediator;
        _currentUser = currentUser;
    }

    public async Task<FingerprintDto> Handle(UpdateFingerprintCommand request, CancellationToken cancellationToken)
    {
        var uid = _currentUser.UserId
            ?? throw new UnauthorizedAccessException("Yozish Pasporti uchun tizimga kiring.");

        var fp = await _db.TypingFingerprints
            .FirstOrDefaultAsync(f => f.UserId == uid, cancellationToken);

        var incomingKeys = Sanitize(request.KeyTimings);
        var incomingBigrams = Sanitize(request.BigramTimings);

        if (fp is null)
        {
            fp = new TypingFingerprint { UserId = uid };
            _db.TypingFingerprints.Add(fp);
        }

        var mergedKeys = FingerprintAnalyzer.Merge(GetFingerprintQueryHandler.Parse(fp.SlowKeys), incomingKeys);
        var mergedBigrams = FingerprintAnalyzer.Merge(GetFingerprintQueryHandler.Parse(fp.BigramStats), incomingBigrams);

        fp.SlowKeys = JsonSerializer.Serialize(mergedKeys);
        fp.BigramStats = JsonSerializer.Serialize(mergedBigrams);
        // AvgWpm — eski bilan o'rtacha (yumshoq yangilanish)
        fp.AvgWpm = fp.AvgWpm > 0 && request.AvgWpm > 0
            ? Math.Round(0.3 * request.AvgWpm + 0.7 * fp.AvgWpm, 2)
            : (request.AvgWpm > 0 ? Math.Round(request.AvgWpm, 2) : fp.AvgWpm);
        fp.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync(cancellationToken);
        return await _mediator.Send(new GetFingerprintQuery(), cancellationToken);
    }

    /// <summary>Manfiy/nol/anormal qiymatlarni tozalaydi (maks 2000 ms).</summary>
    private static Dictionary<string, double> Sanitize(Dictionary<string, double>? input)
    {
        if (input is null) return new();
        return input
            .Where(kv => !string.IsNullOrEmpty(kv.Key) && kv.Value is > 0 and <= 2000)
            .ToDictionary(kv => kv.Key, kv => Math.Round(kv.Value, 2));
    }
}

namespace TypingWar.Application.Features.Fingerprint;

/// <summary>Yozish Pasporti — tugma timinglari (ms) + sekin tugmalar/bigramlar.</summary>
public record FingerprintDto(
    bool HasData,
    double AvgWpm,
    IReadOnlyDictionary<string, double> KeyTimings,
    IReadOnlyList<SlowItemDto> SlowKeys,
    IReadOnlyList<SlowItemDto> SlowBigrams,
    DateTime? UpdatedAt);

/// <summary>Sekin element (tugma yoki bigram) o'rtacha ms bilan.</summary>
public record SlowItemDto(string Key, double Ms);

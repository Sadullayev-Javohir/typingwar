using TypingWar.Domain.Services;
using Xunit;

namespace TypingWar.UnitTests;

public class FingerprintAnalyzerTests
{
    [Fact]
    public void Merge_NewKey_IsTakenAsIs()
    {
        var existing = new Dictionary<string, double>();
        var incoming = new Dictionary<string, double> { ["a"] = 120 };
        var merged = FingerprintAnalyzer.Merge(existing, incoming);
        Assert.Equal(120, merged["a"]);
    }

    [Fact]
    public void Merge_ExistingKey_UsesExponentialAverage()
    {
        var existing = new Dictionary<string, double> { ["a"] = 100 };
        var incoming = new Dictionary<string, double> { ["a"] = 200 };
        var merged = FingerprintAnalyzer.Merge(existing, incoming, 0.3);
        // 0.3*200 + 0.7*100 = 130
        Assert.Equal(130, merged["a"]);
    }

    [Fact]
    public void Merge_KeepsExistingOnlyKeys()
    {
        var existing = new Dictionary<string, double> { ["a"] = 100, ["b"] = 80 };
        var incoming = new Dictionary<string, double> { ["a"] = 100 };
        var merged = FingerprintAnalyzer.Merge(existing, incoming);
        Assert.Equal(80, merged["b"]);
    }

    [Fact]
    public void Slowest_ReturnsHighestTimingsFirst()
    {
        var timings = new Dictionary<string, double> { ["a"] = 100, ["b"] = 300, ["c"] = 200 };
        var slow = FingerprintAnalyzer.Slowest(timings, 2);
        Assert.Equal("b", slow[0].Key);
        Assert.Equal("c", slow[1].Key);
        Assert.Equal(2, slow.Count);
    }

    [Fact]
    public void Slowest_CountLargerThanMap_ReturnsAll()
    {
        var timings = new Dictionary<string, double> { ["a"] = 100 };
        Assert.Single(FingerprintAnalyzer.Slowest(timings, 5));
    }
}

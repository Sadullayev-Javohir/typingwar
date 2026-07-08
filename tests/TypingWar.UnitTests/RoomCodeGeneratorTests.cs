using TypingWar.Domain.Constants;
using TypingWar.Domain.Services;
using Xunit;

namespace TypingWar.UnitTests;

public class RoomCodeGeneratorTests
{
    [Fact]
    public void Generate_HasConfiguredLength()
    {
        Assert.Equal(GameConstants.RoomCodeLength, RoomCodeGenerator.Generate().Length);
    }

    [Fact]
    public void Generate_OnlyDigits()
    {
        var len = GameConstants.RoomCodeLength;
        for (int i = 0; i < 200; i++)
        {
            var code = RoomCodeGenerator.Generate();
            // Kod faqat belgilangan sondagi raqamdan iborat bo'lishi kerak
            Assert.Equal(len, code.Length);
            Assert.All(code, c => Assert.True(char.IsDigit(c), $"'{c}' raqam emas"));
            Assert.Matches($"^[0-9]{{{len}}}$", code);
        }
    }
}

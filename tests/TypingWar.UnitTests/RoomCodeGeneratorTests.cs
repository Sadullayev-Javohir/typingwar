using TypingWar.Domain.Constants;
using TypingWar.Domain.Services;
using Xunit;

namespace TypingWar.UnitTests;

public class RoomCodeGeneratorTests
{
    [Fact]
    public void Generate_Has8Chars()
    {
        Assert.Equal(8, RoomCodeGenerator.Generate().Length);
    }

    [Fact]
    public void Generate_OnlyDigits()
    {
        for (int i = 0; i < 200; i++)
        {
            var code = RoomCodeGenerator.Generate();
            // Kod faqat 8 ta raqamdan iborat bo'lishi kerak
            Assert.Equal(8, code.Length);
            Assert.All(code, c => Assert.True(char.IsDigit(c), $"'{c}' raqam emas"));
            Assert.Matches("^[0-9]{8}$", code);
        }
    }
}

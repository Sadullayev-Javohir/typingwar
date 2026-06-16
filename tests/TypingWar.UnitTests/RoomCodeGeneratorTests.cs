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
    public void Generate_OnlyUsesAllowedAlphabet_NoConfusingChars()
    {
        for (int i = 0; i < 200; i++)
        {
            var code = RoomCodeGenerator.Generate();
            Assert.All(code, c => Assert.Contains(c, GameConstants.RoomCodeAlphabet));
            // I, O, 0, 1 — chalkashlik belgilari ishlatilmasligi kerak
            Assert.DoesNotContain('I', code);
            Assert.DoesNotContain('O', code);
            Assert.DoesNotContain('0', code);
            Assert.DoesNotContain('1', code);
        }
    }
}

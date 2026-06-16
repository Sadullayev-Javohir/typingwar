using TypingWar.Domain.Constants;

namespace TypingWar.Domain.Services;

/// <summary>8 xonali room kodi generatori (I, O, 0, 1 ishlatilmaydi — chalkashlik oldini olish).</summary>
public static class RoomCodeGenerator
{
    public static string Generate()
    {
        var alphabet = GameConstants.RoomCodeAlphabet;
        var chars = new char[GameConstants.RoomCodeLength];
        for (int i = 0; i < chars.Length; i++)
            chars[i] = alphabet[Random.Shared.Next(alphabet.Length)];
        return new string(chars);
    }
}

namespace TypingWar.Domain.Constants;

/// <summary>O'yin bo'yicha umumiy konstantalar.</summary>
public static class GameConstants
{
    /// <summary>Room kodi alfaviti — I, O, 0, 1 yo'q (chalkashlik oldini olish).</summary>
    public const string RoomCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    /// <summary>Room kodi uzunligi.</summary>
    public const int RoomCodeLength = 8;

    /// <summary>5 harf = 1 so'z (xalqaro typing standart).</summary>
    public const int CharsPerWord = 5;

    /// <summary>Aldash himoyasi — bundan yuqori WPM rad etiladi.</summary>
    public const double MaxValidWpm = 250;

    /// <summary>Room kodi Redis TTL (daqiqa).</summary>
    public const int RoomCodeTtlMinutes = 30;

    /// <summary>5x5 jamoaviy musobaqa — har jamoada maksimal a'zo.</summary>
    public const int TeamSize = 5;
}

namespace TypingWar.Domain.Constants;

/// <summary>O'yin bo'yicha umumiy konstantalar.</summary>
public static class GameConstants
{
    /// <summary>Room kodi alfaviti — faqat raqamlar (kod 4 ta tasodifiy raqamdan iborat).</summary>
    public const string RoomCodeAlphabet = "0123456789";

    /// <summary>Room kodi uzunligi.</summary>
    public const int RoomCodeLength = 4;

    /// <summary>5 harf = 1 so'z (xalqaro typing standart).</summary>
    public const int CharsPerWord = 5;

    /// <summary>Aldash himoyasi — bundan yuqori WPM rad etiladi.</summary>
    public const double MaxValidWpm = 250;

    /// <summary>
    /// Aldash himoyasi — bundan past aniqlikdagi natija haqiqiy emas (rad etiladi).
    /// Bitta tugmani bosib turish yoki tasodifiy belgilarni yozish ~0% aniqlik beradi.
    /// Haqiqiy foydalanuvchi (boshlovchi ham) odatda bundan ancha yuqori bo'ladi.
    /// </summary>
    public const double MinValidAccuracy = 50;

    /// <summary>Room kodi Redis TTL (daqiqa).</summary>
    public const int RoomCodeTtlMinutes = 30;

    /// <summary>
    /// Poyga boshlangach o'yinchilar yozib tugatishi uchun maksimal vaqt (daqiqa).
    /// Bu vaqtda hamma tugatmasa — xona avtomatik o'chiriladi va o'yinchilar xabardor qilinadi.
    /// </summary>
    public const int RoomRaceTimeoutMinutes = 5;

    /// <summary>
    /// Host uzilgach (masalan sahifani yangilaganda) xona darrov yopilmaydi —
    /// shu soniyalar ichida host qaytib ulansa xona saqlanadi. Aks holda yopiladi.
    /// </summary>
    public const int RoomHostReconnectGraceSeconds = 12;

    /// <summary>
    /// Oddiy o'yinchi uzilganda (refresh/tarmoq/SignalR avto-qayta ulanish) xona ro'yxatidan
    /// darrov o'chirilmaydi — shu soniyalar ichida qaytib ulansa o'yinchi (mushuki, natijasi)
    /// saqlanadi. Aks holda transient uzilish o'yinchini poygadan tushirib yuborardi.
    /// </summary>
    public const int RoomMemberReconnectGraceSeconds = 10;

    /// <summary>5x5 jamoaviy musobaqa — har jamoada maksimal a'zo.</summary>
    public const int TeamSize = 5;

    /// <summary>Sabotaj uchun xonada kerakli minimal o'yinchi soni.</summary>
    public const int MinPlayersForSabotage = 3;
}

namespace TypingWar.Application.Features.Home;

/// <summary>Landing (bosh sahifa) uchun jonli statistika kartalari.</summary>
public record LandingStatsDto(
    /// <summary>Bugun (Toshkent vaqti bo'yicha) ro'yxatdan o'tgan foydalanuvchilar soni.</summary>
    int TodayRegistrations,
    /// <summary>"words:10" rejimidagi eng yuqori WPM rekordi (rekord yo'q bo'lsa null).</summary>
    RecordHolderDto? Words10Record,
    /// <summary>Elo reyting bo'yicha eng kuchli foydalanuvchi (foydalanuvchi yo'q bo'lsa null).</summary>
    TopUserDto? TopUser);

/// <summary>Rekord egasi — WPM va uni qo'lga kiritgan foydalanuvchi.</summary>
public record RecordHolderDto(
    string Username,
    double Wpm,
    string? RegionCode);

/// <summary>Elo bo'yicha yetakchi foydalanuvchi.</summary>
public record TopUserDto(
    string Username,
    int EloRating,
    string? RegionCode);

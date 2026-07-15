using TypingWar.Application.Features.Online;

namespace TypingWar.Application.Common.Interfaces;

/// <summary>Joriy onlayn foydalanuvchilar ro'yxatini beradi (real-time).</summary>
public interface IOnlineUserProvider
{
    /// <summary>Onlayn foydalanuvchilar (ID, username, o'rtacha WPM, hudud).</summary>
    IReadOnlyList<OnlineUserDto> GetList();

    /// <summary>Bitta foydalanuvchi onlayn bo'lsa uning ma'lumotini qaytaradi, aks holda null.</summary>
    OnlineUserDto? Get(Guid userId);
}

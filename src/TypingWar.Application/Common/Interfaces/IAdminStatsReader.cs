namespace TypingWar.Application.Common.Interfaces;

/// <summary>Admin paneli uchun Identity tomonidagi sanoqlar.</summary>
public interface IAdminStatsReader
{
    Task<int> CountUsersAsync(CancellationToken ct = default);
}

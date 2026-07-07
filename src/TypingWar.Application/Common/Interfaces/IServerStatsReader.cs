using TypingWar.Application.Features.Admin;

namespace TypingWar.Application.Common.Interfaces;

/// <summary>
/// Server (host) holatini o'qiydi — CPU, RAM, disk, ish vaqti. Tizim/jarayon resurslariga
/// kirishni talab qilgani uchun Infrastructure da amalga oshiriladi.
/// </summary>
public interface IServerStatsReader
{
    Task<ServerStatsDto> ReadAsync(CancellationToken ct = default);
}

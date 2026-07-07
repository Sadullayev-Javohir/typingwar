using MediatR;
using TypingWar.Application.Common.Interfaces;

namespace TypingWar.Application.Features.Admin;

/// <summary>Server holati: CPU, RAM, disk va tizim ma'lumotlari (admin paneli uchun).</summary>
public record ServerStatsDto(
    string Os,
    string MachineName,
    string DotnetVersion,
    int CpuCores,
    double CpuUsagePercent,
    long RamTotalBytes,
    long RamUsedBytes,
    double RamUsedPercent,
    long DiskTotalBytes,
    long DiskUsedBytes,
    double DiskUsedPercent,
    long ProcessRamBytes,
    double UptimeSeconds);

/// <summary>Server jonli holatini qaytaradi (CPU/RAM/disk).</summary>
public record GetServerStatsQuery : IRequest<ServerStatsDto>;

public class GetServerStatsQueryHandler : IRequestHandler<GetServerStatsQuery, ServerStatsDto>
{
    private readonly IServerStatsReader _reader;

    public GetServerStatsQueryHandler(IServerStatsReader reader) => _reader = reader;

    public Task<ServerStatsDto> Handle(GetServerStatsQuery request, CancellationToken cancellationToken)
        => _reader.ReadAsync(cancellationToken);
}

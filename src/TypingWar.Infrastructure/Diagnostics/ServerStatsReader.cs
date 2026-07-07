using System.Diagnostics;
using System.Runtime.InteropServices;
using TypingWar.Application.Common.Interfaces;
using TypingWar.Application.Features.Admin;

namespace TypingWar.Infrastructure.Diagnostics;

/// <summary>
/// Server holatini o'qiydi. Linuxda /proc/stat (CPU) va /proc/meminfo (RAM) dan aniq qiymat,
/// boshqa platformalarda jarayon/GC asosida zaxira qiymat. Disk — ilova joylashgan drayv.
/// </summary>
public class ServerStatsReader : IServerStatsReader
{
    public async Task<ServerStatsDto> ReadAsync(CancellationToken ct = default)
    {
        double cpu = await GetCpuUsageAsync(ct);
        var (ramTotal, ramUsed) = GetMemory();
        var (diskTotal, diskUsed) = GetDisk();

        long processRam = 0;
        double uptime = 0;
        try
        {
            using var proc = Process.GetCurrentProcess();
            processRam = proc.WorkingSet64;
            uptime = (DateTime.UtcNow - proc.StartTime.ToUniversalTime()).TotalSeconds;
        }
        catch { /* ignore */ }

        return new ServerStatsDto(
            RuntimeInformation.OSDescription,
            Environment.MachineName,
            RuntimeInformation.FrameworkDescription,
            Environment.ProcessorCount,
            Math.Round(cpu, 1),
            ramTotal, ramUsed, ramTotal > 0 ? Math.Round(ramUsed * 100.0 / ramTotal, 1) : 0,
            diskTotal, diskUsed, diskTotal > 0 ? Math.Round(diskUsed * 100.0 / diskTotal, 1) : 0,
            processRam,
            Math.Round(uptime, 0));
    }

    // ── CPU ──
    private static async Task<double> GetCpuUsageAsync(CancellationToken ct)
    {
        try
        {
            if (OperatingSystem.IsLinux() && File.Exists("/proc/stat"))
            {
                var (idle1, total1) = ReadProcStat();
                await Task.Delay(200, ct);
                var (idle2, total2) = ReadProcStat();
                long totalD = total2 - total1, idleD = idle2 - idle1;
                if (totalD <= 0) return 0;
                return Math.Clamp((1.0 - (double)idleD / totalD) * 100.0, 0, 100);
            }

            // Platformaga bog'liq bo'lmagan zaxira: jarayonning CPU vaqti
            using var p = Process.GetCurrentProcess();
            var start = p.TotalProcessorTime;
            var sw = Stopwatch.StartNew();
            await Task.Delay(200, ct);
            p.Refresh();
            double cpuMs = (p.TotalProcessorTime - start).TotalMilliseconds;
            double elapsed = sw.Elapsed.TotalMilliseconds * Environment.ProcessorCount;
            return elapsed > 0 ? Math.Clamp(cpuMs / elapsed * 100.0, 0, 100) : 0;
        }
        catch { return 0; }
    }

    private static (long Idle, long Total) ReadProcStat()
    {
        var line = File.ReadLines("/proc/stat").FirstOrDefault(l => l.StartsWith("cpu "));
        if (line is null) return (0, 0);
        var parts = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        long total = 0, idle = 0;
        // parts: "cpu" user nice system idle iowait irq softirq steal ...
        for (int i = 1; i < parts.Length; i++)
        {
            if (!long.TryParse(parts[i], out var v)) continue;
            total += v;
            if (i == 4 || i == 5) idle += v;   // idle + iowait
        }
        return (idle, total);
    }

    // ── RAM ──
    private static (long Total, long Used) GetMemory()
    {
        try
        {
            if (OperatingSystem.IsLinux() && File.Exists("/proc/meminfo"))
            {
                long total = 0, avail = 0;
                foreach (var l in File.ReadLines("/proc/meminfo"))
                {
                    if (l.StartsWith("MemTotal:")) total = ParseKbToBytes(l);
                    else if (l.StartsWith("MemAvailable:")) avail = ParseKbToBytes(l);
                    if (total > 0 && avail > 0) break;
                }
                if (total > 0) return (total, Math.Max(0, total - avail));
            }
        }
        catch { /* fall through */ }

        // Zaxira: GC ko'rgan tizim xotirasi
        var info = GC.GetGCMemoryInfo();
        long t = info.TotalAvailableMemoryBytes;
        long u = info.MemoryLoadBytes;
        return (t, u);
    }

    private static long ParseKbToBytes(string line)
    {
        var parts = line.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length >= 2 && long.TryParse(parts[1], out var kb) ? kb * 1024 : 0;
    }

    // ── Disk ──
    private static (long Total, long Used) GetDisk()
    {
        try
        {
            var root = Path.GetPathRoot(AppContext.BaseDirectory);
            if (string.IsNullOrEmpty(root)) root = OperatingSystem.IsWindows() ? "C:\\" : "/";
            var di = new DriveInfo(root);
            if (di.IsReady)
                return (di.TotalSize, Math.Max(0, di.TotalSize - di.TotalFreeSpace));
        }
        catch { /* ignore */ }
        return (0, 0);
    }
}

using Application.DTOs;
using Application.Interfaces;

namespace API.Services;

public sealed class BackupSettingsService(
    IAppSettingRepository repo,
    BackupService backupService,
    ILogger<BackupSettingsService> logger)
{
    public const string DefaultFrequency = "weekly";
    public const int DefaultRetention = 8;
    private const int MinRetention = 1;
    private const int MaxRetention = 50;

    public async Task<BackupSettingsDto> GetAsync()
    {
        var schedule = await GetScheduleAsync();
        var enabled = schedule != "off";
        var frequency = enabled ? schedule : DefaultFrequency;
        var retention = await GetRetentionAsync();
        var lastBackup = await GetLastBackupAsync();
        var nextBackup = enabled ? ComputeNextBackup(lastBackup, frequency) : null;

        return new BackupSettingsDto(enabled, frequency, retention, lastBackup, nextBackup);
    }

    public async Task<BackupSettingsDto> SaveAsync(UpdateBackupSettingsRequest request)
    {
        var frequency = NormalizeFrequency(request.Frequency);
        var schedule = request.AutoBackupEnabled ? frequency : "off";
        var retention = Math.Clamp(request.RetentionCount, MinRetention, MaxRetention);

        await repo.SetAsync("backups.schedule", schedule);
        await repo.SetAsync("backups.retention", retention.ToString());

        return await GetAsync();
    }

    public async Task RecordBackupAsync(DateTime utcTimestamp)
    {
        await repo.SetAsync("backups.last_run", utcTimestamp.ToString("O"));
    }

    public async Task RunScheduledBackupIfDueAsync(CancellationToken ct = default)
    {
        var schedule = await GetScheduleAsync();
        if (schedule == "off")
            return;

        var lastBackup = await GetLastBackupAsync();
        var interval = schedule == "daily" ? TimeSpan.FromDays(1) : TimeSpan.FromDays(7);
        if (lastBackup.HasValue && DateTime.UtcNow - lastBackup.Value < interval)
            return;

        try
        {
            var created = backupService.CreateBackup();
            await RecordBackupAsync(created.LastModified);
            await PruneAsync();
            logger.LogInformation("Scheduled backup created — {Name}", created.Name);
        }
        catch (Exception ex) when (!ct.IsCancellationRequested)
        {
            logger.LogError(ex, "Scheduled backup failed");
        }
    }

    public async Task PruneAsync()
    {
        var retention = await GetRetentionAsync();
        var files = backupService.ListBackups();
        foreach (var old in files.Skip(retention))
        {
            try
            {
                backupService.DeleteBackup(old.Name);
                logger.LogInformation("Pruned old backup — {Name}", old.Name);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to prune backup {Name}", old.Name);
            }
        }
    }

    private async Task<string> GetScheduleAsync()
    {
        var schedule = await repo.GetAsync("backups.schedule");
        return string.IsNullOrWhiteSpace(schedule) ? DefaultFrequency : NormalizeSchedule(schedule);
    }

    private async Task<int> GetRetentionAsync()
    {
        var raw = await repo.GetAsync("backups.retention");
        return int.TryParse(raw, out var value)
            ? Math.Clamp(value, MinRetention, MaxRetention)
            : DefaultRetention;
    }

    private async Task<DateTime?> GetLastBackupAsync()
    {
        var raw = await repo.GetAsync("backups.last_run");
        if (string.IsNullOrWhiteSpace(raw))
            return null;

        return DateTime.TryParse(raw, null, System.Globalization.DateTimeStyles.RoundtripKind, out var parsed)
            ? parsed.ToUniversalTime()
            : null;
    }

    private static DateTime? ComputeNextBackup(DateTime? lastBackup, string frequency)
    {
        var interval = frequency == "daily" ? TimeSpan.FromDays(1) : TimeSpan.FromDays(7);
        return (lastBackup ?? DateTime.UtcNow) + interval;
    }

    private static string NormalizeSchedule(string schedule) =>
        schedule.ToLowerInvariant() switch
        {
            "off" => "off",
            "daily" => "daily",
            "weekly" => "weekly",
            _ => DefaultFrequency,
        };

    private static string NormalizeFrequency(string frequency) =>
        frequency.ToLowerInvariant() switch
        {
            "daily" => "daily",
            _ => DefaultFrequency,
        };
}

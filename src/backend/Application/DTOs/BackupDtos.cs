namespace Application.DTOs;

public record BackupSettingsDto(
    bool AutoBackupEnabled,
    string Frequency,
    int RetentionCount,
    DateTime? LastBackup,
    DateTime? NextBackup);

public record UpdateBackupSettingsRequest(
    bool AutoBackupEnabled,
    string Frequency,
    int RetentionCount);

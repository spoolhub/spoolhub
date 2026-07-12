namespace Application.DTOs;

public record AlertSettingsDto(
    bool Enabled, string Provider, string? NtfyUrl, string? WebhookUrl, string? DiscordWebhookUrl,
    bool NotifyLowStock, bool NotifySpoolAssigned, bool NotifySpoolAdded, bool NotifySpoolDeleted, bool NotifyPrinterDeleted);

public record UpdateAlertSettingsRequest(
    bool Enabled, string Provider, string? NtfyUrl, string? WebhookUrl, string? DiscordWebhookUrl,
    bool NotifyLowStock, bool NotifySpoolAssigned, bool NotifySpoolAdded, bool NotifySpoolDeleted, bool NotifyPrinterDeleted);

public record FilamentSettingsDto(bool AutoSync, string OfdSourceUrl, DateTime? LastSynced);

public record UpdateFilamentSettingsRequest(bool AutoSync, string OfdSourceUrl);

public record AppDefaultsDto(int DefaultLowStockThresholdG, string Currency, string Language);

public record UpdateAppDefaultsRequest(int DefaultLowStockThresholdG, string Currency, string Language);

using Application.DTOs;
using Application.Interfaces;

namespace Application.Services;

public class SettingsService(IAppSettingRepository repo) : ISettingsService
{
    private const string DefaultOfdUrl = "https://openfilament.com/api/filaments";
    private const int DefaultLowStockG = 100;
    private const string DefaultCurrency = "USD";
    private const string DefaultLanguage = "en";

    public async Task<AlertSettingsDto> GetAlertSettingsAsync()
    {
        var enabled              = await repo.GetAsync("alerts.enabled");
        var provider             = await repo.GetAsync("alerts.provider");
        var ntfyUrl              = await repo.GetAsync("alerts.ntfy_url");
        var webhookUrl           = await repo.GetAsync("alerts.webhook_url");
        var discordWebhookUrl    = await repo.GetAsync("alerts.discord_webhook_url");
        var notifyLowStock       = await repo.GetAsync("alerts.notify_low_stock");
        var notifySpoolAssigned  = await repo.GetAsync("alerts.notify_spool_assigned");
        var notifySpoolAdded     = await repo.GetAsync("alerts.notify_spool_added");
        var notifySpoolDeleted   = await repo.GetAsync("alerts.notify_spool_deleted");
        var notifyPrinterDeleted = await repo.GetAsync("alerts.notify_printer_deleted");
        return new AlertSettingsDto(
            bool.TryParse(enabled, out var e) && e,
            provider ?? "ntfy",
            string.IsNullOrEmpty(ntfyUrl)           ? null : ntfyUrl,
            string.IsNullOrEmpty(webhookUrl)        ? null : webhookUrl,
            string.IsNullOrEmpty(discordWebhookUrl) ? null : discordWebhookUrl,
            !bool.TryParse(notifyLowStock,       out var ls) || ls,
            !bool.TryParse(notifySpoolAssigned,  out var sa) || sa,
            !bool.TryParse(notifySpoolAdded,     out var sad) || sad,
            !bool.TryParse(notifySpoolDeleted,   out var sd) || sd,
            !bool.TryParse(notifyPrinterDeleted, out var pd) || pd);
    }

    public async Task SaveAlertSettingsAsync(AlertSettingsDto dto)
    {
        await repo.SetAsync("alerts.enabled",               dto.Enabled.ToString().ToLower());
        await repo.SetAsync("alerts.provider",              dto.Provider);
        await repo.SetAsync("alerts.ntfy_url",              dto.NtfyUrl           ?? string.Empty);
        await repo.SetAsync("alerts.webhook_url",           dto.WebhookUrl        ?? string.Empty);
        await repo.SetAsync("alerts.discord_webhook_url",   dto.DiscordWebhookUrl ?? string.Empty);
        await repo.SetAsync("alerts.notify_low_stock",      dto.NotifyLowStock.ToString().ToLower());
        await repo.SetAsync("alerts.notify_spool_assigned", dto.NotifySpoolAssigned.ToString().ToLower());
        await repo.SetAsync("alerts.notify_spool_added",    dto.NotifySpoolAdded.ToString().ToLower());
        await repo.SetAsync("alerts.notify_spool_deleted",  dto.NotifySpoolDeleted.ToString().ToLower());
        await repo.SetAsync("alerts.notify_printer_deleted",dto.NotifyPrinterDeleted.ToString().ToLower());
    }

    public async Task<FilamentSettingsDto> GetFilamentSettingsAsync(DateTime? lastSynced)
    {
        var autoSync = await repo.GetAsync("filaments.auto_sync");
        var ofdUrl   = await repo.GetAsync("filaments.ofd_source_url");
        return new FilamentSettingsDto(
            !bool.TryParse(autoSync, out var a) || a,
            string.IsNullOrEmpty(ofdUrl) ? DefaultOfdUrl : ofdUrl,
            lastSynced);
    }

    public async Task SaveFilamentSettingsAsync(UpdateFilamentSettingsRequest dto)
    {
        await repo.SetAsync("filaments.auto_sync",       dto.AutoSync.ToString().ToLower());
        await repo.SetAsync("filaments.ofd_source_url",  dto.OfdSourceUrl);
    }

    public async Task<AppDefaultsDto> GetAppDefaultsAsync()
    {
        var raw      = await repo.GetAsync("app.default_low_stock_threshold_g");
        var currency = await repo.GetAsync("app.currency");
        var language = await repo.GetAsync("app.language");
        return new AppDefaultsDto(
            int.TryParse(raw, out var v) ? v : DefaultLowStockG,
            string.IsNullOrEmpty(currency) ? DefaultCurrency : currency,
            string.IsNullOrEmpty(language) ? DefaultLanguage : language);
    }

    public async Task SaveAppDefaultsAsync(AppDefaultsDto dto)
    {
        await repo.SetAsync("app.default_low_stock_threshold_g", dto.DefaultLowStockThresholdG.ToString());
        await repo.SetAsync("app.currency", dto.Currency);
        await repo.SetAsync("app.language", dto.Language);
    }
}

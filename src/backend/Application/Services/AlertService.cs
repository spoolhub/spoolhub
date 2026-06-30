using System.Text;
using System.Text.Json;
using Application.Interfaces;
using Domain.Models;
using Microsoft.Extensions.Logging;

namespace Application.Services;

public class AlertService(
    ISettingsService settingsService,
    IHttpClientFactory httpClientFactory,
    ILogger<AlertService> logger) : IAlertService
{
    public async Task CheckAndAlertAsync(Spool spool)
    {
        var settings = await settingsService.GetAlertSettingsAsync();
        if (!settings.Enabled || !settings.NotifyLowStock) return;
        if (spool.CurrentWeightG > spool.LowStockThresholdG) return;

        var plain = $"⚠️ Low filament — {spool.Brand} {spool.Material} ({spool.ColorName}): {spool.CurrentWeightG:F0}g remaining";
        var hex = spool.ColorHex.TrimStart('#');
        var embed = new
        {
            title = "⚠️ Low Filament",
            description = $"**{spool.CurrentWeightG:F0}g** remaining (threshold: {spool.LowStockThresholdG:F0}g)",
            color = HexToDiscordColor(spool.ColorHex, 0xf59e0b),
            thumbnail = new { url = $"https://placehold.co/64/{hex}/{hex}.png" },
            fields = new object[]
            {
                new { name = "Brand",    value = spool.Brand,     inline = true },
                new { name = "Material", value = spool.Material,  inline = true },
                new { name = "Color",    value = spool.ColorName, inline = true },
            },
            footer = new { text = "SpoolHub" },
            timestamp = DateTime.UtcNow.ToString("o"),
        };
        await SendAsync(plain, settings, embed);
    }

    public async Task<bool> SendTestAsync()
    {
        var settings = await settingsService.GetAlertSettingsAsync();
        var embed = new
        {
            title = "🧪 Test Alert",
            description = "Your SpoolHub notification channel is working correctly!",
            color = 0x06b6d4,
            footer = new { text = "SpoolHub" },
            timestamp = DateTime.UtcNow.ToString("o"),
        };
        return await SendAsync("🧪 Test alert from SpoolHub — notifications are working!", settings, embed);
    }

    public async Task NotifySpoolAddedAsync(string brand, string material, string colorName, string? colorHex)
    {
        var settings = await settingsService.GetAlertSettingsAsync();
        if (!settings.Enabled || !settings.NotifySpoolAdded) return;

        var hex = (colorHex ?? "06b6d4").TrimStart('#');
        var embed = new
        {
            title = "➕ Spool Added",
            color = HexToDiscordColor(colorHex),
            thumbnail = new { url = $"https://placehold.co/64/{hex}/{hex}.png" },
            fields = new object[]
            {
                new { name = "Brand",    value = brand,     inline = true },
                new { name = "Material", value = material,  inline = true },
                new { name = "Color",    value = colorName, inline = true },
            },
            footer = new { text = "SpoolHub" },
            timestamp = DateTime.UtcNow.ToString("o"),
        };
        await SendAsync($"➕ Spool added — {brand} {material} ({colorName})", settings, embed);
    }

    public async Task NotifySpoolAssignedAsync(string brand, string material, string colorName, string? colorHex, string printerName)
    {
        var settings = await settingsService.GetAlertSettingsAsync();
        if (!settings.Enabled || !settings.NotifySpoolAssigned) return;

        var hex = (colorHex ?? "06b6d4").TrimStart('#');
        var embed = new
        {
            title = "🔗 Spool Assigned",
            description = $"Loaded on **{printerName}**",
            color = HexToDiscordColor(colorHex),
            thumbnail = new { url = $"https://placehold.co/64/{hex}/{hex}.png" },
            fields = new object[]
            {
                new { name = "Brand",    value = brand,     inline = true },
                new { name = "Material", value = material,  inline = true },
                new { name = "Color",    value = colorName, inline = true },
            },
            footer = new { text = "SpoolHub" },
            timestamp = DateTime.UtcNow.ToString("o"),
        };
        await SendAsync($"🖨️ Spool assigned — {brand} {material} ({colorName}) loaded on {printerName}", settings, embed);
    }

    public async Task NotifySpoolDeletedAsync(string brand, string material, string colorName, string? colorHex)
    {
        var settings = await settingsService.GetAlertSettingsAsync();
        if (!settings.Enabled || !settings.NotifySpoolDeleted) return;

        var hex = (colorHex ?? "06b6d4").TrimStart('#');
        var embed = new
        {
            title = "🗑️ Spool Removed",
            color = HexToDiscordColor(colorHex),
            thumbnail = new { url = $"https://placehold.co/64/{hex}/{hex}.png" },
            fields = new object[]
            {
                new { name = "Brand",    value = brand,     inline = true },
                new { name = "Material", value = material,  inline = true },
                new { name = "Color",    value = colorName, inline = true },
            },
            footer = new { text = "SpoolHub" },
            timestamp = DateTime.UtcNow.ToString("o"),
        };
        await SendAsync($"🗑️ Spool removed — {brand} {material} ({colorName})", settings, embed);
    }

    public async Task NotifyPrinterDeletedAsync(string printerName)
    {
        var settings = await settingsService.GetAlertSettingsAsync();
        if (!settings.Enabled || !settings.NotifyPrinterDeleted) return;

        var embed = new
        {
            title = "🖨️ Printer Removed",
            description = $"**{printerName}** has been removed from your setup",
            color = 0x6b7280,
            footer = new { text = "SpoolHub" },
            timestamp = DateTime.UtcNow.ToString("o"),
        };
        await SendAsync($"🗑️ Printer removed — {printerName}", settings, embed);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    private static int HexToDiscordColor(string? hex, int fallback = 0x06b6d4)
    {
        if (string.IsNullOrWhiteSpace(hex)) return fallback;
        try { return Convert.ToInt32(hex.TrimStart('#'), 16); }
        catch { return fallback; }
    }

    private async Task<bool> SendAsync(string plainMessage, DTOs.AlertSettingsDto settings, object? discordEmbed = null)
        => await SendAsync(plainMessage, settings.Provider, settings.NtfyUrl, settings.WebhookUrl, settings.DiscordWebhookUrl, discordEmbed);

    private async Task<bool> SendAsync(
        string plainMessage,
        string provider,
        string? ntfyUrl,
        string? webhookUrl,
        string? discordWebhookUrl,
        object? discordEmbed = null)
    {
        try
        {
            using var http = httpClientFactory.CreateClient();

            if (provider == "ntfy" && !string.IsNullOrEmpty(ntfyUrl))
            {
                var resp = await http.PostAsync(ntfyUrl, new StringContent(plainMessage));
                logger.LogInformation("Ntfy alert sent to {Url} — {Status}", ntfyUrl, resp.StatusCode);
                return resp.IsSuccessStatusCode;
            }

            if (provider == "webhook" && !string.IsNullOrEmpty(webhookUrl))
            {
                var body = JsonSerializer.Serialize(new { message = plainMessage });
                var resp = await http.PostAsync(webhookUrl, new StringContent(body, Encoding.UTF8, "application/json"));
                logger.LogInformation("Webhook alert sent to {Url} — {Status}", webhookUrl, resp.StatusCode);
                return resp.IsSuccessStatusCode;
            }

            if (provider == "discord" && !string.IsNullOrEmpty(discordWebhookUrl))
            {
                var payload = discordEmbed is not null
                    ? JsonSerializer.Serialize(new { embeds = new[] { discordEmbed } })
                    : JsonSerializer.Serialize(new { content = plainMessage });
                var resp = await http.PostAsync(discordWebhookUrl, new StringContent(payload, Encoding.UTF8, "application/json"));
                if (!resp.IsSuccessStatusCode)
                {
                    var err = await resp.Content.ReadAsStringAsync();
                    logger.LogWarning("Discord alert failed — {Status} — {Body}", resp.StatusCode, err);
                }
                else
                {
                    logger.LogInformation("Discord embed sent — {Status}", resp.StatusCode);
                }
                return resp.IsSuccessStatusCode;
            }

            logger.LogWarning("Alert skipped — no URL configured for provider '{Provider}'", provider);
            return false;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Alert send failed");
            return false;
        }
    }
}

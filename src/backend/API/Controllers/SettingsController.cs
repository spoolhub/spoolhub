using System.Reflection;
using API.Services;
using Application.DTOs;
using Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/settings")]
public class SettingsController(
    ISettingsService settingsService,
    IAlertService alertService,
    IFilamentService filamentService,
    LogBuffer logBuffer,
    FileLogSink fileLog) : ControllerBase
{
    // ── Version ─────────────────────────────────────────────────────────────

    [HttpGet("version")]
    public IActionResult GetVersion()
    {
        var asm = typeof(Program).Assembly;
        var version = asm.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
                   ?? asm.GetName().Version?.ToString(3)
                   ?? "0.0.0";
        var clean = version.Contains('+') ? version[..version.IndexOf('+')] : version;
        return Ok(new { version = clean });
    }

    // ── Logs ────────────────────────────────────────────────────────────────

    [HttpGet("/api/logs")]
    public IActionResult GetLogs([FromQuery] int limit = 200)
        => Ok(logBuffer.GetHistory(Math.Clamp(limit, 1, 500)));

    [HttpGet("/api/logs/files")]
    public IActionResult GetLogFiles()
    {
        var logsDir = Path.Combine(AppContext.BaseDirectory, "logs");
        if (!Directory.Exists(logsDir))
            return Ok(Array.Empty<object>());

        var files = Directory.GetFiles(logsDir, "spoolhub*.txt")
            .Select(f => new FileInfo(f))
            .OrderByDescending(f => f.LastWriteTimeUtc)
            .Select(f => new { name = f.Name, size = f.Length, lastModified = f.LastWriteTimeUtc });

        return Ok(files);
    }

    [HttpPost("/api/logs/viewing/start")]
    public IActionResult BeginLogViewing()
    {
        fileLog.BeginViewing();
        return NoContent();
    }

    [HttpPost("/api/logs/viewing/stop")]
    public IActionResult EndLogViewing()
    {
        fileLog.EndViewing();
        return NoContent();
    }

    [HttpPost("/api/logs/viewing/extend")]
    public IActionResult ExtendLogViewing()
    {
        fileLog.ExtendViewing();
        return NoContent();
    }

    [HttpGet("/api/logs/download")]
    public IActionResult DownloadLogFileQuery([FromQuery] string file)
        => DownloadLogFile(file);

    [HttpGet("/api/logs/files/{*filename}")]
    public IActionResult DownloadLogFile(string filename)
    {
        if (string.IsNullOrWhiteSpace(filename)
            || filename.Contains('/') || filename.Contains('\\') || filename.Contains(".."))
            return BadRequest("Invalid filename.");

        var filePath = Path.Combine(AppContext.BaseDirectory, "logs", filename);
        if (!System.IO.File.Exists(filePath))
            return NotFound();

        try
        {
            const long maxBytes = 100 * 1024 * 1024;
            var info = new FileInfo(filePath);
            if (info.Length > maxBytes)
                return StatusCode(StatusCodes.Status413PayloadTooLarge, "Log file is too large to download.");

            var bytes = fileLog.ReadLogFileForDownload(filePath);
            return File(bytes, "text/plain; charset=utf-8", filename);
        }
        catch (IOException)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, "Log file is busy. Try again in a moment.");
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, "Log file is busy. Try again in a moment.");
        }
    }


    // ── Alerts ──────────────────────────────────────────────────────────────

    [HttpGet("alerts")]
    public async Task<IActionResult> GetAlerts()
        => Ok(await settingsService.GetAlertSettingsAsync());

    [HttpPut("alerts")]
    public async Task<IActionResult> UpdateAlerts([FromBody] UpdateAlertSettingsRequest req)
    {
        await settingsService.SaveAlertSettingsAsync(new AlertSettingsDto(
            req.Enabled, req.Provider, req.NtfyUrl, req.WebhookUrl, req.DiscordWebhookUrl,
            req.NotifyLowStock, req.NotifySpoolAssigned, req.NotifySpoolAdded, req.NotifySpoolDeleted, req.NotifyPrinterDeleted));
        return Ok(await settingsService.GetAlertSettingsAsync());
    }

    [HttpPost("alerts/test")]
    public async Task<IActionResult> TestAlert()
    {
        var success = await alertService.SendTestAsync();
        return Ok(new { success, message = success ? "Test alert sent successfully." : "Alert send failed — check your URL and provider settings." });
    }

    // ── Filaments ───────────────────────────────────────────────────────────

    [HttpGet("filaments")]
    public async Task<IActionResult> GetFilaments()
        => Ok(await settingsService.GetFilamentSettingsAsync(filamentService.GetCachedAt()));

    [HttpPut("filaments")]
    public async Task<IActionResult> UpdateFilaments([FromBody] UpdateFilamentSettingsRequest req)
    {
        await settingsService.SaveFilamentSettingsAsync(req);
        return Ok(await settingsService.GetFilamentSettingsAsync(filamentService.GetCachedAt()));
    }

    [HttpPost("filaments/sync")]
    public async Task<IActionResult> SyncFilaments(CancellationToken ct)
    {
        await filamentService.RefreshAsync(ct);
        return Ok(new { lastSynced = filamentService.GetCachedAt() });
    }

    // ── App defaults ────────────────────────────────────────────────────────

    [HttpGet("app")]
    public async Task<IActionResult> GetApp()
        => Ok(await settingsService.GetAppDefaultsAsync());

    [HttpPut("app")]
    public async Task<IActionResult> UpdateApp([FromBody] UpdateAppDefaultsRequest req)
    {
        await settingsService.SaveAppDefaultsAsync(new AppDefaultsDto(req.DefaultLowStockThresholdG, req.Currency, req.Language));
        return Ok(await settingsService.GetAppDefaultsAsync());
    }
}

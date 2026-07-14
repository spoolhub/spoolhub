using API.Services;
using Application.DTOs;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
public class BackupController(
    BackupService backupService,
    BackupSettingsService backupSettings,
    ILogger<BackupController> logger) : ControllerBase
{
    [HttpGet("/api/backup/settings")]
    public async Task<IActionResult> GetSettings()
        => Ok(await backupSettings.GetAsync());

    [HttpPut("/api/backup/settings")]
    public async Task<IActionResult> UpdateSettings([FromBody] UpdateBackupSettingsRequest request)
        => Ok(await backupSettings.SaveAsync(request));

    [HttpGet("/api/backup/files")]
    public IActionResult ListBackups()
    {
        try
        {
            var files = backupService.ListBackups()
                .Select(f => new
                {
                    name = f.Name,
                    size = f.Size,
                    lastModified = f.LastModified,
                });
            return Ok(files);
        }
        catch (Exception)
        {
            return Ok(Array.Empty<object>());
        }
    }

    [HttpPost("/api/backup")]
    public async Task<IActionResult> CreateBackup()
    {
        try
        {
            var created = backupService.CreateBackup();
            await backupSettings.RecordBackupAsync(created.LastModified);
            await backupSettings.PruneAsync();
            return Ok(new
            {
                name = created.Name,
                size = created.Size,
                lastModified = created.LastModified,
            });
        }
        catch (FileNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Backup creation failed");
            return StatusCode(StatusCodes.Status503ServiceUnavailable, "Could not create backup. Try again in a moment.");
        }
    }

    [HttpDelete("/api/backup")]
    public IActionResult DeleteBackup([FromQuery] string file)
    {
        if (string.IsNullOrWhiteSpace(file))
            return BadRequest("Invalid filename.");

        try
        {
            backupService.DeleteBackup(file);
            return NoContent();
        }
        catch (ArgumentException)
        {
            return BadRequest("Invalid filename.");
        }
        catch (FileNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpGet("/api/backup/download")]
    public IActionResult DownloadBackup([FromQuery] string file)
    {
        if (string.IsNullOrWhiteSpace(file))
            return BadRequest("Invalid filename.");

        try
        {
            var path = backupService.ResolveBackupPath(file);
            return PhysicalFile(path, "application/octet-stream", file, enableRangeProcessing: true);
        }
        catch (ArgumentException)
        {
            return BadRequest("Invalid filename.");
        }
        catch (FileNotFoundException)
        {
            return NotFound();
        }
        catch (IOException ex)
        {
            logger.LogWarning(ex, "Backup download failed — {File}", file);
            return StatusCode(StatusCodes.Status503ServiceUnavailable, "Backup file is busy. Try again in a moment.");
        }
    }

    [HttpGet("/api/backup/export")]
    public IActionResult Export()
    {
        try
        {
            var bytes = backupService.CreateExportZip();
            var fileName = $"spoolhub_backup_{DateTime.UtcNow:yyyy.MM.dd_HH.mm.ss}.zip";
            return File(bytes, "application/octet-stream", fileName);
        }
        catch (FileNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, "Could not export backup.");
        }
    }

    [HttpPost("/api/backup/restore")]
    public async Task<IActionResult> Restore([FromQuery] string? backup, IFormFile? file, CancellationToken ct)
    {
        try
        {
            if (!string.IsNullOrWhiteSpace(backup))
            {
                await backupService.RestoreFromDiskAsync(backup, ct);
                return Ok(new { message = "Database restored. Restart the application for all changes to take effect." });
            }

            if (file is null || file.Length == 0)
                return BadRequest("No file provided.");

            await using var stream = file.OpenReadStream();
            await backupService.RestoreFromUploadAsync(stream, file.FileName, ct);
            return Ok(new { message = "Database restored. Restart the application for all changes to take effect." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (ArgumentException)
        {
            return BadRequest("Invalid filename.");
        }
        catch (FileNotFoundException)
        {
            return NotFound();
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, "Restore failed. The file may be invalid or incompatible.");
        }
    }

    [HttpPost("/api/backup/import")]
    public Task<IActionResult> Import(IFormFile file, CancellationToken ct)
        => Restore(backup: null, file: file, ct);
}

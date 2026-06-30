using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;

namespace API.Controllers;

[ApiController]
public class BackupController(IConfiguration configuration) : ControllerBase
{
    private string GetDbPath()
    {
        var connStr = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not configured.");

        var dataSource = new SqliteConnectionStringBuilder(connStr).DataSource;
        return Path.IsPathRooted(dataSource)
            ? dataSource
            : Path.Combine(AppContext.BaseDirectory, dataSource);
    }

    [HttpGet("/api/backup/export")]
    public IActionResult Export()
    {
        var dbPath = GetDbPath();
        if (!System.IO.File.Exists(dbPath))
            return NotFound("Database file not found.");

        var tempPath = Path.GetTempFileName();
        try
        {
            using var source = new SqliteConnection($"Data Source={dbPath}");
            using var dest   = new SqliteConnection($"Data Source={tempPath}");
            source.Open();
            dest.Open();
            source.BackupDatabase(dest);
        }
        catch
        {
            System.IO.File.Delete(tempPath);
            throw;
        }

        var fileName = $"spoolhub-backup-{DateTime.UtcNow:yyyy-MM-dd}.db";
        var stream = new FileStream(tempPath, FileMode.Open, FileAccess.Read, FileShare.None,
            bufferSize: 4096, options: FileOptions.DeleteOnClose);
        return File(stream, "application/octet-stream", fileName);
    }

    [HttpPost("/api/backup/import")]
    public async Task<IActionResult> Import(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest("No file provided.");

        if (!file.FileName.EndsWith(".db", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Invalid file type. Please upload a .db backup file.");

        var dbPath = GetDbPath();

        // Write incoming file to a temp path first so we can validate it before touching the real DB
        var tempPath = Path.GetTempFileName();
        try
        {
            using (var fs = new FileStream(tempPath, FileMode.Create, FileAccess.Write))
                await file.CopyToAsync(fs, ct);

            // Quick sanity check: SQLite files start with the magic header
            var header = new byte[16];
            using (var fs = new FileStream(tempPath, FileMode.Open, FileAccess.Read))
                await fs.ReadAsync(header, ct);

            if (!"SQLite format 3\0"u8.SequenceEqual(header))
            {
                System.IO.File.Delete(tempPath);
                return BadRequest("File does not appear to be a valid SQLite database.");
            }

            // Close all pooled connections before replacing the file
            SqliteConnection.ClearAllPools();

            // Swap in the new database
            System.IO.File.Copy(tempPath, dbPath, overwrite: true);

            // Remove stale WAL/SHM files from the old database so SQLite starts clean
            foreach (var ext in new[] { "-wal", "-shm" })
            {
                var side = dbPath + ext;
                if (System.IO.File.Exists(side)) System.IO.File.Delete(side);
            }

            return Ok(new { message = "Database restored. Restart the application for all changes to take effect." });
        }
        finally
        {
            if (System.IO.File.Exists(tempPath)) System.IO.File.Delete(tempPath);
        }
    }
}

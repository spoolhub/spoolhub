using System.IO.Compression;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Data.Sqlite;

namespace API.Services;

public sealed record BackupFileInfo(string Name, long Size, DateTime LastModified);

public sealed class BackupService(IConfiguration configuration, IWebHostEnvironment environment)
{
    private const string DbEntryName = "spoolhub.db";
    private const string ManifestEntryName = "manifest.json";
    private static readonly SemaphoreSlim BackupGate = new(1, 1);

    private readonly string _dbPath = SqlitePathResolver.ResolveDatabasePath(configuration, environment);
    private readonly string _backupsDir = ResolveBackupsDirectory(environment, SqlitePathResolver.ResolveDatabasePath(configuration, environment));

    public string BackupsDirectory
    {
        get
        {
            Directory.CreateDirectory(_backupsDir);
            return _backupsDir;
        }
    }

    public IReadOnlyList<BackupFileInfo> ListBackups()
    {
        MigrateLegacyDevBackupsIfNeeded();
        Directory.CreateDirectory(_backupsDir);

        return Directory.EnumerateFiles(_backupsDir, "spoolhub_backup_*.zip")
            .Select(path => new FileInfo(path))
            .OrderByDescending(f => f.LastWriteTimeUtc)
            .Select(f => new BackupFileInfo(f.Name, f.Length, f.LastWriteTimeUtc))
            .ToList();
    }

    public BackupFileInfo CreateBackup()
    {
        BackupGate.Wait();
        try
        {
            MigrateLegacyDevBackupsIfNeeded();
            Directory.CreateDirectory(_backupsDir);

            var fileName = $"spoolhub_backup_{DateTime.UtcNow:yyyy.MM.dd_HH.mm.ss}.zip";
            var zipPath = Path.Combine(_backupsDir, fileName);
            WriteZipBackup(zipPath);

            var info = new FileInfo(zipPath);
            return new BackupFileInfo(info.Name, info.Length, info.LastWriteTimeUtc);
        }
        finally
        {
            BackupGate.Release();
        }
    }

    public void DeleteBackup(string filename)
    {
        var path = ResolveBackupPath(filename);
        File.Delete(path);
    }

    public async Task RestoreFromDiskAsync(string filename, CancellationToken ct = default)
    {
        await BackupGate.WaitAsync(ct);
        try
        {
            var path = ResolveBackupPath(filename);
            await using var stream = File.OpenRead(path);
            await RestoreFromUploadCoreAsync(stream, filename, ct);
        }
        finally
        {
            BackupGate.Release();
        }
    }

    public byte[] ReadBackupBytes(string filename)
    {
        var path = ResolveBackupPath(filename);
        using var stream = new FileStream(
            path,
            FileMode.Open,
            FileAccess.Read,
            FileShare.ReadWrite | FileShare.Delete);
        using var memory = new MemoryStream();
        stream.CopyTo(memory);
        return memory.ToArray();
    }

    public async Task RestoreFromUploadAsync(Stream upload, string fileName, CancellationToken ct = default)
    {
        await BackupGate.WaitAsync(ct);
        try
        {
            await RestoreFromUploadCoreAsync(upload, fileName, ct);
        }
        finally
        {
            BackupGate.Release();
        }
    }

    private async Task RestoreFromUploadCoreAsync(Stream upload, string fileName, CancellationToken ct)
    {
        var extension = Path.GetExtension(fileName);
        if (extension.Equals(".zip", StringComparison.OrdinalIgnoreCase))
        {
            await RestoreFromZipAsync(upload, ct);
            return;
        }

        if (extension.Equals(".db", StringComparison.OrdinalIgnoreCase))
        {
            await RestoreFromDbStreamAsync(upload, ct);
            return;
        }

        throw new InvalidOperationException("Invalid file type. Upload a .zip or .db backup file.");
    }

    public string ResolveBackupPath(string filename)
    {
        if (string.IsNullOrWhiteSpace(filename)
            || filename.Contains('/') || filename.Contains('\\') || filename.Contains(".."))
            throw new ArgumentException("Invalid filename.");

        if (!filename.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("Invalid filename.");

        var path = Path.Combine(BackupsDirectory, filename);
        if (!File.Exists(path))
            throw new FileNotFoundException("Backup file not found.", filename);

        return path;
    }

    public byte[] CreateExportZip()
    {
        BackupGate.Wait();
        try
        {
            var tempZip = Path.GetTempFileName();
            try
            {
                WriteZipBackup(tempZip);
                return File.ReadAllBytes(tempZip);
            }
            finally
            {
                if (File.Exists(tempZip))
                    File.Delete(tempZip);
            }
        }
        finally
        {
            BackupGate.Release();
        }
    }

    private void WriteZipBackup(string zipPath)
    {
        if (!File.Exists(_dbPath))
            throw new FileNotFoundException("Database file not found.", _dbPath);

        var tempDb = Path.GetTempFileName();
        try
        {
            CreateConsistentDbSnapshot(tempDb);

            if (File.Exists(zipPath))
                File.Delete(zipPath);

            using (var archive = ZipFile.Open(zipPath, ZipArchiveMode.Create))
            {
                archive.CreateEntryFromFile(tempDb, DbEntryName, CompressionLevel.Optimal);

                var manifest = new
                {
                    version = 1,
                    createdAt = DateTime.UtcNow,
                    app = "SpoolHub",
                };
                var manifestEntry = archive.CreateEntry(ManifestEntryName, CompressionLevel.Optimal);
                using var writer = new StreamWriter(manifestEntry.Open());
                writer.Write(JsonSerializer.Serialize(manifest));
            }
        }
        finally
        {
            DeleteWithRetry(tempDb);
        }
    }

    private void CreateConsistentDbSnapshot(string destinationPath)
    {
        var sourceCs = new SqliteConnectionStringBuilder
        {
            DataSource = _dbPath,
            Mode = SqliteOpenMode.ReadWrite,
            Cache = SqliteCacheMode.Shared,
        }.ConnectionString;

        using var source = new SqliteConnection(sourceCs);
        using var dest = new SqliteConnection(new SqliteConnectionStringBuilder
        {
            DataSource = destinationPath,
            Pooling = false,
        }.ConnectionString);
        source.Open();
        dest.Open();

        using (var checkpoint = source.CreateCommand())
        {
            checkpoint.CommandText = "PRAGMA wal_checkpoint(PASSIVE);";
            checkpoint.ExecuteNonQuery();
        }

        source.BackupDatabase(dest);
        dest.Close();
        source.Close();
    }

    private async Task RestoreFromZipAsync(Stream upload, CancellationToken ct)
    {
        var tempZip = Path.GetTempFileName();
        var extractDir = Path.Combine(Path.GetTempPath(), $"spoolhub-restore-{Guid.NewGuid():N}");
        try
        {
            await using (var fs = File.Create(tempZip))
                await upload.CopyToAsync(fs, ct);

            ZipFile.ExtractToDirectory(tempZip, extractDir);

            var dbPath = Path.Combine(extractDir, DbEntryName);
            if (!File.Exists(dbPath))
            {
                dbPath = Directory.EnumerateFiles(extractDir, "*.db").FirstOrDefault()
                    ?? throw new InvalidOperationException("Backup zip does not contain a database file.");
            }

            await ReplaceLiveDatabaseAsync(dbPath, ct);
        }
        finally
        {
            if (File.Exists(tempZip))
                File.Delete(tempZip);
            if (Directory.Exists(extractDir))
                Directory.Delete(extractDir, recursive: true);
        }
    }

    private async Task RestoreFromDbStreamAsync(Stream upload, CancellationToken ct)
    {
        var tempDb = Path.GetTempFileName();
        try
        {
            await using (var fs = File.Create(tempDb))
                await upload.CopyToAsync(fs, ct);

            await ReplaceLiveDatabaseAsync(tempDb, ct);
        }
        finally
        {
            if (File.Exists(tempDb))
                File.Delete(tempDb);
        }
    }

    private async Task ReplaceLiveDatabaseAsync(string validatedSourcePath, CancellationToken ct)
    {
        var header = new byte[16];
        await using (var fs = new FileStream(validatedSourcePath, FileMode.Open, FileAccess.Read, FileShare.Read))
        {
            var read = await fs.ReadAsync(header.AsMemory(0, 16), ct);
            if (read < 16 || !"SQLite format 3\0"u8.SequenceEqual(header))
                throw new InvalidOperationException("File does not appear to be a valid SQLite database.");
        }

        // Caller holds BackupGate — disconnect pooled handles before replacing the live file.
        SqliteConnection.ClearAllPools();

        var dbDir = Path.GetDirectoryName(_dbPath);
        if (!string.IsNullOrEmpty(dbDir))
            Directory.CreateDirectory(dbDir);

        File.Copy(validatedSourcePath, _dbPath, overwrite: true);

        foreach (var ext in new[] { "-wal", "-shm" })
        {
            var side = _dbPath + ext;
            if (File.Exists(side))
                File.Delete(side);
        }
    }

    private static void DeleteWithRetry(string path)
    {
        for (var attempt = 0; attempt < 12; attempt++)
        {
            try
            {
                if (File.Exists(path))
                    File.Delete(path);
                return;
            }
            catch (IOException) when (attempt < 11)
            {
                Thread.Sleep(50 * (attempt + 1));
            }
        }
    }

    private void MigrateLegacyDevBackupsIfNeeded()
    {
        if (!environment.IsDevelopment()) return;

        Directory.CreateDirectory(_backupsDir);

        var legacyDirs = new[]
        {
            Path.Combine(Path.GetDirectoryName(_dbPath)!, "Backups"),
            Path.Combine(environment.ContentRootPath, "Backups"),
        };

        foreach (var legacyDir in legacyDirs.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (!Directory.Exists(legacyDir)) continue;

            foreach (var path in Directory.EnumerateFiles(legacyDir, "spoolhub_backup_*.zip"))
            {
                var dest = Path.Combine(_backupsDir, Path.GetFileName(path));
                if (File.Exists(dest)) continue;
                File.Move(path, dest);
            }
        }
    }

    private static string ResolveBackupsDirectory(IWebHostEnvironment environment, string dbPath)
    {
        // Keep dev backups outside the project tree so VS / dotnet watch does not restart the API.
        if (environment.IsDevelopment())
        {
            return Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "SpoolHub",
                "Backups");
        }

        return Path.Combine(Path.GetDirectoryName(dbPath)!, "Backups");
    }
}

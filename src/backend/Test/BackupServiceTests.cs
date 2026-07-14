using System.IO.Compression;
using API.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using NSubstitute;

namespace Test;

public class BackupServiceTests : IDisposable
{
    private readonly string _root;
    private readonly string _dbPath;
    private readonly BackupService _sut;

    public BackupServiceTests()
    {
        _root = Path.Combine(Path.GetTempPath(), $"spoolhub-backup-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_root);
        _dbPath = Path.Combine(_root, "spoolhub.db");

        using (var conn = new SqliteConnection($"Data Source={_dbPath}"))
        {
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, name TEXT); INSERT INTO t(name) VALUES ('seed');";
            cmd.ExecuteNonQuery();
        }

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = $"Data Source={_dbPath}",
            })
            .Build();

        var env = Substitute.For<IWebHostEnvironment>();
        env.ContentRootPath.Returns(_root);
        env.EnvironmentName.Returns(Environments.Production);
        _sut = new BackupService(config, env);
    }

    [Fact]
    public void CreateBackup_ResolvesRelativeDbPathFromContentRoot()
    {
        var contentRoot = Path.Combine(Path.GetTempPath(), $"spoolhub-backup-root-{Guid.NewGuid():N}");
        Directory.CreateDirectory(contentRoot);
        var dbPath = Path.Combine(contentRoot, "spoolhub.db");

        using (var conn = new SqliteConnection($"Data Source={dbPath}"))
        {
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, name TEXT); INSERT INTO t(name) VALUES ('seed');";
            cmd.ExecuteNonQuery();
        }

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Data Source=spoolhub.db",
            })
            .Build();

        var env = Substitute.For<IWebHostEnvironment>();
        env.ContentRootPath.Returns(contentRoot);
        env.EnvironmentName.Returns(Environments.Production);
        var sut = new BackupService(config, env);

        var created = sut.CreateBackup();

        Assert.True(created.Size > 0);
        Assert.True(File.Exists(Path.Combine(contentRoot, "Backups", created.Name)));

        SqliteConnection.ClearAllPools();
        Directory.Delete(contentRoot, recursive: true);
    }

    [Fact]
    public void CreateBackup_WritesZipWithDatabaseEntry()
    {
        var created = _sut.CreateBackup();

        Assert.EndsWith(".zip", created.Name, StringComparison.OrdinalIgnoreCase);
        Assert.True(created.Size > 0);

        var zipPath = _sut.ResolveBackupPath(created.Name);
        using var archive = ZipFile.OpenRead(zipPath);
        Assert.Contains(archive.Entries, e => e.Name == "spoolhub.db");
    }

    [Fact]
    public void ListBackups_ReturnsCreatedBackup()
    {
        var created = _sut.CreateBackup();

        var files = _sut.ListBackups();

        Assert.Contains(files, f => f.Name == created.Name);
    }

    [Fact]
    public async Task RestoreFromUploadAsync_RestoresDatabaseFromZip()
    {
        var created = _sut.CreateBackup();
        var zipBytes = _sut.ReadBackupBytes(created.Name);

        using (var conn = new SqliteConnection($"Data Source={_dbPath}"))
        {
            conn.Open();
            using var wipe = conn.CreateCommand();
            wipe.CommandText = "DELETE FROM t;";
            wipe.ExecuteNonQuery();
        }

        await using var upload = new MemoryStream(zipBytes);
        await _sut.RestoreFromUploadAsync(upload, created.Name);

        using var restored = new SqliteConnection($"Data Source={_dbPath}");
        restored.Open();
        using var read = restored.CreateCommand();
        read.CommandText = "SELECT COUNT(*) FROM t;";
        var count = Convert.ToInt32(await read.ExecuteScalarAsync());
        Assert.Equal(1, count);
    }

    [Fact]
    public void DeleteBackup_RemovesFile()
    {
        var created = _sut.CreateBackup();
        _sut.DeleteBackup(created.Name);
        Assert.DoesNotContain(created.Name, _sut.ListBackups().Select(f => f.Name));
    }

    [Fact]
    public void CreateBackup_InDevelopment_StoresOutsideContentRoot()
    {
        var contentRoot = Path.Combine(Path.GetTempPath(), $"spoolhub-dev-backup-{Guid.NewGuid():N}");
        Directory.CreateDirectory(contentRoot);
        var dbPath = Path.Combine(contentRoot, "spoolhub.db");

        using (var conn = new SqliteConnection($"Data Source={dbPath}"))
        {
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY, name TEXT); INSERT INTO t(name) VALUES ('seed');";
            cmd.ExecuteNonQuery();
        }

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "Data Source=spoolhub.db",
            })
            .Build();

        var env = Substitute.For<IWebHostEnvironment>();
        env.ContentRootPath.Returns(contentRoot);
        env.EnvironmentName.Returns(Environments.Development);
        var sut = new BackupService(config, env);

        var created = sut.CreateBackup();
        var devBackupDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "SpoolHub",
            "Backups");

        Assert.True(File.Exists(Path.Combine(devBackupDir, created.Name)));
        Assert.False(File.Exists(Path.Combine(contentRoot, "Backups", created.Name)));

        sut.DeleteBackup(created.Name);
        SqliteConnection.ClearAllPools();
        Directory.Delete(contentRoot, recursive: true);
    }

    [Fact]
    public void ListBackups_InDevelopment_MigratesLegacyProjectBackups()
    {
        var contentRoot = Path.Combine(Path.GetTempPath(), $"spoolhub-legacy-backup-{Guid.NewGuid():N}");
        var legacyDir = Path.Combine(contentRoot, "Backups");
        Directory.CreateDirectory(legacyDir);
        var legacyName = $"spoolhub_backup_{DateTime.UtcNow:yyyy.MM.dd_HH.mm.ss}.zip";
        var legacyZip = Path.Combine(legacyDir, legacyName);
        File.WriteAllText(legacyZip, "not-a-real-zip");

        var dbPath = Path.Combine(contentRoot, "spoolhub.db");
        using (var conn = new SqliteConnection($"Data Source={dbPath}"))
        {
            conn.Open();
        }

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = $"Data Source={dbPath}",
            })
            .Build();

        var env = Substitute.For<IWebHostEnvironment>();
        env.ContentRootPath.Returns(contentRoot);
        env.EnvironmentName.Returns(Environments.Development);
        var sut = new BackupService(config, env);

        var files = sut.ListBackups();

        Assert.Contains(files, f => f.Name == legacyName);
        Assert.False(File.Exists(legacyZip));

        sut.DeleteBackup(legacyName);
        SqliteConnection.ClearAllPools();
        Directory.Delete(contentRoot, recursive: true);
    }

    public void Dispose()
    {
        SqliteConnection.ClearAllPools();
        if (!Directory.Exists(_root))
            return;

        try
        {
            Directory.Delete(_root, recursive: true);
        }
        catch (IOException)
        {
            // Best-effort cleanup for temp test directories.
        }
    }
}

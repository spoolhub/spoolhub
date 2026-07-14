using API.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using NSubstitute;

namespace Test;

public class SqlitePathResolverTests : IDisposable
{
    private readonly List<string> _cleanupDirs = [];

    [Fact]
    public void ResolveDatabasePath_WithAbsolutePath_ReturnsAsIs()
    {
        var absolute = Path.Combine(Path.GetTempPath(), $"spoolhub-abs-{Guid.NewGuid():N}.db");
        var config = ConfigWith($"Data Source={absolute}");
        var env = ProductionEnv(Path.GetTempPath());

        var path = SqlitePathResolver.ResolveDatabasePath(config, env);

        Assert.Equal(absolute, path);
    }

    [Fact]
    public void ResolveDatabasePath_InProduction_UsesContentRoot()
    {
        var contentRoot = CreateTempDir();
        var config = ConfigWith("Data Source=spoolhub.db");
        var env = ProductionEnv(contentRoot);

        var path = SqlitePathResolver.ResolveDatabasePath(config, env);

        Assert.Equal(Path.Combine(contentRoot, "spoolhub.db"), path);
    }

    [Fact]
    public void ResolveDatabasePath_InDevelopment_UsesLocalApplicationData()
    {
        var contentRoot = CreateTempDir();
        var config = ConfigWith("Data Source=spoolhub.db");
        var env = DevelopmentEnv(contentRoot);

        var path = SqlitePathResolver.ResolveDatabasePath(config, env);

        var expected = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "SpoolHub",
            "spoolhub.db");
        Assert.Equal(expected, path);
    }

    [Fact]
    public void ResolveDatabasePath_InDevelopment_MigratesLegacyProjectDatabase()
    {
        var contentRoot = CreateTempDir();
        var legacyDb = Path.Combine(contentRoot, "spoolhub-migrate-test.db");
        File.WriteAllText(legacyDb, "sqlite-placeholder");

        var config = ConfigWith("Data Source=spoolhub-migrate-test.db");
        var env = DevelopmentEnv(contentRoot);

        var expectedPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "SpoolHub",
            "spoolhub-migrate-test.db");
        if (File.Exists(expectedPath))
            File.Delete(expectedPath);

        var path = SqlitePathResolver.ResolveDatabasePath(config, env);
        _cleanupDirs.Add(Path.GetDirectoryName(path)!);

        Assert.Equal(expectedPath, path);
        Assert.True(File.Exists(path));
        Assert.Equal("sqlite-placeholder", File.ReadAllText(path));
    }

    [Fact]
    public void ResolveConnectionString_PreservesDataSourceOverride()
    {
        var contentRoot = CreateTempDir();
        var config = ConfigWith("Data Source=spoolhub.db");
        var env = ProductionEnv(contentRoot);

        var connStr = SqlitePathResolver.ResolveConnectionString(config, env);
        var dataSource = new Microsoft.Data.Sqlite.SqliteConnectionStringBuilder(connStr).DataSource;

        Assert.Equal(Path.Combine(contentRoot, "spoolhub.db"), dataSource);
    }

    private static IConfiguration ConfigWith(string connectionString)
        => new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = connectionString,
            })
            .Build();

    private static IWebHostEnvironment ProductionEnv(string contentRoot)
    {
        var env = Substitute.For<IWebHostEnvironment>();
        env.ContentRootPath.Returns(contentRoot);
        env.EnvironmentName.Returns(Environments.Production);
        return env;
    }

    private static IWebHostEnvironment DevelopmentEnv(string contentRoot)
    {
        var env = Substitute.For<IWebHostEnvironment>();
        env.ContentRootPath.Returns(contentRoot);
        env.EnvironmentName.Returns(Environments.Development);
        return env;
    }

    private string CreateTempDir()
    {
        var dir = Path.Combine(Path.GetTempPath(), $"spoolhub-sqlite-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(dir);
        _cleanupDirs.Add(dir);
        return dir;
    }

    public void Dispose()
    {
        foreach (var dir in _cleanupDirs)
        {
            if (!Directory.Exists(dir)) continue;
            try
            {
                Directory.Delete(dir, recursive: true);
            }
            catch (IOException)
            {
                // Best-effort cleanup.
            }
        }
    }
}

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
    public void ResolveDatabasePath_InDevelopment_UsesContentRoot()
    {
        var contentRoot = CreateTempDir();
        var config = ConfigWith("Data Source=spoolhub.db");
        var env = DevelopmentEnv(contentRoot);

        var path = SqlitePathResolver.ResolveDatabasePath(config, env);

        Assert.Equal(Path.Combine(contentRoot, "spoolhub.db"), path);
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

using API.Services;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using NSubstitute;

namespace Test;

public class AppPathsTests : IDisposable
{
    private readonly string _legacyLogsDir;
    private readonly List<string> _cleanup = [];

    public AppPathsTests()
    {
        _legacyLogsDir = Path.Combine(AppContext.BaseDirectory, "logs");
        Directory.CreateDirectory(_legacyLogsDir);
    }

    [Fact]
    public void LogsDirectory_InProduction_UsesBaseDirectory()
    {
        var env = Substitute.For<IWebHostEnvironment>();
        env.EnvironmentName.Returns(Environments.Production);

        var dir = AppPaths.LogsDirectory(env);

        Assert.StartsWith(AppContext.BaseDirectory, dir, StringComparison.OrdinalIgnoreCase);
        Assert.EndsWith("logs", dir, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void LogsDirectory_InDevelopment_UsesLocalApplicationData()
    {
        var env = Substitute.For<IWebHostEnvironment>();
        env.EnvironmentName.Returns(Environments.Development);

        var dir = AppPaths.LogsDirectory(env);

        var expectedRoot = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "SpoolHub");
        Assert.StartsWith(expectedRoot, dir, StringComparison.OrdinalIgnoreCase);
        Assert.EndsWith("logs", dir, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void DataProtectionKeys_InDevelopment_UsesLocalApplicationData()
    {
        var env = Substitute.For<IWebHostEnvironment>();
        env.EnvironmentName.Returns(Environments.Development);

        var dir = AppPaths.DataProtectionKeysDirectory(env);

        Assert.Equal(
            Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "SpoolHub",
                "data-protection-keys"),
            dir);
    }

    [Fact]
    public void MigrateLegacyDevLogsIfNeeded_CopiesFromBaseDirectoryLogs()
    {
        var env = Substitute.For<IWebHostEnvironment>();
        env.EnvironmentName.Returns(Environments.Development);

        var legacyName = $"spoolhub-migrate-{Guid.NewGuid():N}.txt";
        var legacyPath = Path.Combine(_legacyLogsDir, legacyName);
        File.WriteAllText(legacyPath, "legacy-log");
        _cleanup.Add(legacyPath);

        AppPaths.MigrateLegacyDevLogsIfNeeded(env);

        var migratedPath = Path.Combine(AppPaths.LogsDirectory(env), legacyName);
        _cleanup.Add(migratedPath);
        Assert.True(File.Exists(migratedPath));
        Assert.Equal("legacy-log", File.ReadAllText(migratedPath));
    }

    public void Dispose()
    {
        foreach (var path in _cleanup)
        {
            if (File.Exists(path))
                File.Delete(path);
        }
    }
}

using API.Services;
using Application.DTOs;
using Application.Interfaces;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Hosting;
using NSubstitute;

namespace Test;

public class BackupSettingsServiceTests
{
    private readonly IAppSettingRepository _repo = Substitute.For<IAppSettingRepository>();
    private readonly BackupService _backupService;
    private readonly BackupSettingsService _sut;

    public BackupSettingsServiceTests()
    {
        var root = Path.Combine(Path.GetTempPath(), $"spoolhub-settings-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(root);
        var dbPath = Path.Combine(root, "spoolhub.db");
        using (var conn = new Microsoft.Data.Sqlite.SqliteConnection($"Data Source={dbPath}"))
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
        env.ContentRootPath.Returns(root);
        env.EnvironmentName.Returns(Environments.Production);
        _backupService = new BackupService(config, env);
        _sut = new BackupSettingsService(_repo, _backupService, NullLogger<BackupSettingsService>.Instance);
    }

    [Fact]
    public async Task GetAsync_DefaultsToWeeklyEnabled_WhenUnset()
    {
        _repo.GetAsync("backups.schedule").Returns((string?)null);
        _repo.GetAsync("backups.retention").Returns((string?)null);
        _repo.GetAsync("backups.last_run").Returns((string?)null);

        var settings = await _sut.GetAsync();

        Assert.True(settings.AutoBackupEnabled);
        Assert.Equal("weekly", settings.Frequency);
        Assert.Equal(8, settings.RetentionCount);
    }

    [Fact]
    public async Task SaveAsync_DisablingScheduleStoresOff()
    {
        _repo.GetAsync(Arg.Any<string>()).Returns(call =>
        {
            return call.ArgAt<string>(0) switch
            {
                "backups.schedule" => "off",
                "backups.retention" => "8",
                _ => null,
            };
        });

        var saved = await _sut.SaveAsync(new UpdateBackupSettingsRequest(false, "daily", 8));

        Assert.False(saved.AutoBackupEnabled);
        await _repo.Received().SetAsync("backups.schedule", "off");
    }

    [Fact]
    public async Task RunScheduledBackupIfDueAsync_SkipsWhenWeeklyIntervalNotElapsed()
    {
        _repo.GetAsync("backups.schedule").Returns("weekly");
        _repo.GetAsync("backups.last_run").Returns(DateTime.UtcNow.AddDays(-2).ToString("O"));

        await _sut.RunScheduledBackupIfDueAsync();

        Assert.Empty(_backupService.ListBackups());
    }
}

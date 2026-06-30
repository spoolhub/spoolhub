using System.Reflection;
using API.Services;
using Application.Interfaces;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using NSubstitute;
using NSubstitute.ExceptionExtensions;

namespace Test;

public class FilamentCacheWarmupServiceTests
{
    private readonly IFilamentService _filamentService = Substitute.For<IFilamentService>();
    private readonly IServiceScopeFactory _scopeFactory = Substitute.For<IServiceScopeFactory>();
    private readonly ILogger<FilamentCacheWarmupService> _logger =
        Substitute.For<ILogger<FilamentCacheWarmupService>>();

    public FilamentCacheWarmupServiceTests()
    {
        var scope = Substitute.For<IServiceScope>();
        var provider = Substitute.For<IServiceProvider>();
        provider.GetService(typeof(IFilamentService)).Returns(_filamentService);
        scope.ServiceProvider.Returns(provider);
        _scopeFactory.CreateScope().Returns(scope);
    }

    private FilamentCacheWarmupService CreateSut() => new(_scopeFactory, _logger);

    // BackgroundService.StartAsync fires ExecuteAsync without awaiting it.
    // Call ExecuteAsync directly via reflection to get deterministic test behaviour.
    // A pre-cancelled token lets startup logic complete before the trigger loop exits immediately.
    private static async Task RunExecuteAsync(FilamentCacheWarmupService sut)
    {
        using var cts = new CancellationTokenSource();
        cts.Cancel();
        var method = typeof(FilamentCacheWarmupService)
            .GetMethod("ExecuteAsync", BindingFlags.NonPublic | BindingFlags.Instance)!;
        try { await (Task)method.Invoke(sut, [cts.Token])!; }
        catch (OperationCanceledException) { }
    }

    [Fact]
    public async Task ExecuteAsync_SkipsRefresh_WhenCacheIsFresh()
    {
        _filamentService.GetCachedAt().Returns(DateTime.UtcNow.AddHours(-1));
        _filamentService.GetAllAsync().Returns([]);

        await RunExecuteAsync(CreateSut());

        await _filamentService.DidNotReceive().RefreshAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ExecuteAsync_TriggersRefresh_WhenCacheIsNull()
    {
        _filamentService.GetCachedAt().Returns((DateTime?)null);
        _filamentService.GetAllAsync().Returns([]);

        await RunExecuteAsync(CreateSut());

        await _filamentService.Received(1).RefreshAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ExecuteAsync_TriggersRefresh_WhenCacheIsStale()
    {
        _filamentService.GetCachedAt().Returns(DateTime.UtcNow.AddHours(-25));
        _filamentService.GetAllAsync().Returns([]);

        await RunExecuteAsync(CreateSut());

        await _filamentService.Received(1).RefreshAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task ExecuteAsync_DoesNotThrow_WhenGetAllFails()
    {
        _filamentService.GetAllAsync().ThrowsAsync(new Exception("DB error"));
        _filamentService.GetCachedAt().Returns((DateTime?)null);

        var ex = await Record.ExceptionAsync(() => RunExecuteAsync(CreateSut()));

        Assert.Null(ex);
    }
}

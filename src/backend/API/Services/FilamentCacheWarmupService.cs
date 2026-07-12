using System.Threading.Channels;
using Application.Interfaces;

namespace API.Services;

public class FilamentCacheWarmupService(IServiceScopeFactory scopeFactory, ILogger<FilamentCacheWarmupService> logger)
    : BackgroundService, IFilamentRefreshQueue
{
    private readonly Channel<bool> _refreshRequests = Channel.CreateBounded<bool>(
        new BoundedChannelOptions(1) { FullMode = BoundedChannelFullMode.DropWrite });

    public void TriggerRefresh() => _refreshRequests.Writer.TryWrite(true);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await RunStartupWarmupAsync(stoppingToken);

        await foreach (var _ in _refreshRequests.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                logger.LogInformation("Manual filament refresh triggered");
                using var scope = scopeFactory.CreateScope();
                var svc = scope.ServiceProvider.GetRequiredService<IFilamentService>();
                await svc.RefreshAsync(stoppingToken);
            }
            catch (Exception ex) when (!stoppingToken.IsCancellationRequested)
            {
                logger.LogError(ex, "Filament refresh failed");
            }
        }
    }

    private async Task RunStartupWarmupAsync(CancellationToken stoppingToken)
    {
        using var scope = scopeFactory.CreateScope();
        var filamentService = scope.ServiceProvider.GetRequiredService<IFilamentService>();

        try { await filamentService.GetAllAsync(); }
        catch (Exception ex) { logger.LogWarning(ex, "Filament cache pre-load failed — will refresh"); }

        var cachedAt = filamentService.GetCachedAt();
        var isStale  = cachedAt is null || (DateTime.UtcNow - cachedAt.Value) > TimeSpan.FromHours(24);

        if (!isStale)
        {
            logger.LogInformation("Filament cache loaded from SQLite — {Age:0.0}h old, no refresh needed",
                (DateTime.UtcNow - cachedAt!.Value).TotalHours);
            return;
        }

        logger.LogInformation("Filament cache {Status} — refreshing from OFD in background…",
            cachedAt is null ? "empty" : "stale");

        await filamentService.RefreshAsync(stoppingToken);
    }
}

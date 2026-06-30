using Application.Interfaces;

namespace API.Services;

public class ActivityCleanupService(IServiceScopeFactory scopeFactory, ILogger<ActivityCleanupService> logger) : BackgroundService
{
    private const int RetentionDays = 90;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = scopeFactory.CreateScope();
                var repo = scope.ServiceProvider.GetRequiredService<IActivityRepository>();
                var deleted = await repo.DeleteOlderThanAsync(RetentionDays);
                if (deleted > 0)
                    logger.LogInformation("Activity cleanup: removed {Count} records older than {Days} days", deleted, RetentionDays);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Activity cleanup failed");
            }

            // Run once per day
            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }
}

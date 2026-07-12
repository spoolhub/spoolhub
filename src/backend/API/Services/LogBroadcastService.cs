using API.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace API.Services;

public class LogBroadcastService(LogBuffer buffer, IHubContext<LogHub> hub) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var entry in buffer.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await hub.Clients.All.SendAsync("LogEntry", entry, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch
            {
                // don't let a failed broadcast crash the logger
            }
        }
    }
}

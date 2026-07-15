using API.Hubs;
using Application.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace API.Services;

public class SignalRPrinterRealtimeNotifier(
    IHubContext<PrinterHub> hub,
    ILogger<SignalRPrinterRealtimeNotifier> logger) : IPrinterRealtimeNotifier
{
    public async Task NotifyPrinterUpdatedAsync(Guid printerId, bool spoolsChanged = false)
    {
        try
        {
            await hub.Clients.All.SendAsync("PrinterUpdated", new { printerId, spoolsChanged });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to push PrinterUpdated for {PrinterId}", printerId);
        }
    }
}

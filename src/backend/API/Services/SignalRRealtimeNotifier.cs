using API.Hubs;
using Application.DTOs;
using Application.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace API.Services;

public class SignalRRealtimeNotifier(IHubContext<NfcScanHub> hub, ILogger<SignalRRealtimeNotifier> logger) : IRealtimeNotifier
{
    public async Task SpoolUpdatedAsync(SpoolResponse spool)
    {
        try { await hub.Clients.All.SendAsync("SpoolUpdated", spool); }
        catch (Exception ex) { logger.LogError(ex, "Failed to push SpoolUpdated via SignalR"); }
    }

    public async Task ScanResultAsync(NfcScanResult result)
    {
        try { await hub.Clients.All.SendAsync("ScanResult", result); }
        catch (Exception ex) { logger.LogError(ex, "Failed to push ScanResult via SignalR"); }
    }
}

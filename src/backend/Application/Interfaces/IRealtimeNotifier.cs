using Application.DTOs;

namespace Application.Interfaces;

public interface IRealtimeNotifier
{
    Task SpoolUpdatedAsync(SpoolResponse spool);
    Task ScanResultAsync(NfcScanResult result);
}

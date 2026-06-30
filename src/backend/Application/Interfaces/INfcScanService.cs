using Application.DTOs;

namespace Application.Interfaces;

public interface INfcScanService
{
    Task<NfcScanResult> ProcessScanAsync(string tagUid);
}

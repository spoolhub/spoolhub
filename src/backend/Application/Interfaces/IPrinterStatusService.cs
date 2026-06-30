using Application.DTOs;

namespace Application.Interfaces;

public interface IPrinterStatusService
{
    PrinterStatus? GetStatus(Guid printerId);
    void UpdateStatus(Guid printerId, PrinterStatus status);
    bool TryUpdateIp(Guid printerId, string newIp);
    void SaveAmsSnapshot(Guid printerId, AmsSnapshot snapshot);
    AmsSnapshot? GetAmsSnapshot(Guid printerId);
    void ClearAmsSnapshot(Guid printerId);
}

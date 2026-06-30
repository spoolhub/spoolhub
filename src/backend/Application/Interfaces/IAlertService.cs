using Domain.Models;

namespace Application.Interfaces;

public interface IAlertService
{
    Task CheckAndAlertAsync(Spool spool);
    Task<bool> SendTestAsync();
    Task NotifySpoolAddedAsync(string brand, string material, string colorName, string? colorHex);
    Task NotifySpoolAssignedAsync(string brand, string material, string colorName, string? colorHex, string printerName);
    Task NotifySpoolDeletedAsync(string brand, string material, string colorName, string? colorHex);
    Task NotifyPrinterDeletedAsync(string printerName);
}

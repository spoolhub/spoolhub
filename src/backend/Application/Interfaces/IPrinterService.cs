using Application.DTOs;

namespace Application.Interfaces;

public interface IPrinterService
{
    Task<IEnumerable<PrinterResponse>> GetAllAsync();
    Task<PrinterResponse?> GetByIdAsync(Guid id);
    Task<PrinterResponse> RegisterLanAsync(RegisterLanPrinterRequest request);
    Task<PrinterResponse?> UpdateAsync(Guid id, UpdatePrinterRequest request);
    Task<bool> DeleteAsync(Guid id);
    Task<PrinterResponse?> AssignTraySpoolAsync(Guid printerId, int slot, Guid? spoolId, string? displacedStockLocation = null);
    Task<PrinterResponse?> AssignExtraSpoolAsync(Guid printerId, Guid? spoolId, string? displacedStockLocation = null);
}

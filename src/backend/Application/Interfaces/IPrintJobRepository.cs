using Domain.Models;

namespace Application.Interfaces;

public interface IPrintJobRepository
{
    Task<IEnumerable<PrintJob>> GetBySpoolIdAsync(Guid spoolId);
    Task<IEnumerable<PrintJob>> GetByPrinterIdAsync(Guid printerId);
    Task<IEnumerable<PrintJob>> GetRecentAsync(int limit);
    Task<IEnumerable<PrintJob>> GetRunningAsync();
    Task<PrintJob?> GetRunningByPrinterIdAsync(Guid printerId);
    Task<PrintJob?> GetActiveByPrinterIdAsync(Guid printerId);
    Task<PrintJob?> GetByTaskIdAsync(string taskId);
    Task<PrintJob?> GetByIdAsync(Guid id);
    Task<(IEnumerable<PrintJob> Jobs, int Total)> GetPagedAsync(
        int page, int limit,
        string? status = null,
        Guid? printerId = null,
        Guid? spoolId = null,
        string? search = null,
        string? sortBy = null);
    Task<PrintJob> CreateAsync(PrintJob printJob);
    Task<PrintJob> UpdateAsync(PrintJob printJob);
    Task<double> GetUsageSinceAsync(DateTime since);
}

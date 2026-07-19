using Domain.Models;

namespace Application.Interfaces;

public interface ISpoolRepository
{
    Task<IEnumerable<Spool>> GetAllAsync();
    Task<Spool?> GetByIdAsync(Guid id);
    Task<IEnumerable<Spool>> GetByIdsAsync(IEnumerable<Guid> ids);
    Task<Spool?> GetByBambuTagUidAsync(string bambuTagUid);
    Task<Spool?> GetActiveAsync();
    Task<Spool> CreateAsync(Spool spool);
    Task<Spool> UpdateAsync(Spool spool);
    Task SetActiveAsync(Guid spoolId, bool isActive, bool clearStockLocation = false, string? stockLocation = null);
    Task ArchiveAsync(Guid id);
    Task DeleteAsync(Guid id);
    Task<(int Added, int Removed)> GetMonthlyStatsAsync();
}

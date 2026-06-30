using Domain.Models;

namespace Application.Interfaces;

public interface IPrinterRepository
{
    Task<IEnumerable<Printer>> GetAllAsync();
    Task<Printer?> GetByIdAsync(Guid id);
    Task<Printer?> GetBySpoolIdAsync(Guid spoolId);
    Task<IEnumerable<Printer>> GetActiveAsync();
    Task<Printer> CreateAsync(Printer printer);
    Task<Printer> UpdateAsync(Printer printer);
    Task DeleteAsync(Guid id);
}

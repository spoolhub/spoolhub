using Domain.Models;

namespace Application.Interfaces;

public interface ISpoolProfileRepository
{
    Task<IEnumerable<SpoolProfile>> GetAllAsync();
    Task<SpoolProfile?> GetByIdAsync(Guid id);
    Task<SpoolProfile> AddAsync(SpoolProfile profile);
    Task UpdateAsync(SpoolProfile profile);
    Task<bool> DeleteAsync(Guid id);
}

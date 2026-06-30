using Domain.Models;

namespace Application.Interfaces;

public interface ILocationRepository
{
    Task<IEnumerable<Location>> GetAllAsync();
    Task<Location?> GetByIdAsync(Guid id);
    Task<Location> AddAsync(Location location);
    Task<bool> DeleteAsync(Guid id);
}

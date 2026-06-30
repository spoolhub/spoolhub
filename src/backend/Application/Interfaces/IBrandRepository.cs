using Domain.Models;

namespace Application.Interfaces;

public interface IBrandRepository
{
    Task<IEnumerable<Brand>> GetAllAsync();
    Task<Brand?> GetByIdAsync(Guid id);
    Task<Brand?> GetBySlugAsync(string ofdSlug);
    Task<Brand> AddAsync(Brand brand);
    Task<bool> DeleteAsync(Guid id);
}

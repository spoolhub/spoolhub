using Application.DTOs;

namespace Application.Interfaces;

public interface IBrandService
{
    Task<IEnumerable<BrandResponse>> GetAllAsync();
    Task<BrandResponse?> AddAsync(AddBrandRequest request);
    Task<bool> DeleteAsync(Guid id);
    Task<IEnumerable<OfdBrandResult>> SearchOfdAsync(string query, CancellationToken ct = default);
}

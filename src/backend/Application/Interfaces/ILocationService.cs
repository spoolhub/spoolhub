using Application.DTOs;

namespace Application.Interfaces;

public interface ILocationService
{
    Task<IEnumerable<LocationResponse>> GetAllAsync();
    Task<LocationResponse> AddAsync(AddLocationRequest request);
    Task<bool> DeleteAsync(Guid id);
}

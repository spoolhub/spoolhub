using Application.DTOs;

namespace Application.Interfaces;

public interface ISpoolProfileService
{
    Task<IEnumerable<SpoolProfileResponse>> GetAllAsync();
    Task<SpoolProfileResponse?> GetByIdAsync(Guid id);
    Task<SpoolProfileResponse> AddAsync(AddSpoolProfileRequest request);
    Task<SpoolProfileResponse?> UpdateAsync(Guid id, AddSpoolProfileRequest request);
    Task<bool> DeleteAsync(Guid id);
}

using Application.DTOs;

namespace Application.Interfaces;

public interface ISpoolService
{
    Task<IEnumerable<SpoolResponse>> GetAllAsync();
    Task<SpoolResponse?> GetByIdAsync(Guid id);
    Task<SpoolResponse> AddAsync(AddSpoolRequest request);
    Task<SpoolResponse?> ActivateAsync(Guid id);
    Task<SpoolResponse?> DeactivateAsync(Guid id);
    Task<SpoolResponse?> UpdateAsync(Guid id, UpdateSpoolRequest request);
    Task<SpoolResponse?> AssignPrinterAsync(Guid id, Guid? printerId, int? amsSlot);
    Task<bool> DeleteAsync(Guid id);
    Task<(int Added, int Removed)> GetMonthlyStatsAsync();
}

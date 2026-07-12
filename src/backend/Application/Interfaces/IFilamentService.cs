using Application.DTOs;

namespace Application.Interfaces;

public interface IFilamentService
{
    Task<IEnumerable<FilamentProfileResponse>> GetAllAsync();
    Task RefreshAsync(CancellationToken ct = default);
    DateTime? GetCachedAt();
}

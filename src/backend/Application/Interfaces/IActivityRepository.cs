using Domain.Models;

namespace Application.Interfaces;

public interface IActivityRepository
{
    Task<(IEnumerable<Activity> Activities, int Total)> GetPagedAsync(
        int limit, int skip,
        string? eventType = null,
        string? action = null,
        string? timePeriod = null,
        string? sortBy = null);
    Task<Activity> CreateAsync(Activity activity);
    Task<bool> TryUpdateLatestDescriptionAsync(Guid resourceId, string eventType, string description);
    Task<int> DeleteAllAsync();
    Task<int> DeleteOlderThanAsync(int days);
}

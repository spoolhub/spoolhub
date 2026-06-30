namespace Application.Interfaces;

public interface IFilamentCacheRepository
{
    Task<(string? ProfilesJson, DateTime? CachedAt)> GetAsync();
    Task SaveAsync(string profilesJson);
}

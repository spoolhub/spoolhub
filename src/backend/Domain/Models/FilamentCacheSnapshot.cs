namespace Domain.Models;

public class FilamentCacheSnapshot
{
    public int Id { get; set; }
    public string ProfilesJson { get; set; } = "[]";
    public DateTime CachedAt { get; set; }
}

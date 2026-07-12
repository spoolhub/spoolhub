using Application.Interfaces;
using Domain.Models;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public class FilamentCacheRepository(FilamentDbContext db) : IFilamentCacheRepository
{
    public async Task<(string? ProfilesJson, DateTime? CachedAt)> GetAsync()
    {
        var snapshot = await db.FilamentCacheSnapshots.FirstOrDefaultAsync();
        return snapshot is null ? (null, null) : (snapshot.ProfilesJson, snapshot.CachedAt);
    }

    public async Task SaveAsync(string profilesJson)
    {
        var snapshot = await db.FilamentCacheSnapshots.FirstOrDefaultAsync();
        if (snapshot is null)
            db.FilamentCacheSnapshots.Add(new FilamentCacheSnapshot { ProfilesJson = profilesJson, CachedAt = DateTime.UtcNow });
        else
        {
            snapshot.ProfilesJson = profilesJson;
            snapshot.CachedAt = DateTime.UtcNow;
        }
        await db.SaveChangesAsync();
    }
}

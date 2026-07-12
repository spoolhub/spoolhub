using Application.Interfaces;
using Domain.Models;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public class SpoolProfileRepository(FilamentDbContext db) : ISpoolProfileRepository
{
    public async Task<IEnumerable<SpoolProfile>> GetAllAsync() =>
        await db.SpoolProfiles.OrderBy(p => p.Name).ToListAsync();

    public async Task<Dictionary<Guid, int>> GetSpoolCountsAsync()
    {
        var profiles = await db.SpoolProfiles.ToListAsync();
        var spools = await db.Spools.Select(s => new { s.Brand, s.Material, s.ColorName }).ToListAsync();
        return profiles.ToDictionary(
            p => p.Id,
            p => spools.Count(s =>
                string.Equals(s.Brand, p.Brand, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(s.Material, p.Material, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(s.ColorName, p.ColorName, StringComparison.OrdinalIgnoreCase)));
    }

    public async Task<SpoolProfile?> GetByIdAsync(Guid id) =>
        await db.SpoolProfiles.FindAsync(id);

    public async Task<SpoolProfile> AddAsync(SpoolProfile profile)
    {
        db.SpoolProfiles.Add(profile);
        await db.SaveChangesAsync();
        return profile;
    }

    public async Task UpdateAsync(SpoolProfile profile)
    {
        db.SpoolProfiles.Update(profile);
        await db.SaveChangesAsync();
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var profile = await db.SpoolProfiles.FindAsync(id);
        if (profile is null) return false;
        db.SpoolProfiles.Remove(profile);
        await db.SaveChangesAsync();
        return true;
    }
}

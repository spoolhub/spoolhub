using Application.Interfaces;
using Domain.Models;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public class LocationRepository(FilamentDbContext db) : ILocationRepository
{
    public async Task<IEnumerable<Location>> GetAllAsync() =>
        await db.Locations.OrderBy(l => l.Name).ToListAsync();

    public async Task<Location?> GetByIdAsync(Guid id) =>
        await db.Locations.FindAsync(id);

    public async Task<Location> AddAsync(Location location)
    {
        db.Locations.Add(location);
        await db.SaveChangesAsync();
        return location;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var location = await db.Locations.FindAsync(id);
        if (location is null) return false;
        db.Locations.Remove(location);
        await db.SaveChangesAsync();
        return true;
    }
}

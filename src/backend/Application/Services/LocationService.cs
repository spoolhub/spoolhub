using Application.DTOs;
using Application.Interfaces;
using Domain.Models;

namespace Application.Services;

public class LocationService(ILocationRepository repo, ISpoolRepository spoolRepository) : ILocationService
{
    public async Task<IEnumerable<LocationResponse>> GetAllAsync()
    {
        var locations = await repo.GetAllAsync();
        return locations.Select(ToResponse);
    }

    public async Task<LocationResponse> AddAsync(AddLocationRequest request)
    {
        var type = request.Type == "drybox" ? "drybox" : "shelf";
        var location = new Location
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Type = type,
            Capacity = request.Capacity ?? 12,
            Humidity = type == "drybox" ? request.Humidity ?? 30 : null,
            CreatedAt = DateTime.UtcNow
        };
        var created = await repo.AddAsync(location);
        return ToResponse(created);
    }

    public async Task<LocationResponse?> UpdateAsync(Guid id, UpdateLocationRequest request)
    {
        var location = await repo.GetByIdAsync(id);
        if (location is null) return null;

        var oldName = location.Name;
        if (!string.IsNullOrWhiteSpace(request.Name)) location.Name = request.Name;
        if (request.Type is not null) location.Type = request.Type == "drybox" ? "drybox" : "shelf";
        if (request.Capacity is not null) location.Capacity = request.Capacity.Value;
        location.Humidity = location.Type == "drybox" ? request.Humidity ?? location.Humidity ?? 30 : null;

        var updated = await repo.UpdateAsync(location);

        if (updated.Name != oldName)
        {
            var spools = await spoolRepository.GetAllAsync();
            foreach (var spool in spools.Where(s => s.StockLocation == oldName))
            {
                spool.StockLocation = updated.Name;
                await spoolRepository.UpdateAsync(spool);
            }
        }

        return ToResponse(updated);
    }

    public async Task<bool?> DeleteAsync(Guid id)
    {
        var location = await repo.GetByIdAsync(id);
        if (location is null) return null;

        var spools = await spoolRepository.GetAllAsync();
        if (spools.Any(s => s.StockLocation == location.Name)) return false;

        return await repo.DeleteAsync(id);
    }

    private static LocationResponse ToResponse(Location l) =>
        new(l.Id, l.Name, l.Type, l.Capacity, l.Humidity, l.CreatedAt);
}

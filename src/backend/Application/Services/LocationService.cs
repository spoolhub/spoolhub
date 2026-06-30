using Application.DTOs;
using Application.Interfaces;
using Domain.Models;

namespace Application.Services;

public class LocationService(ILocationRepository repo) : ILocationService
{
    public async Task<IEnumerable<LocationResponse>> GetAllAsync()
    {
        var locations = await repo.GetAllAsync();
        return locations.Select(l => new LocationResponse(l.Id, l.Name, l.CreatedAt));
    }

    public async Task<LocationResponse> AddAsync(AddLocationRequest request)
    {
        var location = new Location { Id = Guid.NewGuid(), Name = request.Name, CreatedAt = DateTime.UtcNow };
        var created = await repo.AddAsync(location);
        return new LocationResponse(created.Id, created.Name, created.CreatedAt);
    }

    public Task<bool> DeleteAsync(Guid id) => repo.DeleteAsync(id);
}

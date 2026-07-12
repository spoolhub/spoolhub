using Application.DTOs;
using Application.Interfaces;
using Application.Services;
using Domain.Models;
using NSubstitute;

namespace Test;

public class LocationServiceTests
{
    private readonly ILocationRepository _repo = Substitute.For<ILocationRepository>();
    private readonly ISpoolRepository _spoolRepo = Substitute.For<ISpoolRepository>();
    private readonly LocationService _sut;

    public LocationServiceTests()
    {
        _sut = new LocationService(_repo, _spoolRepo);
    }

    [Fact]
    public async Task AddAsync_DefaultsToShelfWithGivenCapacity()
    {
        _repo.AddAsync(Arg.Any<Location>()).Returns(ci => ci.Arg<Location>());

        var result = await _sut.AddAsync(new AddLocationRequest("Shelf A1", null, null, null));

        Assert.Equal("shelf", result.Type);
        Assert.Equal(12, result.Capacity);
        Assert.Null(result.Humidity);
    }

    [Fact]
    public async Task AddAsync_DryboxDefaultsHumidityWhenNotProvided()
    {
        _repo.AddAsync(Arg.Any<Location>()).Returns(ci => ci.Arg<Location>());

        var result = await _sut.AddAsync(new AddLocationRequest("Drybox 1", "drybox", 6, null));

        Assert.Equal("drybox", result.Type);
        Assert.Equal(6, result.Capacity);
        Assert.Equal(30, result.Humidity);
    }

    [Fact]
    public async Task UpdateAsync_RenamingCascadesToSpoolsStockLocation()
    {
        var location = new Location { Id = Guid.NewGuid(), Name = "Shelf A1", Type = "shelf", Capacity = 12 };
        _repo.GetByIdAsync(location.Id).Returns(location);
        _repo.UpdateAsync(Arg.Any<Location>()).Returns(ci => ci.Arg<Location>());

        var spool = new Spool { Id = Guid.NewGuid(), StockLocation = "Shelf A1" };
        _spoolRepo.GetAllAsync().Returns(new List<Spool> { spool });

        var result = await _sut.UpdateAsync(location.Id, new UpdateLocationRequest("Shelf A2", null, null, null));

        Assert.NotNull(result);
        Assert.Equal("Shelf A2", result!.Name);
        await _spoolRepo.Received(1).UpdateAsync(Arg.Is<Spool>(s => s.StockLocation == "Shelf A2"));
    }

    [Fact]
    public async Task UpdateAsync_WhenLocationMissing_ReturnsNull()
    {
        _repo.GetByIdAsync(Arg.Any<Guid>()).Returns((Location?)null);

        var result = await _sut.UpdateAsync(Guid.NewGuid(), new UpdateLocationRequest("X", null, null, null));

        Assert.Null(result);
    }

    [Fact]
    public async Task DeleteAsync_WhenLocationHasSpools_ReturnsFalseWithoutDeleting()
    {
        var location = new Location { Id = Guid.NewGuid(), Name = "Shelf A1" };
        _repo.GetByIdAsync(location.Id).Returns(location);
        _spoolRepo.GetAllAsync().Returns(new List<Spool> { new() { Id = Guid.NewGuid(), StockLocation = "Shelf A1" } });

        var result = await _sut.DeleteAsync(location.Id);

        Assert.False(result);
        await _repo.DidNotReceive().DeleteAsync(Arg.Any<Guid>());
    }

    [Fact]
    public async Task DeleteAsync_WhenLocationEmpty_Deletes()
    {
        var location = new Location { Id = Guid.NewGuid(), Name = "Shelf A1" };
        _repo.GetByIdAsync(location.Id).Returns(location);
        _spoolRepo.GetAllAsync().Returns(new List<Spool>());
        _repo.DeleteAsync(location.Id).Returns(true);

        var result = await _sut.DeleteAsync(location.Id);

        Assert.True(result);
    }

    [Fact]
    public async Task DeleteAsync_WhenLocationMissing_ReturnsNull()
    {
        _repo.GetByIdAsync(Arg.Any<Guid>()).Returns((Location?)null);

        var result = await _sut.DeleteAsync(Guid.NewGuid());

        Assert.Null(result);
    }
}

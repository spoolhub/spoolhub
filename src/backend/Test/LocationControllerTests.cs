using API.Controllers;
using Application.DTOs;
using Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;

namespace Test;

public class LocationControllerTests
{
    private readonly ILocationService _service = Substitute.For<ILocationService>();
    private readonly LocationController _sut;

    public LocationControllerTests()
    {
        _sut = new LocationController(_service);
    }

    private static LocationResponse BuildResponse() =>
        new(Guid.NewGuid(), "Shelf A1", "shelf", 12, null, DateTime.UtcNow);

    [Fact]
    public async Task GetAll_ReturnsOkWithLocations()
    {
        _service.GetAllAsync().Returns([BuildResponse(), BuildResponse()]);

        var result = await _sut.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.IsAssignableFrom<IEnumerable<LocationResponse>>(ok.Value);
    }

    [Fact]
    public async Task Add_ReturnsCreated()
    {
        var request = new AddLocationRequest("Shelf A1", "shelf", 12, null);
        var response = BuildResponse();
        _service.AddAsync(request).Returns(response);

        var result = await _sut.Add(request);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(response, created.Value);
    }

    [Fact]
    public async Task Update_WhenFound_ReturnsOk()
    {
        var id = Guid.NewGuid();
        var request = new UpdateLocationRequest("Shelf A2", null, null, null);
        var response = BuildResponse();
        _service.UpdateAsync(id, request).Returns(response);

        var result = await _sut.Update(id, request);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(response, ok.Value);
    }

    [Fact]
    public async Task Update_WhenMissing_ReturnsNotFound()
    {
        var id = Guid.NewGuid();
        _service.UpdateAsync(id, Arg.Any<UpdateLocationRequest>()).Returns((LocationResponse?)null);

        var result = await _sut.Update(id, new UpdateLocationRequest(null, null, null, null));

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task Delete_WhenDeleted_ReturnsNoContent()
    {
        var id = Guid.NewGuid();
        _service.DeleteAsync(id).Returns(true);

        var result = await _sut.Delete(id);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_WhenLocationHasSpools_ReturnsConflict()
    {
        var id = Guid.NewGuid();
        _service.DeleteAsync(id).Returns(false);

        var result = await _sut.Delete(id);

        Assert.IsType<ConflictObjectResult>(result);
    }

    [Fact]
    public async Task Delete_WhenMissing_ReturnsNotFound()
    {
        var id = Guid.NewGuid();
        _service.DeleteAsync(id).Returns((bool?)null);

        var result = await _sut.Delete(id);

        Assert.IsType<NotFoundResult>(result);
    }
}

using API.Controllers;
using Application.DTOs;
using Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;

namespace Test;

public class BrandControllerTests
{
    private readonly IBrandService _service = Substitute.For<IBrandService>();
    private readonly BrandController _sut;

    public BrandControllerTests()
    {
        _sut = new BrandController(_service);
    }

    [Fact]
    public async Task GetAll_ReturnsOkWithBrands()
    {
        _service.GetAllAsync().Returns([BuildResponse(), BuildResponse()]);

        var result = await _sut.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.IsAssignableFrom<IEnumerable<BrandResponse>>(ok.Value);
    }

    [Fact]
    public async Task Add_ReturnsCreated()
    {
        var request = new AddBrandRequest("Bambu Lab", "bambulab.com", "bambu_lab");
        var response = BuildResponse();
        _service.AddAsync(request).Returns(response);

        var result = await _sut.Add(request);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(201, created.StatusCode);
        Assert.Equal(response, created.Value);
    }

    [Fact]
    public async Task Add_WhenDuplicate_ReturnsConflict()
    {
        var request = new AddBrandRequest("Bambu Lab", "bambulab.com", "bambu_lab");
        _service.AddAsync(request).Returns((BrandResponse?)null);

        var result = await _sut.Add(request);

        Assert.IsType<ConflictObjectResult>(result);
    }

    [Fact]
    public async Task Delete_WhenFound_ReturnsNoContent()
    {
        var id = Guid.NewGuid();
        _service.DeleteAsync(id).Returns(true);

        var result = await _sut.Delete(id);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task Delete_WhenNotFound_ReturnsNotFound()
    {
        _service.DeleteAsync(Arg.Any<Guid>()).Returns(false);

        var result = await _sut.Delete(Guid.NewGuid());

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task SearchOfd_ReturnsOkWithResults()
    {
        _service.SearchOfdAsync("bambu", Arg.Any<CancellationToken>())
            .Returns([new OfdBrandResult("Bambu Lab", "bambu_lab", 5)]);

        var result = await _sut.SearchOfd("bambu", CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.IsAssignableFrom<IEnumerable<OfdBrandResult>>(ok.Value);
    }

    private static BrandResponse BuildResponse() =>
        new(Guid.NewGuid(), "Bambu Lab", "bambulab.com", "bambu_lab", DateTime.UtcNow);
}

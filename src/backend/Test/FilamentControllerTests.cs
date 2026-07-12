using API.Controllers;
using Application.DTOs;
using Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;

namespace Test;

public class FilamentControllerTests
{
    private readonly IFilamentService _service = Substitute.For<IFilamentService>();
    private readonly IFilamentRefreshQueue _refreshQueue = Substitute.For<IFilamentRefreshQueue>();
    private readonly FilamentController _sut;

    public FilamentControllerTests() => _sut = new FilamentController(_service, _refreshQueue);

    [Fact]
    public async Task GetAllFilaments_ReturnsOkWithFilaments()
    {
        _service.GetAllAsync().Returns([BuildProfile(), BuildProfile()]);

        var result = await _sut.GetAllFilaments();

        var ok = Assert.IsType<OkObjectResult>(result);
        var items = Assert.IsAssignableFrom<IEnumerable<FilamentProfileResponse>>(ok.Value);
        Assert.Equal(2, items.Count());
    }

    [Fact]
    public async Task GetAllFilaments_WhenEmpty_ReturnsOkWithEmptyCollection()
    {
        _service.GetAllAsync().Returns([]);

        var result = await _sut.GetAllFilaments();

        var ok = Assert.IsType<OkObjectResult>(result);
        var items = Assert.IsAssignableFrom<IEnumerable<FilamentProfileResponse>>(ok.Value);
        Assert.Empty(items);
    }

    [Fact]
    public void Refresh_ReturnsAccepted()
    {
        var result = _sut.Refresh();

        Assert.IsType<AcceptedResult>(result);
    }

    [Fact]
    public void Refresh_EnqueuesRefresh()
    {
        _sut.Refresh();

        _refreshQueue.Received(1).TriggerRefresh();
    }

    private static FilamentProfileResponse BuildProfile() => new(
        "Bambu Lab", "Basic PLA", "PLA",
        1.24f, 190, 220, 35, 45,
        "#FFFFFF", "Jade White", null,
        0.02f, false, null, null);
}

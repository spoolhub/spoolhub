using API.Controllers;
using Application.Interfaces;
using Domain.Models;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;

namespace Test;

public class ActivityControllerTests
{
    private readonly IActivityRepository _repo = Substitute.For<IActivityRepository>();
    private readonly ActivityController _sut;

    public ActivityControllerTests() => _sut = new ActivityController(_repo);

    [Fact]
    public async Task GetActivities_ReturnsOk()
    {
        Setup();

        var result = await _sut.GetActivities();

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task GetActivities_DefaultLimit_Is20()
    {
        Setup();

        await _sut.GetActivities();

        await _repo.Received(1).GetPagedAsync(20, 0, null, null, null, null);
    }

    [Fact]
    public async Task GetActivities_Page2_ComputesCorrectSkip()
    {
        Setup();

        await _sut.GetActivities(limit: 20, page: 2);

        await _repo.Received(1).GetPagedAsync(20, 20, null, null, null, null);
    }

    [Fact]
    public async Task GetActivities_ReturnsCorrectTotal()
    {
        _repo.GetPagedAsync(Arg.Any<int>(), Arg.Any<int>(), Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<string?>())
             .Returns((new[] { BuildActivity(), BuildActivity() }.AsEnumerable(), 7));

        var result = await _sut.GetActivities();

        var ok    = Assert.IsType<OkObjectResult>(result);
        var total = (int)ok.Value!.GetType().GetProperty("total")!.GetValue(ok.Value)!;
        Assert.Equal(7, total);
    }

    [Fact]
    public async Task GetActivities_ReturnsTotalPages()
    {
        _repo.GetPagedAsync(Arg.Any<int>(), Arg.Any<int>(), Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<string?>())
             .Returns((Enumerable.Empty<Activity>(), 45));

        var result = await _sut.GetActivities(limit: 20);

        var ok         = Assert.IsType<OkObjectResult>(result);
        var totalPages = (int)ok.Value!.GetType().GetProperty("totalPages")!.GetValue(ok.Value)!;
        Assert.Equal(3, totalPages);
    }

    [Fact]
    public async Task GetActivities_PassesEventTypeFilter()
    {
        Setup();

        await _sut.GetActivities(eventType: "spool");

        await _repo.Received(1).GetPagedAsync(Arg.Any<int>(), Arg.Any<int>(), "spool", null, null, null);
    }

    [Fact]
    public async Task GetActivities_PassesActionFilter()
    {
        Setup();

        await _sut.GetActivities(action: "Deleted");

        await _repo.Received(1).GetPagedAsync(Arg.Any<int>(), Arg.Any<int>(), null, "Deleted", null, null);
    }

    [Fact]
    public async Task GetActivities_PassesSortBy()
    {
        Setup();

        await _sut.GetActivities(sortBy: "oldest");

        await _repo.Received(1).GetPagedAsync(Arg.Any<int>(), Arg.Any<int>(), null, null, null, "oldest");
    }

    private void Setup(int total = 0) =>
        _repo.GetPagedAsync(Arg.Any<int>(), Arg.Any<int>(), Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<string?>(), Arg.Any<string?>())
             .Returns((Enumerable.Empty<Activity>(), total));

    private static Activity BuildActivity() => new()
    {
        Id           = Guid.NewGuid(),
        EventType    = "SpoolCreated",
        Action       = "Created",
        ResourceType = "Spool",
        ResourceName = "Black PLA",
        Description  = "Spool created",
        Icon         = "ti-plus",
        CreatedAt    = DateTime.UtcNow,
    };
}

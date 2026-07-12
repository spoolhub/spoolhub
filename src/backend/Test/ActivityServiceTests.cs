using Application.Interfaces;
using Application.Services;
using Domain.Models;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;

namespace Test;

public class ActivityServiceTests
{
    private readonly IActivityRepository _repo = Substitute.For<IActivityRepository>();
    private readonly ActivityService _sut;

    public ActivityServiceTests() =>
        _sut = new ActivityService(_repo, NullLogger<ActivityService>.Instance);

    [Fact]
    public async Task LogAsync_CallsRepositoryCreate()
    {
        _repo.CreateAsync(Arg.Any<Activity>()).Returns(new Activity());

        await _sut.LogAsync("SpoolCreated", "Created", "Spool", "Black PLA", null, "desc", "ti-plus");

        await _repo.Received(1).CreateAsync(Arg.Any<Activity>());
    }

    [Fact]
    public async Task LogAsync_SetsCorrectFields()
    {
        Activity? captured = null;
        _repo.CreateAsync(Arg.Do<Activity>(a => captured = a)).Returns(new Activity());

        var resourceId = Guid.NewGuid();
        await _sut.LogAsync("SpoolCreated", "Created", "Spool", "Black PLA", resourceId, "some desc", "ti-plus");

        Assert.NotNull(captured);
        Assert.Equal("SpoolCreated", captured.EventType);
        Assert.Equal("Created",      captured.Action);
        Assert.Equal("Spool",        captured.ResourceType);
        Assert.Equal("Black PLA",    captured.ResourceName);
        Assert.Equal(resourceId,     captured.ResourceId);
        Assert.Equal("some desc",    captured.Description);
        Assert.Equal("ti-plus",      captured.Icon);
        Assert.NotEqual(Guid.Empty,  captured.Id);
    }

    [Fact]
    public async Task LogAsync_WhenRepositoryThrows_DoesNotThrow()
    {
        _repo.CreateAsync(Arg.Any<Activity>()).ThrowsAsync(new Exception("DB down"));

        var ex = await Record.ExceptionAsync(() =>
            _sut.LogAsync("SpoolCreated", "Created", "Spool", "Name", null, "desc", "icon"));

        Assert.Null(ex);
    }

    [Fact]
    public async Task LogAsync_WhenRepositoryThrows_DoesNotCallCreateAgain()
    {
        _repo.CreateAsync(Arg.Any<Activity>()).ThrowsAsync(new InvalidOperationException());

        await _sut.LogAsync("SpoolCreated", "Created", "Spool", "Name", null, "desc", "icon");

        await _repo.Received(1).CreateAsync(Arg.Any<Activity>());
    }
}

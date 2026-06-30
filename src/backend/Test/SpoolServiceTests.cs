using Application.DTOs;
using Application.Interfaces;
using Application.Services;
using Domain.Models;
using NSubstitute;

namespace Test;

public class SpoolServiceTests
{
    private readonly ISpoolRepository _repo = Substitute.For<ISpoolRepository>();
    private readonly IActivityService _activity = Substitute.For<IActivityService>();
    private readonly INfcTagService _nfc = Substitute.For<INfcTagService>();
    private readonly IRealtimeNotifier _notifier = Substitute.For<IRealtimeNotifier>();
    private readonly IPrintJobRepository _printJobRepo = Substitute.For<IPrintJobRepository>();
    private readonly IPrinterRepository _printerRepo = Substitute.For<IPrinterRepository>();
    private readonly SpoolService _sut;

    public SpoolServiceTests()
    {
        _printerRepo.GetAllAsync().Returns([]);
        _printerRepo.GetBySpoolIdAsync(Arg.Any<Guid>()).Returns((Domain.Models.Printer?)null);
        _sut = new SpoolService(_repo, _activity, _nfc, _notifier, _printJobRepo, _printerRepo);
    }

    [Fact]
    public async Task GetAllAsync_ReturnsAllSpools()
    {
        _repo.GetAllAsync().Returns([BuildSpool(), BuildSpool()]);

        var result = await _sut.GetAllAsync();

        Assert.Equal(2, result.Count());
    }

    [Fact]
    public async Task GetByIdAsync_WhenFound_ReturnsResponse()
    {
        var spool = BuildSpool();
        _repo.GetByIdAsync(spool.Id).Returns(spool);

        var result = await _sut.GetByIdAsync(spool.Id);

        Assert.NotNull(result);
        Assert.Equal(spool.Id, result.Id);
    }

    [Fact]
    public async Task GetByIdAsync_WhenNotFound_ReturnsNull()
    {
        _repo.GetByIdAsync(Arg.Any<Guid>()).Returns((Spool?)null);

        var result = await _sut.GetByIdAsync(Guid.NewGuid());

        Assert.Null(result);
    }

    [Fact]
    public async Task AddAsync_WhenCurrentWeightMatchesInitial_SetsBothCorrectly()
    {
        var request = new AddSpoolRequest("Bambu", "PLA", "White", "#FFFFFF", 1000, 1000);
        _repo.CreateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());

        var result = await _sut.AddAsync(request);

        Assert.Equal(1000, result.InitialWeightG);
        Assert.Equal(1000, result.CurrentWeightG);
    }

    [Fact]
    public async Task AddAsync_WhenCurrentWeightDiffersFromInitial_UsesExplicitCurrentWeight()
    {
        var request = new AddSpoolRequest("Bambu", "PLA", "White", "#FFFFFF", 1000, 750);
        _repo.CreateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());

        var result = await _sut.AddAsync(request);

        Assert.Equal(1000, result.InitialWeightG);
        Assert.Equal(750, result.CurrentWeightG);
    }

    [Fact]
    public async Task AddAsync_WhenCurrentWeightIsZero_SetsCurrentWeightToZero()
    {
        var request = new AddSpoolRequest("Bambu", "PLA", "White", "#FFFFFF", 1000, 0);
        _repo.CreateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());

        var result = await _sut.AddAsync(request);

        Assert.Equal(1000, result.InitialWeightG);
        Assert.Equal(0, result.CurrentWeightG);
    }

    [Fact]
    public async Task AddAsync_WhenIsActiveTrue_SetsIsActiveOnSpool()
    {
        var request = new AddSpoolRequest("Bambu", "PLA", "White", "#FFFFFF", 1000, 1000, IsActive: true);
        _repo.CreateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());

        var result = await _sut.AddAsync(request);

        Assert.True(result.IsActive);
    }

    [Fact]
    public async Task AddAsync_WhenIsActiveFalse_SetsIsActiveFalse()
    {
        var request = new AddSpoolRequest("Bambu", "PLA", "White", "#FFFFFF", 1000, 1000, IsActive: false);
        _repo.CreateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());

        var result = await _sut.AddAsync(request);

        Assert.False(result.IsActive);
    }

    [Fact]
    public async Task ActivateAsync_WhenFound_SetsIsActiveTrue()
    {
        var spool = BuildSpool();
        _repo.GetByIdAsync(spool.Id).Returns(spool);
        _repo.GetActiveAsync().Returns((Spool?)null);
        _repo.UpdateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());

        var result = await _sut.ActivateAsync(spool.Id);

        Assert.NotNull(result);
        Assert.True(result.IsActive);
    }

    [Fact]
    public async Task ActivateAsync_DoesNotDeactivateOtherActiveSpools()
    {
        var previous = BuildSpool(isActive: true);
        var target = BuildSpool();
        _repo.GetByIdAsync(target.Id).Returns(target);
        _repo.GetActiveAsync().Returns(previous);
        _repo.UpdateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());

        await _sut.ActivateAsync(target.Id);

        Assert.True(previous.IsActive);
    }

    [Fact]
    public async Task ActivateAsync_WhenNotFound_ReturnsNull()
    {
        _repo.GetByIdAsync(Arg.Any<Guid>()).Returns((Spool?)null);

        var result = await _sut.ActivateAsync(Guid.NewGuid());

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateAsync_WhenFound_AppliesChangedFields()
    {
        var spool = BuildSpool();
        _repo.GetByIdAsync(spool.Id).Returns(spool);
        _repo.UpdateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());

        var result = await _sut.UpdateAsync(spool.Id, new UpdateSpoolRequest(
            Brand: "Prusa", Material: null, ColorName: "Red", ColorHex: "#FF0000",
            CurrentWeightG: null, SpoolWeightG: null,
            LowStockThresholdG: null, Notes: "updated", IsActive: null));

        Assert.NotNull(result);
        Assert.Equal("Prusa", result.Brand);
        Assert.Equal("PLA", result.Material);
        Assert.Equal("Red", result.ColorName);
        Assert.Equal("updated", result.Notes);
    }

    [Fact]
    public async Task UpdateAsync_WhenNotFound_ReturnsNull()
    {
        _repo.GetByIdAsync(Arg.Any<Guid>()).Returns((Spool?)null);

        var result = await _sut.UpdateAsync(Guid.NewGuid(), new UpdateSpoolRequest(
            null, null, null, null, null, null, null, null, null, null));

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateAsync_WhenIsActiveChanges_SetsLastScannedAt()
    {
        var spool = BuildSpool(isActive: false);
        _repo.GetByIdAsync(spool.Id).Returns(spool);
        _repo.UpdateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());

        var result = await _sut.UpdateAsync(spool.Id, new UpdateSpoolRequest(
            null, null, null, null, null, null, null, null, IsActive: true));

        Assert.NotNull(result);
        Assert.True(result.IsActive);
        Assert.NotNull(result.LastScannedAt);
    }

    [Fact]
    public async Task UpdateAsync_WhenIsActiveUnchanged_DoesNotUpdateLastScannedAt()
    {
        var spool = BuildSpool(isActive: true);
        _repo.GetByIdAsync(spool.Id).Returns(spool);
        _repo.UpdateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());

        var result = await _sut.UpdateAsync(spool.Id, new UpdateSpoolRequest(
            null, null, null, null, null, null, null, null, IsActive: true));

        Assert.NotNull(result);
        Assert.Null(result.LastScannedAt);
    }

    [Fact]
    public async Task DeactivateAsync_WhenFound_SetsIsActiveFalse()
    {
        var spool = BuildSpool(isActive: true);
        _repo.GetByIdAsync(spool.Id).Returns(spool);
        _repo.UpdateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());

        var result = await _sut.DeactivateAsync(spool.Id);

        Assert.NotNull(result);
        Assert.False(result.IsActive);
        Assert.NotNull(result.LastScannedAt);
    }

    [Fact]
    public async Task DeactivateAsync_WhenNotFound_ReturnsNull()
    {
        _repo.GetByIdAsync(Arg.Any<Guid>()).Returns((Spool?)null);

        var result = await _sut.DeactivateAsync(Guid.NewGuid());

        Assert.Null(result);
        await _repo.DidNotReceive().UpdateAsync(Arg.Any<Spool>());
    }

    [Fact]
    public async Task DeleteAsync_WhenFound_ReturnsTrue()
    {
        var spool = BuildSpool();
        _repo.GetByIdAsync(spool.Id).Returns(spool);

        var result = await _sut.DeleteAsync(spool.Id);

        Assert.True(result);
        await _repo.Received(1).DeleteAsync(spool.Id);
    }

    [Fact]
    public async Task DeleteAsync_WhenNotFound_ReturnsFalse()
    {
        _repo.GetByIdAsync(Arg.Any<Guid>()).Returns((Spool?)null);

        var result = await _sut.DeleteAsync(Guid.NewGuid());

        Assert.False(result);
        await _repo.DidNotReceive().DeleteAsync(Arg.Any<Guid>());
    }

    private static Spool BuildSpool(bool isActive = false, float weight = 1000) => new()
    {
        Id = Guid.NewGuid(),
        Brand = "Bambu",
        Material = "PLA",
        ColorName = "White",
        ColorHex = "#FFFFFF",
        InitialWeightG = weight,
        CurrentWeightG = weight,
        SpoolWeightG = 200,
        LowStockThresholdG = 100,
        IsActive = isActive,
        CreatedAt = DateTime.UtcNow
    };
}

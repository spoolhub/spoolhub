using Application.DTOs;
using Application.Interfaces;
using Domain.Models;
using Infrastructure.Services.Printer;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace Test;

public class PrinterServiceTests
{
    private readonly IPrinterRepository _repo = Substitute.For<IPrinterRepository>();
    private readonly ISpoolRepository _spoolRepo = Substitute.For<ISpoolRepository>();
    private readonly IActivityService _activity = Substitute.For<IActivityService>();
    private readonly IPrinterRealtimeNotifier _printerNotifier = Substitute.For<IPrinterRealtimeNotifier>();
    private readonly PrinterService _sut;

    public PrinterServiceTests()
    {
        _spoolRepo.GetByIdsAsync(Arg.Any<IEnumerable<Guid>>()).Returns([]);
        _sut = new PrinterService(_repo, _spoolRepo, _activity, _printerNotifier, NullLogger<PrinterService>.Instance);
    }

    [Fact]
    public async Task GetAllAsync_ReturnsAllPrinters()
    {
        _repo.GetAllAsync().Returns([BuildPrinter(), BuildPrinter()]);

        var result = await _sut.GetAllAsync();

        Assert.Equal(2, result.Count());
    }

    [Fact]
    public async Task GetByIdAsync_WhenFound_ReturnsPrinterResponse()
    {
        var printer = BuildPrinter();
        _repo.GetByIdAsync(printer.Id).Returns(printer);

        var result = await _sut.GetByIdAsync(printer.Id);

        Assert.NotNull(result);
        Assert.Equal(printer.Id, result.Id);
    }

    [Fact]
    public async Task GetByIdAsync_WhenNotFound_ReturnsNull()
    {
        _repo.GetByIdAsync(Arg.Any<Guid>()).Returns((Printer?)null);

        var result = await _sut.GetByIdAsync(Guid.NewGuid());

        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateAsync_WhenFound_AppliesChangedFields()
    {
        var printer = BuildPrinter();
        _repo.GetByIdAsync(printer.Id).Returns(printer);
        _repo.UpdateAsync(Arg.Any<Printer>()).Returns(x => x.Arg<Printer>());

        var result = await _sut.UpdateAsync(printer.Id, new UpdatePrinterRequest(
            Name: "Updated", Brand: null, Model: null, SerialNumber: null,
            IpAddress: "10.0.0.5", Port: null, Protocol: null, HasAms: null));

        Assert.NotNull(result);
        Assert.Equal("Updated", result.Name);
        Assert.Equal("10.0.0.5", result.IpAddress);
    }

    [Fact]
    public async Task UpdateAsync_WhenNotFound_ReturnsNull()
    {
        _repo.GetByIdAsync(Arg.Any<Guid>()).Returns((Printer?)null);

        var result = await _sut.UpdateAsync(Guid.NewGuid(),
            new UpdatePrinterRequest(null, null, null, null, null, null, null, null));

        Assert.Null(result);
    }

    [Fact]
    public async Task DeleteAsync_WhenFound_ReturnsTrue()
    {
        var printer = BuildPrinter();
        _repo.GetByIdAsync(printer.Id).Returns(printer);

        var result = await _sut.DeleteAsync(printer.Id);

        Assert.True(result);
        await _repo.Received(1).DeleteAsync(printer.Id);
    }

    [Fact]
    public async Task DeleteAsync_WhenNotFound_ReturnsFalse()
    {
        _repo.GetByIdAsync(Arg.Any<Guid>()).Returns((Printer?)null);

        var result = await _sut.DeleteAsync(Guid.NewGuid());

        Assert.False(result);
        await _repo.DidNotReceive().DeleteAsync(Arg.Any<Guid>());
    }

    private static Printer BuildPrinter() => new()
    {
        Id = Guid.NewGuid(),
        Name = "Test Printer",
        Brand = "Bambu Lab",
        Model = "X1 Carbon",
        SerialNumber = "ABC123",
        IpAddress = "192.168.1.100",
        Protocol = "mqtt_lan",
        HasAms = false,
        CreatedAt = DateTime.UtcNow
    };
}

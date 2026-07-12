using API.Controllers;
using Application.DTOs;
using Application.Interfaces;
using Domain.Models;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;

namespace Test;

public class PrinterControllerTests
{
    private readonly IPrinterService _service = Substitute.For<IPrinterService>();
    private readonly IPrinterStatusService _statusService = Substitute.For<IPrinterStatusService>();
    private readonly IPrintJobRepository _printJobRepo = Substitute.For<IPrintJobRepository>();
    private readonly ICloudPrinterRegistrationService _cloudService = Substitute.For<ICloudPrinterRegistrationService>();
    private readonly IAlertService _alertService = Substitute.For<IAlertService>();
    private readonly PrinterController _sut;

    public PrinterControllerTests() => _sut = new PrinterController(_service, _statusService, _printJobRepo, _cloudService, _alertService);

    [Fact]
    public async Task GetAllPrinters_ReturnsOkWithPrinters()
    {
        _service.GetAllAsync().Returns([BuildResponse(), BuildResponse()]);

        var result = await _sut.GetAllPrinters();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.IsAssignableFrom<IEnumerable<PrinterResponse>>(ok.Value);
    }

    [Fact]
    public async Task GetPrinterById_WhenFound_ReturnsOk()
    {
        var response = BuildResponse();
        _service.GetByIdAsync(response.Id).Returns(response);

        var result = await _sut.GetPrinterById(response.Id);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(response, ok.Value);
    }

    [Fact]
    public async Task GetPrinterById_WhenNotFound_ReturnsNotFound()
    {
        _service.GetByIdAsync(Arg.Any<Guid>()).Returns((PrinterResponse?)null);

        var result = await _sut.GetPrinterById(Guid.NewGuid());

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task UpdatePrinter_WhenFound_ReturnsOk()
    {
        var id = Guid.NewGuid();
        var request = new UpdatePrinterRequest("New Name", null, null, null, null, null, null, null);
        var response = BuildResponse();
        _service.UpdateAsync(id, request).Returns(response);

        var result = await _sut.UpdatePrinter(id, request);

        Assert.IsType<OkObjectResult>(result);
    }

    [Fact]
    public async Task UpdatePrinter_WhenNotFound_ReturnsNotFound()
    {
        _service.UpdateAsync(Arg.Any<Guid>(), Arg.Any<UpdatePrinterRequest>())
            .Returns((PrinterResponse?)null);

        var result = await _sut.UpdatePrinter(Guid.NewGuid(),
            new UpdatePrinterRequest(null, null, null, null, null, null, null, null));

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task DeletePrinter_WhenFound_ReturnsNoContent()
    {
        _service.DeleteAsync(Arg.Any<Guid>()).Returns(true);

        var result = await _sut.DeletePrinter(Guid.NewGuid());

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task DeletePrinter_WhenNotFound_ReturnsNotFound()
    {
        _service.DeleteAsync(Arg.Any<Guid>()).Returns(false);

        var result = await _sut.DeletePrinter(Guid.NewGuid());

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task GetStatus_WhenNoStatusAndNoActiveJob_ReturnsNoContent()
    {
        var id = Guid.NewGuid();
        _statusService.GetStatus(id).Returns((PrinterStatus?)null);
        _printJobRepo.GetActiveByPrinterIdAsync(id).Returns((PrintJob?)null);

        var result = await _sut.GetStatus(id);

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task GetStatus_WhenNoMqttStatusButActiveJobInDb_ReturnsRunningFromDb()
    {
        var id = Guid.NewGuid();
        _statusService.GetStatus(id).Returns((PrinterStatus?)null);
        _printJobRepo.GetActiveByPrinterIdAsync(id).Returns(new PrintJob
        {
            Status = PrintJobStatus.Running,
            PrintFileName = "benchy.gcode",
            EstimatedFinishTime = 42,
            LastUpdatedAt = DateTime.UtcNow,
        });

        var result = await _sut.GetStatus(id);

        var ok = Assert.IsType<OkObjectResult>(result);
        var status = Assert.IsType<PrinterStatus>(ok.Value);
        Assert.Equal("RUNNING", status.GcodeState);
        Assert.Equal("benchy.gcode", status.SubtaskName);
        Assert.Equal(42, status.RemainingMinutes);
    }

    [Fact]
    public async Task GetStatus_WhenNoActiveJob_ReturnsIdleRegardlessOfMqttState()
    {
        var id = Guid.NewGuid();
        _statusService.GetStatus(id).Returns(new PrinterStatus(
            "RUNNING", 50, 10, "test.gcode", 100, 200, 220, 65, DateTime.UtcNow));
        _printJobRepo.GetActiveByPrinterIdAsync(id).Returns((PrintJob?)null);

        var result = await _sut.GetStatus(id);

        var ok = Assert.IsType<OkObjectResult>(result);
        var status = Assert.IsType<PrinterStatus>(ok.Value);
        Assert.Equal("IDLE", status.GcodeState);
    }

    [Theory]
    [InlineData(PrintJobStatus.Running, "RUNNING")]
    [InlineData(PrintJobStatus.Paused, "PAUSE")]
    public async Task GetStatus_WhenActiveJobExists_UsesDbJobStatus(PrintJobStatus jobStatus, string expectedGcodeState)
    {
        var id = Guid.NewGuid();
        _statusService.GetStatus(id).Returns(new PrinterStatus(
            "IDLE", 50, 10, "test.gcode", 100, 200, 220, 65, DateTime.UtcNow));
        _printJobRepo.GetActiveByPrinterIdAsync(id).Returns(new PrintJob { Status = jobStatus });

        var result = await _sut.GetStatus(id);

        var ok = Assert.IsType<OkObjectResult>(result);
        var status = Assert.IsType<PrinterStatus>(ok.Value);
        Assert.Equal(expectedGcodeState, status.GcodeState);
    }

    private static PrinterResponse BuildResponse() => new(
        Guid.NewGuid(), "My Printer", "Bambu Lab", "X1 Carbon",
        "ABC123", "192.168.1.100", null, "mqtt_lan", false, DateTime.UtcNow,
        null, null, null, null, null);
}

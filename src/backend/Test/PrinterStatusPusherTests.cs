using API.Hubs;
using API.Services;
using Application.DTOs;
using Microsoft.AspNetCore.SignalR;
using NSubstitute;

namespace Test;

public class PrinterStatusPusherTests
{
    private readonly IHubContext<PrinterHub> _hubContext = Substitute.For<IHubContext<PrinterHub>>();
    private readonly IClientProxy _clientProxy = Substitute.For<IClientProxy>();
    private readonly PrinterStatusPusher _sut;

    public PrinterStatusPusherTests()
    {
        _hubContext.Clients.All.Returns(_clientProxy);
        _sut = new PrinterStatusPusher(_hubContext);
    }

    [Fact]
    public async Task PushAsync_CallsClientsAllSendAsync_WithPrinterStatusEvent()
    {
        var status = new PrinterStatus("RUNNING", 50, 30, "TestFile.gcode", 100, 200, 215f, 60f, DateTime.UtcNow);

        await _sut.PushAsync(status);

        await _clientProxy.Received(1).SendCoreAsync(
            "PrinterStatus",
            Arg.Is<object[]>(args => args.Length == 1 && args[0].Equals(status)),
            Arg.Any<CancellationToken>()
        );
    }

    [Fact]
    public async Task PushAsync_SendsToAllClients_NotSpecificClient()
    {
        var status = new PrinterStatus("IDLE", 0, 0, null, 0, 0, 0f, 0f, DateTime.UtcNow);

        await _sut.PushAsync(status);

        // Verify it went through Clients.All, not Clients.Client or Clients.Group
        _ = _hubContext.Clients.Received(1).All;
    }
}

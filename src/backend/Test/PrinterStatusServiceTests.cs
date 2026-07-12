using Application.DTOs;
using Application.Services;

namespace Test;

public class PrinterStatusServiceTests
{
    private readonly PrinterStatusService _sut = new();
    private readonly Guid _printerId = Guid.NewGuid();

    [Fact]
    public void GetStatus_Initially_ReturnsNull()
    {
        Assert.Null(_sut.GetStatus(_printerId));
    }

    [Fact]
    public void UpdateStatus_SetsStatus()
    {
        _sut.UpdateStatus(_printerId, BuildStatus("RUNNING"));

        Assert.NotNull(_sut.GetStatus(_printerId));
    }

    [Fact]
    public void GetStatus_AfterUpdate_ReturnsCorrectState()
    {
        _sut.UpdateStatus(_printerId, BuildStatus("RUNNING"));

        Assert.Equal("RUNNING", _sut.GetStatus(_printerId)!.GcodeState);
    }

    [Fact]
    public void UpdateStatus_Twice_ReturnsLatest()
    {
        _sut.UpdateStatus(_printerId, BuildStatus("RUNNING"));
        _sut.UpdateStatus(_printerId, BuildStatus("FINISH"));

        Assert.Equal("FINISH", _sut.GetStatus(_printerId)!.GcodeState);
    }

    private static PrinterStatus BuildStatus(string state) => new(
        GcodeState: state,
        ProgressPercent: 50,
        RemainingMinutes: 10,
        SubtaskName: "test.gcode",
        LayerNum: 100,
        TotalLayerNum: 200,
        NozzleTempC: 220,
        BedTempC: 65,
        UpdatedAt: DateTime.UtcNow);
}

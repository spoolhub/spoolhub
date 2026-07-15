using Application.DTOs;
using Application.Interfaces;
using Application.Services;
using Domain.Models;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace Test;

public class MqttMessageProcessorTests
{
    private readonly ISpoolRepository _spoolRepo = Substitute.For<ISpoolRepository>();
    private readonly IPrintJobRepository _printJobRepo = Substitute.For<IPrintJobRepository>();
    private readonly IPrinterRepository _printerRepo = Substitute.For<IPrinterRepository>();
    private readonly IPrinterStatusService _statusService = Substitute.For<IPrinterStatusService>();
    private readonly IPrinterStatusPusher _statusPusher = Substitute.For<IPrinterStatusPusher>();
    private readonly IActivityService _activity = Substitute.For<IActivityService>();
    private readonly IBambuFtpService _ftpService = Substitute.For<IBambuFtpService>();
    private readonly IGcodeParserService _gcodeParser = Substitute.For<IGcodeParserService>();
    private readonly IBambuCloudTaskService _cloudTaskService = Substitute.For<IBambuCloudTaskService>();
    private readonly MqttMessageProcessor _sut;

    public MqttMessageProcessorTests() =>
        _sut = new MqttMessageProcessor(
            _spoolRepo, _printJobRepo, _printerRepo, _statusService, _statusPusher,
            _activity, _ftpService, _gcodeParser, _cloudTaskService, NullLogger<MqttMessageProcessor>.Instance);

    // ── status update tests ──────────────────────────────────────────────────

    [Fact]
    public async Task ProcessAsync_WhenPayloadEmpty_DoesNotUpdateStatus()
    {
        await _sut.ProcessAsync(string.Empty, Guid.NewGuid());

        _statusService.DidNotReceive().UpdateStatus(Arg.Any<Guid>(), Arg.Any<PrinterStatus>());
    }

    [Fact]
    public async Task ProcessAsync_WhenNoPrintProperty_DoesNotUpdateStatus()
    {
        await _sut.ProcessAsync("{\"other\":{}}", Guid.NewGuid());

        _statusService.DidNotReceive().UpdateStatus(Arg.Any<Guid>(), Arg.Any<PrinterStatus>());
    }

    [Fact]
    public async Task ProcessAsync_WhenNoGcodeStateAndNoTemps_DoesNotUpdateStatus()
    {
        await _sut.ProcessAsync("{\"print\":{\"mc_percent\":50}}", Guid.NewGuid());

        _statusService.DidNotReceive().UpdateStatus(Arg.Any<Guid>(), Arg.Any<PrinterStatus>());
    }

    [Fact]
    public async Task ProcessAsync_UpdatesStatusForRunningMessage()
    {
        await _sut.ProcessAsync(RunningPayload(), Guid.NewGuid());

        _statusService.Received(1).UpdateStatus(Arg.Any<Guid>(), Arg.Is<PrinterStatus>(s => s.GcodeState == "RUNNING"));
    }

    [Fact]
    public async Task ProcessAsync_PushesStatusForRunningMessage()
    {
        await _sut.ProcessAsync(RunningPayload(), Guid.NewGuid());

        await _statusPusher.Received(1).PushAsync(Arg.Any<PrinterStatus>());
    }

    [Fact]
    public async Task ProcessAsync_RoundsTemperaturesToWholeNumbers()
    {
        var payload = "{\"print\":{\"gcode_state\":\"RUNNING\",\"nozzle_temper\":219.83,\"bed_temper\":44.69}}";

        await _sut.ProcessAsync(payload, Guid.NewGuid());

        _statusService.Received(1).UpdateStatus(Arg.Any<Guid>(), Arg.Is<PrinterStatus>(s =>
            s.NozzleTempC == 220f && s.BedTempC == 45f));
    }

    [Fact]
    public async Task ProcessAsync_WhenMqttReportsAms_SetsHasAmsTrueOnPrinter()
    {
        var printerId = Guid.NewGuid();
        var printer = BuildPrinter(printerId, hasAms: false);
        _printerRepo.GetByIdAsync(printerId).Returns(printer);
        _printJobRepo.GetActiveByPrinterIdAsync(printerId).Returns((PrintJob?)null);
        _printJobRepo.CreateAsync(Arg.Any<PrintJob>()).Returns(x => x.Arg<PrintJob>());

        await _sut.ProcessAsync(RunningPayload(), printerId);

        await _printerRepo.Received(1).UpdateAsync(Arg.Is<Printer>(p =>
            p.Id == printerId && p.HasAms));
    }

    [Fact]
    public async Task ProcessAsync_WhenMqttReportsAms_AndHasAmsAlreadyTrue_DoesNotUpdatePrinter()
    {
        var printerId = Guid.NewGuid();
        var printer = BuildPrinter(printerId, hasAms: true);
        _printerRepo.GetByIdAsync(printerId).Returns(printer);
        _printJobRepo.GetActiveByPrinterIdAsync(printerId).Returns((PrintJob?)null);
        _printJobRepo.CreateAsync(Arg.Any<PrintJob>()).Returns(x => x.Arg<PrintJob>());

        await _sut.ProcessAsync(RunningPayload(), printerId);

        await _printerRepo.DidNotReceive().UpdateAsync(Arg.Any<Printer>());
    }

    [Fact]
    public async Task ProcessAsync_WhenMqttHasNoAms_DoesNotSetHasAms()
    {
        var printerId = Guid.NewGuid();
        var printer = BuildPrinter(printerId, hasAms: false);
        _printerRepo.GetByIdAsync(printerId).Returns(printer);

        var payload = "{\"print\":{\"gcode_state\":\"RUNNING\",\"nozzle_temper\":220,\"bed_temper\":65}}";
        await _sut.ProcessAsync(payload, printerId);

        await _printerRepo.DidNotReceive().UpdateAsync(Arg.Any<Printer>());
    }

    [Fact]
    public async Task ProcessAsync_WhenMessageMissingFields_KeepsPreviousValues()
    {
        var printerId = Guid.NewGuid();
        var prev = new PrinterStatus("RUNNING", 42, 60, "test.gcode", 10, 100, 220f, 65f, DateTime.UtcNow);
        _statusService.GetStatus(printerId).Returns(prev);

        var payload = "{\"print\":{\"nozzle_temper\":221,\"bed_temper\":65}}";
        await _sut.ProcessAsync(payload, printerId);

        _statusService.Received().UpdateStatus(printerId, Arg.Is<PrinterStatus>(s =>
            s.GcodeState == "RUNNING" &&
            s.ProgressPercent == 42 &&
            s.LayerNum == 10 &&
            s.SubtaskName == "test.gcode"));
    }

    // ── file-name resolution tests ───────────────────────────────────────────

    [Fact]
    public async Task ProcessAsync_WhenSubtaskNameIsProfileString_UsesGcodeFileInstead()
    {
        var printerId = Guid.NewGuid();
        _printJobRepo.GetActiveByPrinterIdAsync(printerId).Returns((PrintJob?)null);
        _printJobRepo.CreateAsync(Arg.Any<PrintJob>()).Returns(x => x.Arg<PrintJob>());

        var payload = "{\"print\":{\"gcode_state\":\"RUNNING\",\"nozzle_temper\":220,\"bed_temper\":65," +
                      "\"subtask_name\":\"0.2mm layer, 2 walls, 15% infill\"," +
                      "\"gcode_file\":\"/data/Metadata/my_actual_model.gcode\"}}";

        await _sut.ProcessAsync(payload, printerId);

        await _printJobRepo.Received(1).CreateAsync(Arg.Is<PrintJob>(j =>
            j.PrintFileName == "my_actual_model.gcode"));
    }

    [Fact]
    public async Task ProcessAsync_WhenSubtaskNameIsNormalFileName_UsesItDirectly()
    {
        var printerId = Guid.NewGuid();
        _printJobRepo.GetActiveByPrinterIdAsync(printerId).Returns((PrintJob?)null);
        _printJobRepo.CreateAsync(Arg.Any<PrintJob>()).Returns(x => x.Arg<PrintJob>());

        var payload = "{\"print\":{\"gcode_state\":\"RUNNING\",\"nozzle_temper\":220,\"bed_temper\":65," +
                      "\"subtask_name\":\"Dragon_articulated_v5\"," +
                      "\"gcode_file\":\"/data/Metadata/something_else.gcode\"}}";

        await _sut.ProcessAsync(payload, printerId);

        await _printJobRepo.Received(1).CreateAsync(Arg.Is<PrintJob>(j =>
            j.PrintFileName == "Dragon_articulated_v5"));
    }

    // ── RUNNING lifecycle tests ──────────────────────────────────────────────

    [Fact]
    public async Task ProcessAsync_WhenStateTransitionsToRunning_OpensNewPrintJob()
    {
        var printerId = Guid.NewGuid();
        var spool = BuildSpool();
        var printer = BuildPrinter(printerId, extraSpoolId: spool.Id);
        _printJobRepo.GetActiveByPrinterIdAsync(printerId).Returns((PrintJob?)null);
        _printerRepo.GetByIdAsync(printerId).Returns(printer);
        _spoolRepo.GetByIdAsync(spool.Id).Returns(spool);
        _printJobRepo.CreateAsync(Arg.Any<PrintJob>()).Returns(x => x.Arg<PrintJob>());

        await _sut.ProcessAsync(RunningPayload(), printerId);

        await _printJobRepo.Received(1).CreateAsync(Arg.Is<PrintJob>(j =>
            j.PrinterId == printerId &&
            j.SpoolId == spool.Id &&
            j.Status == PrintJobStatus.Running));
    }

    [Fact]
    public async Task ProcessAsync_WhenRunning_AlreadyHasOpenJob_DoesNotCreateDuplicate()
    {
        var printerId = Guid.NewGuid();
        _printJobRepo.GetActiveByPrinterIdAsync(printerId).Returns(BuildRunningJob(printerId, Guid.NewGuid()));

        await _sut.ProcessAsync(RunningPayload(), printerId);

        await _printJobRepo.DidNotReceive().CreateAsync(Arg.Any<PrintJob>());
    }

    [Fact]
    public async Task ProcessAsync_WhenStateIsRunning_DoesNotDeductFromSpool()
    {
        await _sut.ProcessAsync(RunningPayload(), Guid.NewGuid());

        await _spoolRepo.DidNotReceive().UpdateAsync(Arg.Any<Spool>());
    }

    // ── FINISH lifecycle tests ───────────────────────────────────────────────

    [Fact]
    public async Task ProcessAsync_WhenFinish_DeductsFromLinkedSpool()
    {
        var printerId = Guid.NewGuid();
        SetupRunningPrev(printerId);
        var spool = BuildSpool(weight: 500);
        SetupFtpChain(printerId, filamentMm: 50000f);
        _printJobRepo.GetActiveByPrinterIdAsync(printerId).Returns(BuildRunningJob(printerId, spool.Id));
        _spoolRepo.GetActiveAsync().Returns(spool);
        _spoolRepo.GetByIdAsync(spool.Id).Returns(spool);
        _spoolRepo.UpdateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());

        await _sut.ProcessAsync(FinishPayload(), printerId);

        Assert.True(spool.CurrentWeightG < 500, "Spool weight should have been reduced after print");
    }

    [Fact]
    public async Task ProcessAsync_WhenFinish_AmsOnlyDeduction_WorksWithoutFtp()
    {
        var printerId = Guid.NewGuid();
        SetupRunningPrev(printerId);
        var spool = BuildSpool(weight: 1000);
        _printerRepo.GetByIdAsync(printerId).Returns(new Printer { Id = printerId, IpAddress = string.Empty, Protocol = "mqtt_lan" });
        _printJobRepo.GetActiveByPrinterIdAsync(printerId).Returns(BuildRunningJob(printerId, spool.Id));
        _spoolRepo.GetByIdAsync(spool.Id).Returns(spool);
        _spoolRepo.UpdateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());
        // Snapshot: remain=80 before print. FinishPayload has remain=65 → delta=15%
        _statusService.GetAmsSnapshot(printerId).Returns(new AmsSnapshot(
            new Dictionary<string, int> { ["unit_0_tray_0"] = 80 }, DateTime.UtcNow));

        await _sut.ProcessAsync(FinishPayload(), printerId);

        Assert.True(spool.CurrentWeightG < 1000, "AMS-only path should deduct from spool");
        var expectedDeduction = 15f / 100f * 1000f;
        Assert.Equal(1000f - expectedDeduction, spool.CurrentWeightG);
    }

    [Fact]
    public async Task ProcessAsync_WhenFinish_FloorsWeightAtZero()
    {
        var printerId = Guid.NewGuid();
        SetupRunningPrev(printerId);
        var spool = BuildSpool(weight: 1);
        SetupFtpChain(printerId, filamentMm: 10_000_000f);
        _printJobRepo.GetActiveByPrinterIdAsync(printerId).Returns(BuildRunningJob(printerId, spool.Id));
        _spoolRepo.GetActiveAsync().Returns(spool);
        _spoolRepo.GetByIdAsync(spool.Id).Returns(spool);
        _spoolRepo.UpdateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());

        await _sut.ProcessAsync(FinishPayload(), printerId);

        Assert.Equal(0, spool.CurrentWeightG);
    }

    [Fact]
    public async Task ProcessAsync_WhenFinish_AmsRemainUnchanged_NoDeduction()
    {
        var printerId = Guid.NewGuid();
        SetupRunningPrev(printerId);
        var spool = BuildSpool(weight: 500);
        _printerRepo.GetByIdAsync(printerId).Returns(new Printer { Id = printerId, IpAddress = string.Empty });
        _printJobRepo.GetActiveByPrinterIdAsync(printerId).Returns(BuildRunningJob(printerId, spool.Id));
        _spoolRepo.GetByIdAsync(spool.Id).Returns(spool);
        _spoolRepo.UpdateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());
        _statusService.GetAmsSnapshot(printerId).Returns(new AmsSnapshot(
            new Dictionary<string, int> { ["unit_0_tray_0"] = 80 }, DateTime.UtcNow));

        await _sut.ProcessAsync(FinishPayloadNoAms(), printerId);

        await _spoolRepo.DidNotReceive().UpdateAsync(Arg.Any<Spool>());
    }

    [Fact]
    public async Task ProcessAsync_WhenFinish_UpdatesOpenJobToFinished()
    {
        var printerId = Guid.NewGuid();
        SetupRunningPrev(printerId);
        var spool = BuildSpool(weight: 500);
        SetupFtpChain(printerId, filamentMm: 50000f);
        _printJobRepo.GetActiveByPrinterIdAsync(printerId).Returns(BuildRunningJob(printerId, spool.Id));
        _spoolRepo.GetActiveAsync().Returns(spool);
        _spoolRepo.GetByIdAsync(spool.Id).Returns(spool);
        _spoolRepo.UpdateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());

        await _sut.ProcessAsync(FinishPayload(), printerId);

        await _printJobRepo.Received(1).UpdateAsync(Arg.Is<PrintJob>(j =>
            j.PrinterId == printerId &&
            j.GramsUsed > 0 &&
            j.Status == PrintJobStatus.Finished &&
            j.FinishedAt != null));
    }

    [Fact]
    public async Task ProcessAsync_WhenFinish_NoSpoolLinked_SkipsDeduction()
    {
        var printerId = Guid.NewGuid();
        SetupRunningPrev(printerId);
        var spool = BuildSpool();
        SetupFtpChain(printerId, filamentMm: 50000f);
        _printJobRepo.GetActiveByPrinterIdAsync(printerId).Returns(BuildRunningJob(printerId, spoolId: null));
        _spoolRepo.GetActiveAsync().Returns(spool);

        await _sut.ProcessAsync(FinishPayload(), printerId);

        await _spoolRepo.DidNotReceive().UpdateAsync(Arg.Any<Spool>());
    }

    [Fact]
    public async Task ProcessAsync_WhenFinish_FtpFails_AmsFallbackDeductsFromSpool()
    {
        var printerId = Guid.NewGuid();
        SetupRunningPrev(printerId);
        var spool = BuildSpool(weight: 500);
        _printerRepo.GetByIdAsync(printerId).Returns(BuildPrinterWithFtp());
        _ftpService.DownloadPrintFileAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>())
            .Returns((byte[]?)null);
        _printJobRepo.GetActiveByPrinterIdAsync(printerId).Returns(BuildRunningJob(printerId, spool.Id));
        _spoolRepo.GetByIdAsync(spool.Id).Returns(spool);
        _spoolRepo.UpdateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());
        // Snapshot: remain=80 before print. FinishPayload has remain=65 → delta=15%
        _statusService.GetAmsSnapshot(printerId).Returns(new AmsSnapshot(
            new Dictionary<string, int> { ["unit_0_tray_0"] = 80 }, DateTime.UtcNow));

        await _sut.ProcessAsync(FinishPayload(), printerId);

        Assert.True(spool.CurrentWeightG < 500, "AMS remain fallback should deduct from spool when FTP fails");
    }

    [Fact]
    public async Task ProcessAsync_WhenFinish_FtpFails_NoAmsData_SkipsDeduction()
    {
        var printerId = Guid.NewGuid();
        SetupRunningPrev(printerId);
        _printerRepo.GetByIdAsync(printerId).Returns(BuildPrinterWithFtp());
        _ftpService.DownloadPrintFileAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>())
            .Returns((byte[]?)null);
        _printJobRepo.GetActiveByPrinterIdAsync(printerId).Returns(BuildRunningJob(printerId, Guid.NewGuid()));
        _statusService.GetAmsSnapshot(printerId).Returns((AmsSnapshot?)null);

        await _sut.ProcessAsync(FinishPayload(), printerId);

        await _spoolRepo.DidNotReceive().UpdateAsync(Arg.Any<Spool>());
    }

    [Fact]
    public async Task ProcessAsync_WhenFinish_NoPrinterIp_SkipsDeduction()
    {
        var printerId = Guid.NewGuid();
        SetupRunningPrev(printerId);
        _printerRepo.GetByIdAsync(printerId).Returns(new Printer { Id = printerId, IpAddress = string.Empty });
        _printJobRepo.GetActiveByPrinterIdAsync(printerId).Returns(BuildRunningJob(printerId, Guid.NewGuid()));

        await _sut.ProcessAsync(FinishPayload(), printerId);

        await _spoolRepo.DidNotReceive().UpdateAsync(Arg.Any<Spool>());
    }

    [Fact]
    public async Task ProcessAsync_WhenFinish_CloudPrinter_UsesTaskApi()
    {
        var printerId = Guid.NewGuid();
        SetupRunningPrev(printerId);
        var spool = BuildSpool(weight: 500);
        var cloudPrinter = new Printer
        {
            Id = printerId,
            Name = "My Printer",
            Protocol = "mqtt_cloud",
            SerialNumber = "ABCDEF123456",
            CloudToken = "encrypted-token",
            IpAddress = "us.mqtt.bambulab.com"
        };
        _printerRepo.GetByIdAsync(printerId).Returns(cloudPrinter);
        _cloudTaskService.GetLastTaskGramsAsync("ABCDEF123456", "encrypted-token", Arg.Any<string?>(), Arg.Any<string?>())
            .Returns(18.5f);
        _printJobRepo.GetActiveByPrinterIdAsync(printerId).Returns(BuildRunningJob(printerId, spool.Id));
        _spoolRepo.GetByIdAsync(spool.Id).Returns(spool);
        _spoolRepo.UpdateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());

        await _sut.ProcessAsync(FinishPayload(), printerId);

        Assert.Equal(500f - 18.5f, spool.CurrentWeightG);
        await _ftpService.DidNotReceive().DownloadPrintFileAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>());
    }

    [Fact]
    public async Task ProcessAsync_WhenFinish_CloudPrinter_EmptyFileName_StillDeductsFromSpool()
    {
        // Regression: no-AMS cloud printers send subtask_name="" so grams must not short-circuit on empty name
        var printerId = Guid.NewGuid();
        SetupRunningPrev(printerId);
        var spool = BuildSpool(weight: 300);
        var cloudPrinter = new Printer
        {
            Id = printerId,
            Name = "Cloud Printer",
            Protocol = "mqtt_cloud",
            SerialNumber = "XYZ987",
            CloudToken = "enc-token",
            IpAddress = "us.mqtt.bambulab.com"
        };
        _printerRepo.GetByIdAsync(printerId).Returns(cloudPrinter);
        _cloudTaskService.GetLastTaskGramsAsync("XYZ987", "enc-token", "task-001", Arg.Any<string?>())
            .Returns(12.3f);
        var runningJob = BuildRunningJob(printerId, spool.Id);
        runningJob.TaskId = "task-001";
        _printJobRepo.GetActiveByPrinterIdAsync(printerId).Returns(runningJob);
        _spoolRepo.GetByIdAsync(spool.Id).Returns(spool);
        _spoolRepo.UpdateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());

        // FINISH payload with empty subtask_name — no-AMS cloud printer scenario
        await _sut.ProcessAsync(FinishPayloadEmptyName(), printerId);

        Assert.Equal(300f - 12.3f, spool.CurrentWeightG, precision: 2);
        await _ftpService.DidNotReceive().DownloadPrintFileAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>());
    }

    [Fact]
    public async Task ProcessAsync_WhenFinish_AlwaysLogsActivityCard()
    {
        var printerId = Guid.NewGuid();
        SetupRunningPrev(printerId);
        // FTP fails — no grams — but card should still appear
        _printerRepo.GetByIdAsync(printerId).Returns(new Printer { Id = printerId, IpAddress = string.Empty });
        _printJobRepo.GetActiveByPrinterIdAsync(printerId).Returns(BuildRunningJob(printerId, Guid.NewGuid()));

        await _sut.ProcessAsync(FinishPayload(), printerId);

        await _activity.Received(1).LogAsync(
            "PrintCompleted", Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>(),
            Arg.Any<Guid?>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string?>());
    }

    // ── FAILED / CANCELLED lifecycle tests ──────────────────────────────────

    [Fact]
    public async Task ProcessAsync_WhenFailed_ClosesJobAsFailed_NoDeduction()
    {
        var printerId = Guid.NewGuid();
        SetupRunningPrev(printerId);
        _printJobRepo.GetActiveByPrinterIdAsync(printerId).Returns(BuildRunningJob(printerId, Guid.NewGuid()));

        await _sut.ProcessAsync(FailedPayload(), printerId);

        await _printJobRepo.Received(1).UpdateAsync(Arg.Is<PrintJob>(j =>
            j.Status == PrintJobStatus.Failed && j.FinishedAt != null));
        await _spoolRepo.DidNotReceive().UpdateAsync(Arg.Any<Spool>());
    }

    [Fact]
    public async Task ProcessAsync_WhenCancelled_ClosesJobAsCancelled_NoDeduction()
    {
        var printerId = Guid.NewGuid();
        SetupRunningPrev(printerId);
        _printJobRepo.GetActiveByPrinterIdAsync(printerId).Returns(BuildRunningJob(printerId, Guid.NewGuid()));

        await _sut.ProcessAsync(CancelledPayload(), printerId);

        await _printJobRepo.Received(1).UpdateAsync(Arg.Is<PrintJob>(j =>
            j.Status == PrintJobStatus.Cancelled && j.FinishedAt != null));
        await _spoolRepo.DidNotReceive().UpdateAsync(Arg.Any<Spool>());
    }

    [Fact]
    public async Task ProcessAsync_WhenFailed_NoOpenJob_DoesNothing()
    {
        _statusService.GetStatus(Arg.Any<Guid>()).Returns(new PrinterStatus("RUNNING", 0, 0, null, 0, 0, 0f, 0f, DateTime.UtcNow));
        _printJobRepo.GetActiveByPrinterIdAsync(Arg.Any<Guid>()).Returns((PrintJob?)null);

        await _sut.ProcessAsync(FailedPayload(), Guid.NewGuid());

        await _printJobRepo.DidNotReceive().UpdateAsync(Arg.Any<PrintJob>());
        await _printJobRepo.DidNotReceive().CreateAsync(Arg.Any<PrintJob>());
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private void SetupRunningPrev(Guid printerId) =>
        _statusService.GetStatus(printerId).Returns(
            new PrinterStatus("RUNNING", 0, 0, "test.gcode", 0, 0, 0f, 0f, DateTime.UtcNow));

    private void SetupFtpChain(Guid printerId, float filamentMm)
    {
        var bytes = new byte[] { 1 };
        _printerRepo.GetByIdAsync(printerId).Returns(BuildPrinterWithFtp());
        _ftpService.DownloadPrintFileAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>())
            .Returns(bytes);
        _gcodeParser.ParseFilamentUsedMm(bytes, Arg.Any<string>()).Returns(filamentMm);
    }

    private static Printer BuildPrinterWithFtp() => new()
    {
        Id = Guid.NewGuid(),
        Name = "Test Printer",
        IpAddress = "192.168.1.100",
        AccessCode = "12345678",
        Protocol = "mqtt_lan"
    };

    private static string RunningPayload() =>
        "{\"print\":{\"gcode_state\":\"RUNNING\",\"mc_percent\":42,\"mc_remaining_time\":60,\"nozzle_temper\":220,\"bed_temper\":65,\"ams\":{\"ams\":[{\"id\":\"0\",\"tray\":[{\"id\":\"0\",\"remain\":80},{\"id\":\"1\",\"remain\":-1},{\"id\":\"2\",\"remain\":-1},{\"id\":\"3\",\"remain\":-1}]}]}}}";

    private static string FinishPayload() =>
        "{\"print\":{\"gcode_state\":\"FINISH\",\"subtask_name\":\"test.gcode\",\"nozzle_temper\":25,\"bed_temper\":25,\"ams\":{\"ams\":[{\"id\":\"0\",\"tray\":[{\"id\":\"0\",\"remain\":65},{\"id\":\"1\",\"remain\":-1},{\"id\":\"2\",\"remain\":-1},{\"id\":\"3\",\"remain\":-1}]}]}}}";


    private static string FinishPayloadNoAms() =>
        "{\"print\":{\"gcode_state\":\"FINISH\",\"subtask_name\":\"test.gcode\",\"nozzle_temper\":25,\"bed_temper\":25}}";

    private static string FinishPayloadEmptyName() =>
        "{\"print\":{\"gcode_state\":\"FINISH\",\"subtask_name\":\"\",\"gcode_file\":\"\",\"task_id\":\"task-001\",\"nozzle_temper\":25,\"bed_temper\":25}}";

    private static string FailedPayload() =>
        "{\"print\":{\"gcode_state\":\"FAILED\",\"nozzle_temper\":25,\"bed_temper\":25}}";

    private static string CancelledPayload() =>
        "{\"print\":{\"gcode_state\":\"CANCELLED\",\"nozzle_temper\":25,\"bed_temper\":25}}";

    private static Spool BuildSpool(float weight = 500) => new()
    {
        Id = Guid.NewGuid(),
        Brand = "Test",
        Material = "PLA",
        ColorName = "White",
        ColorHex = "#FFFFFF",
        InitialWeightG = weight,
        CurrentWeightG = weight,
        SpoolWeightG = 200,
        LowStockThresholdG = 100,
        CreatedAt = DateTime.UtcNow
    };

    private static PrintJob BuildRunningJob(Guid printerId, Guid? spoolId) => new()
    {
        Id = Guid.NewGuid(),
        PrinterId = printerId,
        SpoolId = spoolId,
        PrintFileName = "test.gcode",
        Status = PrintJobStatus.Running,
        Source = "mqtt",
        StartedAt = DateTime.UtcNow.AddMinutes(-10),
        LastUpdatedAt = DateTime.UtcNow.AddMinutes(-10)
    };

    private static Printer BuildPrinter(Guid id, Guid? extraSpoolId = null, bool hasAms = false,
        Guid? tray1SpoolId = null) => new()
    {
        Id = id,
        Name = "Test Printer",
        IpAddress = "192.168.1.100",
        Protocol = "mqtt_lan",
        HasAms = hasAms,
        ExtraSpoolId = extraSpoolId,
        Tray1SpoolId = tray1SpoolId
    };
}

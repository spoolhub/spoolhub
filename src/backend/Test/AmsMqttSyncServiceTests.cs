using System.Text.Json;
using Application.Interfaces;
using Application.Services;
using Domain.Models;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace Test;

public class AmsMqttSyncServiceTests
{
    private readonly IPrinterRepository _printerRepo = Substitute.For<IPrinterRepository>();
    private readonly ISpoolRepository _spoolRepo = Substitute.For<ISpoolRepository>();
    private readonly IPrinterRealtimeNotifier _printerNotifier = Substitute.For<IPrinterRealtimeNotifier>();
    private readonly AmsMqttSyncService _sut;

    public AmsMqttSyncServiceTests() =>
        _sut = new AmsMqttSyncService(_printerRepo, _spoolRepo, _printerNotifier, NullLogger<AmsMqttSyncService>.Instance);

    [Fact]
    public async Task SyncFromMqtt_WhenAmsRemoved_SetsHasAmsFalseAndClearsTrays()
    {
        var printerId = Guid.NewGuid();
        var linked = Guid.NewGuid();
        var printer = BuildPrinter(printerId);
        printer.HasAms = true;
        printer.Tray1Occupied = true;
        printer.Tray1RemainPct = 80;
        printer.Tray1SpoolId = linked;
        _printerRepo.GetByIdAsync(printerId).Returns(printer);

        using var removed = JsonDocument.Parse(
            """{"print":{"ams":{"ams":[],"ams_exist_bits":"0","tray_exist_bits":"0","tray_now":"254"}}}""");
        await _sut.SyncFromMqttAsync(printerId, removed.RootElement.GetProperty("print"));

        await _printerRepo.Received(1).UpdateAsync(Arg.Is<Printer>(p =>
            !p.HasAms &&
            !p.Tray1Occupied &&
            p.Tray1RemainPct == null &&
            p.Tray1SpoolId == null));
    }

    [Fact]
    public async Task SyncFromMqtt_DeltaWithoutExistBits_KeepsOccupiedFromPriorSnapshot()
    {
        var printerId = Guid.NewGuid();
        var printer = BuildPrinter(printerId);
        _printerRepo.GetByIdAsync(printerId).Returns(printer);
        _spoolRepo.GetByBambuTagUidAsync("D53E550500000100").Returns((Spool?)null);
        _spoolRepo.GetByBambuTagUidAsync("D53E550500000200").Returns((Spool?)null);
        _spoolRepo.CreateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());
        _spoolRepo.SetActiveAsync(Arg.Any<Guid>(), true, true).Returns(Task.CompletedTask);

        using var full = JsonDocument.Parse(
            """{"print":{"ams":{"ams_exist_bits":"1","tray_exist_bits":"3","ams":[{"id":"0","tray":[{"id":"0","remain":80,"tag_uid":"D53E550500000100","tray_weight":"1000"},{"id":"1","remain":60,"tag_uid":"D53E550500000200","tray_weight":"1000"},{"id":"2","remain":-1},{"id":"3","remain":-1}]}]}}}""");
        using var delta = JsonDocument.Parse(
            """{"print":{"ams":{"ams":[{"id":"0","tray":[{"id":"0","remain":75},{"id":"1","remain":55}]}]}}}""");

        await _sut.SyncFromMqttAsync(printerId, full.RootElement.GetProperty("print"));
        await _sut.SyncFromMqttAsync(printerId, delta.RootElement.GetProperty("print"));

        await _printerRepo.Received(2).UpdateAsync(Arg.Is<Printer>(p =>
            p.Tray1Occupied &&
            p.Tray2Occupied &&
            !p.Tray3Occupied &&
            !p.Tray4Occupied));
    }

    [Fact]
    public async Task SyncFromMqtt_WithBambuUid_CreatesSpoolLinksTrayAndSetsWeight()
    {
        var printerId = Guid.NewGuid();
        var printer = BuildPrinter(printerId);
        _printerRepo.GetByIdAsync(printerId).Returns(printer);
        _spoolRepo.GetByBambuTagUidAsync("D53E550500000100").Returns((Spool?)null);
        _spoolRepo.CreateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());
        _spoolRepo.SetActiveAsync(Arg.Any<Guid>(), true, true).Returns(Task.CompletedTask);

        using var doc = JsonDocument.Parse(RfidTrayPayload());
        await _sut.SyncFromMqttAsync(printerId, doc.RootElement.GetProperty("print"));

        await _spoolRepo.Received(1).CreateAsync(Arg.Is<Spool>(s =>
            s.BambuTagUid == "D53E550500000100" &&
            s.Material == "PLA" &&
            s.InitialWeightG == 1000f &&
            Math.Abs(s.CurrentWeightG - 800f) < 1f));
        await _printerRepo.Received(1).UpdateAsync(Arg.Is<Printer>(p =>
            p.Tray1SpoolId != null &&
            p.Tray1Occupied &&
            p.Tray1RemainPct == 80));
    }

    [Fact]
    public async Task SyncFromMqtt_WithKnownUid_UpdatesSpoolWeightOnly()
    {
        var printerId = Guid.NewGuid();
        var spoolId = Guid.NewGuid();
        var printer = BuildPrinter(printerId);
        var spool = new Spool
        {
            Id = spoolId,
            Brand = "Bambu Lab",
            Material = "PLA",
            ColorName = "White",
            ColorHex = "#FFFFFF",
            InitialWeightG = 1000,
            CurrentWeightG = 900,
            BambuTagUid = "D53E550500000100",
            CreatedAt = DateTime.UtcNow
        };
        _printerRepo.GetByIdAsync(printerId).Returns(printer);
        _spoolRepo.GetByBambuTagUidAsync("D53E550500000100").Returns(spool);
        _spoolRepo.UpdateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());
        _spoolRepo.SetActiveAsync(Arg.Any<Guid>(), true, true).Returns(Task.CompletedTask);

        using var doc = JsonDocument.Parse(RfidTrayPayload(remain: 65));
        await _sut.SyncFromMqttAsync(printerId, doc.RootElement.GetProperty("print"));

        await _spoolRepo.DidNotReceive().CreateAsync(Arg.Any<Spool>());
        await _spoolRepo.Received(1).UpdateAsync(Arg.Is<Spool>(s =>
            Math.Abs(s.CurrentWeightG - 650f) < 1f));
    }

    [Fact]
    public async Task SyncFromMqtt_EmptyTray_ClearsSlotAndNotClickableState()
    {
        var printerId = Guid.NewGuid();
        var linked = Guid.NewGuid();
        var printer = BuildPrinter(printerId);
        printer.Tray2SpoolId = linked;
        printer.Tray2Occupied = true;
        _printerRepo.GetByIdAsync(printerId).Returns(printer);
        _spoolRepo.GetByBambuTagUidAsync("D53E550500000100").Returns((Spool?)null);
        _spoolRepo.CreateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());
        _spoolRepo.SetActiveAsync(Arg.Any<Guid>(), true, true).Returns(Task.CompletedTask);

        using var doc = JsonDocument.Parse(OnlyTray0OccupiedPayload());
        await _sut.SyncFromMqttAsync(printerId, doc.RootElement.GetProperty("print"));

        await _printerRepo.Received(1).UpdateAsync(Arg.Is<Printer>(p =>
            p.Tray1Occupied &&
            !p.Tray2Occupied &&
            p.Tray2SpoolId == null));
    }

    [Fact]
    public async Task SyncFromMqtt_EmptyTrayWithPendingAssignment_KeepsSpoolLink()
    {
        var printerId = Guid.NewGuid();
        var linked = Guid.NewGuid();
        var printer = BuildPrinter(printerId);
        printer.Tray2SpoolId = linked;
        printer.Tray2Occupied = false;
        _printerRepo.GetByIdAsync(printerId).Returns(printer);
        _spoolRepo.GetByBambuTagUidAsync("D53E550500000100").Returns((Spool?)null);
        _spoolRepo.CreateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());
        _spoolRepo.SetActiveAsync(Arg.Any<Guid>(), true, true).Returns(Task.CompletedTask);

        using var doc = JsonDocument.Parse(OnlyTray0OccupiedPayload());
        await _sut.SyncFromMqttAsync(printerId, doc.RootElement.GetProperty("print"));

        await _printerRepo.Received(1).UpdateAsync(Arg.Is<Printer>(p =>
            p.Tray1Occupied &&
            !p.Tray2Occupied &&
            p.Tray2SpoolId == linked));
    }

    [Fact]
    public async Task SyncFromMqtt_NoUidOccupied_DoesNotCreateSpool()
    {
        var printerId = Guid.NewGuid();
        var printer = BuildPrinter(printerId);
        _printerRepo.GetByIdAsync(printerId).Returns(printer);

        using var doc = JsonDocument.Parse(NoUidOccupiedPayload());
        await _sut.SyncFromMqttAsync(printerId, doc.RootElement.GetProperty("print"));

        await _spoolRepo.DidNotReceive().CreateAsync(Arg.Any<Spool>());
        await _printerRepo.Received(1).UpdateAsync(Arg.Is<Printer>(p =>
            p.Tray1Occupied && p.Tray1SpoolId == null));
    }

    private static Printer BuildPrinter(Guid id) => new()
    {
        Id = id,
        Name = "Test",
        Brand = "Bambu Lab",
        Model = "P1S",
        IpAddress = "192.168.1.1",
        Protocol = "mqtt_lan",
        CreatedAt = DateTime.UtcNow
    };

    private static string RfidTrayPayload(int remain = 80) =>
        "{\"print\":{\"gcode_state\":\"RUNNING\",\"ams\":{\"tray_exist_bits\":\"1\",\"ams\":[{\"id\":\"0\",\"tray\":[{\"id\":\"0\",\"remain\":" + remain + ",\"tag_uid\":\"D53E550500000100\",\"tray_type\":\"PLA\",\"tray_color\":\"FFFFFFFF\",\"tray_weight\":\"1000\"}]}]}}}";

    private static string OnlyTray0OccupiedPayload() =>
        """{"print":{"ams":{"tray_exist_bits":"1","ams":[{"id":"0","tray":[{"id":"0","remain":80,"tag_uid":"D53E550500000100","tray_weight":"1000"},{"id":"1","remain":-1,"tag_uid":"0000000000000000"}]}]}}}""";

    private static string NoUidOccupiedPayload() =>
        """{"print":{"ams":{"tray_exist_bits":"1","ams":[{"id":"0","tray":[{"id":"0","remain":-1,"tag_uid":"0000000000000000","tray_type":"PETG"}]}]}}}""";

    [Fact]
    public async Task SyncFromMqtt_NonRfidOccupiedTray_StoresMqttHint()
    {
        var printerId = Guid.NewGuid();
        var printer = BuildPrinter(printerId);
        _printerRepo.GetByIdAsync(printerId).Returns(printer);

        using var doc = JsonDocument.Parse(
            """{"print":{"ams":{"tray_exist_bits":"1","ams":[{"id":"0","tray":[{"id":"0","remain":65,"tag_uid":"0000000000000000","tray_type":"PLA","tray_id_name":"Jade White","tray_color":"FFFFFFFF","tray_sub_brands":"Polymaker"}]}]}}}""");
        await _sut.SyncFromMqttAsync(printerId, doc.RootElement.GetProperty("print"));

        await _spoolRepo.DidNotReceive().CreateAsync(Arg.Any<Spool>());
        await _printerRepo.Received(1).UpdateAsync(Arg.Is<Printer>(p =>
            p.Tray1Occupied &&
            p.Tray1MqttMaterial == "PLA" &&
            p.Tray1MqttColorName == "Jade White" &&
            p.Tray1MqttColorHex == "#FFFFFF" &&
            p.Tray1MqttBrand == "Polymaker" &&
            p.Tray1SpoolId == null));
    }

    [Fact]
    public async Task SyncFromMqtt_VtTrayNow254_MarksExtraOccupiedWithoutUid()
    {
        var printerId = Guid.NewGuid();
        var printer = BuildPrinter(printerId);
        printer.HasAms = false;
        _printerRepo.GetByIdAsync(printerId).Returns(printer);

        using var doc = JsonDocument.Parse(VtTrayPayload());
        await _sut.SyncFromMqttAsync(printerId, doc.RootElement.GetProperty("print"));

        await _spoolRepo.DidNotReceive().CreateAsync(Arg.Any<Spool>());
        await _printerRepo.Received(1).UpdateAsync(Arg.Is<Printer>(p =>
            p.ExtraSpoolOccupied == true &&
            p.ExtraSpoolRemainPct == 0 &&
            p.ExtraSpoolId == null));
    }

    [Fact]
    public async Task SyncFromMqtt_VtTrayWithRfid_CreatesAndLinksExtraSpool()
    {
        var printerId = Guid.NewGuid();
        var printer = BuildPrinter(printerId);
        printer.HasAms = false;
        _printerRepo.GetByIdAsync(printerId).Returns(printer);
        _spoolRepo.GetByBambuTagUidAsync("D53E550500000100").Returns((Spool?)null);
        _spoolRepo.CreateAsync(Arg.Any<Spool>()).Returns(x => x.Arg<Spool>());
        _spoolRepo.SetActiveAsync(Arg.Any<Guid>(), true, true).Returns(Task.CompletedTask);

        using var doc = JsonDocument.Parse(VtTrayPayload(tagUid: "D53E550500000100", remain: 42));
        await _sut.SyncFromMqttAsync(printerId, doc.RootElement.GetProperty("print"));

        await _spoolRepo.Received(1).CreateAsync(Arg.Is<Spool>(s =>
            s.BambuTagUid == "D53E550500000100" &&
            s.Material == "PLA"));
        await _printerRepo.Received(1).UpdateAsync(Arg.Is<Printer>(p =>
            p.ExtraSpoolOccupied == true &&
            p.ExtraSpoolId != null));
    }

    [Fact]
    public async Task SyncFromMqtt_VtTrayNow255_ClearsExtraSlot()
    {
        var printerId = Guid.NewGuid();
        var linked = Guid.NewGuid();
        var printer = BuildPrinter(printerId);
        printer.HasAms = false;
        printer.ExtraSpoolOccupied = true;
        printer.ExtraSpoolId = linked;
        _printerRepo.GetByIdAsync(printerId).Returns(printer);

        using var doc = JsonDocument.Parse(
            """{"print":{"ams":{"ams":[],"ams_exist_bits":"0","tray_now":"255"}}}""");
        await _sut.SyncFromMqttAsync(printerId, doc.RootElement.GetProperty("print"));

        await _printerRepo.Received(1).UpdateAsync(Arg.Is<Printer>(p =>
            p.ExtraSpoolOccupied == false &&
            p.ExtraSpoolId == null));
    }

    private static string VtTrayPayload(string tagUid = "0000000000000000", int remain = 0) =>
        "{\"print\":{\"ams\":{\"ams\":[],\"ams_exist_bits\":\"0\",\"tray_now\":\"254\"},\"vt_tray\":{\"id\":\"254\",\"tag_uid\":\"" + tagUid + "\",\"tray_type\":\"PLA\",\"tray_color\":\"FFFFFFFF\",\"remain\":" + remain + ",\"tray_weight\":\"1000\"}}}";
}

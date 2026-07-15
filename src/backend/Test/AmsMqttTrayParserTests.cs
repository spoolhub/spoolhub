using System.Text.Json;
using Application.Services;

namespace Test;

public class AmsMqttTrayParserTests
{
    [Fact]
    public void TryReadAmsHardwarePresence_WhenAmsExistBitsZero_ReturnsFalseAndClearsCache()
    {
        var printerId = Guid.NewGuid();
        using var seed = JsonDocument.Parse(
            """{"print":{"ams":{"ams_exist_bits":"1","tray_exist_bits":"1","ams":[{"id":"0","tray":[{"id":"0","remain":80}]}]}}}""");
        Assert.True(AmsMqttTrayParser.TryParse(printerId, seed.RootElement.GetProperty("print"), out _, out _, out _));

        using var removed = JsonDocument.Parse(
            """{"print":{"ams":{"ams":[],"ams_exist_bits":"0","tray_exist_bits":"0"}}}""");
        Assert.True(AmsMqttTrayParser.TryReadAmsHardwarePresence(
            printerId, removed.RootElement.GetProperty("print"), out var hasAms));

        Assert.False(hasAms);
        Assert.False(AmsMqttTrayParser.TryParse(printerId, removed.RootElement.GetProperty("print"), out _, out _, out _));
    }

    [Fact]
    public void TryReadAmsHardwarePresence_WhenNoAmsBlock_ReturnsFalseWithoutChangingPresence()
    {
        var printerId = Guid.NewGuid();
        using var doc = JsonDocument.Parse("""{"print":{"gcode_state":"IDLE","nozzle_temper":25}}""");

        Assert.False(AmsMqttTrayParser.TryReadAmsHardwarePresence(
            printerId, doc.RootElement.GetProperty("print"), out var hasAms));
        Assert.Null(hasAms);
    }

    [Fact]
    public void TryParse_TrayExistBits3_MarksTrays0And1Occupied()
    {
        var printerId = Guid.NewGuid();
        using var doc = JsonDocument.Parse(
            """{"print":{"ams":{"tray_exist_bits":"3","ams":[{"id":"0","tray":[{"id":"0","remain":-1,"tag_uid":"0000000000000000"},{"id":"1","remain":-1,"tag_uid":"0000000000000000"},{"id":"2","remain":-1},{"id":"3","remain":-1}]}]}}}""");

        Assert.True(AmsMqttTrayParser.TryParse(
            printerId,
            doc.RootElement.GetProperty("print"),
            out var trays,
            out _,
            out var hasBits));

        Assert.True(hasBits);
        Assert.Collection(
            trays.OrderBy(t => t.TrayIndex),
            t => { Assert.Equal(0, t.TrayIndex); Assert.True(t.Occupied); },
            t => { Assert.Equal(1, t.TrayIndex); Assert.True(t.Occupied); },
            t => { Assert.Equal(2, t.TrayIndex); Assert.False(t.Occupied); },
            t => { Assert.Equal(3, t.TrayIndex); Assert.False(t.Occupied); });
    }

    [Fact]
    public void TryParse_DeltaWithoutBits_ReusesCachedTrayExistBits()
    {
        var printerId = Guid.NewGuid();
        using var full = JsonDocument.Parse(
            """{"print":{"ams":{"tray_exist_bits":"3","ams":[{"id":"0","tray":[{"id":"0","remain":80,"tag_uid":"D53E550500000100"},{"id":"1","remain":50,"tag_uid":"D53E550500000200"},{"id":"2","remain":-1},{"id":"3","remain":-1}]}]}}}""");
        using var delta = JsonDocument.Parse(
            """{"print":{"ams":{"ams":[{"id":"0","tray":[{"id":"0","remain":75,"tag_uid":"D53E550500000100"},{"id":"1","remain":45,"tag_uid":"D53E550500000200"}]}]}}}""");

        Assert.True(AmsMqttTrayParser.TryParse(printerId, full.RootElement.GetProperty("print"), out _, out _, out _));
        Assert.True(AmsMqttTrayParser.TryParse(printerId, delta.RootElement.GetProperty("print"), out var trays, out _, out var hasBits));

        Assert.True(hasBits);
        Assert.True(trays.Single(t => t.TrayIndex == 0).Occupied);
        Assert.True(trays.Single(t => t.TrayIndex == 1).Occupied);
        Assert.Equal(75, trays.Single(t => t.TrayIndex == 0).Remain);
    }

    [Fact]
    public void TryParse_NumericTrayExistBits_IsAccepted()
    {
        var printerId = Guid.NewGuid();
        using var doc = JsonDocument.Parse(
            """{"print":{"ams":{"tray_exist_bits":3,"ams":[{"id":"0","tray":[{"id":"0","remain":-1},{"id":"1","remain":-1},{"id":"2","remain":-1},{"id":"3","remain":-1}]}]}}}""");

        Assert.True(AmsMqttTrayParser.TryParse(printerId, doc.RootElement.GetProperty("print"), out var trays, out _, out var hasBits));

        Assert.True(hasBits);
        Assert.True(trays.Single(t => t.TrayIndex == 0).Occupied);
        Assert.True(trays.Single(t => t.TrayIndex == 1).Occupied);
    }

    [Fact]
    public void TryParse_NumericTrayId_ParsesSlot4WithColor()
    {
        var printerId = Guid.NewGuid();
        using var doc = JsonDocument.Parse(
            """{"print":{"ams":{"tray_exist_bits":"8","ams":[{"id":0,"tray":[{"id":0,"remain":-1},{"id":1,"remain":-1},{"id":2,"remain":-1},{"id":3,"remain":80,"tag_uid":"0000000000000000","tray_type":"PLA","tray_color":"000000FF","tray_id_name":"Black","tray_info_idx":"GFL03"}]}]}}}""");

        Assert.True(AmsMqttTrayParser.TryParse(
            printerId, doc.RootElement.GetProperty("print"), out var trays, out _, out _));

        var slot4 = trays.Single(t => t.TrayIndex == 3);
        Assert.True(slot4.Occupied);
        Assert.Equal("Black", slot4.TrayIdName);
        Assert.Equal("PLA", slot4.TrayType);
        Assert.Equal("GFL03", slot4.TrayInfoIdx);
    }

    [Fact]
    public void TryParseVtTray_TrayNow254_MarksOccupied()
    {
        var printerId = Guid.NewGuid();
        using var doc = JsonDocument.Parse(
            """{"print":{"ams":{"ams":[],"ams_exist_bits":"0","tray_now":"254"},"vt_tray":{"id":"254","tag_uid":"0000000000000000","tray_type":"PLA","remain":0}}}""");

        Assert.True(AmsMqttTrayParser.TryParseVtTray(
            printerId, doc.RootElement.GetProperty("print"), out var tray, out var hasExplicit));

        Assert.True(hasExplicit);
        Assert.True(tray.Occupied);
        Assert.Equal(0, tray.Remain);
        Assert.Equal("PLA", tray.TrayType);
    }

    [Fact]
    public void TryParseVtTray_TrayNow255_MarksEmpty()
    {
        var printerId = Guid.NewGuid();
        using var seed = JsonDocument.Parse(
            """{"print":{"ams":{"tray_now":"254"},"vt_tray":{"remain":50,"tray_type":"PLA"}}}""");
        Assert.True(AmsMqttTrayParser.TryParseVtTray(printerId, seed.RootElement.GetProperty("print"), out _, out _));

        using var empty = JsonDocument.Parse("""{"print":{"ams":{"tray_now":"255"}}}""");
        Assert.True(AmsMqttTrayParser.TryParseVtTray(
            printerId, empty.RootElement.GetProperty("print"), out var tray, out var hasExplicit));

        Assert.True(hasExplicit);
        Assert.False(tray.Occupied);
    }
}

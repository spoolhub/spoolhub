using Application.Services;

namespace Test;

public class MqttPreviewMapperTests
{
    [Fact]
    public void MapFromPayload_AmsTrays_MapsOccupiedSlotsAndBambuBrand()
    {
        var previewId = MqttPreviewMapper.PreviewIdForSerial("TEST123");
        const string payload =
            """{"print":{"ams":{"ams_exist_bits":"1","tray_exist_bits":"3","ams":[{"id":"0","tray":[{"id":"0","remain":80,"tag_uid":"D53E550500000100","tray_type":"PLA","tray_color":"#FF0000FF","tray_id_name":"Red"},{"id":"1","remain":50,"tag_uid":"D53E550500000200","tray_type":"PETG","tray_color":"#00FF00FF","tray_id_name":"Green"},{"id":"2","remain":-1},{"id":"3","remain":-1}]}]}}}""";

        var preview = MqttPreviewMapper.MapFromPayload(previewId, payload);

        Assert.NotNull(preview);
        Assert.True(preview!.HasAms);
        Assert.Equal(2, preview.Trays.Count(t => t.Occupied));
        var red = preview.Trays.Single(t => t.Slot == 1);
        Assert.True(red.IsBambuFilament);
        Assert.Equal("Bambu Lab", red.Brand);
        Assert.Equal("#FF0000", red.ColorHex);
        AmsMqttTrayParser.ClearPrinterCaches(previewId);
    }

    [Fact]
    public void MapFromPayload_VtTray_MapsExtraSpoolWithThirdPartyBrand()
    {
        var previewId = MqttPreviewMapper.PreviewIdForSerial("VT123");
        const string payload =
            """{"print":{"ams":{"ams":[],"ams_exist_bits":"0","tray_now":"254"},"vt_tray":{"id":"254","tag_uid":"0000000000000000","tray_type":"PLA","tray_sub_brands":"Polymaker","tray_id_name":"PolyLite","tray_color":"#112233FF","remain":42}}}""";

        var preview = MqttPreviewMapper.MapFromPayload(previewId, payload);

        Assert.NotNull(preview);
        Assert.False(preview!.HasAms);
        Assert.NotNull(preview.ExtraTray);
        Assert.True(preview.ExtraTray!.Occupied);
        Assert.False(preview.ExtraTray.IsBambuFilament);
        Assert.Equal("Polymaker", preview.ExtraTray.Brand);
        Assert.Equal("PolyLite", preview.ExtraTray.ColorName);
        Assert.Equal(42, preview.ExtraTray.RemainPct);
        AmsMqttTrayParser.ClearPrinterCaches(previewId);
    }

    [Fact]
    public void MapFromPayload_EsunPlaPlus_ResolvesBrandFromTrayInfoIdx()
    {
        var previewId = MqttPreviewMapper.PreviewIdForSerial("ESUN123");
        const string payload =
            """{"print":{"ams":{"ams_exist_bits":"1","tray_exist_bits":"1","tray_is_bbl_bits":"e","ams":[{"id":"0","tray":[{"id":"0","remain":90,"tag_uid":"0000000000000000","tray_type":"PLA","tray_color":"FFFFFFFF","tray_info_idx":"GFL03","tray_sub_brands":""},{"id":"1","remain":-1},{"id":"2","remain":-1},{"id":"3","remain":-1}]}]}}}""";

        var preview = MqttPreviewMapper.MapFromPayload(previewId, payload);

        Assert.NotNull(preview);
        var tray = preview!.Trays.Single(t => t.Slot == 1);
        Assert.Equal("eSUN", tray.Brand);
        Assert.False(tray.IsBambuFilament);
        Assert.Equal("PLA+", tray.Material);
        AmsMqttTrayParser.ClearPrinterCaches(previewId);
    }

    [Fact]
    public void MapFromPayload_MaterialOnlyTray_DoesNotDuplicateMaterialAsBrandOrColorName()
    {
        var previewId = MqttPreviewMapper.PreviewIdForSerial("MATONLY");
        const string payload =
            """{"print":{"ams":{"ams_exist_bits":"1","tray_exist_bits":"1","ams":[{"id":"0","tray":[{"id":"0","remain":90,"tag_uid":"0000000000000000","tray_type":"PLA","tray_color":"FFFFFFFF"},{"id":"1","remain":-1},{"id":"2","remain":-1},{"id":"3","remain":-1}]}]}}}""";

        var preview = MqttPreviewMapper.MapFromPayload(previewId, payload);

        Assert.NotNull(preview);
        var tray = preview!.Trays.Single(t => t.Slot == 1);
        Assert.True(tray.Occupied);
        Assert.Equal("PLA", tray.Material);
        Assert.Null(tray.ColorName);
        Assert.Null(tray.Brand);
        Assert.False(tray.IsBambuFilament);
        Assert.Equal("#FFFFFF", tray.ColorHex);
        AmsMqttTrayParser.ClearPrinterCaches(previewId);
    }

    [Fact]
    public void PreviewIdForSerial_IsDeterministic()
    {
        var a = MqttPreviewMapper.PreviewIdForSerial("517328");
        var b = MqttPreviewMapper.PreviewIdForSerial("517328");
        Assert.Equal(a, b);
        Assert.NotEqual(MqttPreviewMapper.PreviewIdForSerial("other"), a);
    }
}

using System.Text.Json;
using Application.DTOs;

namespace Application.Services;

public static class MqttPreviewMapper
{
    public static DiscoveredPrinterMqttPreview? MapFromPayload(Guid previewId, string payload)
    {
        using var doc = JsonDocument.Parse(payload);
        if (!doc.RootElement.TryGetProperty("print", out var printEl))
            return null;

        return MapFromPrint(previewId, printEl);
    }

    public static DiscoveredPrinterMqttPreview MapFromPrint(Guid previewId, JsonElement printEl)
    {
        var hasAms = false;
        if (AmsMqttTrayParser.TryReadAmsHardwarePresence(previewId, printEl, out var hw))
            hasAms = hw == true;

        var trays = new List<DiscoveredSpoolSlotPreview>();
        DiscoveredSpoolSlotPreview? extra = null;

        if (AmsMqttTrayParser.TryParse(previewId, printEl, out var amsTrays, out _, out _) && amsTrays.Count > 0)
        {
            hasAms = true;
            foreach (var tray in amsTrays.OrderBy(t => t.TrayIndex))
                trays.Add(ToSlot(tray.TrayIndex + 1, tray));
        }

        if (!hasAms && AmsMqttTrayParser.TryParseVtTray(previewId, printEl, out var vt, out _))
            extra = ToSlot(0, vt.Remain, vt.Occupied, vt.TagUid, vt.TrayType, vt.TrayColor, vt.TrayIdName,
                vt.TraySubBrand, vt.TrayInfoIdx, vt.IsBambuFilament);

        return new DiscoveredPrinterMqttPreview(hasAms, trays, extra);
    }

    private static DiscoveredSpoolSlotPreview ToSlot(int slot, AmsTrayInfo tray) =>
        ToSlot(slot, tray.Remain, tray.Occupied, tray.TagUid, tray.TrayType, tray.TrayColor, tray.TrayIdName,
            tray.TraySubBrand, tray.TrayInfoIdx, tray.IsBambuFilament);

    private static DiscoveredSpoolSlotPreview ToSlot(
        int slot,
        int remain,
        bool occupied,
        string? tagUid,
        string? trayType,
        string? trayColor,
        string? trayIdName,
        string? traySubBrand,
        string? trayInfoIdx,
        bool isBambuFilament)
    {
        var profileName = BambuFilamentProfiles.TryGetProfileName(trayInfoIdx);
        var (_, materialHint) = BambuFilamentProfiles.ParseProfileName(profileName);
        var material = !string.IsNullOrWhiteSpace(materialHint)
            ? materialHint
            : string.IsNullOrWhiteSpace(trayType) ? null : trayType;
        var colorHex = AmsMqttTrayParser.ParseTrayColorHex(trayColor);
        var colorName = string.IsNullOrWhiteSpace(trayIdName) ? null : trayIdName;
        var brand = BambuFilamentProfiles.ResolveBrand(traySubBrand, trayInfoIdx, trayIdName, isBambuFilament);

        return new DiscoveredSpoolSlotPreview(
            slot,
            occupied,
            remain >= 0 ? remain : null,
            material,
            colorHex,
            colorName,
            brand,
            isBambuFilament);
    }

    public static Guid PreviewIdForSerial(string serial)
    {
        var bytes = System.Security.Cryptography.MD5.HashData(System.Text.Encoding.UTF8.GetBytes(serial));
        return new Guid(bytes);
    }
}

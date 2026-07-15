using System.Text.Json;
using Application.Interfaces;
using Domain.Models;
using Microsoft.Extensions.Logging;

namespace Application.Services;

public class AmsMqttSyncService(
    IPrinterRepository printerRepository,
    ISpoolRepository spoolRepository,
    IPrinterRealtimeNotifier printerNotifier,
    ILogger<AmsMqttSyncService> logger) : IAmsMqttSyncService
{
    public async Task SyncFromMqttAsync(Guid printerId, JsonElement printEl)
    {
        var printer = await printerRepository.GetByIdAsync(printerId);
        if (printer is null) return;

        var changed = false;
        var spoolsChanged = false;
        bool? hasAmsHardware = null;
        if (AmsMqttTrayParser.TryReadAmsHardwarePresence(printerId, printEl, out var hw))
            hasAmsHardware = hw;

        if (hasAmsHardware == false && printer.HasAms)
        {
            printer.HasAms = false;
            changed |= ClearAllAmsState(printer);
            logger.LogInformation("MQTT AMS removed for printer {Id} — HasAms set to false", printerId);
        }

        if (AmsMqttTrayParser.TryParse(printerId, printEl, out var trays, out _, out var hasExplicitTrayExistBits))
        {
            if (hasAmsHardware != false && !printer.HasAms)
            {
                printer.HasAms = true;
                changed = true;
            }

            if (printer.HasAms)
            {
                foreach (var tray in trays)
                {
                    if (ApplyTrayState(printer, tray, hasExplicitTrayExistBits))
                        changed = true;

                    if (!tray.Occupied)
                    {
                        if (hasExplicitTrayExistBits && ClearTraySlot(printer, tray.TrayIndex))
                            changed = true;
                        continue;
                    }

                    if (!AmsMqttTrayParser.IsValidBambuTagUid(tray.TagUid))
                        continue;

                    var (linked, created) = await LinkOrCreateSpoolForTrayAsync(printer, printerId, tray);
                    if (linked) changed = true;
                    if (created) spoolsChanged = true;
                }
            }
        }

        if (!printer.HasAms
            && AmsMqttTrayParser.TryParseVtTray(printerId, printEl, out var vtTray, out var hasExplicitVtOccupied))
        {
            if (ApplyExtraState(printer, vtTray, hasExplicitVtOccupied))
                changed = true;

            if (!vtTray.Occupied)
            {
                if (hasExplicitVtOccupied && ClearExtraSlot(printer))
                    changed = true;
            }
            else if (AmsMqttTrayParser.IsValidBambuTagUid(vtTray.TagUid))
            {
                var (linked, created) = await LinkOrCreateSpoolForExtraAsync(printer, printerId, vtTray);
                if (linked) changed = true;
                if (created) spoolsChanged = true;
            }
        }

        if (!changed) return;

        await printerRepository.UpdateAsync(printer);
        if (printer.HasAms)
        {
            logger.LogInformation(
                "MQTT AMS sync for printer {Id} — trays occupied [{O1},{O2},{O3},{O4}], remain [{R1},{R2},{R3},{R4}]",
                printerId,
                printer.Tray1Occupied, printer.Tray2Occupied, printer.Tray3Occupied, printer.Tray4Occupied,
                printer.Tray1RemainPct, printer.Tray2RemainPct, printer.Tray3RemainPct, printer.Tray4RemainPct);
        }
        else
        {
            logger.LogInformation(
                "MQTT extra spool sync for printer {Id} — occupied {Occupied}, remain {Remain}",
                printerId, printer.ExtraSpoolOccupied, printer.ExtraSpoolRemainPct);
        }

        await printerNotifier.NotifyPrinterUpdatedAsync(printerId, spoolsChanged);
    }

    private async Task<(bool Changed, bool SpoolCreated)> LinkOrCreateSpoolForTrayAsync(Printer printer, Guid printerId, AmsTrayInfo tray)
    {
        var changed = false;
        var weightUpdated = false;
        var spool = await spoolRepository.GetByBambuTagUidAsync(tray.TagUid!);
        var created = false;
        if (spool is null)
        {
            spool = BuildSpoolFromTray(printer, tray);
            spool = await spoolRepository.CreateAsync(spool);
            created = true;
            logger.LogInformation(
                "Created spool {SpoolId} from Bambu RFID {Uid} for printer {PrinterId} tray {Tray}",
                spool.Id, tray.TagUid, printerId, tray.TrayIndex + 1);
        }
        else if (SyncSpoolWeight(spool, tray.Remain))
        {
            spool = await spoolRepository.UpdateAsync(spool);
            weightUpdated = true;
        }

        if (LinkSpoolToTray(printer, tray.TrayIndex, spool.Id))
            changed = true;

        if (created || !spool.IsActive)
            await spoolRepository.SetActiveAsync(spool.Id, true, clearStockLocation: true);

        return (changed, created || weightUpdated);
    }

    private async Task<(bool Changed, bool SpoolCreated)> LinkOrCreateSpoolForExtraAsync(Printer printer, Guid printerId, VtTrayInfo tray)
    {
        var changed = false;
        var weightUpdated = false;
        var amsTray = ToAmsTrayInfo(tray);
        var spool = await spoolRepository.GetByBambuTagUidAsync(tray.TagUid!);
        var created = false;
        if (spool is null)
        {
            spool = BuildSpoolFromTray(printer, amsTray);
            spool = await spoolRepository.CreateAsync(spool);
            created = true;
            logger.LogInformation(
                "Created spool {SpoolId} from Bambu RFID {Uid} for printer {PrinterId} extra spool",
                spool.Id, tray.TagUid, printerId);
        }
        else if (SyncSpoolWeight(spool, tray.Remain))
        {
            spool = await spoolRepository.UpdateAsync(spool);
            weightUpdated = true;
        }

        if (LinkSpoolToExtra(printer, spool.Id))
            changed = true;

        if (created || !spool.IsActive)
            await spoolRepository.SetActiveAsync(spool.Id, true, clearStockLocation: true);

        return (changed, created || weightUpdated);
    }

    private static AmsTrayInfo ToAmsTrayInfo(VtTrayInfo tray) =>
        new(0, tray.Remain, tray.Occupied, tray.TagUid, tray.TrayType, tray.TrayColor, tray.TrayIdName,
            tray.TraySubBrand, tray.TrayInfoIdx, tray.IsBambuFilament, tray.TrayWeightG);

    private static bool ClearAllAmsState(Printer printer)
    {
        var changed = false;

        if (printer.Tray1SpoolId is not null) { printer.Tray1SpoolId = null; changed = true; }
        if (printer.Tray2SpoolId is not null) { printer.Tray2SpoolId = null; changed = true; }
        if (printer.Tray3SpoolId is not null) { printer.Tray3SpoolId = null; changed = true; }
        if (printer.Tray4SpoolId is not null) { printer.Tray4SpoolId = null; changed = true; }

        if (printer.Tray1Occupied) { printer.Tray1Occupied = false; changed = true; }
        if (printer.Tray2Occupied) { printer.Tray2Occupied = false; changed = true; }
        if (printer.Tray3Occupied) { printer.Tray3Occupied = false; changed = true; }
        if (printer.Tray4Occupied) { printer.Tray4Occupied = false; changed = true; }

        if (printer.Tray1RemainPct is not null) { printer.Tray1RemainPct = null; changed = true; }
        if (printer.Tray2RemainPct is not null) { printer.Tray2RemainPct = null; changed = true; }
        if (printer.Tray3RemainPct is not null) { printer.Tray3RemainPct = null; changed = true; }
        if (printer.Tray4RemainPct is not null) { printer.Tray4RemainPct = null; changed = true; }

        changed |= ClearTrayMqttHint(printer, 0);
        changed |= ClearTrayMqttHint(printer, 1);
        changed |= ClearTrayMqttHint(printer, 2);
        changed |= ClearTrayMqttHint(printer, 3);

        return changed;
    }

    private static bool ApplyTrayState(Printer printer, AmsTrayInfo tray, bool hasExplicitTrayExistBits)
    {
        var changed = false;
        if (GetRemain(printer, tray.TrayIndex) != tray.Remain)
        {
            SetRemain(printer, tray.TrayIndex, tray.Remain);
            changed = true;
        }

        if (hasExplicitTrayExistBits || tray.Occupied)
        {
            if (GetOccupied(printer, tray.TrayIndex) != tray.Occupied)
            {
                SetOccupied(printer, tray.TrayIndex, tray.Occupied);
                changed = true;
            }
        }

        if (tray.Occupied)
            changed |= SetTrayMqttHint(printer, tray.TrayIndex, tray);
        else
            changed |= ClearTrayMqttHint(printer, tray.TrayIndex);

        return changed;
    }

    private static bool ApplyExtraState(Printer printer, VtTrayInfo tray, bool hasExplicitOccupied)
    {
        var changed = false;
        if (printer.ExtraSpoolRemainPct != tray.Remain)
        {
            printer.ExtraSpoolRemainPct = tray.Remain;
            changed = true;
        }

        if (hasExplicitOccupied || tray.Occupied)
        {
            if (printer.ExtraSpoolOccupied != tray.Occupied)
            {
                printer.ExtraSpoolOccupied = tray.Occupied;
                changed = true;
            }
        }

        if (tray.Occupied)
            changed |= SetExtraMqttHint(printer, tray);
        else
            changed |= ClearExtraMqttHint(printer);

        return changed;
    }

    private static bool SetTrayMqttHint(Printer printer, int trayIndex, AmsTrayInfo tray)
    {
        var material = ResolveTrayMaterial(tray.TrayType, tray.TrayInfoIdx);
        var colorName = string.IsNullOrWhiteSpace(tray.TrayIdName) ? null : tray.TrayIdName;
        var colorHex = string.IsNullOrWhiteSpace(tray.TrayColor)
            ? null
            : AmsMqttTrayParser.ParseTrayColorHex(tray.TrayColor);
        var brand = BambuFilamentProfiles.ResolveBrand(
            tray.TraySubBrand, tray.TrayInfoIdx, tray.TrayIdName, tray.IsBambuFilament);

        return ApplyTrayMqttFields(printer, trayIndex, material, colorName, colorHex, brand);
    }

    private static bool SetExtraMqttHint(Printer printer, VtTrayInfo tray)
    {
        var material = ResolveTrayMaterial(tray.TrayType, tray.TrayInfoIdx);
        var colorName = string.IsNullOrWhiteSpace(tray.TrayIdName) ? null : tray.TrayIdName;
        var colorHex = string.IsNullOrWhiteSpace(tray.TrayColor)
            ? null
            : AmsMqttTrayParser.ParseTrayColorHex(tray.TrayColor);
        var brand = BambuFilamentProfiles.ResolveBrand(
            tray.TraySubBrand, tray.TrayInfoIdx, tray.TrayIdName, tray.IsBambuFilament);

        var changed = false;
        if (printer.ExtraMqttMaterial != material) { printer.ExtraMqttMaterial = material; changed = true; }
        if (printer.ExtraMqttColorName != colorName) { printer.ExtraMqttColorName = colorName; changed = true; }
        if (printer.ExtraMqttColorHex != colorHex) { printer.ExtraMqttColorHex = colorHex; changed = true; }
        if (printer.ExtraMqttBrand != brand) { printer.ExtraMqttBrand = brand; changed = true; }
        return changed;
    }

    private static bool ClearTrayMqttHint(Printer printer, int trayIndex) =>
        ApplyTrayMqttFields(printer, trayIndex, null, null, null, null);

    private static bool ClearExtraMqttHint(Printer printer)
    {
        var changed = false;
        if (printer.ExtraMqttMaterial is not null) { printer.ExtraMqttMaterial = null; changed = true; }
        if (printer.ExtraMqttColorName is not null) { printer.ExtraMqttColorName = null; changed = true; }
        if (printer.ExtraMqttColorHex is not null) { printer.ExtraMqttColorHex = null; changed = true; }
        if (printer.ExtraMqttBrand is not null) { printer.ExtraMqttBrand = null; changed = true; }
        return changed;
    }

    private static bool ApplyTrayMqttFields(
        Printer printer,
        int trayIndex,
        string? material,
        string? colorName,
        string? colorHex,
        string? brand)
    {
        var changed = false;
        switch (trayIndex)
        {
            case 0:
                if (printer.Tray1MqttMaterial != material) { printer.Tray1MqttMaterial = material; changed = true; }
                if (printer.Tray1MqttColorName != colorName) { printer.Tray1MqttColorName = colorName; changed = true; }
                if (printer.Tray1MqttColorHex != colorHex) { printer.Tray1MqttColorHex = colorHex; changed = true; }
                if (printer.Tray1MqttBrand != brand) { printer.Tray1MqttBrand = brand; changed = true; }
                break;
            case 1:
                if (printer.Tray2MqttMaterial != material) { printer.Tray2MqttMaterial = material; changed = true; }
                if (printer.Tray2MqttColorName != colorName) { printer.Tray2MqttColorName = colorName; changed = true; }
                if (printer.Tray2MqttColorHex != colorHex) { printer.Tray2MqttColorHex = colorHex; changed = true; }
                if (printer.Tray2MqttBrand != brand) { printer.Tray2MqttBrand = brand; changed = true; }
                break;
            case 2:
                if (printer.Tray3MqttMaterial != material) { printer.Tray3MqttMaterial = material; changed = true; }
                if (printer.Tray3MqttColorName != colorName) { printer.Tray3MqttColorName = colorName; changed = true; }
                if (printer.Tray3MqttColorHex != colorHex) { printer.Tray3MqttColorHex = colorHex; changed = true; }
                if (printer.Tray3MqttBrand != brand) { printer.Tray3MqttBrand = brand; changed = true; }
                break;
            case 3:
                if (printer.Tray4MqttMaterial != material) { printer.Tray4MqttMaterial = material; changed = true; }
                if (printer.Tray4MqttColorName != colorName) { printer.Tray4MqttColorName = colorName; changed = true; }
                if (printer.Tray4MqttColorHex != colorHex) { printer.Tray4MqttColorHex = colorHex; changed = true; }
                if (printer.Tray4MqttBrand != brand) { printer.Tray4MqttBrand = brand; changed = true; }
                break;
        }
        return changed;
    }

    private static string? FirstNonEmpty(params string?[] values) =>
        values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));

    private static string? ResolveTrayMaterial(string? trayType, string? trayInfoIdx)
    {
        var profileName = BambuFilamentProfiles.TryGetProfileName(trayInfoIdx);
        var (_, materialHint) = BambuFilamentProfiles.ParseProfileName(profileName);
        if (!string.IsNullOrWhiteSpace(materialHint))
            return materialHint;
        return string.IsNullOrWhiteSpace(trayType) ? null : trayType;
    }

    private static Spool BuildSpoolFromTray(Printer printer, AmsTrayInfo tray)
    {
        var initial = tray.TrayWeightG > 0 ? tray.TrayWeightG : 1000f;
        var current = tray.Remain >= 0 ? initial * tray.Remain / 100f : initial;
        var colorName = !string.IsNullOrWhiteSpace(tray.TrayIdName)
            ? tray.TrayIdName!
            : tray.TrayType ?? "AMS";

        return new Spool
        {
            Id = Guid.NewGuid(),
            Brand = string.IsNullOrWhiteSpace(printer.Brand) ? "Bambu Lab" : printer.Brand,
            Material = string.IsNullOrWhiteSpace(tray.TrayType) ? "PLA" : tray.TrayType!,
            ColorName = colorName,
            ColorHex = AmsMqttTrayParser.ParseTrayColorHex(tray.TrayColor),
            InitialWeightG = initial,
            CurrentWeightG = current,
            BambuTagUid = tray.TagUid,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
    }

    private static bool SyncSpoolWeight(Spool spool, int remain)
    {
        if (remain < 0 || spool.InitialWeightG <= 0) return false;
        var target = spool.InitialWeightG * remain / 100f;
        if (Math.Abs(spool.CurrentWeightG - target) < 0.5f) return false;
        spool.CurrentWeightG = Math.Max(0, target);
        return true;
    }

    private static bool LinkSpoolToTray(Printer printer, int trayIndex, Guid spoolId)
    {
        ClearSpoolFromPrinter(printer, spoolId);
        var slot = trayIndex + 1;
        if (GetTraySpoolId(printer, slot) == spoolId)
            return false;
        SetTraySpoolId(printer, slot, spoolId);
        return true;
    }

    private static bool LinkSpoolToExtra(Printer printer, Guid spoolId)
    {
        ClearSpoolFromPrinter(printer, spoolId);
        if (printer.ExtraSpoolId == spoolId)
            return false;
        printer.ExtraSpoolId = spoolId;
        return true;
    }

    private static bool ClearTraySlot(Printer printer, int trayIndex)
    {
        var slot = trayIndex + 1;
        var changed = ClearTrayMqttHint(printer, trayIndex);
        if (GetTraySpoolId(printer, slot) is null)
            return changed;
        SetTraySpoolId(printer, slot, null);
        return true;
    }

    private static bool ClearExtraSlot(Printer printer)
    {
        var changed = ClearExtraMqttHint(printer);
        if (printer.ExtraSpoolId is null)
            return changed;
        printer.ExtraSpoolId = null;
        return true;
    }

    private static void ClearSpoolFromPrinter(Printer printer, Guid spoolId)
    {
        if (printer.Tray1SpoolId == spoolId) printer.Tray1SpoolId = null;
        if (printer.Tray2SpoolId == spoolId) printer.Tray2SpoolId = null;
        if (printer.Tray3SpoolId == spoolId) printer.Tray3SpoolId = null;
        if (printer.Tray4SpoolId == spoolId) printer.Tray4SpoolId = null;
        if (printer.ExtraSpoolId == spoolId) printer.ExtraSpoolId = null;
    }

    private static int? GetRemain(Printer p, int trayIndex) => trayIndex switch
    {
        0 => p.Tray1RemainPct,
        1 => p.Tray2RemainPct,
        2 => p.Tray3RemainPct,
        3 => p.Tray4RemainPct,
        _ => null
    };

    private static void SetRemain(Printer p, int trayIndex, int value)
    {
        switch (trayIndex)
        {
            case 0: p.Tray1RemainPct = value; break;
            case 1: p.Tray2RemainPct = value; break;
            case 2: p.Tray3RemainPct = value; break;
            case 3: p.Tray4RemainPct = value; break;
        }
    }

    private static bool GetOccupied(Printer p, int trayIndex) => trayIndex switch
    {
        0 => p.Tray1Occupied,
        1 => p.Tray2Occupied,
        2 => p.Tray3Occupied,
        3 => p.Tray4Occupied,
        _ => false
    };

    private static void SetOccupied(Printer p, int trayIndex, bool value)
    {
        switch (trayIndex)
        {
            case 0: p.Tray1Occupied = value; break;
            case 1: p.Tray2Occupied = value; break;
            case 2: p.Tray3Occupied = value; break;
            case 3: p.Tray4Occupied = value; break;
        }
    }

    private static Guid? GetTraySpoolId(Printer p, int slot) => slot switch
    {
        1 => p.Tray1SpoolId,
        2 => p.Tray2SpoolId,
        3 => p.Tray3SpoolId,
        4 => p.Tray4SpoolId,
        _ => null
    };

    private static void SetTraySpoolId(Printer p, int slot, Guid? id)
    {
        switch (slot)
        {
            case 1: p.Tray1SpoolId = id; break;
            case 2: p.Tray2SpoolId = id; break;
            case 3: p.Tray3SpoolId = id; break;
            case 4: p.Tray4SpoolId = id; break;
        }
    }
}

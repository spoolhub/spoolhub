using Application.DTOs;
using Application.Interfaces;
using Microsoft.Extensions.Logging;
using PrinterEntity = Domain.Models.Printer;

namespace Infrastructure.Services.Printer;

public class PrinterService(
    IPrinterRepository printerRepository,
    ISpoolRepository spoolRepository,
    IActivityService activityService,
    IPrinterRealtimeNotifier printerNotifier,
    ILogger<PrinterService> logger) : IPrinterService
{
    public async Task<IEnumerable<PrinterResponse>> GetAllAsync()
    {
        var printers = (await printerRepository.GetAllAsync()).ToList();
        var spools = await LoadTraySpoolsAsync(printers.SelectMany(TrayIds));
        return printers.Select(p => ToResponse(p, spools));
    }

    public async Task<PrinterResponse?> GetByIdAsync(Guid id)
    {
        var printer = await printerRepository.GetByIdAsync(id);
        if (printer is null) return null;
        var spools = await LoadTraySpoolsAsync(TrayIds(printer));
        return ToResponse(printer, spools);
    }

    public async Task<PrinterResponse> RegisterLanAsync(RegisterLanPrinterRequest request)
    {
        var printer = new PrinterEntity
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Brand = request.Brand,
            Model = request.Model,
            SerialNumber = request.SerialNumber,
            IpAddress = request.IpAddress,
            Port = request.Port,
            Protocol = "mqtt_lan",
            HasAms = request.HasAms,
            AccessCode = request.AccessCode,
            CreatedAt = DateTime.UtcNow
        };

        var created = await printerRepository.CreateAsync(printer);
        logger.LogInformation("Registered LAN printer {Name}", created.Name);
        await activityService.LogAsync(
            "PrinterAdded", "Added", "Printer", created.Name, created.Id,
            $"Added {created.Name} printer (IP: {created.IpAddress})", "ti-printer");
        return ToResponse(created, []);
    }

    public async Task<PrinterResponse?> UpdateAsync(Guid id, UpdatePrinterRequest request)
    {
        var printer = await printerRepository.GetByIdAsync(id);
        if (printer is null) return null;

        if (request.Name is not null) printer.Name = request.Name;
        if (request.Brand is not null) printer.Brand = request.Brand;
        if (request.Model is not null) printer.Model = request.Model;
        if (request.SerialNumber is not null) printer.SerialNumber = request.SerialNumber;
        if (request.IpAddress is not null) printer.IpAddress = request.IpAddress;
        if (request.Port is not null) printer.Port = request.Port;
        if (request.Protocol is not null) printer.Protocol = request.Protocol;
        if (request.HasAms is not null) printer.HasAms = request.HasAms.Value;

        var updated = await printerRepository.UpdateAsync(printer);
        await activityService.LogAsync(
            "PrinterUpdated", "Updated", "Printer", updated.Name, updated.Id,
            $"Updated {updated.Name} printer", "ti-edit");
        var spools = await LoadTraySpoolsAsync(TrayIds(updated));
        return ToResponse(updated, spools);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var printer = await printerRepository.GetByIdAsync(id);
        if (printer is null) return false;

        // Unassign every spool linked to this printer before deleting it
        var assigned = TrayIds(printer).Distinct().ToList();
        foreach (var spoolId in assigned)
            await DeactivateSpoolAsync(spoolId);

        var name = printer.Name;
        await printerRepository.DeleteAsync(id);
        await activityService.LogAsync(
            "PrinterDeleted", "Deleted", "Printer", name, id,
            $"Deleted {name} printer", "ti-trash");
        return true;
    }

    public async Task<PrinterResponse?> AssignTraySpoolAsync(Guid printerId, int slot, Guid? spoolId, string? displacedStockLocation = null)
    {
        if (slot is < 1 or > 4) return null;

        var printer = await printerRepository.GetByIdAsync(printerId);
        if (printer is null) return null;

        var oldSpoolId = slot switch
        {
            1 => printer.Tray1SpoolId,
            2 => printer.Tray2SpoolId,
            3 => printer.Tray3SpoolId,
            4 => printer.Tray4SpoolId,
            _ => null
        };

        // Incoming spool: drop any prior printer/slot link so it only lives here
        if (spoolId.HasValue)
        {
            await ClearSpoolFromAnyPrinterAsync(spoolId.Value, exceptPrinterId: printerId);
            ClearSpoolFromPrinter(printer, spoolId.Value);
        }

        // Previous occupant of this slot → unassign (inactive / back in stock)
        if (oldSpoolId.HasValue && oldSpoolId != spoolId)
        {
            ClearSpoolFromPrinter(printer, oldSpoolId.Value);
            await DeactivateSpoolAsync(oldSpoolId.Value, displacedStockLocation);
        }

        switch (slot)
        {
            case 1: printer.Tray1SpoolId = spoolId; break;
            case 2: printer.Tray2SpoolId = spoolId; break;
            case 3: printer.Tray3SpoolId = spoolId; break;
            case 4: printer.Tray4SpoolId = spoolId; break;
        }

        var updated = await printerRepository.UpdateAsync(printer);

        if (spoolId.HasValue)
            await ActivateSpoolAsync(spoolId.Value);

        Guid[] extra = oldSpoolId.HasValue ? [oldSpoolId.Value] : [];
        var spools = await LoadTraySpoolsAsync(TrayIds(updated).Concat(extra));

        if (spoolId.HasValue && spools.TryGetValue(spoolId.Value, out var assignedSpool))
            await activityService.LogAsync(
                "SpoolAssigned", "Assigned", "Spool", $"{assignedSpool.Brand} {assignedSpool.ColorName}", spoolId,
                $"to {printer.Name} (Tray {slot})", "ti-printer", TraySpoolSnapshot(assignedSpool));
        else if (!spoolId.HasValue && oldSpoolId.HasValue && spools.TryGetValue(oldSpoolId.Value, out var removed))
            await activityService.LogAsync(
                "SpoolUnassigned", "Unassigned", "Spool", $"{removed.Brand} {removed.ColorName}", oldSpoolId,
                $"from {printer.Name} (Tray {slot})", "ti-printer-off", TraySpoolSnapshot(removed));

        await printerNotifier.NotifyPrinterUpdatedAsync(printerId, spoolId.HasValue || oldSpoolId.HasValue);
        return ToResponse(updated, spools);
    }

    public async Task<PrinterResponse?> AssignExtraSpoolAsync(Guid printerId, Guid? spoolId, string? displacedStockLocation = null)
    {
        var printer = await printerRepository.GetByIdAsync(printerId);
        if (printer is null) return null;

        var oldSpoolId = printer.ExtraSpoolId;

        if (spoolId.HasValue)
        {
            await ClearSpoolFromAnyPrinterAsync(spoolId.Value, exceptPrinterId: printerId);
            ClearSpoolFromPrinter(printer, spoolId.Value);
        }

        if (oldSpoolId.HasValue && oldSpoolId != spoolId)
        {
            ClearSpoolFromPrinter(printer, oldSpoolId.Value);
            await DeactivateSpoolAsync(oldSpoolId.Value, displacedStockLocation);
        }

        printer.ExtraSpoolId = spoolId;
        var updated = await printerRepository.UpdateAsync(printer);

        if (spoolId.HasValue)
            await ActivateSpoolAsync(spoolId.Value);

        Guid[] extra = oldSpoolId.HasValue ? [oldSpoolId.Value] : [];
        var spools = await LoadTraySpoolsAsync(TrayIds(updated).Concat(extra));

        if (spoolId.HasValue && spools.TryGetValue(spoolId.Value, out var assignedSpool))
            await activityService.LogAsync(
                "SpoolAssigned", "Assigned", "Spool", $"{assignedSpool.Brand} {assignedSpool.ColorName}", spoolId,
                $"to {printer.Name}", "ti-printer", TraySpoolSnapshot(assignedSpool));
        else if (!spoolId.HasValue && oldSpoolId.HasValue && spools.TryGetValue(oldSpoolId.Value, out var removed))
            await activityService.LogAsync(
                "SpoolUnassigned", "Unassigned", "Spool", $"{removed.Brand} {removed.ColorName}", oldSpoolId,
                $"from {printer.Name}", "ti-printer-off", TraySpoolSnapshot(removed));

        await printerNotifier.NotifyPrinterUpdatedAsync(printerId, spoolId.HasValue || oldSpoolId.HasValue);
        return ToResponse(updated, spools);
    }

    private async Task ClearSpoolFromAnyPrinterAsync(Guid spoolId, Guid exceptPrinterId)
    {
        var other = await printerRepository.GetBySpoolIdAsync(spoolId);
        if (other is null || other.Id == exceptPrinterId) return;
        ClearSpoolFromPrinter(other, spoolId);
        await printerRepository.UpdateAsync(other);
    }

    private static void ClearSpoolFromPrinter(PrinterEntity p, Guid spoolId)
    {
        if (p.Tray1SpoolId == spoolId) p.Tray1SpoolId = null;
        if (p.Tray2SpoolId == spoolId) p.Tray2SpoolId = null;
        if (p.Tray3SpoolId == spoolId) p.Tray3SpoolId = null;
        if (p.Tray4SpoolId == spoolId) p.Tray4SpoolId = null;
        if (p.ExtraSpoolId == spoolId) p.ExtraSpoolId = null;
    }

    private Task ActivateSpoolAsync(Guid spoolId) =>
        spoolRepository.SetActiveAsync(spoolId, true, clearStockLocation: true);

    private Task DeactivateSpoolAsync(Guid spoolId, string? stockLocation = null) =>
        spoolRepository.SetActiveAsync(spoolId, false, stockLocation: stockLocation);

    private static string TraySpoolSnapshot(TraySpoolSummary s) =>
        System.Text.Json.JsonSerializer.Serialize(new
        {
            brand = s.Brand, material = s.Material, colorName = s.ColorName, colorHex = s.ColorHex
        });

    private async Task<Dictionary<Guid, TraySpoolSummary>> LoadTraySpoolsAsync(IEnumerable<Guid> ids)
    {
        var idList = ids.Distinct().ToList();
        if (idList.Count == 0) return [];
        var spools = await spoolRepository.GetByIdsAsync(idList);
        return spools.ToDictionary(
            s => s.Id,
            s => new TraySpoolSummary(s.Id, s.Brand, s.Material, s.ColorName, s.ColorHex));
    }

    private static IEnumerable<Guid> TrayIds(PrinterEntity p) =>
        new[] { p.Tray1SpoolId, p.Tray2SpoolId, p.Tray3SpoolId, p.Tray4SpoolId, p.ExtraSpoolId }
            .Where(id => id.HasValue).Select(id => id!.Value);

    private static PrinterResponse ToResponse(PrinterEntity p, Dictionary<Guid, TraySpoolSummary> spools)
    {
        TraySpoolSummary? Tray(Guid? id) => id.HasValue && spools.TryGetValue(id.Value, out var s) ? s : null;
        return new PrinterResponse(
            p.Id, p.Name, p.Brand, p.Model,
            p.SerialNumber, p.IpAddress, p.Port, p.Protocol,
            p.HasAms, p.CreatedAt,
            Tray(p.Tray1SpoolId), Tray(p.Tray2SpoolId),
            Tray(p.Tray3SpoolId), Tray(p.Tray4SpoolId),
            Tray(p.ExtraSpoolId),
            p.Tray1RemainPct, p.Tray2RemainPct, p.Tray3RemainPct, p.Tray4RemainPct,
            p.Tray1Occupied, p.Tray2Occupied, p.Tray3Occupied, p.Tray4Occupied,
            p.ExtraSpoolOccupied, p.ExtraSpoolRemainPct,
            TrayMqtt(p.Tray1MqttMaterial, p.Tray1MqttColorName, p.Tray1MqttColorHex, p.Tray1MqttBrand),
            TrayMqtt(p.Tray2MqttMaterial, p.Tray2MqttColorName, p.Tray2MqttColorHex, p.Tray2MqttBrand),
            TrayMqtt(p.Tray3MqttMaterial, p.Tray3MqttColorName, p.Tray3MqttColorHex, p.Tray3MqttBrand),
            TrayMqtt(p.Tray4MqttMaterial, p.Tray4MqttColorName, p.Tray4MqttColorHex, p.Tray4MqttBrand),
            TrayMqtt(p.ExtraMqttMaterial, p.ExtraMqttColorName, p.ExtraMqttColorHex, p.ExtraMqttBrand));
    }

    private static TrayMqttHint? TrayMqtt(string? material, string? colorName, string? colorHex, string? brand)
    {
        if (string.IsNullOrWhiteSpace(material)
            && string.IsNullOrWhiteSpace(colorName)
            && string.IsNullOrWhiteSpace(colorHex))
            return null;
        return new TrayMqttHint(material, colorName, colorHex, brand);
    }
}

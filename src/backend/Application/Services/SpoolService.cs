using Application.DTOs;
using Application.Interfaces;
using Domain.Models;
using PrinterModel = Domain.Models.Printer;

namespace Application.Services;

public class SpoolService(
    ISpoolRepository spoolRepository,
    IActivityService activityService,
    INfcTagService nfcTagService,
    IRealtimeNotifier notifier,
    IPrintJobRepository printJobRepository,
    IPrinterRepository printerRepository) : ISpoolService
{
    public async Task<IEnumerable<SpoolResponse>> GetAllAsync()
    {
        var spools = await spoolRepository.GetAllAsync();
        var map = await BuildPrinterMapAsync();
        return spools.Select(s =>
        {
            var info = map.TryGetValue(s.Id, out var p) ? p : default;
            return ToResponse(s, info);
        });
    }

    public async Task<SpoolResponse?> GetByIdAsync(Guid id)
    {
        var spool = await spoolRepository.GetByIdAsync(id);
        if (spool is null) return null;
        var printer = await printerRepository.GetBySpoolIdAsync(id);
        return ToResponse(spool, PrinterInfoFor(printer, id));
    }

    public async Task<SpoolResponse> AddAsync(AddSpoolRequest request)
    {
        var spool = new Spool
        {
            Id = Guid.NewGuid(),
            Brand = request.Brand,
            Material = request.Material,
            ColorName = request.ColorName,
            ColorHex = request.ColorHex,
            InitialWeightG = request.InitialWeightG,
            CurrentWeightG = request.CurrentWeightG,
            SpoolWeightG = request.SpoolWeightG,
            LowStockThresholdG = request.LowStockThresholdG,
            IsActive = request.IsActive,
            Notes = request.Notes,
            Density = request.Density,
            DiameterTolerance = request.DiameterTolerance,
            ExtruderMin = request.ExtruderMin,
            ExtruderMax = request.ExtruderMax,
            BedMin = request.BedMin,
            BedMax = request.BedMax,
            Price = request.Price,
            StockLocation = request.StockLocation,
            CreatedAt = DateTime.UtcNow
        };

        var created = await spoolRepository.CreateAsync(spool);
        var name = SpoolName(created);

        if (!string.IsNullOrWhiteSpace(request.TagUid))
            await nfcTagService.RegisterAsync(
                new RegisterNfcTagRequest(request.TagUid, created.Id, "NFC"), silent: true);

        var tagNote = !string.IsNullOrWhiteSpace(request.TagUid) ? $"NFC: {request.TagUid}" : string.Empty;
        await activityService.LogAsync(
            "SpoolCreated", "Added", "Spool", name, created.Id,
            tagNote, "ti-circle-plus", SpoolSnapshot(created));
        return ToResponse(created);
    }

    public async Task<SpoolResponse?> ActivateAsync(Guid id)
    {
        var target = await spoolRepository.GetByIdAsync(id);
        if (target is null) return null;

        target.IsActive = true;
        target.LastScannedAt = DateTime.UtcNow;
        var updated = await spoolRepository.UpdateAsync(target);
        var name = SpoolName(updated);

        var printer = await printerRepository.GetBySpoolIdAsync(id);
        var printerNote = printer?.Name is { } p ? $"on {p}" : string.Empty;
        await activityService.LogAsync(
            "SpoolActivated", "Activated", "Spool", name, updated.Id,
            printerNote, "ti-circle-check", SpoolSnapshot(updated));
        var response = ToResponse(updated, PrinterInfoFor(printer, id));
        await notifier.SpoolUpdatedAsync(response);
        return response;
    }

    public async Task<SpoolResponse?> DeactivateAsync(Guid id)
    {
        var target = await spoolRepository.GetByIdAsync(id);
        if (target is null) return null;

        var printer = await printerRepository.GetBySpoolIdAsync(id);
        if (printer is not null)
        {
            ClearSpoolFromPrinter(printer, id);
            await printerRepository.UpdateAsync(printer);
        }

        target.IsActive = false;
        target.LastScannedAt = DateTime.UtcNow;
        var updated = await spoolRepository.UpdateAsync(target);
        var name = SpoolName(updated);
        var printerNote = printer?.Name is { } p ? $"from {p} - Stock" : "moved to Stock";
        await activityService.LogAsync(
            "SpoolDeactivated", "Deactivated", "Spool", name, updated.Id,
            printerNote, "ti-circle-minus", SpoolSnapshot(updated));
        var response = ToResponse(updated);
        await notifier.SpoolUpdatedAsync(response);
        return response;
    }

    public async Task<SpoolResponse?> UpdateAsync(Guid id, UpdateSpoolRequest request)
    {
        var spool = await spoolRepository.GetByIdAsync(id);
        if (spool is null) return null;

        var oldBrand = spool.Brand;
        var oldMaterial = spool.Material;
        var oldColorName = spool.ColorName;
        var oldWeight = spool.CurrentWeightG;
        var oldNotes = spool.Notes;

        if (request.Brand is not null) spool.Brand = request.Brand;
        if (request.Material is not null) spool.Material = request.Material;
        if (request.ColorName is not null) spool.ColorName = request.ColorName;
        if (request.ColorHex is not null) spool.ColorHex = request.ColorHex;
        if (request.CurrentWeightG is not null) spool.CurrentWeightG = request.CurrentWeightG.Value;
        if (request.InitialWeightG is not null) spool.InitialWeightG = request.InitialWeightG.Value;
        if (request.SpoolWeightG is not null) spool.SpoolWeightG = request.SpoolWeightG.Value;
        if (request.LowStockThresholdG is not null) spool.LowStockThresholdG = request.LowStockThresholdG.Value;
        if (request.Notes is not null) spool.Notes = request.Notes;
        if (request.IsActive is not null && spool.IsActive != request.IsActive.Value)
        {
            spool.IsActive = request.IsActive.Value;
            spool.LastScannedAt = DateTime.UtcNow;
        }
        if (request.Price is not null) spool.Price = request.Price;
        if (request.StockLocation is not null) spool.StockLocation = request.StockLocation == "" ? null : request.StockLocation;
        if (request.Density is not null) spool.Density = request.Density;
        if (request.DiameterTolerance is not null) spool.DiameterTolerance = request.DiameterTolerance;
        if (request.ExtruderMin is not null) spool.ExtruderMin = request.ExtruderMin;
        if (request.ExtruderMax is not null) spool.ExtruderMax = request.ExtruderMax;
        if (request.BedMin is not null) spool.BedMin = request.BedMin;
        if (request.BedMax is not null) spool.BedMax = request.BedMax;

        var updated = await spoolRepository.UpdateAsync(spool);
        var name = SpoolName(updated);

        var changes = new List<string>();
        if (request.Brand is not null && request.Brand != oldBrand)
            changes.Add($"brand: {oldBrand} → {request.Brand}");
        if (request.Material is not null && request.Material != oldMaterial)
            changes.Add($"material: {oldMaterial} → {request.Material}");
        if (request.ColorName is not null && request.ColorName != oldColorName)
            changes.Add($"color: {oldColorName} → {request.ColorName}");
        if (request.CurrentWeightG is not null && Math.Abs(oldWeight - request.CurrentWeightG.Value) > 0.01f)
            changes.Add($"weight: {oldWeight:F0}g → {request.CurrentWeightG.Value:F0}g");
        if (request.Notes is not null && request.Notes != oldNotes)
            changes.Add("notes updated");

        var description = string.Join(", ", changes);
        await activityService.LogAsync(
            "SpoolUpdated", "Updated", "Spool", name, updated.Id,
            description, "ti-edit", SpoolSnapshot(updated));

        var printer = await printerRepository.GetBySpoolIdAsync(id);
        var response = ToResponse(updated, PrinterInfoFor(printer, id));
        await notifier.SpoolUpdatedAsync(response);
        return response;
    }

    public async Task<SpoolResponse?> AssignPrinterAsync(Guid id, Guid? printerId, int? amsSlot)
    {
        var spool = await spoolRepository.GetByIdAsync(id);
        if (spool is null) return null;

        // Clear this spool from whatever printer currently has it
        var oldPrinter = await printerRepository.GetBySpoolIdAsync(id);
        string? oldPrinterName = null;
        if (oldPrinter is not null)
        {
            oldPrinterName = oldPrinter.Name;
            ClearSpoolFromPrinter(oldPrinter, id);
        }

        string? newPrinterName = null;
        int? newAmsSlot = null;
        if (printerId.HasValue)
        {
            var printer = oldPrinter?.Id == printerId.Value
                ? oldPrinter
                : await printerRepository.GetByIdAsync(printerId.Value);
            if (printer is null) return null;

            // Deactivate any spool already in the target tray
            var prevSpoolId = amsSlot.HasValue ? GetTraySpoolId(printer, amsSlot.Value) : printer.ExtraSpoolId;
            if (prevSpoolId.HasValue && prevSpoolId != id)
                await spoolRepository.SetActiveAsync(prevSpoolId.Value, false);

            if (amsSlot.HasValue)
                SetTraySpoolId(printer, amsSlot.Value, id);
            else
                printer.ExtraSpoolId = id;

            await printerRepository.UpdateAsync(printer);
            if (oldPrinter is not null && oldPrinter.Id != printer.Id)
                await printerRepository.UpdateAsync(oldPrinter);

            newPrinterName = printer.Name;
            newAmsSlot = amsSlot;
        }
        else if (oldPrinter is not null)
        {
            await printerRepository.UpdateAsync(oldPrinter);
        }

        spool.IsActive = printerId.HasValue;
        if (printerId.HasValue) spool.StockLocation = null;
        spool.LastScannedAt = DateTime.UtcNow;
        var updated = await spoolRepository.UpdateAsync(spool);
        var name = SpoolName(updated);

        if (printerId.HasValue)
        {
            var activeJob = await printJobRepository.GetActiveByPrinterIdAsync(printerId.Value);
            if (activeJob is not null && activeJob.SpoolId != spool.Id)
            {
                activeJob.SpoolId = spool.Id;
                activeJob.LastUpdatedAt = DateTime.UtcNow;
                await printJobRepository.UpdateAsync(activeJob);
            }

            var slotNote = amsSlot.HasValue ? $", AMS slot {amsSlot}" : string.Empty;
            await activityService.LogAsync(
                "SpoolAssigned", "Assigned", "Spool", name, updated.Id,
                $"to {newPrinterName}{slotNote}", "ti-printer", SpoolSnapshot(updated));
        }
        else
        {
            var fromNote = oldPrinterName is { } p ? $"from {p}" : string.Empty;
            await activityService.LogAsync(
                "SpoolUnassigned", "Unassigned", "Spool", name, updated.Id,
                fromNote, "ti-printer-off", SpoolSnapshot(updated));
        }

        var printerInfo = printerId.HasValue
            ? ((Guid?)printerId.Value, newPrinterName, newAmsSlot)
            : default;
        var response = ToResponse(updated, printerInfo);
        await notifier.SpoolUpdatedAsync(response);
        return response;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var spool = await spoolRepository.GetByIdAsync(id);
        if (spool is null) return false;

        var name = SpoolName(spool);
        var snap = SpoolSnapshot(spool);
        await spoolRepository.DeleteAsync(id);
        await activityService.LogAsync(
            "SpoolDeleted", "Deleted", "Spool", name, id,
            string.Empty, "ti-trash", snap);
        return true;
    }

    public async Task<(int Added, int Removed)> GetMonthlyStatsAsync()
        => await spoolRepository.GetMonthlyStatsAsync();

    // ── Printer assignment helpers ──────────────────────────────────────────

    private async Task<Dictionary<Guid, (Guid? Id, string? Name, int? Slot)>> BuildPrinterMapAsync()
    {
        var printers = await printerRepository.GetAllAsync();
        var map = new Dictionary<Guid, (Guid?, string?, int?)>();
        foreach (var p in printers)
        {
            if (p.Tray1SpoolId.HasValue) map[p.Tray1SpoolId.Value] = (p.Id, p.Name, 1);
            if (p.Tray2SpoolId.HasValue) map[p.Tray2SpoolId.Value] = (p.Id, p.Name, 2);
            if (p.Tray3SpoolId.HasValue) map[p.Tray3SpoolId.Value] = (p.Id, p.Name, 3);
            if (p.Tray4SpoolId.HasValue) map[p.Tray4SpoolId.Value] = (p.Id, p.Name, 4);
            if (p.ExtraSpoolId.HasValue) map[p.ExtraSpoolId.Value] = (p.Id, p.Name, null);
        }
        return map;
    }

    private static (Guid? Id, string? Name, int? Slot) PrinterInfoFor(PrinterModel? printer, Guid spoolId) =>
        printer is null ? default : (printer.Id, printer.Name, GetSlotForSpool(printer, spoolId));

    private static void ClearSpoolFromPrinter(PrinterModel p, Guid spoolId)
    {
        if (p.Tray1SpoolId == spoolId) p.Tray1SpoolId = null;
        if (p.Tray2SpoolId == spoolId) p.Tray2SpoolId = null;
        if (p.Tray3SpoolId == spoolId) p.Tray3SpoolId = null;
        if (p.Tray4SpoolId == spoolId) p.Tray4SpoolId = null;
        if (p.ExtraSpoolId == spoolId) p.ExtraSpoolId = null;
    }

    private static int? GetSlotForSpool(PrinterModel p, Guid spoolId)
    {
        if (p.Tray1SpoolId == spoolId) return 1;
        if (p.Tray2SpoolId == spoolId) return 2;
        if (p.Tray3SpoolId == spoolId) return 3;
        if (p.Tray4SpoolId == spoolId) return 4;
        return null;
    }

    private static Guid? GetTraySpoolId(PrinterModel p, int slot) => slot switch
    {
        1 => p.Tray1SpoolId, 2 => p.Tray2SpoolId,
        3 => p.Tray3SpoolId, 4 => p.Tray4SpoolId,
        _ => null
    };

    private static void SetTraySpoolId(PrinterModel p, int slot, Guid id)
    {
        switch (slot)
        {
            case 1: p.Tray1SpoolId = id; break;
            case 2: p.Tray2SpoolId = id; break;
            case 3: p.Tray3SpoolId = id; break;
            case 4: p.Tray4SpoolId = id; break;
        }
    }

    // ── Response helpers ────────────────────────────────────────────────────

    private static string SpoolName(Spool s) => $"{s.Brand} {s.ColorName}";

    private static string SpoolSnapshot(Spool s) =>
        System.Text.Json.JsonSerializer.Serialize(new
        {
            material      = s.Material,
            colorHex      = s.ColorHex,
            weight        = (int)Math.Round(s.CurrentWeightG),
            brand         = s.Brand,
            colorName     = s.ColorName,
            stockLocation = s.StockLocation,
        });

    private static SpoolResponse ToResponse(Spool s, (Guid? Id, string? Name, int? Slot) printer = default) => new(
        s.Id, s.Brand, s.Material, s.ColorName, s.ColorHex,
        s.InitialWeightG, s.CurrentWeightG, s.SpoolWeightG, s.LowStockThresholdG,
        s.IsActive, s.IsArchived, s.CreatedAt, s.LastScannedAt,
        s.Notes, s.Density, s.DiameterTolerance, s.ExtruderMin, s.ExtruderMax, s.BedMin, s.BedMax,
        s.NfcTags.Any(), s.NfcTags.FirstOrDefault()?.TagUid,
        printer.Id, printer.Name, printer.Slot,
        s.Price, s.StockLocation);
}

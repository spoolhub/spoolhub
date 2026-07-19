using Application.DTOs;
using Application.Interfaces;
using Domain.Models;
using Infrastructure.Services.BambuLab;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/printers")]
public class PrinterController(
    IPrinterService printerService,
    IPrinterStatusService printerStatusService,
    IPrintJobRepository printJobRepository,
    ICloudPrinterRegistrationService cloudRegistrationService,
    IPrinterMqttPreviewService mqttPreviewService,
    IAlertService alertService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAllPrinters()
    {
        var printers = await printerService.GetAllAsync();
        return Ok(printers);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetPrinterById(Guid id)
    {
        var printer = await printerService.GetByIdAsync(id);
        return printer is null ? NotFound() : Ok(printer);
    }

    // Scan LAN for Bambu printers via UDP broadcast on port 2021
    [HttpGet("discover/lan")]
    public async Task<IActionResult> DiscoverLan(CancellationToken ct)
    {
        var scanTask    = LanService.ScanAsync(ct);
        var existingTask = printerService.GetAllAsync();
        await Task.WhenAll(scanTask, existingTask);

        var existingSerials = existingTask.Result
            .Where(p => !string.IsNullOrEmpty(p.SerialNumber))
            .Select(p => p.SerialNumber!)
            .ToHashSet();
        var existingIps = existingTask.Result
            .Where(p => !string.IsNullOrEmpty(p.IpAddress))
            .Select(p => p.IpAddress!)
            .ToHashSet();

        var filtered = scanTask.Result
            .Where(p => !existingSerials.Contains(p.SerialNumber) && !existingIps.Contains(p.IpAddress))
            .ToList();

        return Ok(filtered);
    }

    // LAN registration — validates access code against printer before saving
    [HttpPost("register/lan")]
    public async Task<IActionResult> RegisterLan([FromBody] RegisterLanPrinterRequest request, CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(request.AccessCode))
        {
            var error = await LanService.TestConnectionAsync(request.IpAddress, request.AccessCode, ct);
            if (error is not null)
                return BadRequest(new { error });
        }

        var printer = await printerService.RegisterLanAsync(request);
        return CreatedAtAction(nameof(GetPrinterById), new { id = printer.Id }, printer);
    }

    // Cloud login — body: { brand, email, password }
    // Returns either { requiresVerification: true } or the printer list as JSON
    [HttpPost("register/cloud")]
    public async Task<IActionResult> RegisterCloud([FromBody] CloudLoginRequest request, CancellationToken ct)
    {
        var result = await cloudRegistrationService.LoginAsync(request, ct);
        if (result.ErrorMessage is not null)
            return BadRequest(new ProblemDetails { Status = 400, Title = "Bad Request", Detail = result.ErrorMessage });
        return Ok(result);
    }

    // Submit 2FA code — returns available printers for the user to select from
    [HttpPost("cloud/verify")]
    public async Task<IActionResult> VerifyCloud([FromBody] CloudVerifyRequest request, CancellationToken ct)
    {
        var result = await cloudRegistrationService.VerifyAsync(request, ct);
        if (result.ErrorMessage is not null)
            return BadRequest(new ProblemDetails { Status = 400, Title = "Bad Request", Detail = result.ErrorMessage });
        return Ok(result.AvailablePrinters ?? []);
    }

    // Save selected cloud printers — body: { serials: ["ABC123", ...] }
    [HttpPost("cloud/select")]
    public async Task<IActionResult> SelectCloud([FromBody] CloudSelectRequest request, CancellationToken ct)
    {
        var saved = await cloudRegistrationService.SelectAsync(request.Serials, ct);
        return Ok(saved);
    }

    [HttpPost("cloud/preview")]
    public async Task<IActionResult> PreviewCloudPrinter([FromBody] CloudPrinterPreviewRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.SerialNumber))
            return BadRequest(new { error = "SerialNumber is required" });

        var preview = await mqttPreviewService.PreviewCloudAsync(request.SerialNumber, ct);
        return preview is null ? NoContent() : Ok(preview);
    }

    [HttpPost("discover/lan/preview")]
    public async Task<IActionResult> PreviewLanPrinter([FromBody] LanPrinterPreviewRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.SerialNumber)
            || string.IsNullOrWhiteSpace(request.IpAddress)
            || string.IsNullOrWhiteSpace(request.AccessCode))
            return BadRequest(new { error = "SerialNumber, IpAddress, and AccessCode are required" });

        var preview = await mqttPreviewService.PreviewLanAsync(
            request.SerialNumber, request.IpAddress, request.AccessCode, ct);
        return preview is null ? NoContent() : Ok(preview);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdatePrinter(Guid id, [FromBody] UpdatePrinterRequest request)
    {
        var printer = await printerService.UpdateAsync(id, request);
        return printer is null ? NotFound() : Ok(printer);
    }

    [HttpPut("{id:guid}/trays/{slot:int}")]
    public async Task<IActionResult> AssignTraySpool(Guid id, int slot, [FromBody] AssignTraySpoolRequest request)
    {
        if (slot < 1 || slot > 4)
            return BadRequest(new { error = "Slot must be between 1 and 4" });
        var printer = await printerService.AssignTraySpoolAsync(id, slot, request.SpoolId, request.DisplacedStockLocation);
        return printer is null ? NotFound() : Ok(printer);
    }

    [HttpPut("{id:guid}/extra-spool")]
    public async Task<IActionResult> AssignExtraSpool(Guid id, [FromBody] AssignTraySpoolRequest request)
    {
        var printer = await printerService.AssignExtraSpoolAsync(id, request.SpoolId, request.DisplacedStockLocation);
        return printer is null ? NotFound() : Ok(printer);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeletePrinter(Guid id)
    {
        var printer = await printerService.GetByIdAsync(id);
        var deleted = await printerService.DeleteAsync(id);
        if (!deleted) return NotFound();
        if (printer is not null)
            await alertService.NotifyPrinterDeletedAsync(printer.Name);
        return NoContent();
    }

    [HttpGet("{id:guid}/jobs")]
    public async Task<IActionResult> GetPrinterJobs(Guid id)
    {
        var jobs = await printJobRepository.GetByPrinterIdAsync(id);
        var response = jobs.Select(j => new PrintJobResponse(
            Id:                  j.Id,
            PrinterId:           j.PrinterId,
            PrinterName:         j.Printer?.Name,
            SpoolId:             j.SpoolId,
            SpoolBrand:          j.Spool?.Brand,
            SpoolColorName:      j.Spool?.ColorName,
            SpoolColorHex:       j.Spool?.ColorHex,
            SpoolMaterial:       j.Spool?.Material,
            PrintFileName:       j.PrintFileName,
            TaskId:              j.TaskId,
            Status:              j.Status.ToString().ToLowerInvariant(),
            GramsUsed:           j.GramsUsed,
            FilamentDeducted:    j.FilamentDeducted,
            StartedAt:           j.StartedAt,
            FinishedAt:          j.FinishedAt,
            EstimatedFinishTime: j.EstimatedFinishTime,
            Source:              j.Source,
            Notes:               j.Notes,
            Filaments:           j.Filaments
                                   .OrderBy(f => f.SlotIndex)
                                   .Select(f => new PrintJobFilamentResponse(f.Id, f.SpoolId, f.ColorName, f.ColorHex, f.Material, f.GramsUsed, f.SlotIndex))
                                   .ToList()));
        return Ok(response);
    }

    [HttpGet("{id:guid}/status")]
    public async Task<IActionResult> GetStatus(Guid id)
    {
        var status = printerStatusService.GetStatus(id);

        // The card's printing/paused/idle state must reflect the persisted PrintJob.Status,
        // not the raw MQTT gcode_state — MQTT only supplies live telemetry (progress, temps).
        var activeJob = await printJobRepository.GetActiveByPrinterIdAsync(id);
        var gcodeState = activeJob?.Status switch
        {
            PrintJobStatus.Running => "RUNNING",
            PrintJobStatus.Paused  => "PAUSE",
            _                      => status?.ConnectionError != null ? status.GcodeState : "IDLE"
        };

        if (status is null)
        {
            // No live MQTT telemetry cached (e.g. server just restarted, or a seeded/offline
            // printer) — still surface the DB-backed job status rather than reporting nothing.
            if (activeJob is null) return NoContent();
            return Ok(new PrinterStatus(
                GcodeState:       gcodeState,
                ProgressPercent:  0,
                RemainingMinutes: activeJob.EstimatedFinishTime ?? 0,
                SubtaskName:      activeJob.PrintFileName,
                LayerNum:         0,
                TotalLayerNum:    0,
                NozzleTempC:      0,
                BedTempC:         0,
                UpdatedAt:        activeJob.LastUpdatedAt));
        }

        return Ok(status with { GcodeState = gcodeState });
    }

    [HttpPost("{id:guid}/status/mock")]
    public IActionResult MockStatus(Guid id, [FromBody] MockPrinterStatusRequest req)
    {
        printerStatusService.UpdateStatus(id, new PrinterStatus(
            GcodeState:       req.GcodeState,
            ProgressPercent:  req.ProgressPercent,
            RemainingMinutes: req.RemainingMinutes,
            SubtaskName:      req.SubtaskName,
            LayerNum:         req.LayerNum,
            TotalLayerNum:    req.TotalLayerNum,
            NozzleTempC:      req.NozzleTempC,
            BedTempC:         req.BedTempC,
            UpdatedAt:        DateTime.UtcNow));
        return Ok();
    }
}

using Application.DTOs;
using Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/spools")]
public class SpoolController(ISpoolService spoolService, IPrintJobRepository printJobRepository, IAlertService alertService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAllSpools()
    {
        var spools = await spoolService.GetAllAsync();
        return Ok(spools);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetSpoolById(Guid id)
    {
        var spool = await spoolService.GetByIdAsync(id);
        return spool is null ? NotFound() : Ok(spool);
    }

    [HttpPost]
    public async Task<IActionResult> AddSpool([FromBody] AddSpoolRequest request)
    {
        var spool = await spoolService.AddAsync(request);
        await alertService.NotifySpoolAddedAsync(spool.Brand, spool.Material, spool.ColorName, spool.ColorHex);
        return CreatedAtAction(nameof(GetSpoolById), new { id = spool.Id }, spool);
    }

    [HttpPatch("activate/{id:guid}")]
    public async Task<IActionResult> ActivateSpool(Guid id)
    {
        var spool = await spoolService.ActivateAsync(id);
        return spool is null ? NotFound() : Ok(spool);
    }

    [HttpPatch("deactivate/{id:guid}")]
    public async Task<IActionResult> DeactivateSpool(Guid id)
    {
        var spool = await spoolService.DeactivateAsync(id);
        return spool is null ? NotFound() : Ok(spool);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateSpool(Guid id, [FromBody] UpdateSpoolRequest request)
    {
        var spool = await spoolService.UpdateAsync(id, request);
        return spool is null ? NotFound() : Ok(spool);
    }

    [HttpPatch("{id:guid}/assign-printer")]
    public async Task<IActionResult> AssignPrinter(Guid id, [FromBody] AssignPrinterRequest request)
    {
        var spool = await spoolService.AssignPrinterAsync(id, request.PrinterId, request.AmsSlot, request.DisplacedStockLocation);
        if (spool is null) return NotFound();
        if (spool.PrinterName is not null)
            await alertService.NotifySpoolAssignedAsync(spool.Brand, spool.Material, spool.ColorName, spool.ColorHex, spool.PrinterName);
        return Ok(spool);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteSpool(Guid id)
    {
        var spool   = await spoolService.GetByIdAsync(id);
        var deleted = await spoolService.DeleteAsync(id);
        if (!deleted) return NotFound();
        if (spool is not null)
            await alertService.NotifySpoolDeletedAsync(spool.Brand, spool.Material, spool.ColorName, spool.ColorHex);
        return NoContent();
    }

    [HttpGet("monthly-stats")]
    public async Task<IActionResult> GetMonthlyStats()
    {
        var (added, removed) = await spoolService.GetMonthlyStatsAsync();
        return Ok(new Application.DTOs.SpoolMonthlyStats(added, removed));
    }

    [HttpGet("{id:guid}/jobs")]
    public async Task<IActionResult> GetSpoolJobs(Guid id)
    {
        var jobs = await printJobRepository.GetBySpoolIdAsync(id);
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
}

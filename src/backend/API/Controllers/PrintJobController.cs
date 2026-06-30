using System.ComponentModel.DataAnnotations;
using Application.DTOs;
using Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/print-jobs")]
public class PrintJobController(IPrintJobRepository printJobRepository) : ControllerBase
{
    [HttpGet("recent")]
    public async Task<IActionResult> GetRecent([FromQuery][Range(1, 50)] int limit = 5)
    {
        var jobs = await printJobRepository.GetRecentAsync(limit);
        return Ok(jobs.Select(MapJob));
    }

    [HttpGet]
    public async Task<IActionResult> GetPaged(
        [FromQuery] int page = 1,
        [FromQuery][Range(1, 100)] int limit = 20,
        [FromQuery] string? status = null,
        [FromQuery] Guid? printerId = null,
        [FromQuery] Guid? spoolId = null,
        [FromQuery] string? search = null,
        [FromQuery] string? sortBy = null)
    {
        var (jobs, total) = await printJobRepository.GetPagedAsync(page, limit, status, printerId, spoolId, search, sortBy);
        return Ok(new { total, page, limit, jobs = jobs.Select(MapJob) });
    }

    [HttpGet("usage")]
    public async Task<IActionResult> GetUsage([FromQuery] string since)
    {
        if (!DateTime.TryParse(since, out var sinceDate))
            return BadRequest("Invalid since date");
        var total = await printJobRepository.GetUsageSinceAsync(sinceDate);
        return Ok(new { totalGrams = total });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var job = await printJobRepository.GetByIdAsync(id);
        if (job is null) return NotFound();
        return Ok(MapJob(job));
    }

    private static PrintJobResponse MapJob(Domain.Models.PrintJob j) => new(
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
                               .ToList());
}

using Application.Interfaces;
using Domain.Models;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public class PrintJobRepository(FilamentDbContext db) : IPrintJobRepository
{
    public async Task<IEnumerable<PrintJob>> GetBySpoolIdAsync(Guid spoolId)
    {
        return await db.PrintJobs
            .Include(j => j.Spool)
            .Include(j => j.Filaments)
            .Where(j => j.SpoolId == spoolId)
            .OrderByDescending(j => j.StartedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<PrintJob>> GetByPrinterIdAsync(Guid printerId)
    {
        return await db.PrintJobs
            .Include(j => j.Spool)
            .Include(j => j.Filaments)
            .Where(j => j.PrinterId == printerId)
            .OrderByDescending(j => j.StartedAt)
            .ToListAsync();
    }

    public async Task<IEnumerable<PrintJob>> GetRecentAsync(int limit)
    {
        return await db.PrintJobs
            .Include(j => j.Spool)
            .Include(j => j.Printer)
            .Include(j => j.Filaments)
            .OrderByDescending(j => j.StartedAt)
            .Take(limit)
            .ToListAsync();
    }

    public async Task<IEnumerable<PrintJob>> GetRunningAsync()
    {
        return await db.PrintJobs
            .Where(j => j.Status == PrintJobStatus.Running)
            .ToListAsync();
    }

    public async Task<PrintJob?> GetRunningByPrinterIdAsync(Guid printerId)
    {
        return await db.PrintJobs
            .Where(j => j.PrinterId == printerId && j.Status == PrintJobStatus.Running)
            .OrderByDescending(j => j.StartedAt)
            .FirstOrDefaultAsync();
    }

    public async Task<PrintJob?> GetActiveByPrinterIdAsync(Guid printerId)
    {
        return await db.PrintJobs
            .Where(j => j.PrinterId == printerId &&
                        (j.Status == PrintJobStatus.Running || j.Status == PrintJobStatus.Paused))
            .OrderByDescending(j => j.StartedAt)
            .FirstOrDefaultAsync();
    }

    public async Task<PrintJob?> GetByTaskIdAsync(string taskId)
    {
        return await db.PrintJobs
            .FirstOrDefaultAsync(j => j.TaskId == taskId);
    }

    public async Task<PrintJob?> GetByIdAsync(Guid id)
    {
        return await db.PrintJobs
            .Include(j => j.Printer)
            .Include(j => j.Spool)
            .Include(j => j.Filaments)
            .FirstOrDefaultAsync(j => j.Id == id);
    }

    public async Task<(IEnumerable<PrintJob> Jobs, int Total)> GetPagedAsync(
        int page, int limit,
        string? status = null,
        Guid? printerId = null,
        Guid? spoolId = null,
        string? search = null,
        string? sortBy = null)
    {
        var query = db.PrintJobs
            .Include(j => j.Printer)
            .Include(j => j.Spool)
            .Include(j => j.Filaments)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<PrintJobStatus>(status, ignoreCase: true, out var parsedStatus))
            query = query.Where(j => j.Status == parsedStatus);

        if (printerId.HasValue)
            query = query.Where(j => j.PrinterId == printerId.Value);

        if (spoolId.HasValue)
            query = query.Where(j => j.SpoolId == spoolId.Value);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(j => j.PrintFileName != null &&
                                     j.PrintFileName.ToLower().Contains(search.ToLower()));

        var total = await query.CountAsync();

        query = sortBy switch
        {
            "duration"  => query.OrderByDescending(j => j.FinishedAt != null
                               ? (double?)(j.FinishedAt!.Value - j.StartedAt).TotalSeconds : null),
            "gramsUsed" => query.OrderByDescending(j => j.GramsUsed),
            _           => query.OrderByDescending(j => j.StartedAt),
        };

        var jobs = await query
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        return (jobs, total);
    }

    public async Task<PrintJob> CreateAsync(PrintJob printJob)
    {
        db.PrintJobs.Add(printJob);
        await db.SaveChangesAsync();
        return printJob;
    }

    public async Task<PrintJob> UpdateAsync(PrintJob printJob)
    {
        db.PrintJobs.Update(printJob);
        await db.SaveChangesAsync();
        return printJob;
    }

    public async Task<double> GetUsageSinceAsync(DateTime since)
    {
        return await db.PrintJobs
            .Where(j => j.GramsUsed > 0 && j.StartedAt >= since)
            .SumAsync(j => j.GramsUsed);
    }
}

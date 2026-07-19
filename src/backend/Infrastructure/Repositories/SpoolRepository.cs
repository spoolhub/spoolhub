using Application.Interfaces;
using Domain.Models;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public class SpoolRepository(FilamentDbContext db) : ISpoolRepository
{
    public async Task<IEnumerable<Spool>> GetAllAsync()
    {
        return await db.Spools
            .Include(s => s.NfcTags)
            .Where(s => !s.IsArchived)
            .OrderByDescending(s => s.LastScannedAt)
            .ToListAsync();
    }

    public async Task<Spool?> GetByIdAsync(Guid id)
    {
        return await db.Spools
            .Include(s => s.NfcTags)
            .Include(s => s.PrintJobs)
            .FirstOrDefaultAsync(s => s.Id == id);
    }

    public async Task<IEnumerable<Spool>> GetByIdsAsync(IEnumerable<Guid> ids)
    {
        var idList = ids.ToList();
        if (idList.Count == 0) return [];
        return await db.Spools
            .Where(s => idList.Contains(s.Id))
            .ToListAsync();
    }

    public async Task<Spool?> GetActiveAsync()
    {
        return await db.Spools
            .FirstOrDefaultAsync(s => s.IsActive);
    }

    public async Task<Spool?> GetByBambuTagUidAsync(string bambuTagUid)
    {
        return await db.Spools
            .Include(s => s.NfcTags)
            .FirstOrDefaultAsync(s => s.BambuTagUid == bambuTagUid && !s.IsArchived);
    }

    public async Task<Spool> CreateAsync(Spool spool)
    {
        db.Spools.Add(spool);
        await db.SaveChangesAsync();
        return await db.Spools
            .AsNoTracking()
            .Include(s => s.NfcTags)
            .FirstAsync(s => s.Id == spool.Id);
    }

    public async Task<Spool> UpdateAsync(Spool spool)
    {
        db.Spools.Update(spool);
        await db.SaveChangesAsync();
        db.Entry(spool).State = EntityState.Detached;
        return await db.Spools
            .AsNoTracking()
            .Include(s => s.NfcTags)
            .FirstAsync(s => s.Id == spool.Id);
    }

    public async Task SetActiveAsync(Guid spoolId, bool isActive, bool clearStockLocation = false, string? stockLocation = null)
    {
        var query = db.Spools.Where(s => s.Id == spoolId);
        if (clearStockLocation)
            await query.ExecuteUpdateAsync(s => s
                .SetProperty(x => x.IsActive, isActive)
                .SetProperty(x => x.StockLocation, (string?)null));
        else if (!string.IsNullOrWhiteSpace(stockLocation))
            await query.ExecuteUpdateAsync(s => s
                .SetProperty(x => x.IsActive, isActive)
                .SetProperty(x => x.StockLocation, stockLocation.Trim()));
        else
            await query.ExecuteUpdateAsync(s => s.SetProperty(x => x.IsActive, isActive));
    }

    public async Task ArchiveAsync(Guid id)
    {
        var now = DateTime.UtcNow;
        await db.Spools
            .Where(s => s.Id == id)
            .ExecuteUpdateAsync(s => s
                .SetProperty(x => x.IsArchived, true)
                .SetProperty(x => x.ArchivedAt, now));
    }

    public async Task<(int Added, int Removed)> GetMonthlyStatsAsync()
    {
        var start = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var added   = await db.Spools.CountAsync(s => s.CreatedAt >= start);
        var removed = await db.Spools.CountAsync(s => s.ArchivedAt.HasValue && s.ArchivedAt >= start);
        return (added, removed);
    }

    public async Task DeleteAsync(Guid id)
    {
        await db.Spools
            .Where(s => s.Id == id)
            .ExecuteDeleteAsync();
    }
}

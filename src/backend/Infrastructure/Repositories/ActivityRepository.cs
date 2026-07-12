using Application.Interfaces;
using Domain.Models;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public class ActivityRepository(FilamentDbContext db) : IActivityRepository
{
    public async Task<(IEnumerable<Activity> Activities, int Total)> GetPagedAsync(
        int limit, int skip,
        string? eventType = null,
        string? action = null,
        string? timePeriod = null,
        string? sortBy = null)
    {
        var query = db.Activities.AsQueryable();

        if (!string.IsNullOrEmpty(eventType))
            query = eventType switch
            {
                "spool"   => query.Where(a => a.ResourceType == "Spool"),
                "printer" => query.Where(a => a.ResourceType == "Printer"),
                "brand"   => query.Where(a => a.ResourceType == "Brand"),
                "print"   => query.Where(a => a.EventType.StartsWith("Print")),
                "nfc"     => query.Where(a => a.ResourceType == "NfcTag" || a.EventType == "SpoolScanned"),
                _         => query
            };

        if (!string.IsNullOrEmpty(action))
            query = query.Where(a => a.Action == action);

        if (!string.IsNullOrEmpty(timePeriod))
        {
            var now = DateTime.UtcNow;
            query = timePeriod switch
            {
                "today" => query.Where(a => a.CreatedAt >= now.Date),
                "week"  => query.Where(a => a.CreatedAt >= now.AddDays(-7)),
                "month" => query.Where(a => a.CreatedAt >= now.AddDays(-30)),
                _       => query
            };
        }

        query = sortBy switch
        {
            "oldest" => query.OrderBy(a => a.CreatedAt),
            "az"     => query.OrderBy(a => a.ResourceName),
            "za"     => query.OrderByDescending(a => a.ResourceName),
            _        => query.OrderByDescending(a => a.CreatedAt)
        };

        var total = await query.CountAsync();
        var activities = await query.Skip(skip).Take(limit).ToListAsync();
        return (activities, total);
    }

    public async Task<Activity> CreateAsync(Activity activity)
    {
        db.Activities.Add(activity);
        await db.SaveChangesAsync();
        return activity;
    }

    public async Task<bool> TryUpdateLatestDescriptionAsync(Guid resourceId, string eventType, string description)
    {
        var activity = await db.Activities
            .Where(a => a.ResourceId == resourceId && a.EventType == eventType)
            .OrderByDescending(a => a.CreatedAt)
            .FirstOrDefaultAsync();
        if (activity == null) return false;
        activity.Description = description;
        await db.SaveChangesAsync();
        return true;
    }

    public async Task<int> DeleteAllAsync()
    {
        return await db.Activities.ExecuteDeleteAsync();
    }

    public async Task<int> DeleteOlderThanAsync(int days)
    {
        var cutoff = DateTime.UtcNow.AddDays(-days);
        return await db.Activities.Where(a => a.CreatedAt < cutoff).ExecuteDeleteAsync();
    }
}

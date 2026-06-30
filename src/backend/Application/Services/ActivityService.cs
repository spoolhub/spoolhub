using Application.Interfaces;
using Domain.Models;
using Microsoft.Extensions.Logging;

namespace Application.Services;

public class ActivityService(
    IActivityRepository activityRepository,
    ILogger<ActivityService> logger) : IActivityService
{
    public async Task LogAsync(
        string eventType,
        string action,
        string resourceType,
        string resourceName,
        Guid? resourceId,
        string? description,
        string icon,
        string? snapshot = null)
    {
        try
        {
            await activityRepository.CreateAsync(new Activity
            {
                Id = Guid.NewGuid(),
                EventType = eventType,
                Action = action,
                ResourceType = resourceType,
                ResourceName = resourceName,
                ResourceId = resourceId,
                Description = description,
                Icon = icon,
                Snapshot = snapshot,
                CreatedAt = DateTime.UtcNow,
            });
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to log activity {EventType} for {ResourceName}", eventType, resourceName);
        }
    }

    public async Task TryBackfillDescriptionAsync(Guid resourceId, string eventType, string description)
    {
        try
        {
            await activityRepository.TryUpdateLatestDescriptionAsync(resourceId, eventType, description);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to backfill description for {EventType} resource {ResourceId}", eventType, resourceId);
        }
    }
}

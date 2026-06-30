namespace Application.Interfaces;

public interface IActivityService
{
    Task LogAsync(
        string eventType,
        string action,
        string resourceType,
        string resourceName,
        Guid? resourceId,
        string? description,
        string icon,
        string? snapshot = null);

    Task TryBackfillDescriptionAsync(Guid resourceId, string eventType, string description);
}

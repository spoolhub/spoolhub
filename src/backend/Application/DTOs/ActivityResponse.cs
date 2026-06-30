namespace Application.DTOs;

public record ActivityResponse(
    Guid Id,
    string EventType,
    string Action,
    string ResourceType,
    string ResourceName,
    Guid? ResourceId,
    string? Description,
    string? Icon,
    string? Snapshot,
    DateTime CreatedAt);

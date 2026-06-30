namespace Domain.Models;

public class Activity
{
    public Guid Id { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string ResourceType { get; set; } = string.Empty;
    public string ResourceName { get; set; } = string.Empty;
    public Guid? ResourceId { get; set; }
    public string? Description { get; set; }
    public string? Icon { get; set; }
    public string? Snapshot { get; set; }
    public DateTime CreatedAt { get; set; }
}

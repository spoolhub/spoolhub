namespace Domain.Models;

public class Location
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = "shelf";
    public int Capacity { get; set; } = 12;
    public int? Humidity { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

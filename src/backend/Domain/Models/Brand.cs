namespace Domain.Models;

public class Brand
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Domain { get; set; } = string.Empty;
    public string OfdSlug { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

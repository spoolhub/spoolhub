namespace Domain.Models;

public class SpoolProfile
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Brand { get; set; } = string.Empty;
    public string Material { get; set; } = string.Empty;
    public string ColorName { get; set; } = string.Empty;
    public string ColorHex { get; set; } = string.Empty;
    public float InitialWeightG { get; set; }
    public float SpoolWeightG { get; set; } = 200;
    public float LowStockThresholdG { get; set; } = 100;
    public float? Density { get; set; }
    public float? DiameterTolerance { get; set; }
    public int? ExtruderMin { get; set; }
    public int? ExtruderMax { get; set; }
    public int? BedMin { get; set; }
    public int? BedMax { get; set; }
    public decimal? Price { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

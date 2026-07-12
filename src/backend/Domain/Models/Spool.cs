namespace Domain.Models;

public class Spool
{
    public Guid Id { get; set; }
    public string Brand { get; set; } = string.Empty;
    public string Material { get; set; } = string.Empty;
    public string ColorName { get; set; } = string.Empty;
    public string ColorHex { get; set; } = string.Empty;
    public float InitialWeightG { get; set; }
    public float CurrentWeightG { get; set; }
    public float SpoolWeightG { get; set; } = 200;
    public float LowStockThresholdG { get; set; } = 100;
    public bool IsActive { get; set; } = false;
    public bool IsArchived { get; set; } = false;
    public DateTime? ArchivedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastScannedAt { get; set; }
    public string? Notes { get; set; }
    public string? StockLocation { get; set; }
    public decimal? Price { get; set; }
    public float? Density { get; set; }
    public float? DiameterTolerance { get; set; }
    public int? ExtruderMin { get; set; }
    public int? ExtruderMax { get; set; }
    public int? BedMin { get; set; }
    public int? BedMax { get; set; }
    public ICollection<NfcTag> NfcTags { get; set; } = new List<NfcTag>();
    public ICollection<PrintJob> PrintJobs { get; set; } = new List<PrintJob>();
}

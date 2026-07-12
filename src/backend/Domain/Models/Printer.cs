namespace Domain.Models;

public class Printer
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Brand { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public string? SerialNumber { get; set; }
    public string IpAddress { get; set; } = string.Empty;
    public int? Port { get; set; }
    public string Protocol { get; set; } = string.Empty;
    public bool HasAms { get; set; } = false;

    // AMS tray spool assignments (slot 0–3)
    public Guid? Tray1SpoolId { get; set; }
    public Guid? Tray2SpoolId { get; set; }
    public Guid? Tray3SpoolId { get; set; }
    public Guid? Tray4SpoolId { get; set; }

    // Non-AMS single spool assignment
    public Guid? ExtraSpoolId { get; set; }

    public string? AccessCode { get; set; }
    public string? CloudEmail { get; set; }
    public string? CloudPassword { get; set; }
    public string? CloudToken { get; set; }
    public string? CloudUserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public ICollection<PrintJob> PrintJobs { get; set; } = new List<PrintJob>();
}

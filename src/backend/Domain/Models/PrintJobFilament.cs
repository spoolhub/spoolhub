namespace Domain.Models;

public class PrintJobFilament
{
    public Guid Id { get; set; }
    public Guid PrintJobId { get; set; }
    public Guid? SpoolId { get; set; }
    public string? ColorName { get; set; }
    public string? ColorHex { get; set; }
    public string? Material { get; set; }
    public float GramsUsed { get; set; }
    public int SlotIndex { get; set; }
    public PrintJob PrintJob { get; set; } = null!;
}

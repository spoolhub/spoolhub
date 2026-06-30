namespace Domain.Models;

public class NfcTag
{
    public Guid Id { get; set; }
    public string TagUid { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public Guid SpoolId { get; set; }
    public DateTime CreatedAt { get; set; }
    public Spool Spool { get; set; } = null!;
}

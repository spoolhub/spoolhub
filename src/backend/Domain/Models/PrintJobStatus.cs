namespace Domain.Models;

public enum PrintJobStatus
{
    Running,
    Paused,
    Finished,
    Failed,
    Cancelled,
    Unknown
}

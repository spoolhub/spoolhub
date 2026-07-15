namespace Application.Interfaces;

public interface IPrinterRealtimeNotifier
{
    /// <param name="spoolsChanged">True when new spools were created or spool links changed (refetch spools too).</param>
    Task NotifyPrinterUpdatedAsync(Guid printerId, bool spoolsChanged = false);
}

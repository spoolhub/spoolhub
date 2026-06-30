using Application.Interfaces;

namespace Application.Services;

public class InMemoryCloudSessionStore : ICloudSessionStore
{
    private CloudPendingSession? _pending;
    private readonly Lock _lock = new();

    public void SetPending(CloudPendingSession session)
    {
        lock (_lock) { _pending = session; }
    }

    public CloudPendingSession? GetPending()
    {
        lock (_lock) { return _pending; }
    }

    public void Clear()
    {
        lock (_lock) { _pending = null; }
    }
}

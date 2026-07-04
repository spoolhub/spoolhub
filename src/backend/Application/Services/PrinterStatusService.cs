using System.Collections.Concurrent;
using Application.DTOs;
using Application.Interfaces;

namespace Application.Services;

public class PrinterStatusService : IPrinterStatusService
{
    private readonly ConcurrentDictionary<Guid, PrinterStatus> _statuses = new();
    private readonly ConcurrentDictionary<Guid, string> _knownIps = new();
    private readonly ConcurrentDictionary<Guid, AmsSnapshot?> _amsSnapshots = new();
    private readonly ConcurrentDictionary<Guid, byte> _pushAllRequests = new();

    public PrinterStatus? GetStatus(Guid printerId) =>
        _statuses.TryGetValue(printerId, out var s) ? s : null;

    public void UpdateStatus(Guid printerId, PrinterStatus status) =>
        _statuses[printerId] = status;

    public bool TryUpdateIp(Guid printerId, string newIp)
    {
        if (_knownIps.TryGetValue(printerId, out var existing) && existing == newIp)
            return false;
        _knownIps[printerId] = newIp;
        return true;
    }

    public void SaveAmsSnapshot(Guid printerId, AmsSnapshot snapshot) =>
        _amsSnapshots[printerId] = snapshot;

    public AmsSnapshot? GetAmsSnapshot(Guid printerId) =>
        _amsSnapshots.TryGetValue(printerId, out var s) ? s : null;

    public void ClearAmsSnapshot(Guid printerId) =>
        _amsSnapshots.TryRemove(printerId, out _);

    public void RequestPushAll(Guid printerId) =>
        _pushAllRequests[printerId] = 1;

    public HashSet<Guid> DrainPushAllRequests()
    {
        var ids = new HashSet<Guid>(_pushAllRequests.Keys);
        _pushAllRequests.Clear();
        return ids;
    }
}
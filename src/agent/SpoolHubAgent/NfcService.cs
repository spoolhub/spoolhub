using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;
using System.Text.Json;
using PCSC;
using PCSC.Monitoring;

namespace SpoolHubAgent;

public sealed class NfcService : IHostedService, IDisposable
{
    private readonly ILogger<NfcService> _logger;
    private readonly ConcurrentDictionary<Guid, WebSocket> _clients = new();
    private CancellationTokenSource? _cts;
    private ISCardMonitor? _monitor;

    private static readonly byte[] GetUidApdu = [0xFF, 0xCA, 0x00, 0x00, 0x00];

    public string? ActiveReader { get; private set; }
    public IReadOnlyList<string> AvailableReaders { get; private set; } = [];

    public NfcService(ILogger<NfcService> logger) => _logger = logger;

    public Task StartAsync(CancellationToken ct)
    {
        _cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        _logger.LogInformation("SpoolHub Agent listening on http://localhost:8765");
        _ = Task.Run(() => WatchReadersAsync(_cts.Token));
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken ct)
    {
        _cts?.Cancel();
        return Task.CompletedTask;
    }

    // Called from /events WebSocket endpoint — keeps the socket alive until the client disconnects.
    public async Task HandleClientAsync(WebSocket ws)
    {
        var id = Guid.NewGuid();
        _clients[id] = ws;

        // Send current reader state immediately on connect
        await SendAsync(ws, new { @event = "reader_status", connected = ActiveReader != null, reader = ActiveReader });

        var buf = new byte[256];
        try
        {
            while (ws.State == WebSocketState.Open)
            {
                var result = await ws.ReceiveAsync(buf, CancellationToken.None);
                if (result.MessageType == WebSocketMessageType.Close) break;
            }
        }
        catch { /* client disconnected */ }
        finally
        {
            _clients.TryRemove(id, out _);
        }
    }

    public async Task DisconnectAsync()
    {
        StopMonitor();
        ActiveReader = null;
        await BroadcastAsync(new { @event = "reader_status", connected = false, reader = (string?)null });
        _logger.LogInformation("Reader manually disconnected");
    }

    private async Task WatchReadersAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var ctx = ContextFactory.Instance.Establish(SCardScope.System);
                var readers = ctx.GetReaders().ToList();

                if (!readers.SequenceEqual(AvailableReaders))
                {
                    AvailableReaders = readers.AsReadOnly();

                    if (ActiveReader != null && !readers.Contains(ActiveReader))
                    {
                        StopMonitor();
                        ActiveReader = null;
                        await BroadcastAsync(new { @event = "reader_status", connected = false, reader = (string?)null });
                        _logger.LogInformation("NFC reader disconnected");
                    }

                    if (ActiveReader == null && readers.Count > 0)
                    {
                        ActiveReader = readers[0];
                        StartMonitor(ActiveReader);
                        await BroadcastAsync(new { @event = "reader_status", connected = true, reader = ActiveReader });
                        _logger.LogInformation("NFC reader connected: {Reader}", ActiveReader);
                    }
                }
            }
            catch (Exception ex) when (!ct.IsCancellationRequested)
            {
                _logger.LogDebug("PC/SC poll: {Msg}", ex.Message);
                if (ActiveReader != null)
                {
                    StopMonitor();
                    ActiveReader = null;
                    AvailableReaders = [];
                    await BroadcastAsync(new { @event = "reader_status", connected = false, reader = (string?)null });
                }
            }

            try { await Task.Delay(5_000, ct); }
            catch (OperationCanceledException) { break; }
        }
    }

    private void StartMonitor(string readerName)
    {
        _monitor = MonitorFactory.Instance.Create(SCardScope.System);
        _monitor.CardInserted += (_, args) => _ = Task.Run(() => HandleCardAsync(args.ReaderName));
        _monitor.MonitorException += (_, ex) =>
        {
            _logger.LogDebug("Monitor exception: {Msg}", ex.Message);
            StopMonitor();
            ActiveReader = null;
        };
        _monitor.Start(readerName);
    }

    private void StopMonitor()
    {
        if (_monitor is null) return;
        try { _monitor.Cancel(); } catch { }
        _monitor.Dispose();
        _monitor = null;
    }

    private async Task HandleCardAsync(string readerName)
    {
        try
        {
            using var ctx = ContextFactory.Instance.Establish(SCardScope.System);
            using var reader = ctx.ConnectReader(readerName, SCardShareMode.Shared, SCardProtocol.Any);

            var response = new byte[18];
            var recvLen = reader.Transmit(GetUidApdu, response);
            if (recvLen < 4) return;
            if (response[recvLen - 2] != 0x90 || response[recvLen - 1] != 0x00) return;

            var uid = BitConverter.ToString(response[..(recvLen - 2)]).Replace("-", ":");
            _logger.LogInformation("Tag scanned: {Uid}", uid);

            await BroadcastAsync(new { @event = "tag_scanned", uid });
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Error reading NFC tag: {Msg}", ex.Message);
        }
    }

    private async Task BroadcastAsync(object message)
    {
        var json = JsonSerializer.Serialize(message);
        var bytes = Encoding.UTF8.GetBytes(json);
        var segment = new ArraySegment<byte>(bytes);

        foreach (var (id, ws) in _clients)
        {
            try
            {
                if (ws.State == WebSocketState.Open)
                    await ws.SendAsync(segment, WebSocketMessageType.Text, true, CancellationToken.None);
            }
            catch
            {
                _clients.TryRemove(id, out _);
            }
        }
    }

    private static async Task SendAsync(WebSocket ws, object message)
    {
        var json = JsonSerializer.Serialize(message);
        var bytes = Encoding.UTF8.GetBytes(json);
        await ws.SendAsync(new ArraySegment<byte>(bytes), WebSocketMessageType.Text, true, CancellationToken.None);
    }

    public void Dispose()
    {
        _cts?.Cancel();
        StopMonitor();
    }
}

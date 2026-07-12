using System.Net;
using System.Net.Sockets;
using System.Text;
using API.Hubs;
using Application.Exceptions;
using Application.Interfaces;
using Microsoft.AspNetCore.SignalR;
using PCSC;
using PCSC.Monitoring;

namespace API.Services;

public sealed class Acr122UService : IHostedService, IDisposable, INfcReaderService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHubContext<NfcScanHub> _hubContext;
    private readonly ILogger<Acr122UService> _logger;
    private readonly string _frontendBaseUrl;
    private CancellationTokenSource? _cts;
    private ISCardMonitor? _monitor;

    private static readonly byte[] GetUidApdu = [0xFF, 0xCA, 0x00, 0x00, 0x00];

    public string? ActiveReader { get; private set; }
    public IReadOnlyList<string> AvailableReaders { get; private set; } = [];

    public Acr122UService(
        IServiceScopeFactory scopeFactory,
        IHubContext<NfcScanHub> hubContext,
        ILogger<Acr122UService> logger,
        IConfiguration configuration)
    {
        _scopeFactory = scopeFactory;
        _hubContext = hubContext;
        _logger = logger;
        var configured = configuration["FrontendBaseUrl"]?.Trim().TrimEnd('/');
        _frontendBaseUrl = string.IsNullOrEmpty(configured)
            ? $"http://{GetLanIpAddress()}:5173"
            : configured;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _ = Task.Run(() => WatchReadersAsync(_cts.Token));
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _cts?.Cancel();
        return Task.CompletedTask;
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

                    // If the active reader was unplugged, stop monitoring it
                    if (ActiveReader != null && !readers.Contains(ActiveReader))
                    {
                        StopMonitor();
                        ActiveReader = null;
                        _logger.LogInformation("Active NFC reader disconnected");
                    }

                    await PushReaderStatusAsync(ActiveReader != null, ActiveReader, ct);
                }
            }
            catch (Exception ex) when (!ct.IsCancellationRequested)
            {
                _logger.LogDebug("PC/SC poll: {Msg}", ex.Message);
                if (ActiveReader != null || AvailableReaders.Count > 0)
                {
                    StopMonitor();
                    ActiveReader = null;
                    AvailableReaders = [];
                    await PushReaderStatusAsync(false, null, ct);
                }
            }

            try { await Task.Delay(5_000, ct); }
            catch (OperationCanceledException) { break; }
        }
    }

    public async Task SelectReaderAsync(string readerName)
    {
        if (!AvailableReaders.Contains(readerName, StringComparer.OrdinalIgnoreCase)) return;
        StopMonitor();
        ActiveReader = readerName;
        StartMonitor(readerName);
        await PushReaderStatusAsync(true, readerName, CancellationToken.None);
        _logger.LogInformation("NFC reader manually selected: {Reader}", readerName);
    }

    public async Task DisconnectReaderAsync()
    {
        if (ActiveReader == null) return;
        StopMonitor();
        ActiveReader = null;
        await PushReaderStatusAsync(false, null, CancellationToken.None);
        _logger.LogInformation("NFC reader manually disconnected");
    }

    private void StartMonitor(string readerName)
    {
        _monitor = MonitorFactory.Instance.Create(SCardScope.System);
        _monitor.CardInserted += OnCardInserted;
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

    private void OnCardInserted(object sender, CardStatusEventArgs args)
        => _ = Task.Run(() => HandleCardAsync(args.ReaderName));

    private async Task HandleCardAsync(string readerName)
    {
        try
        {
            string uid;
            using (var ctx = ContextFactory.Instance.Establish(SCardScope.System))
            using (var reader = ctx.ConnectReader(readerName, SCardShareMode.Shared, SCardProtocol.Any))
            {
                var response = new byte[18];
                var recvLen = reader.Transmit(GetUidApdu, response);
                if (recvLen < 4) return;
                if (response[recvLen - 2] != 0x90 || response[recvLen - 1] != 0x00) return;
                uid = BitConverter.ToString(response[..(recvLen - 2)]).Replace("-", ":");
                _logger.LogInformation("NFC tag scanned: {Uid}", uid);
                EnsureNdefUrl(reader, uid);
            }

            using var scope = _scopeFactory.CreateScope();
            var scanService = scope.ServiceProvider.GetRequiredService<INfcScanService>();
            await scanService.ProcessScanAsync(uid);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Error reading NFC tag: {Msg}", ex.Message);
        }
    }

    private void EnsureNdefUrl(ICardReader reader, string uid)
    {
        var url = $"{_frontendBaseUrl}/scan?tagUid={uid}";
        var tx = reader as ISCardReader;
        try
        {
            tx?.BeginTransaction();
            try
            {
                WriteNdefUriToReader(reader, url);
                tx?.EndTransaction(SCardReaderDisposition.Leave);
            }
            catch
            {
                try { tx?.EndTransaction(SCardReaderDisposition.Reset); } catch { }
                throw;
            }
            _logger.LogInformation("NDEF URL written to tag {Uid}: {Url}", uid, url);
        }
        catch (Exception ex) { _logger.LogWarning("Could not write NDEF URL to tag {Uid}: {Msg}", uid, ex.Message); }
    }

    // Called from NfcTagController for manual writes
    public void WriteNdefUri(string url)
    {
        if (ActiveReader is null)
            throw new ServiceUnavailableException("No NFC reader connected.");

        using var ctx = ContextFactory.Instance.Establish(SCardScope.System);
        using var reader = ctx.ConnectReader(ActiveReader, SCardShareMode.Shared, SCardProtocol.Any);
        WriteNdefUriToReader(reader, url);
        _logger.LogInformation("NDEF URI written to tag: {Url}", url);
    }

    private static void WriteNdefUriToReader(ICardReader reader, string url)
    {
        var tlv = BuildNdefUriTlv(url);
        var padLen = (4 - tlv.Length % 4) % 4;
        if (padLen > 0) tlv = [..tlv, ..new byte[padLen]];
        for (int i = 0; i < tlv.Length; i += 4)
            WritePage(reader, 4 + i / 4, tlv[i..(i + 4)]);
    }

    private static void WritePage(ICardReader reader, int page, byte[] data)
    {
        byte[] apdu = [0xFF, 0xD6, 0x00, (byte)page, 0x04, data[0], data[1], data[2], data[3]];
        var resp = new byte[4];
        var len = reader.Transmit(apdu, resp);
        if (len < 2 || resp[len - 2] != 0x90 || resp[len - 1] != 0x00)
            throw new ServiceUnavailableException($"Write failed at page {page}: {resp[len - 2]:X2}{resp[len - 1]:X2}");
    }

    private static byte[] BuildNdefUriTlv(string url)
    {
        byte identifier;
        string uriBody;

        if (url.StartsWith("https://", StringComparison.OrdinalIgnoreCase)) { identifier = 0x04; uriBody = url[8..]; }
        else if (url.StartsWith("http://", StringComparison.OrdinalIgnoreCase)) { identifier = 0x03; uriBody = url[7..]; }
        else { identifier = 0x00; uriBody = url; }

        var uriBytes = Encoding.UTF8.GetBytes(uriBody);
        var payloadLen = 1 + uriBytes.Length;
        var ndefLen = 4 + payloadLen;

        var tlv = new byte[2 + ndefLen + 1];
        int p = 0;
        tlv[p++] = 0x03;
        tlv[p++] = (byte)ndefLen;
        tlv[p++] = 0xD1;
        tlv[p++] = 0x01;
        tlv[p++] = (byte)payloadLen;
        tlv[p++] = 0x55;
        tlv[p++] = identifier;
        uriBytes.CopyTo(tlv, p); p += uriBytes.Length;
        tlv[p] = 0xFE;
        return tlv;
    }

    private static string GetLanIpAddress()
    {
        try
        {
            using var socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, 0);
            socket.Connect("8.8.8.8", 65530);
            return ((IPEndPoint)socket.LocalEndPoint!).Address.ToString();
        }
        catch
        {
            return "localhost";
        }
    }

    private Task PushReaderStatusAsync(bool connected, string? name, CancellationToken ct)
        => _hubContext.Clients.All.SendAsync("ReaderStatus", new { connected, name, availableReaders = AvailableReaders }, ct);

    public void Dispose()
    {
        _cts?.Cancel();
        StopMonitor();
    }
}

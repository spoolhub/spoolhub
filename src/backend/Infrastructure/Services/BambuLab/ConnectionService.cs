using System.Buffers;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Application.Interfaces;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using MQTTnet;
using MQTTnet.Protocol;

namespace Infrastructure.Services.BambuLab;

public class ConnectionService : IHostedService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IDataProtector _protector;
    private readonly ILogger<ConnectionService> _logger;
    private readonly IPrinterStatusService _statusService;
    private CancellationTokenSource? _cts;

    private readonly Dictionary<Guid, Task> _printerTasks = new();
    private readonly Dictionary<Guid, CancellationTokenSource> _printerCts = new();

    private static readonly string PushAllPayload =
        JsonSerializer.Serialize(new { pushing = new { sequence_id = "0", command = "pushall" } });
    private static readonly string GetVersionPayload =
        JsonSerializer.Serialize(new { info = new { sequence_id = "1", command = "get_version" } });

    public ConnectionService(
        IServiceScopeFactory scopeFactory,
        IDataProtectionProvider dataProtectionProvider,
        IPrinterStatusService statusService,
        ILogger<ConnectionService> logger)
    {
        _scopeFactory = scopeFactory;
        _protector = dataProtectionProvider.CreateProtector("SpoolHub.CloudPassword");
        _statusService = statusService;
        _logger = logger;
    }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _ = Task.Run(() => ManagePrinterTasksAsync(_cts.Token), _cts.Token);
        return Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken)
    {
        _cts?.Cancel();
        return Task.CompletedTask;
    }

    // Polls DB every 5 s; starts a per-printer reconnect loop for any new MQTT printer.
    private async Task ManagePrinterTasksAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var repo = scope.ServiceProvider.GetRequiredService<IPrinterRepository>();
                var printers = await repo.GetActiveAsync();

                var all = printers.ToList();
                _logger.LogInformation("MQTT scan: {Total} printer(s) — {Protocols}",
                    all.Count,
                    string.Join(", ", all.Select(p => $"{p.Name}={p.Protocol ?? "null"}")));

                var activeIds = all
                    .Where(p => p.Protocol is "mqtt_lan" or "mqtt_cloud")
                    .Select(p => p.Id)
                    .ToHashSet();

                // Cancel tasks for printers that were deleted
                foreach (var id in _printerCts.Keys.Except(activeIds).ToList())
                {
                    _logger.LogInformation("MQTT printer {Id} removed — cancelling task", id);
                    _printerCts[id].Cancel();
                    _printerCts[id].Dispose();
                    _printerCts.Remove(id);
                    _printerTasks.Remove(id);
                }

                // Start tasks for new/restarted printers
                foreach (var id in activeIds)
                {
                    if (!_printerTasks.TryGetValue(id, out var t) || t.IsCompleted)
                    {
                        var printerCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                        _printerCts[id] = printerCts;
                        _printerTasks[id] = PrinterLoopAsync(id, printerCts.Token);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Error scanning for MQTT printers: {Message}", ex.Message);
            }

            try { await Task.Delay(TimeSpan.FromSeconds(5), ct); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task PrinterLoopAsync(Guid printerId, CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            try
            {
                await TryConnectAsync(printerId, ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning("MQTT [{PrinterId}] {Message} — retrying in 30 s", printerId, ex.Message);
            }

            try { await Task.Delay(TimeSpan.FromSeconds(30), ct); }
            catch (OperationCanceledException) { break; }
        }
    }

    private async Task TryConnectAsync(Guid printerId, CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var repo = scope.ServiceProvider.GetRequiredService<IPrinterRepository>();
        var printer = await repo.GetByIdAsync(printerId);

        if (printer is null)
        {
            _logger.LogWarning("Printer {PrinterId} not found — stopping MQTT loop", printerId);
            return;
        }

        var (host, port, username, password) = await BuildCredentialsAsync(printer, ct);

        var factory = new MqttClientFactory();
        using var client = factory.CreateMqttClient();

        var serialNumber = printer.SerialNumber;

        var disconnectedTcs = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        client.DisconnectedAsync += _ => { disconnectedTcs.TrySetResult(); return Task.CompletedTask; };

        client.ApplicationMessageReceivedAsync += async e =>
        {
            try
            {
                // Fallback: extract serial from topic if cert extraction didn't yield one
                if (string.IsNullOrEmpty(serialNumber))
                {
                    var parts = e.ApplicationMessage.Topic.Split('/');
                    if (parts.Length >= 2 && !string.IsNullOrEmpty(parts[1]))
                    {
                        serialNumber = parts[1];
                        _logger.LogInformation(
                            "MQTT [{Name}] discovered serial from topic: {Serial}", printer.Name, serialNumber);
                        await SaveSerialAsync(printerId, serialNumber);
                        try { await PublishToDeviceAsync(client, serialNumber, PushAllPayload, ct); }
                        catch (Exception) { }
                    }
                }

                var payload = Encoding.UTF8.GetString(e.ApplicationMessage.Payload);
                _logger.LogInformation("MQTT [{Name}] {Bytes} bytes:\n{Payload}",
                    printer.Name, payload.Length, payload);
                using var msgScope = _scopeFactory.CreateScope();
                var processor = msgScope.ServiceProvider.GetRequiredService<IMqttMessageProcessor>();
                await processor.ProcessAsync(payload, printer.Id);

                // After processing, send pushall to any printer that requested it
                var pushAllIds = _statusService.DrainPushAllRequests();
                foreach (var pid in pushAllIds)
                {
                    try
                    {
                        if (!string.IsNullOrEmpty(serialNumber))
                        {
                            await PublishToDeviceAsync(client, serialNumber, PushAllPayload, ct);
                            _logger.LogInformation("MQTT [{Name}] sent pushall (requested by processor)", printer.Name);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning("MQTT [{Name}] pushall failed: {Message}", printer.Name, ex.Message);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "MQTT [{Name}] error processing message", printer.Name);
            }
        };

        // Try to extract serial from the TLS cert CN during handshake.
        // Only trust it if it looks like a real Bambu serial (uppercase alphanumeric, 12-20 chars).
        string? certSerial = null;
        var options = new MqttClientOptionsBuilder()
            .WithProtocolVersion(MQTTnet.Formatter.MqttProtocolVersion.V311)
            .WithTcpServer(host, port)
            .WithCredentials(username, password)
            .WithTlsOptions(o => o
                .WithCertificateValidationHandler(args =>
                {
                    if (string.IsNullOrEmpty(serialNumber) && args.Certificate != null)
                    {
                        var match = Regex.Match(args.Certificate.Subject, @"CN=([^,\s]+)");
                        if (match.Success)
                        {
                            var cn = match.Groups[1].Value.Trim();
                            _logger.LogInformation("MQTT [{Name}] TLS cert CN: {CN}", printer.Name, cn);
                            if (LooksLikeBambuSerial(cn)) certSerial = cn;
                        }
                    }
                    return true;
                })
                .UseTls())
            .WithClientId($"spoolhub-{printer.Id:N}")
            .WithKeepAlivePeriod(TimeSpan.FromSeconds(60))
            .WithCleanSession(true)
            .Build();

        var connResult = await client.ConnectAsync(options, ct);
        if (connResult.ResultCode != MqttClientConnectResultCode.Success)
        {
            string connectionError;
            if (printer.Protocol == "mqtt_cloud")
            {
                // Token may be expired — refresh now so the 30s retry succeeds without a Docker restart.
                await RefreshAndSaveCloudTokenAsync(printerId, printer, ct);
                connectionError = "Cloud authentication failed — retrying with a fresh token";
            }
            else
            {
                connectionError = "Wrong access code — check the 8-digit code on your printer's touchscreen (Settings → Network)";
            }

            _statusService.UpdateStatus(printerId, new Application.DTOs.PrinterStatus(
                GcodeState: "error", ProgressPercent: 0, RemainingMinutes: 0,
                SubtaskName: null, LayerNum: 0, TotalLayerNum: 0,
                NozzleTempC: 0, BedTempC: 0, UpdatedAt: DateTime.UtcNow,
                ConnectionError: connectionError));
            throw new InvalidOperationException(
                $"MQTT CONNECT refused ({connResult.ResultCode})");
        }

        // Clear any previous connection error on successful connect
        _statusService.UpdateStatus(printerId, new Application.DTOs.PrinterStatus(
            GcodeState: "idle", ProgressPercent: 0, RemainingMinutes: 0,
            SubtaskName: null, LayerNum: 0, TotalLayerNum: 0,
            NozzleTempC: 0, BedTempC: 0, UpdatedAt: DateTime.UtcNow,
            ConnectionError: null));

        _logger.LogInformation(
            "MQTT connected — printer: {Name}, broker: {Host}:{Port}",
            printer.Name, host, port);

        // UDP probe gives us dev_name (user-set name from touchscreen); push_status and get_version
        // don't reliably include it on all models/firmware. Fire-and-forget — don't block the MQTT loop.
        if (printer.Protocol == "mqtt_lan")
            _ = Task.Run(() => TryUpdateNameFromUdpAsync(printerId, host, ct), ct);

        if (string.IsNullOrEmpty(serialNumber) && !string.IsNullOrEmpty(certSerial))
        {
            serialNumber = certSerial;
            _logger.LogInformation(
                "MQTT [{Name}] serial from TLS cert: {Serial}", printer.Name, serialNumber);
            await SaveSerialAsync(printerId, serialNumber);
        }

        var topic = string.IsNullOrEmpty(serialNumber)
            ? "device/+/report"
            : $"device/{serialNumber}/report";

        await client.SubscribeAsync(new MqttClientSubscribeOptionsBuilder()
            .WithTopicFilter(new MqttTopicFilterBuilder()
                .WithTopic(topic)
                .WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce)
                .Build())
            .Build(), ct);
        _logger.LogInformation("Subscribed to {Topic}", topic);

        if (!string.IsNullOrEmpty(serialNumber))
        {
            await PublishToDeviceAsync(client, serialNumber, PushAllPayload, ct);
            _logger.LogInformation("Sent pushall to device/{Serial}/request", serialNumber);
            await PublishToDeviceAsync(client, serialNumber, GetVersionPayload, ct);
        }
        else
        {
            _logger.LogInformation(
                "MQTT [{Name}] serial still unknown — subscribed to wildcard, waiting for first push", printer.Name);
        }

        using var reg = ct.Register(() => disconnectedTcs.TrySetCanceled(ct));
        await disconnectedTcs.Task;

        if (!ct.IsCancellationRequested)
            throw new InvalidOperationException($"Broker {host} disconnected — will reconnect");
    }

    private async Task<(string host, int port, string username, string password)> BuildCredentialsAsync(
        Domain.Models.Printer printer, CancellationToken ct)
    {
        if (printer.Protocol == "mqtt_lan")
        {
            if (string.IsNullOrEmpty(printer.AccessCode))
                throw new InvalidOperationException(
                    $"'{printer.Name}': LAN mode but no AccessCode — re-register with the code shown on the printer screen");

            return (printer.IpAddress, printer.Port ?? 8883, "bblp", printer.AccessCode);
        }

        // mqtt_cloud — use stored token when available; only re-auth if token is missing
        if (string.IsNullOrEmpty(printer.CloudEmail) || string.IsNullOrEmpty(printer.CloudPassword))
            throw new InvalidOperationException(
                $"'{printer.Name}': cloud mode but no stored credentials — re-register via Add Printer");

        if (string.IsNullOrEmpty(printer.CloudUserId))
            throw new InvalidOperationException(
                $"'{printer.Name}': no CloudUserId stored — delete and re-add the printer");

        string token;
        if (!string.IsNullOrEmpty(printer.CloudToken))
        {
            token = _protector.Unprotect(printer.CloudToken);
        }
        else
        {
            var cloudEmail = TryDecrypt(printer.CloudEmail);
            var cloudPwd = _protector.Unprotect(printer.CloudPassword);
            token = await CloudService.FetchTokenAsync(cloudEmail, cloudPwd, ct);
        }

        return ("us.mqtt.bambulab.com", printer.Port ?? 8883, $"u_{printer.CloudUserId}", token);
    }

    private static bool LooksLikeBambuSerial(string s) => LanService.LooksLikeBambuSerial(s);

    private static Task PublishToDeviceAsync(IMqttClient client, string serial, string payload, CancellationToken ct) =>
        client.PublishAsync(new MqttApplicationMessageBuilder()
            .WithTopic($"device/{serial}/request")
            .WithPayload(payload)
            .WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce)
            .Build(), ct);

    private async Task TryUpdateNameFromUdpAsync(Guid printerId, string ip, CancellationToken ct)
    {
        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(4000);
            var result = await LanService.UnicastUdpProbeAsync(ip, cts.Token);
            if (result == null || string.IsNullOrWhiteSpace(result.Name) || result.Name.Contains(ip))
                return;

            using var scope = _scopeFactory.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<IPrinterRepository>();
            var p = await repo.GetByIdAsync(printerId);
            if (p == null || p.Name == result.Name) return;
            if (!p.Name.StartsWith("Bambu ") && !p.Name.Contains('.')) return;
            p.Name = result.Name;
            await repo.UpdateAsync(p);
            _logger.LogInformation("Updated printer {Id} name from UDP probe → {Name}", printerId, result.Name);
        }
        catch (Exception ex)
        {
            _logger.LogDebug("UDP name probe failed for {Ip}: {Message}", ip, ex.Message);
        }
    }

    private async Task SaveSerialAsync(Guid printerId, string serial)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<IPrinterRepository>();
            var p = await repo.GetByIdAsync(printerId);
            if (p != null && string.IsNullOrEmpty(p.SerialNumber))
            {
                p.SerialNumber = serial;
                await repo.UpdateAsync(p);
                _logger.LogInformation("Saved auto-discovered serial {Serial} for printer {Id}", serial, printerId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Failed to save serial {Serial}: {Message}", serial, ex.Message);
        }
    }

    private async Task RefreshAndSaveCloudTokenAsync(Guid printerId, Domain.Models.Printer printer, CancellationToken ct)
    {
        try
        {
            var cloudEmail = TryDecrypt(printer.CloudEmail!);
            var cloudPwd = _protector.Unprotect(printer.CloudPassword!);
            _logger.LogInformation("MQTT [{Name}] re-authenticating with Bambu cloud to refresh expired token", printer.Name);
            var newToken = await CloudService.FetchTokenAsync(cloudEmail, cloudPwd, ct);

            using var scope = _scopeFactory.CreateScope();
            var repo = scope.ServiceProvider.GetRequiredService<IPrinterRepository>();
            var p = await repo.GetByIdAsync(printerId);
            if (p != null)
            {
                p.CloudToken = _protector.Protect(newToken);
                await repo.UpdateAsync(p);
                _logger.LogInformation("MQTT [{Name}] saved refreshed cloud token — next retry will use it", printer.Name);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("MQTT [{Name}] cloud token refresh failed: {Message}", printer.Name, ex.Message);
        }
    }

    // Tries to data-protect-decrypt value; falls back to plain text for existing databases
    // where CloudEmail was stored unencrypted before this fix.
    private string TryDecrypt(string value)
    {
        try { return _protector.Unprotect(value); }
        catch { return value; }
    }
}

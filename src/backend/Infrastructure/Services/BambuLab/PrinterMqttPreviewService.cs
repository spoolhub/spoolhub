using System.Text;
using System.Text.Json;
using Application.DTOs;
using Application.Interfaces;
using Application.Services;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Logging;
using MQTTnet;
using MQTTnet.Protocol;

namespace Infrastructure.Services.BambuLab;

public class PrinterMqttPreviewService(
    ICloudSessionStore sessionStore,
    IDataProtectionProvider dataProtectionProvider,
    ILogger<PrinterMqttPreviewService> logger) : IPrinterMqttPreviewService
{
    private const string CloudHost = "us.mqtt.bambulab.com";
    private const int MqttPort = 8883;

    private static readonly string PushAllPayload =
        JsonSerializer.Serialize(new { pushing = new { sequence_id = "0", command = "pushall" } });

    private readonly IDataProtector _protector =
        dataProtectionProvider.CreateProtector("SpoolHub.CloudPassword");

    public async Task<DiscoveredPrinterMqttPreview?> PreviewCloudAsync(string serialNumber, CancellationToken ct = default)
    {
        var session = sessionStore.GetPending();
        if (session?.AccessToken is null || session.UserId is null)
            return null;

        var token = _protector.Unprotect(session.AccessToken);
        var username = $"u_{session.UserId}";
        return await FetchPreviewAsync(CloudHost, username, token, serialNumber, ct);
    }

    public async Task<DiscoveredPrinterMqttPreview?> PreviewLanAsync(
        string serialNumber,
        string ipAddress,
        string accessCode,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(ipAddress) || string.IsNullOrWhiteSpace(accessCode))
            return null;

        return await FetchPreviewAsync(ipAddress, "bblp", accessCode, serialNumber, ct);
    }

    private async Task<DiscoveredPrinterMqttPreview?> FetchPreviewAsync(
        string host,
        string username,
        string password,
        string serialNumber,
        CancellationToken ct)
    {
        var previewId = MqttPreviewMapper.PreviewIdForSerial(serialNumber);
        try
        {
            var payload = await FetchFirstPrintPayloadAsync(host, username, password, serialNumber, ct);
            if (payload is null) return null;
            return MqttPreviewMapper.MapFromPayload(previewId, payload);
        }
        catch (Exception ex)
        {
            logger.LogDebug(ex, "MQTT preview failed for {Serial} via {Host}", serialNumber, host);
            return null;
        }
        finally
        {
            AmsMqttTrayParser.ClearPrinterCaches(previewId);
        }
    }

    private static async Task<string?> FetchFirstPrintPayloadAsync(
        string host,
        string username,
        string password,
        string serialNumber,
        CancellationToken ct)
    {
        var factory = new MqttClientFactory();
        using var client = factory.CreateMqttClient();
        var received = new TaskCompletionSource<string?>(TaskCreationOptions.RunContinuationsAsynchronously);
        string? fallbackPayload = null;

        using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeout.CancelAfter(TimeSpan.FromSeconds(10));

        client.ApplicationMessageReceivedAsync += e =>
        {
            var payload = Encoding.UTF8.GetString(e.ApplicationMessage.Payload);
            if (!payload.Contains("\"print\"", StringComparison.Ordinal))
                return Task.CompletedTask;

            if (payload.Contains("ams_exist_bits", StringComparison.Ordinal)
                || payload.Contains("tray_exist_bits", StringComparison.Ordinal)
                || payload.Contains("\"tray\"", StringComparison.Ordinal))
            {
                received.TrySetResult(payload);
                return Task.CompletedTask;
            }

            fallbackPayload ??= payload;
            return Task.CompletedTask;
        };

        var options = new MqttClientOptionsBuilder()
            .WithProtocolVersion(MQTTnet.Formatter.MqttProtocolVersion.V311)
            .WithTcpServer(host, MqttPort)
            .WithCredentials(username, password)
            .WithTlsOptions(o => o.UseTls())
            .WithClientId($"spoolhub-preview-{serialNumber[..Math.Min(8, serialNumber.Length)]}")
            .WithKeepAlivePeriod(TimeSpan.FromSeconds(30))
            .WithCleanSession(true)
            .Build();

        var connect = await client.ConnectAsync(options, timeout.Token);
        if (connect.ResultCode != MqttClientConnectResultCode.Success)
            return null;

        await client.SubscribeAsync(new MqttClientSubscribeOptionsBuilder()
            .WithTopicFilter(new MqttTopicFilterBuilder()
                .WithTopic($"device/{serialNumber}/report")
                .WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce)
                .Build())
            .Build(), timeout.Token);

        await client.PublishAsync(new MqttApplicationMessageBuilder()
            .WithTopic($"device/{serialNumber}/request")
            .WithPayload(PushAllPayload)
            .WithQualityOfServiceLevel(MqttQualityOfServiceLevel.AtLeastOnce)
            .Build(), timeout.Token);

        try
        {
            return await received.Task.WaitAsync(timeout.Token);
        }
        catch (OperationCanceledException)
        {
            return fallbackPayload;
        }
        finally
        {
            try { await client.DisconnectAsync(); } catch { /* best effort */ }
        }
    }
}

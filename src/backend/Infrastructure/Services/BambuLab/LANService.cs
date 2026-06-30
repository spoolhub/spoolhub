using System.Collections.Concurrent;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Security;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Application.DTOs;
using MQTTnet;
using MQTTnet.Formatter;

namespace Infrastructure.Services.BambuLab;

public static class LanService
{
    private const int DiscoveryPort = 2021;
    private const int MqttPort = 8883;
    private const int UdpSeconds = 6;
    private const int TcpTimeoutMs = 400;
    private const int MaxConcurrent = 80;
    private const string DiscoveryProbe = "{\"command\":\"discovery\"}";

    public static async Task<IReadOnlyList<LanDiscoveredPrinterResponse>> ScanAsync(CancellationToken ct)
    {
        // Run UDP passive + active probe in parallel with TCP port scan.
        // TCP is the reliable fallback — no inbound firewall rule needed.
        var udpTask  = ScanUdpAsync(ct);
        var tcpTask  = ScanTcpAsync(ct);

        await Task.WhenAll(udpTask, tcpTask);

        // Merge: UDP results are preferred (have full info); TCP fills in any gaps
        var merged = new Dictionary<string, LanDiscoveredPrinterResponse>(
            udpTask.Result.ToDictionary(p => p.IpAddress));

        foreach (var tcpResult in tcpTask.Result)
        {
            if (!merged.ContainsKey(tcpResult.IpAddress))
                merged[tcpResult.IpAddress] = tcpResult;
        }

        // Retry UDP for any printer whose name is still a fallback (contains the IP).
        // Happens when TCP found the port open but UDP timed out — retry up to 3x.
        var fallbacks = merged.Values.Where(p => p.Name.Contains(p.IpAddress)).ToList();
        var refineTasks = fallbacks.Select(async p =>
        {
            for (var attempt = 0; attempt < 3; attempt++)
            {
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                cts.CancelAfter(3000);
                var result = await UnicastUdpProbeAsync(p.IpAddress, cts.Token);
                if (result != null && !result.Name.Contains(p.IpAddress))
                {
                    merged[p.IpAddress] = result;
                    return;
                }
            }
        });
        await Task.WhenAll(refineTasks);

        return merged.Values.OrderBy(p => p.IpAddress).ToList();
    }

    // ── UDP: send discovery probe to all subnet broadcasts, listen 6 s ──────

    private static async Task<IReadOnlyList<LanDiscoveredPrinterResponse>> ScanUdpAsync(CancellationToken ct)
    {
        var found = new Dictionary<string, LanDiscoveredPrinterResponse>();
        try
        {
            using var udp = new UdpClient();
            udp.Client.SetSocketOption(SocketOptionLevel.Socket, SocketOptionName.ReuseAddress, true);
            udp.Client.Bind(new IPEndPoint(IPAddress.Any, DiscoveryPort));
            udp.EnableBroadcast = true;

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(UdpSeconds));

            _ = Task.Run(async () =>
            {
                var probe = Encoding.UTF8.GetBytes(DiscoveryProbe);
                var targets = GetSubnetBroadcasts();
                targets.Add(IPAddress.Broadcast);
                for (var i = 0; i < UdpSeconds / 2 && !cts.Token.IsCancellationRequested; i++)
                {
                    foreach (var addr in targets)
                    {
                        try { await udp.SendAsync(probe, probe.Length, new IPEndPoint(addr, DiscoveryPort)); }
                        catch { }
                    }
                    try { await Task.Delay(2000, cts.Token); } catch (OperationCanceledException) { break; }
                }
            }, cts.Token);

            try
            {
                while (!cts.Token.IsCancellationRequested)
                {
                    var result = await udp.ReceiveAsync(cts.Token);
                    ParseUdpPayload(result, found);
                }
            }
            catch (OperationCanceledException) { }
        }
        catch { /* firewall / port in use — TCP scan covers it */ }

        return found.Values.ToList();
    }

    private static void ParseUdpPayload(UdpReceiveResult result,
        Dictionary<string, LanDiscoveredPrinterResponse> found)
    {
        try
        {
            var payload = Encoding.UTF8.GetString(result.Buffer);

            if (payload.StartsWith("NOTIFY", StringComparison.OrdinalIgnoreCase))
            {
                ParseSsdpNotify(payload, result.RemoteEndPoint.Address.ToString(), found);
                return;
            }

            using var doc = JsonDocument.Parse(payload);
            var root = doc.RootElement;

            if (!root.TryGetProperty("dev_id", out var devId)) return;
            var serial = devId.GetString();
            if (string.IsNullOrEmpty(serial)) return;

            var ip = root.TryGetProperty("dev_ip", out var ipEl) ? ipEl.GetString()
                   : result.RemoteEndPoint.Address.ToString();
            var name = root.TryGetProperty("dev_name", out var nameEl) ? nameEl.GetString() : null;
            var model = root.TryGetProperty("dev_product_name", out var modelEl) ? modelEl.GetString()
                      : root.TryGetProperty("dev_model_name", out var codeEl) ? codeEl.GetString()
                      : "Bambu Lab Printer";
            var accessCode = root.TryGetProperty("dev_access_code", out var acEl) ? acEl.GetString() : null;

            found[serial] = new LanDiscoveredPrinterResponse(
                SerialNumber: serial,
                IpAddress:   ip ?? result.RemoteEndPoint.Address.ToString(),
                Name:        name ?? $"Bambu Lab {serial[^6..]}",
                Model:       model ?? "Bambu Lab Printer",
                AccessCode:  accessCode
            );
        }
        catch (JsonException) { }
    }

    private static void ParseSsdpNotify(string payload, string remoteIp,
        Dictionary<string, LanDiscoveredPrinterResponse> found)
    {
        try
        {
            var headers = ParseSsdpHeaders(payload);

            if (!headers.TryGetValue("NT", out var nt) ||
                !nt.Contains("bambulab", StringComparison.OrdinalIgnoreCase)) return;

            if (!headers.TryGetValue("USN", out var serial) || string.IsNullOrEmpty(serial)) return;

            var ip = headers.TryGetValue("Location", out var loc) && !string.IsNullOrEmpty(loc)
                ? loc : remoteIp;
            var name = headers.TryGetValue("DevName.bambu.com", out var devName) && !string.IsNullOrWhiteSpace(devName)
                ? devName : null;
            var modelCode = headers.TryGetValue("DevModel.bambu.com", out var modelEl) ? modelEl : null;
            var model = NormalizeModel(modelCode);

            if (found.TryGetValue(serial, out var existing))
            {
                // JSON probe already has this printer (possibly with access code); only upgrade a fallback name
                if (!string.IsNullOrEmpty(name) && existing.Name.StartsWith("Bambu Lab "))
                    found[serial] = existing with { Name = name };
            }
            else
            {
                found[serial] = new LanDiscoveredPrinterResponse(
                    SerialNumber: serial,
                    IpAddress:   ip,
                    Name:        name ?? $"Bambu Lab {serial[^6..]}",
                    Model:       model,
                    AccessCode:  null
                );
            }
        }
        catch (Exception) { /* malformed SSDP packet — ignore */ }
    }

    private static Dictionary<string, string> ParseSsdpHeaders(string payload)
    {
        var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var line in payload.Split('\n'))
        {
            var trimmed = line.Trim();
            var colon = trimmed.IndexOf(':');
            if (colon > 0)
                headers[trimmed[..colon].Trim()] = trimmed[(colon + 1)..].Trim();
        }
        return headers;
    }

    // ── TCP: scan all /24 local subnets for port 8883 ───────────────────────

    private static async Task<IReadOnlyList<LanDiscoveredPrinterResponse>> ScanTcpAsync(CancellationToken ct)
    {
        var found = new ConcurrentBag<LanDiscoveredPrinterResponse>();
        var subnets = GetLocalSubnetPrefixes();

        var sem   = new SemaphoreSlim(MaxConcurrent);
        var tasks = new List<Task>();

        foreach (var prefix in subnets)
        {
            for (var host = 1; host <= 254; host++)
            {
                if (ct.IsCancellationRequested) break;
                var ip = $"{prefix}.{host}";
                tasks.Add(ProbeTcpAsync(ip, found, sem, ct));
            }
        }

        await Task.WhenAll(tasks);
        return found.ToList();
    }

    private static async Task ProbeTcpAsync(string ip,
        ConcurrentBag<LanDiscoveredPrinterResponse> found,
        SemaphoreSlim sem, CancellationToken ct)
    {
        try { await sem.WaitAsync(ct); }
        catch (OperationCanceledException) { return; }

        try
        {
            using var tcp = new TcpClient();
            using var connectCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            connectCts.CancelAfter(TcpTimeoutMs);
            await tcp.ConnectAsync(ip, MqttPort, connectCts.Token);

            // Port 8883 is open — this is a Bambu printer.
            // 1) Try unicast UDP probe: printer responds to our random source port,
            //    so Windows stateful firewall lets it through (unlike broadcast on 2021).
            var udp = await UnicastUdpProbeAsync(ip, ct);
            if (udp != null) { found.Add(udp); return; }

            // 2) Fallback: TLS handshake to extract serial from cert CN → model name
            string? serial = null;
            try
            {
                using var tlsCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                tlsCts.CancelAfter(1500);
                using var ssl = new SslStream(tcp.GetStream(), false, (_, cert, _, _) =>
                {
                    if (cert != null)
                    {
                        var m = Regex.Match(cert.Subject, @"CN=([^,\s]+)");
                        if (m.Success && LooksLikeBambuSerial(m.Groups[1].Value.Trim()))
                            serial = m.Groups[1].Value.Trim();
                    }
                    return true;
                });
                await ssl.AuthenticateAsClientAsync(
                    new SslClientAuthenticationOptions { TargetHost = ip },
                    tlsCts.Token);
            }
            catch { /* proceed with whatever serial we have */ }

            var (name, model) = BambuModelInfo(serial, ip);
            found.Add(new LanDiscoveredPrinterResponse(
                SerialNumber: serial ?? "",
                IpAddress:   ip,
                Name:        name,
                Model:       model,
                AccessCode:  null
            ));
        }
        catch (Exception) { /* host unreachable or not a Bambu printer — ignore */ }
        finally { sem.Release(); }
    }

    // Send a unicast UDP discovery probe directly to the printer IP.
    // Because WE initiate the packet, Windows stateful firewall lets the response back through.
    public static async Task<LanDiscoveredPrinterResponse?> UnicastUdpProbeAsync(string ip, CancellationToken ct)
    {
        try
        {
            using var udp = new UdpClient();
            udp.Client.SetSocketOption(SocketOptionLevel.Socket, SocketOptionName.ReuseAddress, true);
            udp.Client.Bind(new IPEndPoint(IPAddress.Any, DiscoveryPort));

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(3000);

            var probe = Encoding.UTF8.GetBytes(DiscoveryProbe);
            await udp.SendAsync(probe, probe.Length, new IPEndPoint(IPAddress.Parse(ip), DiscoveryPort));

            while (true)
            {
                var result = await udp.ReceiveAsync(cts.Token);
                if (result.RemoteEndPoint.Address.ToString() != ip) continue;

                var payload = Encoding.UTF8.GetString(result.Buffer);
                using var doc = JsonDocument.Parse(payload);
                var root = doc.RootElement;

                if (!root.TryGetProperty("dev_id", out var devId)) continue;
                var serial = devId.GetString();
                if (string.IsNullOrEmpty(serial)) continue;

                var name       = root.TryGetProperty("dev_name",         out var nameEl)  ? nameEl.GetString()  : null;
                var rawModel   = root.TryGetProperty("dev_product_name", out var modelEl) ? modelEl.GetString() :
                                 root.TryGetProperty("dev_model_name",   out var codeEl)  ? codeEl.GetString()  : null;
                var accessCode = root.TryGetProperty("dev_access_code",  out var acEl)    ? acEl.GetString()    : null;

                var model = !string.IsNullOrEmpty(rawModel)
                    ? NormalizeModel(rawModel)
                    : BambuModelInfo(serial, ip).Model;

                return new LanDiscoveredPrinterResponse(
                    SerialNumber: serial,
                    IpAddress:   ip,
                    Name:        name ?? $"Bambu Lab {serial[^6..]}",
                    Model:       model ?? "Bambu Lab Printer",
                    AccessCode:  accessCode
                );
            }
        }
        catch { return null; }
    }

    private static (string Name, string Model) BambuModelInfo(string? serial, string ip)
    {
        if (string.IsNullOrEmpty(serial))
            return ($"Bambu Lab Printer ({ip})", "Bambu Lab Printer");

        var model = serial.Length >= 3 ? serial[..3] switch
        {
            "00M" => "X1 Carbon",
            "01P" => "P1P",
            "01S" => "P1S",
            "028" => "P1S",
            "030" => "A1 Mini",
            "039" => "A1",
            "031" => "X1E",
            "03F" => "H2D",
            _     => "",
        } : "";

        return string.IsNullOrEmpty(model)
            ? ($"Bambu Lab Printer ({ip})", "Bambu Lab Printer")
            : ($"Bambu {model} ({ip})", model);
    }

    public static string NormalizeModel(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "Bambu Lab Printer";
        var m = raw.Trim();

        // SSDP model codes
        switch (m)
        {
            case "C11":                 return "P1P";
            case "C12":                 return "P1S";
            case "C13":                 return "X1E";
            case "N1":                  return "A1 Mini";
            case "N2S":                 return "A1";
            case "3DPrinter-X1-Carbon": return "X1 Carbon";
            case "3DPrinter-X1":        return "X1";
        }

        if (m.StartsWith("Bambu Lab ", StringComparison.OrdinalIgnoreCase))
            m = m["Bambu Lab ".Length..].Trim();

        return m.Replace("-", " ").ToUpperInvariant() switch
        {
            "A1 MINI" or "A1MINI"               => "A1 Mini",
            "A1"                                => "A1",
            "X1 CARBON" or "X1CARBON" or "X1C" => "X1 Carbon",
            "X1"                                => "X1",
            "X1E"                               => "X1E",
            "X2D"                               => "X2D",
            "P1S"                               => "P1S",
            "P1P"                               => "P1P",
            "P2S"                               => "P2S",
            "H2D"                               => "H2D",
            "H2D PRO"                           => "H2D Pro",
            "H2C"                               => "H2C",
            "H2S"                               => "H2S",
            "A2L"                               => "A2L",
            _                                   => string.IsNullOrEmpty(m) ? "Bambu Lab Printer" : m,
        };
    }

    internal static bool LooksLikeBambuSerial(string s) =>
        s.Length is >= 12 and <= 20 &&
        s.All(c => char.IsAsciiLetterUpper(c) || char.IsAsciiDigit(c)) &&
        s.Any(char.IsAsciiDigit) &&
        s.Any(char.IsAsciiLetterUpper);

    // ── MQTT connection test ─────────────────────────────────────────────────

    public static async Task<string?> TestConnectionAsync(string ip, string accessCode, CancellationToken ct)
    {
        try
        {
            var factory = new MqttClientFactory();
            using var client = factory.CreateMqttClient();

            var options = new MqttClientOptionsBuilder()
                .WithProtocolVersion(MqttProtocolVersion.V311)
                .WithTcpServer(ip, MqttPort)
                .WithCredentials("bblp", accessCode)
                .WithTlsOptions(o => o.WithCertificateValidationHandler(_ => true).UseTls())
                .WithClientId($"spoolhub-test-{Guid.NewGuid():N}")
                .WithCleanSession(true)
                .Build();

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(10));

            var result = await client.ConnectAsync(options, cts.Token);

            if (result.ResultCode == MqttClientConnectResultCode.Success)
            {
                await client.DisconnectAsync();
                return null;
            }

            return "Wrong access code — check the 8-digit code on your printer's touchscreen (Settings → Network)";
        }
        catch (OperationCanceledException)
        {
            return $"Could not reach printer at {ip} — check the IP address and make sure the printer is on";
        }
        catch (Exception ex)
        {
            return $"Connection failed: {ex.Message}";
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private static List<IPAddress> GetSubnetBroadcasts()
    {
        var result = new List<IPAddress>();
        try
        {
            foreach (var iface in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (iface.OperationalStatus != OperationalStatus.Up) continue;
                if (iface.NetworkInterfaceType == NetworkInterfaceType.Loopback) continue;
                foreach (var addr in iface.GetIPProperties().UnicastAddresses)
                {
                    if (addr.Address.AddressFamily != AddressFamily.InterNetwork) continue;
                    var ip   = addr.Address.GetAddressBytes();
                    var mask = addr.IPv4Mask.GetAddressBytes();
                    var bc   = new byte[4];
                    for (var i = 0; i < 4; i++) bc[i] = (byte)(ip[i] | ~mask[i]);
                    result.Add(new IPAddress(bc));
                }
            }
        }
        catch { }
        return result;
    }

    private static List<string> GetLocalSubnetPrefixes()
    {
        var prefixes = new HashSet<string>();
        try
        {
            foreach (var iface in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (iface.OperationalStatus != OperationalStatus.Up) continue;
                if (iface.NetworkInterfaceType == NetworkInterfaceType.Loopback) continue;
                foreach (var addr in iface.GetIPProperties().UnicastAddresses)
                {
                    if (addr.Address.AddressFamily != AddressFamily.InterNetwork) continue;
                    var parts = addr.Address.ToString().Split('.');
                    if (parts.Length != 4) continue;
                    // skip Docker/VM bridges (172.17–172.31)
                    if (parts[0] == "172" && int.TryParse(parts[1], out var b) && b is >= 17 and <= 31) continue;
                    prefixes.Add($"{parts[0]}.{parts[1]}.{parts[2]}");
                }
            }
        }
        catch { }
        return prefixes.ToList();
    }
}

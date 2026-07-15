using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Application.DTOs;
using Application.Exceptions;
using Application.Interfaces;
using Domain.Models;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Logging;

namespace Infrastructure.CloudHandlers;

public class BambuCloudHandler(
    IPrinterRepository printerRepository,
    ICloudSessionStore sessionStore,
    IDataProtectionProvider dataProtectionProvider,
    ILogger<BambuCloudHandler> logger) : ICloudBrandHandler
{
    private readonly IDataProtector _protector = dataProtectionProvider.CreateProtector("SpoolHub.CloudPassword");

    public string Brand => "Bambu Lab";

    public async Task<CloudLoginResult> LoginAsync(string email, string password, CancellationToken ct)
    {
        using var client = BuildClient();

        var response = await client.PostAsJsonAsync(
            "/v1/user-service/user/login",
            new { account = email, password },
            ct);

        var raw = await response.Content.ReadAsStringAsync(ct);

        if (!response.IsSuccessStatusCode && response.StatusCode != System.Net.HttpStatusCode.BadRequest)
        {
            logger.LogWarning("Bambu login failed ({Status}): {Body}", response.StatusCode, raw);
            throw new BadRequestException($"Bambu login failed: {response.StatusCode}");
        }

        using var doc = JsonDocument.Parse(raw);
        var root = doc.RootElement;

        // Bambu reports failures (wrong credentials, risk control, region mismatch) as JSON with an "error" field.
        // These are expected user errors — return them as a result instead of throwing.
        if (root.TryGetProperty("error", out var err) && err.ValueKind == JsonValueKind.String
            && !string.IsNullOrEmpty(err.GetString()))
        {
            logger.LogWarning("Bambu login error ({Status}): {Body}", response.StatusCode, raw);
            return new CloudLoginResult(RequiresVerification: false, ErrorMessage: err.GetString());
        }

        var loginType = root.TryGetProperty("loginType", out var lt) ? lt.GetString() : null;
        if (loginType == "verifyCode" || loginType == "tfa")
        {
            // tfa: Bambu already sent the code automatically on login — don't send again with a different type
            if (loginType == "verifyCode")
                await SendVerificationCodeAsync(client, email, ct);

            sessionStore.SetPending(new CloudPendingSession(Brand, email, password, loginType));
            logger.LogInformation("Bambu login requires verification for {Email} (type: {Type})", email, loginType);
            return new CloudLoginResult(RequiresVerification: true, Message: "A verification code was sent to your email");
        }

        // accessToken can also be present but empty when verification is required
        if (!root.TryGetProperty("accessToken", out var tokenEl) || string.IsNullOrEmpty(tokenEl.GetString()))
        {
            logger.LogWarning("Bambu login returned no access token ({Status}): {Body}", response.StatusCode, raw);
            throw new BadRequestException("Bambu login returned no access token");
        }

        var accessToken = tokenEl.GetString()!;
        var available = await FetchAndStoreAsync(client, accessToken, email, password, ct);
        return new CloudLoginResult(RequiresVerification: false, AvailablePrinters: available);
    }

    public async Task<CloudVerifyResult> VerifyAsync(string code, CancellationToken ct)
    {
        var pending = sessionStore.GetPending();
        if (pending is null)
            return new CloudVerifyResult(ErrorMessage: "No pending Bambu 2FA session — sign in again");

        using var client = BuildClient();

        // tfa requires password + code; verifyCode (passwordless) only needs account + code
        object loginBody = pending.LoginType == "tfa"
            ? new { account = pending.Email, password = pending.Password, code }
            : (object)new { account = pending.Email, code };

        var response = await client.PostAsJsonAsync("/v1/user-service/user/login", loginBody, ct);

        var raw = await response.Content.ReadAsStringAsync(ct);
        logger.LogInformation("Bambu verify response ({Status}): {Body}", response.StatusCode, raw);

        using var doc = JsonDocument.Parse(raw);
        var root = doc.RootElement;

        // Wrong or expired code — expected user error, returned as a result instead of thrown
        if (root.TryGetProperty("error", out var err) && err.ValueKind == JsonValueKind.String
            && !string.IsNullOrEmpty(err.GetString()))
        {
            logger.LogWarning("Bambu verify error ({Status}): {Body}", response.StatusCode, raw);
            return new CloudVerifyResult(ErrorMessage: err.GetString());
        }

        if (!response.IsSuccessStatusCode
            || !root.TryGetProperty("accessToken", out var tokenEl) || string.IsNullOrEmpty(tokenEl.GetString()))
        {
            logger.LogWarning("Bambu verify failed ({Status}): {Body}", response.StatusCode, raw);
            return new CloudVerifyResult(ErrorMessage: "Verification failed — check the code and try again");
        }

        var accessToken = tokenEl.GetString()!;
        var available = await FetchAndStoreAsync(client, accessToken, pending.Email, pending.Password, ct);
        return new CloudVerifyResult(AvailablePrinters: available);
    }

    public async Task<IReadOnlyList<PrinterResponse>> SelectAsync(IReadOnlyList<string> serials, CancellationToken ct)
    {
        var pending = sessionStore.GetPending()
            ?? throw new BadRequestException("No pending cloud session — call register/cloud first");

        if (pending.PendingPrinters == null || string.IsNullOrEmpty(pending.AccessToken) || string.IsNullOrEmpty(pending.UserId))
            throw new BadRequestException("Pending session is missing printer data — login again");

        var selectedSet = serials.ToHashSet();
        var toSave = pending.PendingPrinters.Where(p => selectedSet.Contains(p.SerialNumber)).ToList();

        var accessToken = _protector.Unprotect(pending.AccessToken);
        var encryptedPassword = _protector.Protect(pending.Password);
        var encryptedToken = _protector.Protect(accessToken);

        var saved = new List<PrinterResponse>();
        foreach (var info in toSave)
        {
            var entity = new Printer
            {
                Id = Guid.NewGuid(),
                Name = info.Name,
                Brand = Brand,
                Model = info.Model,
                SerialNumber = info.SerialNumber,
                IpAddress = "us.mqtt.bambulab.com",
                Port = 8883,
                Protocol = "mqtt_cloud",
                HasAms = false,
                AccessCode = info.AccessCode,
                CloudEmail = _protector.Protect(pending.Email),
                CloudPassword = encryptedPassword,
                CloudToken = encryptedToken,
                CloudUserId = pending.UserId,
                CreatedAt = DateTime.UtcNow
            };

            var created = await printerRepository.CreateAsync(entity);
            logger.LogInformation("Saved Bambu cloud printer {Name} ({Serial})", created.Name, created.SerialNumber);

            saved.Add(new PrinterResponse(
                created.Id, created.Name, created.Brand, created.Model,
                created.SerialNumber, created.IpAddress, created.Port, created.Protocol,
                created.HasAms, created.CreatedAt,
                null,                 null, null, null, null,
                null, null, null, null,
                false, false, false, false,
                null, null,
                null, null, null, null, null));
        }

        sessionStore.Clear();
        return saved;
    }

    // Fetches printers from Bambu, filters already-added, stores in session for SelectAsync.
    private async Task<IReadOnlyList<CloudDiscoveredPrinterResponse>> FetchAndStoreAsync(
        HttpClient client, string accessToken, string email, string password, CancellationToken ct)
    {
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        var userId = await FetchUserIdAsync(client, ct);
        var allPrinters = await FetchPrintersAsync(client, ct);

        var existing = await printerRepository.GetAllAsync();

        // All serials already in DB (case-insensitive — Bambu API and MQTT may differ in case)
        var existingSerials = existing
            .Where(p => !string.IsNullOrEmpty(p.SerialNumber))
            .Select(p => p.SerialNumber!)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        // Names of printers from this account that have no serial yet (e.g. added via old code before MQTT connected)
        var nullSerialNamesFromAccount = existing
            .Where(p => p.CloudUserId == userId && string.IsNullOrEmpty(p.SerialNumber))
            .Select(p => p.Name)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        bool IsAlreadyAdded(RawCloudPrinter p) =>
            existingSerials.Contains(p.SerialNumber) || nullSerialNamesFromAccount.Contains(p.Name);

        var available = allPrinters.Where(p => !IsAlreadyAdded(p)).ToList();

        var pending = sessionStore.GetPending();
        sessionStore.SetPending(new CloudPendingSession(
            Brand: Brand,
            Email: email,
            Password: password,
            LoginType: pending?.LoginType ?? "direct",
            AccessToken: _protector.Protect(accessToken),
            UserId: userId,
            PendingPrinters: available.Select(p => new CloudPendingPrinter(p.SerialNumber, p.Name, p.Model, p.AccessCode)).ToList()
        ));

        return allPrinters
            .Select(p => new CloudDiscoveredPrinterResponse(p.SerialNumber, p.Name, p.Model, p.Online, IsAlreadyAdded(p)))
            .ToList();
    }

    private async Task SendVerificationCodeAsync(HttpClient client, string email, CancellationToken ct)
    {
        var response = await client.PostAsJsonAsync(
            "/v1/user-service/user/sendemail/code",
            new { email, type = "codeLogin" },
            ct);

        var body = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Bambu sendemail/code failed ({Status}): {Body}", response.StatusCode, body);
            throw new BadRequestException($"Bambu failed to send verification code: {response.StatusCode} {body}");
        }
        logger.LogInformation("Bambu sendemail/code response: {Body}", body);
    }

    private static HttpClient BuildClient()
    {
        var client = new HttpClient { BaseAddress = new Uri("https://api.bambulab.com") };
        client.DefaultRequestHeaders.Add("User-Agent", "bambu_network_agent/01.09.05.01");
        client.DefaultRequestHeaders.Add("X-BBL-Client-Name", "OrcaSlicer");
        client.DefaultRequestHeaders.Add("X-BBL-Client-Type", "slicer");
        client.DefaultRequestHeaders.Add("Accept", "application/json");
        return client;
    }

    private static async Task<string> FetchUserIdAsync(HttpClient client, CancellationToken ct)
    {
        var response = await client.GetAsync("/v1/user-service/my/profile", ct);
        response.EnsureSuccessStatusCode();

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
        if (doc.RootElement.TryGetProperty("uid", out var uid))
            return uid.ToString();

        throw new BadRequestException("Bambu user profile did not return a uid");
    }

    private static async Task<IReadOnlyList<RawCloudPrinter>> FetchPrintersAsync(HttpClient client, CancellationToken ct)
    {
        var response = await client.GetAsync("/v1/iot-service/api/user/bind", ct);
        response.EnsureSuccessStatusCode();

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
        var devices = doc.RootElement.GetProperty("devices");

        var printers = new List<RawCloudPrinter>();
        foreach (var device in devices.EnumerateArray())
        {
            printers.Add(new RawCloudPrinter(
                SerialNumber: device.TryGetProperty("dev_id", out var id) ? id.GetString()! : string.Empty,
                Name: device.TryGetProperty("name", out var name) ? name.GetString()! : string.Empty,
                Model: device.TryGetProperty("dev_product_name", out var model) ? model.GetString()! : string.Empty,
                AccessCode: device.TryGetProperty("dev_access_code", out var ac) ? ac.GetString()! : string.Empty,
                Online: device.TryGetProperty("online", out var online) && online.GetBoolean()
            ));
        }

        return printers;
    }

    private record RawCloudPrinter(string SerialNumber, string Name, string Model, string AccessCode, bool Online);
}

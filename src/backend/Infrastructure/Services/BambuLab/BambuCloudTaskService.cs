using System.Net.Http.Headers;
using System.Text.Json;
using Application.Interfaces;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.BambuLab;

public class BambuCloudTaskService(
    IDataProtectionProvider dataProtectionProvider,
    ILogger<BambuCloudTaskService> logger) : IBambuCloudTaskService
{
    private readonly IDataProtector _protector = dataProtectionProvider.CreateProtector("SpoolHub.CloudPassword");

    public async Task<float?> GetLastTaskGramsAsync(string serialNumber, string encryptedToken, string? taskId, string? expectedTitle, CancellationToken ct = default)
    {
        string token;
        try
        {
            token = _protector.Unprotect(encryptedToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning("Could not decrypt cloud token for {Serial}: {Message}", serialNumber, ex.Message);
            return null;
        }

        try
        {
            using var http = new HttpClient { BaseAddress = new Uri("https://api.bambulab.com") };
            http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            http.DefaultRequestHeaders.Add("User-Agent", "bambu_network_agent/01.09.05.01");

            var response = await http.GetAsync("/v1/user-service/my/tasks?limit=10", ct);

            if (!response.IsSuccessStatusCode)
            {
                logger.LogWarning("Bambu cloud task API returned {Status} for {Serial}", response.StatusCode, serialNumber);
                return null;
            }

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));

            // API returns tasks under either "hits" or "tasks" key
            JsonElement hits;
            if (!doc.RootElement.TryGetProperty("hits", out hits) &&
                !doc.RootElement.TryGetProperty("tasks", out hits))
                return null;

            foreach (var task in hits.EnumerateArray())
            {
                // Filter to this printer's tasks
                var deviceId = task.TryGetProperty("deviceId", out var devEl) ? devEl.GetString() : null;
                if (!string.IsNullOrEmpty(deviceId) && !string.Equals(deviceId, serialNumber, StringComparison.OrdinalIgnoreCase))
                    continue;

                var status = task.TryGetProperty("status", out var statusEl) ? statusEl.GetInt32() : 0;
                if (status != 2) continue; // 2 = finished

                if (taskId != null)
                {
                    var tid = task.TryGetProperty("id", out var tidEl)
                        ? (tidEl.ValueKind == JsonValueKind.Number ? tidEl.GetInt64().ToString() : tidEl.GetString())
                        : null;
                    if (!string.Equals(tid, taskId, StringComparison.OrdinalIgnoreCase)) continue;
                }
                else if (expectedTitle != null)
                {
                    var title = task.TryGetProperty("title", out var titleEl) ? titleEl.GetString() : null;
                    if (!TitlesMatch(title, expectedTitle)) continue;
                }
                // If both null: accept the first finished task for this device (latest in list)

                if (!task.TryGetProperty("weight", out var weightEl)) continue;

                var weight = weightEl.GetSingle();
                if (weight <= 0) continue;

                logger.LogInformation("Cloud task API: '{Title}' used {Weight:F1}g (printer {Serial})",
                    task.TryGetProperty("title", out var t) ? t.GetString() : expectedTitle, weight, serialNumber);
                return weight;
            }

            logger.LogWarning("No matching finished task in cloud API for {Serial}, taskId='{TaskId}', title='{Title}'", serialNumber, taskId, expectedTitle);
            return null;
        }
        catch (Exception ex)
        {
            logger.LogWarning("Bambu cloud task API error for {Serial}: {Message}", serialNumber, ex.Message);
            return null;
        }
    }

    public async Task<string?> GetActiveTaskIdAsync(string serialNumber, string encryptedToken, CancellationToken ct = default)
    {
        string token;
        try { token = _protector.Unprotect(encryptedToken); }
        catch { return null; }

        try
        {
            using var http = new HttpClient { BaseAddress = new Uri("https://api.bambulab.com") };
            http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            http.DefaultRequestHeaders.Add("User-Agent", "bambu_network_agent/01.09.05.01");

            var response = await http.GetAsync("/v1/user-service/my/tasks?limit=5", ct);
            if (!response.IsSuccessStatusCode) return null;

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));

            JsonElement hits;
            if (!doc.RootElement.TryGetProperty("hits", out hits) &&
                !doc.RootElement.TryGetProperty("tasks", out hits))
                return null;

            foreach (var task in hits.EnumerateArray())
            {
                var deviceId = task.TryGetProperty("deviceId", out var devEl) ? devEl.GetString() : null;
                if (!string.Equals(deviceId, serialNumber, StringComparison.OrdinalIgnoreCase)) continue;

                // Return the most recent task for this printer (list is newest-first)
                var tid = task.TryGetProperty("id", out var tidEl)
                    ? (tidEl.ValueKind == JsonValueKind.Number ? tidEl.GetInt64().ToString() : tidEl.GetString())
                    : null;

                if (!string.IsNullOrEmpty(tid) && tid != "0")
                {
                    logger.LogInformation("Cloud API: resolved active TaskId {TaskId} for {Serial}", tid, serialNumber);
                    return tid;
                }
            }

            return null;
        }
        catch (Exception ex)
        {
            logger.LogWarning("Bambu cloud task API error fetching active task for {Serial}: {Message}", serialNumber, ex.Message);
            return null;
        }
    }

    private static bool TitlesMatch(string? apiTitle, string mqttName)
    {
        if (string.IsNullOrEmpty(apiTitle)) return false;
        if (string.Equals(apiTitle, mqttName, StringComparison.OrdinalIgnoreCase)) return true;

        // Strip common extensions and compare base names
        static string Base(string s) => Path.GetFileNameWithoutExtension(
            s.EndsWith(".gcode.3mf", StringComparison.OrdinalIgnoreCase)
                ? s[..^".gcode.3mf".Length]
                : s);

        return string.Equals(Base(apiTitle), Base(mqttName), StringComparison.OrdinalIgnoreCase);
    }
}

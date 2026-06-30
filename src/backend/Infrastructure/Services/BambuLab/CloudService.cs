using System.Net.Http.Json;
using System.Text.Json;

namespace Infrastructure.Services.BambuLab;

public static class CloudService
{
    public static async Task<string> FetchTokenAsync(string email, string password, CancellationToken ct)
    {
        using var http = new HttpClient { BaseAddress = new Uri("https://api.bambulab.com") };
        http.DefaultRequestHeaders.Add("User-Agent", "bambu_network_agent/01.09.05.01");

        var response = await http.PostAsJsonAsync(
            "/v1/user-service/user/login",
            new { account = email, password },
            ct);

        response.EnsureSuccessStatusCode();

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
        if (!doc.RootElement.TryGetProperty("accessToken", out var tokenEl))
            throw new InvalidOperationException("Bambu login did not return an accessToken");

        return tokenEl.GetString()!;
    }
}

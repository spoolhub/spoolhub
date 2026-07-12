using System.Net;
using System.Text.Json;

namespace Test.Integration;

[Collection(nameof(IntegrationTestCollection))]
public class HealthIntegrationTests
{
    private readonly HttpClient _client;

    public HealthIntegrationTests(ApiWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Get_Returns200()
    {
        var response = await _client.GetAsync("/api/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Get_ReturnsHealthyStatus()
    {
        var response = await _client.GetAsync("/api/health");
        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var status = doc.RootElement.GetProperty("status").GetString();
        Assert.Equal("healthy", status);
    }

    [Fact]
    public async Task Get_ReturnsJsonContentType()
    {
        var response = await _client.GetAsync("/api/health");
        Assert.Contains("application/json", response.Content.Headers.ContentType?.MediaType ?? "");
    }
}

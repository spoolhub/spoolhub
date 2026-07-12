using System.Net;

namespace Test.Integration;

[Collection(nameof(IntegrationTestCollection))]
public class FilamentIntegrationTests
{
    private readonly HttpClient _client;

    public FilamentIntegrationTests(ApiWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetAll_Returns200()
    {
        var response = await _client.GetAsync("/api/filaments");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetAll_ReturnsJsonArray()
    {
        var response = await _client.GetAsync("/api/filaments");
        var body = await response.Content.ReadAsStringAsync();
        Assert.StartsWith("[", body.Trim());
    }

    [Fact]
    public async Task Refresh_Returns202()
    {
        var response = await _client.PostAsync("/api/filaments/refresh", null);
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
    }
}

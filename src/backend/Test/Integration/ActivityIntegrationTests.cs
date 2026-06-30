using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Test.Integration;

[Collection(nameof(IntegrationTestCollection))]
public class ActivityIntegrationTests
{
    private readonly HttpClient _client;

    public ActivityIntegrationTests(ApiWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    // ── GET /api/activities ───────────────────────────────────────────────────

    [Fact]
    public async Task GetActivities_Returns200()
    {
        var response = await _client.GetAsync("/api/activities");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetActivities_ReturnsActivitiesAndTotalProperties()
    {
        var result = await _client.GetFromJsonAsync<JsonElement>("/api/activities");
        Assert.True(result.TryGetProperty("activities", out _));
        Assert.True(result.TryGetProperty("total", out _));
    }

    [Fact]
    public async Task GetActivities_ReturnsPaginationProperties()
    {
        var result = await _client.GetFromJsonAsync<JsonElement>("/api/activities");
        Assert.True(result.TryGetProperty("page", out _));
        Assert.True(result.TryGetProperty("pageSize", out _));
        Assert.True(result.TryGetProperty("totalPages", out _));
    }

    [Fact]
    public async Task GetActivities_DefaultPage_Is1()
    {
        var result = await _client.GetFromJsonAsync<JsonElement>("/api/activities");
        Assert.Equal(1, result.GetProperty("page").GetInt32());
    }

    [Fact]
    public async Task GetActivities_DefaultPageSize_Is20()
    {
        var result = await _client.GetFromJsonAsync<JsonElement>("/api/activities");
        Assert.Equal(20, result.GetProperty("pageSize").GetInt32());
    }

    [Fact]
    public async Task GetActivities_LimitAbove100_Returns400()
    {
        var response = await _client.GetAsync("/api/activities?limit=999");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetActivities_NegativePage_Returns400()
    {
        var response = await _client.GetAsync("/api/activities?page=-1");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetActivities_NegativeLimit_Returns400()
    {
        var response = await _client.GetAsync("/api/activities?limit=-1");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GetActivities_WithEventTypeFilter_Returns200()
    {
        var response = await _client.GetAsync("/api/activities?eventType=spool");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetActivities_WithSortBy_Returns200()
    {
        var response = await _client.GetAsync("/api/activities?sortBy=oldest");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}

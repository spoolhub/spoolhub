using System.Net;
using System.Net.Http.Json;
using Application.DTOs;

namespace Test.Integration;

[Collection(nameof(IntegrationTestCollection))]
public class SpoolIntegrationTests
{
    private readonly HttpClient _client;

    public SpoolIntegrationTests(ApiWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    private static AddSpoolRequest ValidSpool(string brand = "TestBrand") => new(
        Brand: brand,
        Material: "PLA",
        ColorName: "White",
        ColorHex: "#FFFFFF",
        InitialWeightG: 1000,
        CurrentWeightG: 1000
    );

    // ── GET all ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_Returns200()
    {
        var response = await _client.GetAsync("/api/spools");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetAll_ReturnsJsonArray()
    {
        var result = await _client.GetFromJsonAsync<SpoolResponse[]>("/api/spools");
        Assert.NotNull(result);
    }

    // ── GET by id ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetById_Returns200_WhenExists()
    {
        var created = await CreateSpool();
        var response = await _client.GetAsync($"/api/spools/{created.Id}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetById_Returns404_WhenNotFound()
    {
        var response = await _client.GetAsync($"/api/spools/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── POST add ─────────────────────────────────────────────────────────

    [Fact]
    public async Task Add_Returns201_WithValidBody()
    {
        var response = await _client.PostAsJsonAsync("/api/spools", ValidSpool());
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Add_ReturnsSpoolWithCorrectFields()
    {
        var request = ValidSpool("BrandCheck");
        var response = await _client.PostAsJsonAsync("/api/spools", request);
        var spool = await response.Content.ReadFromJsonAsync<SpoolResponse>();

        Assert.NotNull(spool);
        Assert.NotEqual(Guid.Empty, spool.Id);
        Assert.Equal("BrandCheck", spool.Brand);
        Assert.Equal("PLA", spool.Material);
        Assert.Equal(1000f, spool.InitialWeightG);
        Assert.False(spool.IsActive);
        Assert.False(spool.IsArchived);
    }

    [Fact]
    public async Task Add_WhenIsActiveTrue_ReturnsIsActiveTrue()
    {
        var request = ValidSpool() with { IsActive = true };
        var response = await _client.PostAsJsonAsync("/api/spools", request);
        var spool = await response.Content.ReadFromJsonAsync<SpoolResponse>();

        Assert.NotNull(spool);
        Assert.True(spool.IsActive);
    }

    // ── PATCH activate ────────────────────────────────────────────────────────

    [Fact]
    public async Task Activate_Returns200_WhenExists()
    {
        var spool = await CreateSpool();
        var response = await _client.PatchAsync(
            $"/api/spools/activate/{spool.Id}",
            new StringContent(string.Empty, System.Text.Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Activate_SetsIsActiveTrue()
    {
        var spool = await CreateSpool();
        var response = await _client.PatchAsync(
            $"/api/spools/activate/{spool.Id}",
            new StringContent(string.Empty, System.Text.Encoding.UTF8, "application/json"));
        var updated = await response.Content.ReadFromJsonAsync<SpoolResponse>();
        Assert.True(updated!.IsActive);
    }

    [Fact]
    public async Task Activate_Returns404_WhenNotFound()
    {
        var response = await _client.PatchAsync(
            $"/api/spools/activate/{Guid.NewGuid()}",
            new StringContent(string.Empty, System.Text.Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── PUT update ────────────────────────────────────────────────────────────

    [Fact]
    public async Task Update_Returns200_WhenExists()
    {
        var spool = await CreateSpool();
        var update = new UpdateSpoolRequest("UpdatedBrand", null, null, null, null, null, null, null, null, null, null, null);
        var response = await _client.PutAsJsonAsync($"/api/spools/{spool.Id}", update);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Update_ChangesFields()
    {
        var spool = await CreateSpool();
        var update = new UpdateSpoolRequest("NewBrand", "PETG", null, null, 800f, null, null, "test note", null, null, null, null);
        var response = await _client.PutAsJsonAsync($"/api/spools/{spool.Id}", update);
        var updated = await response.Content.ReadFromJsonAsync<SpoolResponse>();

        Assert.Equal("NewBrand", updated!.Brand);
        Assert.Equal("PETG", updated.Material);
        Assert.Equal(800f, updated.CurrentWeightG);
        Assert.Equal("test note", updated.Notes);
    }

    [Fact]
    public async Task Update_Returns404_WhenNotFound()
    {
        var update = new UpdateSpoolRequest(null, null, null, null, null, null, null, null, null, null, null, null);
        var response = await _client.PutAsJsonAsync($"/api/spools/{Guid.NewGuid()}", update);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── DELETE ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_Returns204_WhenExists()
    {
        var spool = await CreateSpool();
        var response = await _client.DeleteAsync($"/api/spools/{spool.Id}");
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Delete_RemovesSpool()
    {
        var spool = await CreateSpool();
        await _client.DeleteAsync($"/api/spools/{spool.Id}");
        var response = await _client.GetAsync($"/api/spools/{spool.Id}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Delete_Returns404_WhenNotFound()
    {
        var response = await _client.DeleteAsync($"/api/spools/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── helper ───────────────────────────────────────────────────────────────

    private async Task<SpoolResponse> CreateSpool(string brand = "TestBrand")
    {
        var response = await _client.PostAsJsonAsync("/api/spools", ValidSpool(brand));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<SpoolResponse>())!;
    }
}

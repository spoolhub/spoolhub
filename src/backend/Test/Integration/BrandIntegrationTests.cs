using System.Net;
using System.Net.Http.Json;
using Application.DTOs;

namespace Test.Integration;

[Collection(nameof(IntegrationTestCollection))]
public class BrandIntegrationTests
{
    private readonly HttpClient _client;

    public BrandIntegrationTests(ApiWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    private static AddBrandRequest ValidBrand(string name = "Test Brand") =>
        new(Name: name, Domain: "example.com", OfdSlug: $"test_{Guid.NewGuid():N}");

    // ── GET all ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_Returns200()
    {
        var response = await _client.GetAsync("/api/brands");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetAll_ReturnsJsonArray()
    {
        var result = await _client.GetFromJsonAsync<BrandResponse[]>("/api/brands");
        Assert.NotNull(result);
    }

    // ── POST add ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Add_Returns201_WithValidBody()
    {
        var response = await _client.PostAsJsonAsync("/api/brands", ValidBrand());
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Add_ReturnsCorrectFields()
    {
        var request = ValidBrand("Bambu Lab");
        var response = await _client.PostAsJsonAsync("/api/brands", request);
        var brand = await response.Content.ReadFromJsonAsync<BrandResponse>();

        Assert.NotNull(brand);
        Assert.NotEqual(Guid.Empty, brand.Id);
        Assert.Equal("Bambu Lab", brand.Name);
        Assert.Equal("example.com", brand.Domain);
        Assert.Equal(request.OfdSlug, brand.OfdSlug);
    }

    [Fact]
    public async Task Add_Returns201_WhenDomainIsEmpty()
    {
        // OFD brands without a known domain are submitted with an empty domain;
        // this must succeed rather than fail validation (regression for #468).
        var request = new AddBrandRequest("No Domain Brand", "", $"test_{Guid.NewGuid():N}");
        var response = await _client.PostAsJsonAsync("/api/brands", request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Add_Returns201_WhenDomainIsOmitted()
    {
        var request = new AddBrandRequest("Null Domain Brand", null, $"test_{Guid.NewGuid():N}");
        var response = await _client.PostAsJsonAsync("/api/brands", request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var brand = await response.Content.ReadFromJsonAsync<BrandResponse>();
        Assert.NotNull(brand);
        Assert.Equal("", brand.Domain);
    }

    [Fact]
    public async Task Add_Returns409_WhenSlugAlreadyExists()
    {
        var slug = $"dup_{Guid.NewGuid():N}";
        var request = new AddBrandRequest("Dup Brand", "example.com", slug);
        await _client.PostAsJsonAsync("/api/brands", request);

        var response = await _client.PostAsJsonAsync("/api/brands", request);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Add_AppearsInGetAll()
    {
        var request = ValidBrand("Listed Brand");
        await _client.PostAsJsonAsync("/api/brands", request);

        var brands = await _client.GetFromJsonAsync<BrandResponse[]>("/api/brands");

        Assert.NotNull(brands);
        Assert.Contains(brands, b => b.Name == "Listed Brand");
    }

    // ── DELETE ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_Returns204_WhenExists()
    {
        var brand = await CreateBrand();
        var response = await _client.DeleteAsync($"/api/brands/{brand.Id}");
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Delete_RemovesBrand()
    {
        var brand = await CreateBrand();
        await _client.DeleteAsync($"/api/brands/{brand.Id}");

        var brands = await _client.GetFromJsonAsync<BrandResponse[]>("/api/brands");
        Assert.DoesNotContain(brands!, b => b.Id == brand.Id);
    }

    [Fact]
    public async Task Delete_Returns404_WhenNotFound()
    {
        var response = await _client.DeleteAsync($"/api/brands/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── OFD search ───────────────────────────────────────────────────────────

    [Fact]
    public async Task SearchOfd_Returns200()
    {
        var response = await _client.GetAsync("/api/brands/ofd-search?q=bambu");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task SearchOfd_ReturnsJsonArray()
    {
        var result = await _client.GetFromJsonAsync<OfdBrandResult[]>("/api/brands/ofd-search?q=bambu");
        Assert.NotNull(result);
    }

    // ── helper ───────────────────────────────────────────────────────────────

    private async Task<BrandResponse> CreateBrand(string name = "Test Brand")
    {
        var response = await _client.PostAsJsonAsync("/api/brands", ValidBrand(name));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<BrandResponse>())!;
    }
}

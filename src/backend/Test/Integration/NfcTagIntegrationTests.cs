using System.Net;
using System.Net.Http.Json;
using Application.DTOs;

namespace Test.Integration;

[Collection(nameof(IntegrationTestCollection))]
public class NfcTagIntegrationTests
{
    private readonly HttpClient _client;

    public NfcTagIntegrationTests(ApiWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    // ── GET all ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_Returns200()
    {
        var response = await _client.GetAsync("/api/nfc-tags");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetAll_ReturnsJsonArray()
    {
        var result = await _client.GetFromJsonAsync<NfcTagResponse[]>("/api/nfc-tags");
        Assert.NotNull(result);
    }

    // ── GET by id ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetById_Returns200_WhenExists()
    {
        var tag = await CreateTag();
        var response = await _client.GetAsync($"/api/nfc-tags/{tag.Id}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetById_Returns404_WhenNotFound()
    {
        var response = await _client.GetAsync($"/api/nfc-tags/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── POST register ─────────────────────────────────────────────────────────

    [Fact]
    public async Task Register_Returns201_WithValidBody()
    {
        var spoolId = await CreateSpoolId();
        var request = new RegisterNfcTagRequest($"UID-{Guid.NewGuid():N}", spoolId, "NTAG215");
        var response = await _client.PostAsJsonAsync("/api/nfc-tags", request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Register_ReturnsTagWithCorrectFields()
    {
        var spoolId = await CreateSpoolId();
        var uid = $"UID-{Guid.NewGuid():N}";
        var request = new RegisterNfcTagRequest(uid, spoolId, "NTAG215");
        var response = await _client.PostAsJsonAsync("/api/nfc-tags", request);
        var tag = await response.Content.ReadFromJsonAsync<NfcTagResponse>();

        Assert.NotNull(tag);
        Assert.NotEqual(Guid.Empty, tag.Id);
        Assert.Equal(uid, tag.TagUid);
        Assert.Equal(spoolId, tag.SpoolId);
        Assert.Equal("NTAG215", tag.Type);
    }

    // ── POST scan ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Scan_Returns200_WithKnownTag()
    {
        var spoolId = await CreateSpoolId();
        var uid = $"SCAN-{Guid.NewGuid():N}";
        await _client.PostAsJsonAsync("/api/nfc-tags", new RegisterNfcTagRequest(uid, spoolId, "NTAG215"));

        var response = await _client.PostAsJsonAsync("/api/nfc-tags/scan", new ScanRequest(uid));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Scan_Returns200_WithUnknownTag()
    {
        var response = await _client.PostAsJsonAsync("/api/nfc-tags/scan", new ScanRequest($"UNKNOWN-{Guid.NewGuid():N}"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Scan_Returns400_WhenTagUidIsEmpty()
    {
        var response = await _client.PostAsJsonAsync("/api/nfc-tags/scan", new ScanRequest(string.Empty));
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ── DELETE ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_Returns204_WhenExists()
    {
        var tag = await CreateTag();
        var response = await _client.DeleteAsync($"/api/nfc-tags/{tag.Id}");
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Delete_RemovesTag()
    {
        var tag = await CreateTag();
        await _client.DeleteAsync($"/api/nfc-tags/{tag.Id}");
        var response = await _client.GetAsync($"/api/nfc-tags/{tag.Id}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Delete_Returns404_WhenNotFound()
    {
        var response = await _client.DeleteAsync($"/api/nfc-tags/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private async Task<Guid> CreateSpoolId()
    {
        var response = await _client.PostAsJsonAsync("/api/spools", new AddSpoolRequest(
            Brand: "TagTestBrand",
            Material: "PLA",
            ColorName: "Black",
            ColorHex: "#000000",
            InitialWeightG: 1000,
            CurrentWeightG: 1000
        ));
        response.EnsureSuccessStatusCode();
        var spool = (await response.Content.ReadFromJsonAsync<SpoolResponse>())!;
        return spool.Id;
    }

    private async Task<NfcTagResponse> CreateTag()
    {
        var spoolId = await CreateSpoolId();
        var response = await _client.PostAsJsonAsync("/api/nfc-tags",
            new RegisterNfcTagRequest($"UID-{Guid.NewGuid():N}", spoolId, "NTAG215"));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<NfcTagResponse>())!;
    }
}

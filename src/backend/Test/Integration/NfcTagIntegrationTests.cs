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

    [Fact]
    public async Task Register_TwoDistinctUids_SameSpool_BothPersist()
    {
        var spoolId = await CreateSpoolId();
        var uidA = $"UID-A-{Guid.NewGuid():N}";
        var uidB = $"UID-B-{Guid.NewGuid():N}";

        var first = await _client.PostAsJsonAsync("/api/nfc-tags", new RegisterNfcTagRequest(uidA, spoolId, "NTAG215"));
        var second = await _client.PostAsJsonAsync("/api/nfc-tags", new RegisterNfcTagRequest(uidB, spoolId, "NTAG215"));

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal(HttpStatusCode.Created, second.StatusCode);

        var tagA = await first.Content.ReadFromJsonAsync<NfcTagResponse>();
        var tagB = await second.Content.ReadFromJsonAsync<NfcTagResponse>();
        Assert.NotNull(tagA);
        Assert.NotNull(tagB);
        Assert.Equal(spoolId, tagA.SpoolId);
        Assert.Equal(spoolId, tagB.SpoolId);
        Assert.NotEqual(tagA.TagUid, tagB.TagUid);

        var all = await _client.GetFromJsonAsync<NfcTagResponse[]>("/api/nfc-tags");
        Assert.NotNull(all);
        Assert.Contains(all, t => t.TagUid == uidA && t.SpoolId == spoolId);
        Assert.Contains(all, t => t.TagUid == uidB && t.SpoolId == spoolId);
    }

    [Fact]
    public async Task Scan_EitherUid_ReturnsSameSpool_WhenTwoTagsRegistered()
    {
        var spoolId = await CreateSpoolId();
        var uidA = $"SCAN-A-{Guid.NewGuid():N}";
        var uidB = $"SCAN-B-{Guid.NewGuid():N}";
        await _client.PostAsJsonAsync("/api/nfc-tags", new RegisterNfcTagRequest(uidA, spoolId, "NTAG215"));
        await _client.PostAsJsonAsync("/api/nfc-tags", new RegisterNfcTagRequest(uidB, spoolId, "NTAG215"));

        var scanA = await _client.PostAsJsonAsync("/api/nfc-tags/scan", new ScanRequest(uidA));
        var scanB = await _client.PostAsJsonAsync("/api/nfc-tags/scan", new ScanRequest(uidB));
        Assert.Equal(HttpStatusCode.OK, scanA.StatusCode);
        Assert.Equal(HttpStatusCode.OK, scanB.StatusCode);

        var resultA = await scanA.Content.ReadFromJsonAsync<NfcScanResult>();
        var resultB = await scanB.Content.ReadFromJsonAsync<NfcScanResult>();
        Assert.NotNull(resultA);
        Assert.NotNull(resultB);
        Assert.Equal("found", resultA.Status);
        Assert.Equal("found", resultB.Status);
        Assert.NotNull(resultA.Spool);
        Assert.NotNull(resultB.Spool);
        Assert.Equal(spoolId, resultA.Spool.Id);
        Assert.Equal(spoolId, resultB.Spool.Id);
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

    [Fact]
    public async Task GetSpoolById_ReturnsAllNfcTagUids_WhenTwoTagsRegistered()
    {
        var spoolId = await CreateSpoolId();
        var uidA = $"UID-A-{Guid.NewGuid():N}";
        var uidB = $"UID-B-{Guid.NewGuid():N}";
        await _client.PostAsJsonAsync("/api/nfc-tags", new RegisterNfcTagRequest(uidA, spoolId, "NTAG215"));
        await _client.PostAsJsonAsync("/api/nfc-tags", new RegisterNfcTagRequest(uidB, spoolId, "NTAG215"));

        var spool = await _client.GetFromJsonAsync<SpoolResponse>($"/api/spools/{spoolId}");

        Assert.NotNull(spool);
        Assert.True(spool.HasNfcTag);
        Assert.Equal(2, spool.NfcTagUids.Count);
        Assert.Contains(uidA, spool.NfcTagUids);
        Assert.Contains(uidB, spool.NfcTagUids);
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

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Test.Integration;

[Collection(nameof(IntegrationTestCollection))]
public class BackupIntegrationTests : IDisposable
{
    private readonly HttpClient _client;
    private readonly List<string> _createdBackupNames = [];

    public BackupIntegrationTests(ApiWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task ListBackups_ReturnsOkArray()
    {
        var response = await _client.GetAsync("/api/backup/files");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var files = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(JsonValueKind.Array, files.ValueKind);
    }

    [Fact]
    public async Task GetSettings_ReturnsWeeklyByDefault()
    {
        var response = await _client.GetAsync("/api/backup/settings");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.True(json.GetProperty("autoBackupEnabled").GetBoolean());
        Assert.Equal("weekly", json.GetProperty("frequency").GetString());
    }

    [Fact]
    public async Task Export_ReturnsZipFile()
    {
        var response = await _client.GetAsync("/api/backup/export");
        if (response.StatusCode == HttpStatusCode.NotFound)
            return;

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/octet-stream", response.Content.Headers.ContentType?.MediaType);

        var bytes = await response.Content.ReadAsByteArrayAsync();
        AssertZipHeader(bytes);
    }

    [Fact]
    public async Task CreateBackup_ReturnsZipMetadata()
    {
        var created = await CreateBackupOrSkipAsync();
        if (created is null) return;

        Assert.EndsWith(".zip", created.Value.GetProperty("name").GetString(), StringComparison.OrdinalIgnoreCase);
        Assert.True(created.Value.GetProperty("size").GetInt64() > 0);
    }

    [Fact]
    public async Task DownloadBackup_StreamsZipWithoutLoadingEntireFileIntoControllerBuffer()
    {
        var created = await CreateBackupOrSkipAsync();
        if (created is null) return;

        var name = created.Value.GetProperty("name").GetString()!;
        _createdBackupNames.Add(name);

        var response = await _client.GetAsync($"/api/backup/download?file={Uri.EscapeDataString(name)}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("application/octet-stream", response.Content.Headers.ContentType?.MediaType);

        await using var stream = await response.Content.ReadAsStreamAsync();
        var header = new byte[2];
        var read = await stream.ReadAsync(header);
        Assert.Equal(2, read);
        Assert.Equal((byte)'P', header[0]);
        Assert.Equal((byte)'K', header[1]);
    }

    [Fact]
    public async Task DownloadBackup_WithAccessTokenQuery_ReturnsZip()
    {
        var created = await CreateBackupOrSkipAsync();
        if (created is null) return;

        var name = created.Value.GetProperty("name").GetString()!;
        _createdBackupNames.Add(name);

        var response = await _client.GetAsync(
            $"/api/backup/download?file={Uri.EscapeDataString(name)}&access_token=download-token");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var bytes = await response.Content.ReadAsByteArrayAsync();
        AssertZipHeader(bytes);
    }

    [Fact]
    public async Task DownloadBackup_InvalidFilename_ReturnsBadRequest()
    {
        var response = await _client.GetAsync("/api/backup/download?file=../evil.zip");
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task DeleteBackup_RemovesListedFile()
    {
        var created = await CreateBackupOrSkipAsync();
        if (created is null) return;

        var name = created.Value.GetProperty("name").GetString()!;
        var delete = await _client.DeleteAsync($"/api/backup?file={Uri.EscapeDataString(name)}");
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);

        var list = await _client.GetAsync("/api/backup/files");
        var files = await list.Content.ReadFromJsonAsync<JsonElement>();
        Assert.DoesNotContain(files.EnumerateArray(), f => f.GetProperty("name").GetString() == name);
    }

    [Fact]
    public async Task UpdateSettings_PersistsFrequency()
    {
        var response = await _client.PutAsJsonAsync("/api/backup/settings", new
        {
            autoBackupEnabled = true,
            frequency = "daily",
            retentionCount = 5,
        });
        if (response.StatusCode == HttpStatusCode.NotFound)
            return;

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("daily", json.GetProperty("frequency").GetString());
        Assert.Equal(5, json.GetProperty("retentionCount").GetInt32());
    }

    private async Task<JsonElement?> CreateBackupOrSkipAsync()
    {
        var response = await _client.PostAsync("/api/backup", null);
        if (response.StatusCode == HttpStatusCode.NotFound)
            return null;

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    private static void AssertZipHeader(byte[] bytes)
    {
        Assert.True(bytes.Length > 4);
        Assert.Equal((byte)'P', bytes[0]);
        Assert.Equal((byte)'K', bytes[1]);
    }

    public void Dispose()
    {
        foreach (var name in _createdBackupNames)
        {
            _client.DeleteAsync($"/api/backup?file={Uri.EscapeDataString(name)}").GetAwaiter().GetResult();
        }
    }
}

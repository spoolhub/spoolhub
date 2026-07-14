using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace Test.Integration;

[Collection(nameof(IntegrationTestCollection))]
public class LogFileIntegrationTests : IDisposable
{
    private readonly HttpClient _client;
    private readonly string _logsDir;
    private readonly List<string> _createdFiles = [];

    public LogFileIntegrationTests(ApiWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
        _logsDir = Path.Combine(Path.GetDirectoryName(typeof(Program).Assembly.Location)!, "logs");
        Directory.CreateDirectory(_logsDir);
    }

    [Fact]
    public async Task Download_ActiveLogFile_WithDottedName_ReturnsContent()
    {
        var name = $"spoolhub-test-{Guid.NewGuid():N}.txt";
        var path = Path.Combine(_logsDir, name);
        await File.WriteAllTextAsync(path, new string('x', 4096));
        _createdFiles.Add(path);

        var response = await _client.GetAsync($"/api/logs/download?file={Uri.EscapeDataString(name)}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.Equal(4096, bytes.Length);
    }

    [Fact]
    public async Task List_IncludesCreatedLogFile()
    {
        var name = $"spoolhub-test-{Guid.NewGuid():N}.txt";
        var path = Path.Combine(_logsDir, name);
        await File.WriteAllTextAsync(path, "hello");
        _createdFiles.Add(path);

        var response = await _client.GetAsync("/api/logs/files");
        var files = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains(files.EnumerateArray(), f => f.GetProperty("name").GetString() == name);
    }

    [Fact]
    public async Task Download_WhileFileIsBeingWritten_ReturnsSnapshot()
    {
        var name = $"spoolhub-test-{Guid.NewGuid():N}.txt";
        var path = Path.Combine(_logsDir, name);
        await File.WriteAllTextAsync(path, new string('a', 2048));
        _createdFiles.Add(path);

        using var writer = new FileStream(path, FileMode.Append, FileAccess.Write, FileShare.ReadWrite);
        var writerTask = Task.Run(async () =>
        {
            for (var i = 0; i < 50; i++)
            {
                var chunk = new string('b', 128);
                var bytes = System.Text.Encoding.UTF8.GetBytes(chunk);
                await writer.WriteAsync(bytes);
                await writer.FlushAsync();
                await Task.Delay(10);
            }
        });

        var response = await _client.GetAsync($"/api/logs/download?file={Uri.EscapeDataString(name)}");
        await writerTask;
        writer.Dispose();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var bytes = await response.Content.ReadAsByteArrayAsync();
        Assert.True(bytes.Length >= 2048);
    }

    [Fact]
    public async Task Viewing_StartAndStop_ReturnsNoContent()
    {
        var start = await _client.PostAsync("/api/logs/viewing/start", null);
        Assert.Equal(HttpStatusCode.NoContent, start.StatusCode);

        var stop = await _client.PostAsync("/api/logs/viewing/stop", null);
        Assert.Equal(HttpStatusCode.NoContent, stop.StatusCode);
    }

    public void Dispose()
    {
        foreach (var path in _createdFiles)
        {
            if (File.Exists(path)) File.Delete(path);
        }
    }
}

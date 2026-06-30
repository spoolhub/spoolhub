using System.Net;
using System.Net.Http.Json;
using Application.DTOs;

namespace Test.Integration;

[Collection(nameof(IntegrationTestCollection))]
public class PrinterIntegrationTests
{
    private readonly HttpClient _client;

    public PrinterIntegrationTests(ApiWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    private static RegisterLanPrinterRequest ValidPrinter(string name = "Test Printer") => new(
        Name: name,
        Brand: "Bambu Lab",
        Model: "X1C",
        IpAddress: "192.168.1.100",
        Port: 8883,
        SerialNumber: $"SN-{Guid.NewGuid():N}",
        HasAms: false
    );

    // ── GET all ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_Returns200()
    {
        var response = await _client.GetAsync("/api/printers");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetAll_ReturnsJsonArray()
    {
        var result = await _client.GetFromJsonAsync<PrinterResponse[]>("/api/printers");
        Assert.NotNull(result);
    }

    // ── GET by id ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetById_Returns200_WhenExists()
    {
        var printer = await CreatePrinter();
        var response = await _client.GetAsync($"/api/printers/{printer.Id}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetById_Returns404_WhenNotFound()
    {
        var response = await _client.GetAsync($"/api/printers/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── POST register/lan ─────────────────────────────────────────────────────

    [Fact]
    public async Task RegisterLan_Returns201_WithValidBody()
    {
        var response = await _client.PostAsJsonAsync("/api/printers/register/lan", ValidPrinter());
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task RegisterLan_ReturnsPrinterWithCorrectFields()
    {
        var request = ValidPrinter("My Printer");
        var response = await _client.PostAsJsonAsync("/api/printers/register/lan", request);
        var printer = await response.Content.ReadFromJsonAsync<PrinterResponse>();

        Assert.NotNull(printer);
        Assert.NotEqual(Guid.Empty, printer.Id);
        Assert.Equal("My Printer", printer.Name);
        Assert.Equal("Bambu Lab", printer.Brand);
        Assert.Equal("X1C", printer.Model);
        Assert.Equal("192.168.1.100", printer.IpAddress);
    }

    // ── GET status ────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetStatus_Returns204_WhenNoStatus()
    {
        var printer = await CreatePrinter();
        var response = await _client.GetAsync($"/api/printers/{printer.Id}/status");
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    // ── PUT update ────────────────────────────────────────────────────────────

    [Fact]
    public async Task Update_Returns200_WhenExists()
    {
        var printer = await CreatePrinter();
        var update = new UpdatePrinterRequest("Updated Name", null, null, null, null, null, null, null);
        var response = await _client.PutAsJsonAsync($"/api/printers/{printer.Id}", update);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Update_ChangesFields()
    {
        var printer = await CreatePrinter();
        var update = new UpdatePrinterRequest("Renamed", "Prusa", "MK4", null, "10.0.0.1", null, null, true);
        var response = await _client.PutAsJsonAsync($"/api/printers/{printer.Id}", update);
        var updated = await response.Content.ReadFromJsonAsync<PrinterResponse>();

        Assert.Equal("Renamed", updated!.Name);
        Assert.Equal("Prusa", updated.Brand);
        Assert.Equal("MK4", updated.Model);
        Assert.Equal("10.0.0.1", updated.IpAddress);
        Assert.True(updated.HasAms);
    }

    [Fact]
    public async Task Update_Returns404_WhenNotFound()
    {
        var update = new UpdatePrinterRequest(null, null, null, null, null, null, null, null);
        var response = await _client.PutAsJsonAsync($"/api/printers/{Guid.NewGuid()}", update);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── DELETE ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_Returns204_WhenExists()
    {
        var printer = await CreatePrinter();
        var response = await _client.DeleteAsync($"/api/printers/{printer.Id}");
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Delete_RemovesPrinter()
    {
        var printer = await CreatePrinter();
        await _client.DeleteAsync($"/api/printers/{printer.Id}");
        var response = await _client.GetAsync($"/api/printers/{printer.Id}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Delete_Returns404_WhenNotFound()
    {
        var response = await _client.DeleteAsync($"/api/printers/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── helper ───────────────────────────────────────────────────────────────

    private async Task<PrinterResponse> CreatePrinter(string name = "Test Printer")
    {
        var response = await _client.PostAsJsonAsync("/api/printers/register/lan", ValidPrinter(name));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<PrinterResponse>())!;
    }
}

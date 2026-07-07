using Serilog;
using SpoolHubAgent;

var logPath = Path.Combine(
    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
    "SpoolHubAgent", "logs", "agent-.log");

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.File(logPath, rollingInterval: RollingInterval.Day, retainedFileCountLimit: 7)
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseSerilog();
builder.WebHost.UseUrls("http://localhost:8765");
builder.Services.AddCors(opt =>
    opt.AddDefaultPolicy(p => p.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddSingleton<NfcService>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<NfcService>());

var app = builder.Build();
app.UseCors();
app.UseWebSockets();

var nfc = app.Services.GetRequiredService<NfcService>();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/readers", () => Results.Ok(new
{
    connected = nfc.ActiveReader != null,
    activeReader = nfc.ActiveReader,
    availableReaders = nfc.AvailableReaders,
}));

app.MapPost("/disconnect", async () =>
{
    await nfc.DisconnectAsync();
    return Results.Ok();
});

app.MapPost("/write-url", (WriteUrlRequest req) =>
{
    var ok = nfc.TryWriteNdefUri(MakeLanReachable(req.Url));
    return ok ? Results.Ok() : Results.Problem("No reader/tag present", statusCode: StatusCodes.Status503ServiceUnavailable);
});

app.MapGet("/events", async (HttpContext ctx) =>
{
    if (!ctx.WebSockets.IsWebSocketRequest)
    {
        ctx.Response.StatusCode = StatusCodes.Status400BadRequest;
        return;
    }
    using var ws = await ctx.WebSockets.AcceptWebSocketAsync();
    await nfc.HandleClientAsync(ws);
});

await app.RunAsync();

/// Tags are read by other devices (phones), so a URL pointing at
/// localhost/127.0.0.1 is useless on them. Since this agent runs on the same
/// machine that serves the app, swap a loopback host for this machine's
/// LAN-facing IPv4 address, keeping the scheme, port, and path intact.
static string MakeLanReachable(string url)
{
    if (!Uri.TryCreate(url, UriKind.Absolute, out var uri)) return url;
    if (!uri.IsLoopback) return url;

    try
    {
        // Connecting a UDP socket picks the interface with the default route
        // (the real LAN adapter, not loopback or virtual/VPN interfaces).
        using var socket = new System.Net.Sockets.Socket(
            System.Net.Sockets.AddressFamily.InterNetwork,
            System.Net.Sockets.SocketType.Dgram, 0);
        socket.Connect("8.8.8.8", 65530);
        var lanIp = ((System.Net.IPEndPoint)socket.LocalEndPoint!).Address.ToString();
        return new UriBuilder(uri) { Host = lanIp }.Uri.ToString();
    }
    catch
    {
        return url;
    }
}

public record WriteUrlRequest(string Url);

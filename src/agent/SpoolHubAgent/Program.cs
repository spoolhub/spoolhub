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

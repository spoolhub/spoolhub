using API.Hubs;
using Microsoft.Extensions.FileProviders;
using API.Middleware;
using API.Services;
using Application.Interfaces;
using Infrastructure.CloudHandlers;
using Infrastructure.Data;
using Infrastructure.Repositories;
using Application.Services;
using Infrastructure.Services;
using Infrastructure.Services.BambuLab;
using Infrastructure.Services.Printer;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.DataProtection;
using Serilog;
using Serilog.Events;

// Create LogBuffer before the builder so the logger provider can reference it
var logBuffer = new LogBuffer();

var logsPath = Path.Combine(AppContext.BaseDirectory, "logs", "spoolhub.txt");

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .MinimumLevel.Override("Microsoft.AspNetCore.Hosting",  LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.AspNetCore.Routing",  LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore.Database", LogEventLevel.Warning)
    .MinimumLevel.Override("Microsoft.EntityFrameworkCore.Model",    LogEventLevel.Warning)
    .WriteTo.File(
        logsPath,
        rollingInterval: RollingInterval.Day,
        retainedFileCountLimit: 7,
        outputTemplate: "{Timestamp:yyyy-MM-dd HH:mm:ss} [{Level:u3}] {SourceContext} {Message:lj}{NewLine}{Exception}"
    )
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);
builder.Logging.AddProvider(new BufferLoggerProvider(logBuffer));
builder.Logging.AddSerilog(Log.Logger, dispose: true);

builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo("/data/keys"))
    .SetApplicationName("SpoolHub");
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<IFilamentService, FilamentService>(client =>
{
    client.DefaultRequestHeaders.Add("User-Agent", "SpoolHub/1.0");
});
builder.Services.AddSignalR();

builder.Services.AddCors(options =>
{
    options.AddPolicy("DevPolicy", policy =>
        policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());

    options.AddPolicy("ProdPolicy", policy =>
        policy.WithOrigins("https://spoolhub.local")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials());
});

builder.Services.AddDbContext<FilamentDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddHttpClient("ofd", client =>
{
    client.DefaultRequestHeaders.Add("User-Agent", "SpoolHub/1.0");
});
builder.Services.AddSingleton(logBuffer);
builder.Services.AddHostedService<LogBroadcastService>();
builder.Services.AddScoped<IAppSettingRepository, AppSettingRepository>();
builder.Services.AddScoped<ISettingsService, SettingsService>();
builder.Services.AddScoped<IAlertService, AlertService>();
builder.Services.AddScoped<IActivityRepository, ActivityRepository>();
builder.Services.AddScoped<IActivityService, ActivityService>();
builder.Services.AddScoped<IBrandRepository, BrandRepository>();
builder.Services.AddScoped<IBrandService, BrandService>();
builder.Services.AddScoped<IFilamentCacheRepository, FilamentCacheRepository>();
builder.Services.AddScoped<ISpoolRepository, SpoolRepository>();
builder.Services.AddScoped<IPrinterRepository, PrinterRepository>();
builder.Services.AddScoped<IPrintJobRepository, PrintJobRepository>();
builder.Services.AddScoped<INfcTagRepository, NfcTagRepository>();
builder.Services.AddScoped<IRealtimeNotifier, SignalRRealtimeNotifier>();
builder.Services.AddScoped<ISpoolService, SpoolService>();
builder.Services.AddScoped<INfcTagService, NfcTagService>();
builder.Services.AddScoped<INfcScanService, NfcScanService>();
builder.Services.AddScoped<IMqttMessageProcessor, MqttMessageProcessor>();
builder.Services.AddScoped<IBambuFtpService, BambuFtpService>();
builder.Services.AddScoped<IGcodeParserService, GcodeParserService>();
builder.Services.AddScoped<IBambuCloudTaskService, BambuCloudTaskService>();
builder.Services.AddScoped<IPrinterService, PrinterService>();
builder.Services.AddSingleton<IPrinterStatusService, PrinterStatusService>();
builder.Services.AddSingleton<IPrinterStatusPusher, PrinterStatusPusher>();

// Cloud registration
builder.Services.AddSingleton<ICloudSessionStore, InMemoryCloudSessionStore>();
builder.Services.AddScoped<ICloudBrandHandler, BambuCloudHandler>();
builder.Services.AddScoped<CloudBrandHandlerFactory>();
builder.Services.AddScoped<ICloudPrinterRegistrationService, CloudPrinterRegistrationService>();

builder.Services.AddHostedService<ConnectionService>();
builder.Services.AddSingleton<FilamentCacheWarmupService>();
builder.Services.AddSingleton<IFilamentRefreshQueue>(sp => sp.GetRequiredService<FilamentCacheWarmupService>());
builder.Services.AddHostedService(sp => sp.GetRequiredService<FilamentCacheWarmupService>());
builder.Services.AddHostedService<ActivityCleanupService>();
builder.Services.AddScoped<ILocationRepository, LocationRepository>();
builder.Services.AddScoped<ILocationService, LocationService>();
builder.Services.AddScoped<ISpoolProfileRepository, SpoolProfileRepository>();
builder.Services.AddScoped<ISpoolProfileService, SpoolProfileService>();
builder.Services.AddSingleton<Acr122UService>();
builder.Services.AddSingleton<INfcReaderService>(sp => sp.GetRequiredService<Acr122UService>());
builder.Services.AddHostedService(sp => sp.GetRequiredService<Acr122UService>());

var app = builder.Build();

var printerStatusService = app.Services.GetRequiredService<IPrinterStatusService>();

await InitializeDatabaseAsync(app, builder);

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.UseCors("DevPolicy");
}
else
{
    app.UseCors("ProdPolicy");
}

app.UseExceptionHandler();

app.UseDefaultFiles(new DefaultFilesOptions { DefaultFileNames = { "index.html" } });
app.UseStaticFiles();
app.MapControllers();
app.MapHub<NfcScanHub>("/hubs/nfc");
app.MapHub<PrinterHub>("/hubs/printer");
app.MapHub<LogHub>("/hubs/logs");

if (Directory.Exists(app.Environment.WebRootPath))
{
    // Production/Docker layout: the built frontend is copied into wwwroot,
    // so the SPA fallback can use the app's own default file provider.
    app.MapFallbackToFile("index.html");
}
else
{
    // Local dev without a populated wwwroot (e.g. `dotnet run` from source):
    // look for the frontend's build output elsewhere in the repo tree.
    var frontendDist = Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", "frontend", "web", "dist");
    if (!Directory.Exists(frontendDist))
        frontendDist = Path.Combine(AppContext.BaseDirectory, "dist");
    if (!Directory.Exists(frontendDist))
        frontendDist = Path.Combine(Directory.GetCurrentDirectory(), "dist");

    if (Directory.Exists(frontendDist))
    {
        app.UseStaticFiles(new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(frontendDist),
            RequestPath = ""
        });
        app.MapFallbackToFile("index.html", new StaticFileOptions
        {
            FileProvider = new PhysicalFileProvider(frontendDist)
        });
    }
}

app.Run();

static async Task InitializeDatabaseAsync(IApplicationBuilder app, WebApplicationBuilder builder)
{
    using var scope = app.ApplicationServices.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<FilamentDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    try
    {
        var connStr = builder.Configuration.GetConnectionString("DefaultConnection") ?? "";
        var dbPath = connStr.Replace("Data Source=", "", StringComparison.OrdinalIgnoreCase).Trim();
        var dbDir = Path.GetDirectoryName(dbPath);
        if (!string.IsNullOrEmpty(dbDir))
            Directory.CreateDirectory(dbDir);

        // Transition guard: databases created with EnsureCreated have no __EFMigrationsHistory.
        // Detect this state (tables exist, history doesn't) and seed history so Migrate() doesn't
        // try to re-apply InitialCreate on an already-populated database.
        db.Database.OpenConnection();
        try
        {
            var conn = db.Database.GetDbConnection();
            long spoolsExist;
            using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='Spools'";
                spoolsExist = (long)cmd.ExecuteScalar()!;
            }
            if (spoolsExist > 0)
            {
                long historyExists;
                using (var cmd = conn.CreateCommand())
                {
                    cmd.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='__EFMigrationsHistory'";
                    historyExists = (long)cmd.ExecuteScalar()!;
                }
                if (historyExists == 0)
                {
                    db.Database.ExecuteSqlRaw(@"
                        CREATE TABLE ""__EFMigrationsHistory"" (
                            ""MigrationId"" TEXT NOT NULL CONSTRAINT ""PK___EFMigrationsHistory"" PRIMARY KEY,
                            ""ProductVersion"" TEXT NOT NULL
                        )
                        ");

                    // Discover which tables actually exist so we don't seed migrations
                    // for tables that haven't been created yet — let Migrate() do that.
                    var existingTables = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                    using (var tablesCmd = conn.CreateCommand())
                    {
                        tablesCmd.CommandText = "SELECT name FROM sqlite_master WHERE type='table'";
                        using var reader = tablesCmd.ExecuteReader();
                        while (reader.Read()) existingTables.Add(reader.GetString(0));
                    }

                    // Migrations that create a brand-new table: only seed if the table exists.
                    var newTableGuards = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
                    {
                        ["AddFilamentCacheSnapshot"] = "FilamentCacheSnapshots",
                        ["AddBrandsTable"]           = "Brands",
                        ["AddPrintJobFilaments"]      = "PrintJobFilaments",
                        ["AddActivitiesTable"]        = "Activities",
                        ["AddAppSettings"]            = "AppSettings",
                        ["AddLocationsTable"]         = "Locations",
                        ["AddSpoolProfile"]           = "SpoolProfiles",
                    };

                    var seeded = 0;
                    foreach (var id in db.Database.GetMigrations())
                    {
                        var suffix = id.Contains('_') ? id[(id.IndexOf('_') + 1)..] : id;
                        if (newTableGuards.TryGetValue(suffix, out var requiredTable)
                            && !existingTables.Contains(requiredTable))
                            continue;
                        db.Database.ExecuteSqlRaw($"INSERT INTO \"__EFMigrationsHistory\" VALUES ('{id}', '10.0.0')");
                        seeded++;
                    }
                    logger.LogInformation("Seeded migration history for pre-migration database ({Count} entries).", seeded);
                }
            }
        }
        finally
        {
            db.Database.CloseConnection();
        }

        db.Database.Migrate();
        if (builder.Environment.IsDevelopment())
            await SeedData.SeedAsync(db);
        logger.LogInformation("Database initialized.");
    }
    catch (Exception ex) when (ex is InvalidOperationException or IOException)
    {
        logger.LogError(ex, "Database file could not be created or accessed. Check the connection string and file permissions.");
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "An error occurred applying migrations. The application will continue but the database may be out of date.");
    }
}

public partial class Program { }
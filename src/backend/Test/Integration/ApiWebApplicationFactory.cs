using Infrastructure.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Test.Integration;

public class ApiWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _dbPath;
    private readonly SqliteConnection _connection;

    public ApiWebApplicationFactory()
    {
        _dbPath = Path.Combine(Path.GetTempPath(), $"spoolhub-test-{Guid.NewGuid():N}.db");
        _connection = new SqliteConnection($"Data Source={_dbPath};Cache=Shared");
        _connection.Open();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(Environments.Production);

        builder.ConfigureAppConfiguration(config =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = $"Data Source={_dbPath}",
            });
        });

        builder.ConfigureTestServices(services =>
        {
            var dbDescriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<FilamentDbContext>));
            if (dbDescriptor != null) services.Remove(dbDescriptor);

            services.AddDbContext<FilamentDbContext>(options =>
                options.UseSqlite(_connection.ConnectionString));

            // Authenticate every request so RequireAuthorization() passes in tests
            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
            }).AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });

            // Suppress hardware/network background services that slow tests
            var toRemove = services
                .Where(d => d.ServiceType == typeof(IHostedService) &&
                    (d.ImplementationType?.Name is "ConnectionService" ||
                     d.ImplementationFactory != null))
                .ToList();
            foreach (var d in toRemove) services.Remove(d);
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = base.CreateHost(builder);
        using var scope = host.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FilamentDbContext>();
        db.Database.EnsureCreated();
        return host;
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);
        if (disposing)
        {
            _connection.Dispose();
            SqliteConnection.ClearAllPools();
            if (File.Exists(_dbPath))
                File.Delete(_dbPath);
            foreach (var side in new[] { "-wal", "-shm" })
            {
                var path = _dbPath + side;
                if (File.Exists(path))
                    File.Delete(path);
            }
        }
    }
}

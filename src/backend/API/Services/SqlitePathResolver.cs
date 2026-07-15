using Microsoft.Data.Sqlite;

namespace API.Services;

public static class SqlitePathResolver
{
    public static string ResolveDatabasePath(IConfiguration configuration, IWebHostEnvironment environment)
    {
        var connStr = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not configured.");

        var csb = new SqliteConnectionStringBuilder(connStr);
        if (Path.IsPathRooted(csb.DataSource))
            return csb.DataSource;

        return Path.Combine(environment.ContentRootPath, csb.DataSource);
    }

    public static string ResolveConnectionString(IConfiguration configuration, IWebHostEnvironment environment)
    {
        var connStr = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("DefaultConnection not configured.");

        var csb = new SqliteConnectionStringBuilder(connStr)
        {
            DataSource = ResolveDatabasePath(configuration, environment),
        };
        return csb.ConnectionString;
    }
}

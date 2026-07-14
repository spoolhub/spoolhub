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

        if (environment.IsDevelopment())
        {
            var devDir = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "SpoolHub");
            Directory.CreateDirectory(devDir);

            var devDb = Path.Combine(devDir, Path.GetFileName(csb.DataSource));
            var legacyDb = Path.Combine(environment.ContentRootPath, csb.DataSource);
            MigrateDatabaseIfNeeded(legacyDb, devDb);
            return devDb;
        }

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

    private static void MigrateDatabaseIfNeeded(string legacyPath, string devPath)
    {
        if (!File.Exists(legacyPath) || File.Exists(devPath))
            return;

        File.Copy(legacyPath, devPath);
        foreach (var ext in new[] { "-wal", "-shm" })
        {
            var side = legacyPath + ext;
            if (File.Exists(side))
                File.Copy(side, devPath + ext);
        }
    }
}

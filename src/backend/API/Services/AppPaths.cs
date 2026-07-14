namespace API.Services;

public static class AppPaths
{
    public static string SpoolHubDataRoot(IWebHostEnvironment environment)
    {
        if (environment.IsDevelopment())
        {
            var root = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "SpoolHub");
            Directory.CreateDirectory(root);
            return root;
        }

        return AppContext.BaseDirectory;
    }

    public static string LogsDirectory(IWebHostEnvironment environment)
    {
        var dir = Path.Combine(SpoolHubDataRoot(environment), "logs");
        Directory.CreateDirectory(dir);
        return dir;
    }

    public static string ActiveLogPath(IWebHostEnvironment environment)
        => Path.Combine(LogsDirectory(environment), "spoolhub.txt");

    public static string DataProtectionKeysDirectory(IWebHostEnvironment environment)
        => environment.IsDevelopment()
            ? Path.Combine(SpoolHubDataRoot(environment), "data-protection-keys")
            : "/data/keys";

    public static void MigrateLegacyDevLogsIfNeeded(IWebHostEnvironment environment)
    {
        if (!environment.IsDevelopment()) return;

        var legacyDir = Path.Combine(AppContext.BaseDirectory, "logs");
        if (!Directory.Exists(legacyDir)) return;

        var targetDir = LogsDirectory(environment);
        foreach (var path in Directory.EnumerateFiles(legacyDir, "spoolhub*.txt"))
        {
            var dest = Path.Combine(targetDir, Path.GetFileName(path));
            if (File.Exists(dest)) continue;
            try
            {
                File.Copy(path, dest);
            }
            catch (IOException)
            {
                // Another process or test run may have migrated the same file first.
            }
        }
    }
}

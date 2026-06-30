using Domain.Models;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

// Seed console tool - run: dotnet run --project src/backend/Seed -- [db-path]
if (args.Length == 0)
{
    Console.WriteLine("Usage: dotnet run --project src/backend/Seed -- <db-path>");
    return;
}

var dbPath = args[0];
var dbDir = Path.GetDirectoryName(dbPath);
if (!string.IsNullOrEmpty(dbDir))
    Directory.CreateDirectory(dbDir);

var options = new DbContextOptionsBuilder<FilamentDbContext>()
    .UseSqlite($"Data Source={dbPath}")
    .Options;

await using var db = new FilamentDbContext(options);

// Ensure database exists with model schema
db.Database.EnsureCreated();

// Seed if empty
if (!await db.Printers.AnyAsync())
{
    await SeedData.SeedAsync(db);
    Console.WriteLine("Seed completed.");
}
else
{
    Console.WriteLine("Database already has data - skipping seed.");
}
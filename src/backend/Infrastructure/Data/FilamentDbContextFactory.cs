using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Infrastructure.Data;

public class FilamentDbContextFactory : IDesignTimeDbContextFactory<FilamentDbContext>
{
    public FilamentDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<FilamentDbContext>()
            .UseSqlite("Data Source=spoolhub.db")
            .Options;

        return new FilamentDbContext(options);
    }
}

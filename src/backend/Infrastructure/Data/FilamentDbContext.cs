using Domain.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Infrastructure.Data;

public class FilamentDbContext(DbContextOptions<FilamentDbContext> options) : DbContext(options)
{
    public DbSet<Spool> Spools => Set<Spool>();
    public DbSet<Printer> Printers => Set<Printer>();
    public DbSet<PrintJob> PrintJobs => Set<PrintJob>();
    public DbSet<PrintJobFilament> PrintJobFilaments => Set<PrintJobFilament>();
    public DbSet<NfcTag> NfcTags => Set<NfcTag>();
    public DbSet<FilamentCacheSnapshot> FilamentCacheSnapshots => Set<FilamentCacheSnapshot>();
    public DbSet<Brand> Brands => Set<Brand>();
    public DbSet<Activity> Activities => Set<Activity>();
    public DbSet<Domain.Models.AppSetting> AppSettings => Set<Domain.Models.AppSetting>();
    public DbSet<Location> Locations => Set<Location>();
    public DbSet<SpoolProfile> SpoolProfiles => Set<SpoolProfile>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Domain.Models.AppSetting>()
            .HasKey(s => s.Key);

        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();

        modelBuilder.Entity<NfcTag>()
            .HasIndex(t => t.TagUid)
            .IsUnique();

        modelBuilder.Entity<NfcTag>()
            .HasOne(t => t.Spool)
            .WithMany(s => s.NfcTags)
            .HasForeignKey(t => t.SpoolId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PrintJob>()
            .HasOne(p => p.Spool)
            .WithMany(s => s.PrintJobs)
            .HasForeignKey(p => p.SpoolId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PrintJob>()
            .HasOne(p => p.Printer)
            .WithMany(pr => pr.PrintJobs)
            .HasForeignKey(p => p.PrinterId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<PrintJob>()
            .Property(p => p.Status)
            .HasConversion(
                v => v.ToString().ToLowerInvariant(),
                v => Enum.Parse<PrintJobStatus>(v, ignoreCase: true));

        modelBuilder.Entity<PrintJobFilament>()
            .HasOne(f => f.PrintJob)
            .WithMany(j => j.Filaments)
            .HasForeignKey(f => f.PrintJobId)
            .OnDelete(DeleteBehavior.Cascade);

        // Printer tray/extra spool → Spool FK relationships (ON DELETE SET NULL)
        modelBuilder.Entity<Printer>()
            .HasOne<Spool>().WithMany().HasForeignKey(p => p.Tray1SpoolId)
            .OnDelete(DeleteBehavior.SetNull).IsRequired(false);
        modelBuilder.Entity<Printer>()
            .HasOne<Spool>().WithMany().HasForeignKey(p => p.Tray2SpoolId)
            .OnDelete(DeleteBehavior.SetNull).IsRequired(false);
        modelBuilder.Entity<Printer>()
            .HasOne<Spool>().WithMany().HasForeignKey(p => p.Tray3SpoolId)
            .OnDelete(DeleteBehavior.SetNull).IsRequired(false);
        modelBuilder.Entity<Printer>()
            .HasOne<Spool>().WithMany().HasForeignKey(p => p.Tray4SpoolId)
            .OnDelete(DeleteBehavior.SetNull).IsRequired(false);
        modelBuilder.Entity<Printer>()
            .HasOne<Spool>().WithMany().HasForeignKey(p => p.ExtraSpoolId)
            .OnDelete(DeleteBehavior.SetNull).IsRequired(false);

        // PrintJobFilament.SpoolId → Spool FK
        modelBuilder.Entity<PrintJobFilament>()
            .HasOne<Spool>().WithMany().HasForeignKey(f => f.SpoolId)
            .OnDelete(DeleteBehavior.SetNull).IsRequired(false);

        // SQLite stores DateTime without timezone info; mark every DateTime column as UTC
        // so ASP.NET Core serializes with a 'Z' suffix and browsers parse it correctly.
        var utcConverter = new ValueConverter<DateTime, DateTime>(
            v => v,
            v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        foreach (var entity in modelBuilder.Model.GetEntityTypes())
            foreach (var prop in entity.GetProperties())
                if (prop.ClrType == typeof(DateTime) || prop.ClrType == typeof(DateTime?))
                    prop.SetValueConverter(utcConverter);
    }
}

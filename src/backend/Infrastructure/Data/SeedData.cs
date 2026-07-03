using System.Globalization;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Text.Json.Serialization;
using Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Data;

/// <summary>
/// Loads demo/dev data from a gitignored local fixture (seed-data.local.json, next to this file).
/// The fixture never ships in the repo or the Docker image; if it's absent, seeding is a no-op.
/// Copy seed-data.example.json (committed) to seed-data.local.json to get started, then edit freely.
/// </summary>
public static class SeedData
{
    public static async Task SeedAsync(FilamentDbContext db)
    {
        if (await db.Printers.AnyAsync())
            return;

        var fixturePath = GetFixturePath();
        if (!File.Exists(fixturePath))
            return;

        var fixture = JsonSerializer.Deserialize<SeedFixture>(
            await File.ReadAllTextAsync(fixturePath),
            new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                Converters = { new JsonStringEnumConverter() }
            }) ?? throw new InvalidOperationException($"Seed fixture at '{fixturePath}' is empty or invalid.");

        var now = DateTime.UtcNow;

        db.Locations.AddRange(fixture.Locations.Select(l => new Location
        {
            Id = Guid.NewGuid(),
            Name = l.Name,
            CreatedAt = ResolveTime(now, l.CreatedAt)
        }));

        db.AppSettings.AddRange(fixture.AppSettings.Select(s => new AppSetting { Key = s.Key, Value = s.Value }));

        db.Brands.AddRange(fixture.Brands.Select(b => new Brand
        {
            Id = Guid.NewGuid(),
            Name = b.Name,
            Domain = b.Domain,
            OfdSlug = b.OfdSlug,
            CreatedAt = ResolveTime(now, b.CreatedAt)
        }));

        db.SpoolProfiles.AddRange(fixture.SpoolProfiles.Select(p => new SpoolProfile
        {
            Id = Guid.NewGuid(),
            Name = p.Name,
            Brand = p.Brand,
            Material = p.Material,
            ColorName = p.ColorName,
            ColorHex = p.ColorHex,
            InitialWeightG = p.InitialWeightG,
            SpoolWeightG = p.SpoolWeightG,
            LowStockThresholdG = p.LowStockThresholdG,
            Density = p.Density,
            DiameterTolerance = p.DiameterTolerance,
            ExtruderMin = p.ExtruderMin,
            ExtruderMax = p.ExtruderMax,
            BedMin = p.BedMin,
            BedMax = p.BedMax,
            Price = p.Price,
            CreatedAt = ResolveTime(now, p.CreatedAt),
            UpdatedAt = ResolveTime(now, p.UpdatedAt)
        }));

        var spoolsByKey = fixture.Spools.ToDictionary(s => s.Key, s => new Spool
        {
            Id = Guid.NewGuid(),
            Brand = s.Brand,
            Material = s.Material,
            ColorName = s.ColorName,
            ColorHex = s.ColorHex,
            InitialWeightG = s.InitialWeightG,
            CurrentWeightG = s.CurrentWeightG,
            SpoolWeightG = s.SpoolWeightG,
            LowStockThresholdG = s.LowStockThresholdG,
            IsActive = s.IsActive,
            IsArchived = s.IsArchived,
            CreatedAt = ResolveTime(now, s.CreatedAt),
            LastScannedAt = ResolveTimeNullable(now, s.LastScannedAt),
            Notes = s.Notes,
            StockLocation = s.StockLocation,
            Price = s.Price,
            Density = s.Density,
            DiameterTolerance = s.DiameterTolerance,
            ExtruderMin = s.ExtruderMin,
            ExtruderMax = s.ExtruderMax,
            BedMin = s.BedMin,
            BedMax = s.BedMax
        });
        db.Spools.AddRange(spoolsByKey.Values);

        db.NfcTags.AddRange(fixture.NfcTags.Select(t => new NfcTag
        {
            Id = Guid.NewGuid(),
            TagUid = t.TagUid,
            Type = t.Type,
            SpoolId = spoolsByKey[t.Spool].Id,
            CreatedAt = ResolveTime(now, t.CreatedAt)
        }));

        var printersByKey = fixture.Printers.ToDictionary(p => p.Key, p => new Printer
        {
            Id = Guid.NewGuid(),
            Name = p.Name,
            Brand = p.Brand,
            Model = p.Model,
            SerialNumber = p.SerialNumber,
            HasAms = p.HasAms,
            Protocol = p.Protocol,
            IpAddress = p.IpAddress,
            Port = p.Port,
            AccessCode = p.AccessCode,
            Tray1SpoolId = ResolveSpool(spoolsByKey, p.Tray1Spool),
            Tray2SpoolId = ResolveSpool(spoolsByKey, p.Tray2Spool),
            Tray3SpoolId = ResolveSpool(spoolsByKey, p.Tray3Spool),
            Tray4SpoolId = ResolveSpool(spoolsByKey, p.Tray4Spool),
            ExtraSpoolId = ResolveSpool(spoolsByKey, p.ExtraSpool),
            CreatedAt = ResolveTime(now, p.CreatedAt)
        });
        db.Printers.AddRange(printersByKey.Values);

        var printJobsByKey = fixture.PrintJobs.ToDictionary(j => j.Key, j => new PrintJob
        {
            Id = Guid.NewGuid(),
            PrinterId = printersByKey[j.Printer].Id,
            SpoolId = ResolveSpool(spoolsByKey, j.Spool),
            PrintFileName = j.PrintFileName,
            Status = j.Status,
            GramsUsed = j.GramsUsed,
            StartedAt = ResolveTime(now, j.StartedAt),
            FinishedAt = ResolveTimeNullable(now, j.FinishedAt),
            LastUpdatedAt = ResolveTime(now, j.LastUpdatedAt),
            FilamentDeducted = j.FilamentDeducted,
            Source = j.Source
        });
        db.PrintJobs.AddRange(printJobsByKey.Values);

        db.PrintJobFilaments.AddRange(fixture.PrintJobFilaments.Select(f => new PrintJobFilament
        {
            Id = Guid.NewGuid(),
            PrintJobId = printJobsByKey[f.PrintJob].Id,
            SpoolId = ResolveSpool(spoolsByKey, f.Spool),
            ColorName = f.ColorName,
            ColorHex = f.ColorHex,
            Material = f.Material,
            GramsUsed = f.GramsUsed,
            SlotIndex = f.SlotIndex
        }));

        db.Activities.AddRange(fixture.Activities.Select(a => new Activity
        {
            Id = Guid.NewGuid(),
            EventType = a.EventType,
            ResourceType = a.ResourceType,
            ResourceId = ResolveActivityResource(spoolsByKey, printersByKey, printJobsByKey, a.ResourceType, a.Resource),
            ResourceName = a.ResourceName,
            Action = a.Action,
            CreatedAt = ResolveTime(now, a.CreatedAt)
        }));

        await db.SaveChangesAsync();
    }

    private static Guid? ResolveSpool(Dictionary<string, Spool> spoolsByKey, string? key) =>
        key is null ? null : spoolsByKey[key].Id;

    private static Guid? ResolveActivityResource(
        Dictionary<string, Spool> spoolsByKey,
        Dictionary<string, Printer> printersByKey,
        Dictionary<string, PrintJob> printJobsByKey,
        string resourceType,
        string? key)
    {
        if (key is null)
            return null;

        return resourceType switch
        {
            "Spool" => spoolsByKey[key].Id,
            "Printer" => printersByKey[key].Id,
            "PrintJob" => printJobsByKey[key].Id,
            _ => throw new InvalidOperationException($"Unknown activity resource type '{resourceType}'.")
        };
    }

    // Fixture timestamps are relative offsets from load time (e.g. "-60d", "-90m", "-2h"),
    // since the fixture is committed nowhere but must still produce plausible "recent activity" data.
    private static DateTime ResolveTime(DateTime now, string offset)
    {
        if (string.IsNullOrEmpty(offset))
            return now;

        var unit = offset[^1];
        var amount = double.Parse(offset[..^1], CultureInfo.InvariantCulture);
        return unit switch
        {
            'd' => now.AddDays(amount),
            'h' => now.AddHours(amount),
            'm' => now.AddMinutes(amount),
            _ => throw new FormatException($"Time offset '{offset}' must end in d/h/m, e.g. '-60d'.")
        };
    }

    private static DateTime? ResolveTimeNullable(DateTime now, string? offset) =>
        offset is null ? null : ResolveTime(now, offset);

    private static string GetFixturePath([CallerFilePath] string sourceFilePath = "") =>
        Path.Combine(Path.GetDirectoryName(sourceFilePath) ?? ".", "seed-data.local.json");

    private sealed class SeedFixture
    {
        public List<LocationFixture> Locations { get; set; } = [];
        public List<AppSettingFixture> AppSettings { get; set; } = [];
        public List<BrandFixture> Brands { get; set; } = [];
        public List<SpoolProfileFixture> SpoolProfiles { get; set; } = [];
        public List<SpoolFixture> Spools { get; set; } = [];
        public List<NfcTagFixture> NfcTags { get; set; } = [];
        public List<PrinterFixture> Printers { get; set; } = [];
        public List<PrintJobFixture> PrintJobs { get; set; } = [];
        public List<PrintJobFilamentFixture> PrintJobFilaments { get; set; } = [];
        public List<ActivityFixture> Activities { get; set; } = [];
    }

    private sealed class LocationFixture
    {
        public string Name { get; set; } = "";
        public string CreatedAt { get; set; } = "";
    }

    private sealed class AppSettingFixture
    {
        public string Key { get; set; } = "";
        public string Value { get; set; } = "";
    }

    private sealed class BrandFixture
    {
        public string Name { get; set; } = "";
        public string Domain { get; set; } = "";
        public string OfdSlug { get; set; } = "";
        public string CreatedAt { get; set; } = "";
    }

    private sealed class SpoolProfileFixture
    {
        public string Name { get; set; } = "";
        public string Brand { get; set; } = "";
        public string Material { get; set; } = "";
        public string ColorName { get; set; } = "";
        public string ColorHex { get; set; } = "";
        public float InitialWeightG { get; set; }
        public float SpoolWeightG { get; set; }
        public float LowStockThresholdG { get; set; }
        public float? Density { get; set; }
        public float? DiameterTolerance { get; set; }
        public int? ExtruderMin { get; set; }
        public int? ExtruderMax { get; set; }
        public int? BedMin { get; set; }
        public int? BedMax { get; set; }
        public decimal? Price { get; set; }
        public string CreatedAt { get; set; } = "";
        public string UpdatedAt { get; set; } = "";
    }

    private sealed class SpoolFixture
    {
        public string Key { get; set; } = "";
        public string Brand { get; set; } = "";
        public string Material { get; set; } = "";
        public string ColorName { get; set; } = "";
        public string ColorHex { get; set; } = "";
        public float InitialWeightG { get; set; }
        public float CurrentWeightG { get; set; }
        public float SpoolWeightG { get; set; }
        public float LowStockThresholdG { get; set; }
        public bool IsActive { get; set; }
        public bool IsArchived { get; set; }
        public string CreatedAt { get; set; } = "";
        public string? LastScannedAt { get; set; }
        public string? Notes { get; set; }
        public string? StockLocation { get; set; }
        public decimal? Price { get; set; }
        public float? Density { get; set; }
        public float? DiameterTolerance { get; set; }
        public int? ExtruderMin { get; set; }
        public int? ExtruderMax { get; set; }
        public int? BedMin { get; set; }
        public int? BedMax { get; set; }
    }

    private sealed class NfcTagFixture
    {
        public string TagUid { get; set; } = "";
        public string Type { get; set; } = "";
        public string Spool { get; set; } = "";
        public string CreatedAt { get; set; } = "";
    }

    private sealed class PrinterFixture
    {
        public string Key { get; set; } = "";
        public string Name { get; set; } = "";
        public string Brand { get; set; } = "";
        public string Model { get; set; } = "";
        public string? SerialNumber { get; set; }
        public bool HasAms { get; set; }
        public string Protocol { get; set; } = "";
        public string IpAddress { get; set; } = "";
        public int? Port { get; set; }
        public string? AccessCode { get; set; }
        public string? Tray1Spool { get; set; }
        public string? Tray2Spool { get; set; }
        public string? Tray3Spool { get; set; }
        public string? Tray4Spool { get; set; }
        public string? ExtraSpool { get; set; }
        public string CreatedAt { get; set; } = "";
    }

    private sealed class PrintJobFixture
    {
        public string Key { get; set; } = "";
        public string Printer { get; set; } = "";
        public string? Spool { get; set; }
        public string? PrintFileName { get; set; }
        public PrintJobStatus Status { get; set; }
        public float GramsUsed { get; set; }
        public string StartedAt { get; set; } = "";
        public string? FinishedAt { get; set; }
        public string LastUpdatedAt { get; set; } = "";
        public bool FilamentDeducted { get; set; }
        public string Source { get; set; } = "local";
    }

    private sealed class PrintJobFilamentFixture
    {
        public string PrintJob { get; set; } = "";
        public string? Spool { get; set; }
        public string? ColorName { get; set; }
        public string? ColorHex { get; set; }
        public string? Material { get; set; }
        public float GramsUsed { get; set; }
        public int SlotIndex { get; set; }
    }

    private sealed class ActivityFixture
    {
        public string EventType { get; set; } = "";
        public string ResourceType { get; set; } = "";
        public string? Resource { get; set; }
        public string ResourceName { get; set; } = "";
        public string Action { get; set; } = "";
        public string CreatedAt { get; set; } = "";
    }
}

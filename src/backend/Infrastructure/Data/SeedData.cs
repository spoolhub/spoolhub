using Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Data;

public static class SeedData
{
    public static async Task SeedAsync(FilamentDbContext db)
    {
        if (await db.Printers.AnyAsync())
            return;

        var now = DateTime.UtcNow;

        // ── Locations ──
        var locShelfA1 = new Location { Id = Guid.NewGuid(), Name = "Shelf A1", CreatedAt = now.AddDays(-60) };
        var locShelfA2 = new Location { Id = Guid.NewGuid(), Name = "Shelf A2", CreatedAt = now.AddDays(-60) };
        var locShelfB1 = new Location { Id = Guid.NewGuid(), Name = "Shelf B1", CreatedAt = now.AddDays(-60) };
        var locShelfB2 = new Location { Id = Guid.NewGuid(), Name = "Shelf B2", CreatedAt = now.AddDays(-60) };
        var locDrybox1 = new Location { Id = Guid.NewGuid(), Name = "Drybox 1", CreatedAt = now.AddDays(-60) };
        var locDrybox2 = new Location { Id = Guid.NewGuid(), Name = "Drybox 2", CreatedAt = now.AddDays(-60) };
        db.Locations.AddRange(locShelfA1, locShelfA2, locShelfB1, locShelfB2, locDrybox1, locDrybox2);

        // ── App settings ──
        db.AppSettings.AddRange(
            new AppSetting { Key = "alerts.enabled",                Value = "false" },
            new AppSetting { Key = "alerts.provider",               Value = "ntfy" },
            new AppSetting { Key = "alerts.ntfy_url",               Value = "" },
            new AppSetting { Key = "alerts.webhook_url",            Value = "" },
            new AppSetting { Key = "alerts.discord_webhook_url",    Value = "" },
            new AppSetting { Key = "alerts.notify_low_stock",       Value = "true" },
            new AppSetting { Key = "alerts.notify_spool_assigned",  Value = "true" },
            new AppSetting { Key = "alerts.notify_spool_added",     Value = "true" },
            new AppSetting { Key = "alerts.notify_spool_deleted",   Value = "true" },
            new AppSetting { Key = "alerts.notify_printer_deleted", Value = "true" },
            new AppSetting { Key = "filaments.auto_sync",           Value = "true" },
            new AppSetting { Key = "filaments.ofd_source_url",      Value = "https://openfilament.com/api/filaments" },
            new AppSetting { Key = "app.default_low_stock_threshold_g", Value = "100" },
            new AppSetting { Key = "app.currency",                  Value = "USD" },
            new AppSetting { Key = "app.language",                  Value = "en" }
        );

        // ── Brands ──
        var brandBambu    = new Brand { Id = Guid.NewGuid(), Name = "Bambu Lab",  Domain = "bambulab.com",   OfdSlug = "bambu_lab",  CreatedAt = now.AddDays(-60) };
        var brandPrusa    = new Brand { Id = Guid.NewGuid(), Name = "Prusament",  Domain = "prusa3d.com",    OfdSlug = "prusament",  CreatedAt = now.AddDays(-55) };
        var brandESun     = new Brand { Id = Guid.NewGuid(), Name = "eSUN",       Domain = "esun3d.com",     OfdSlug = "esun_3d",    CreatedAt = now.AddDays(-50) };
        var brandPoly     = new Brand { Id = Guid.NewGuid(), Name = "Polymaker",  Domain = "polymaker.com",  OfdSlug = "polymaker",  CreatedAt = now.AddDays(-45) };
        var brandHatch    = new Brand { Id = Guid.NewGuid(), Name = "Hatchbox",   Domain = "hatchbox3d.com", OfdSlug = "hatchbox",   CreatedAt = now.AddDays(-40) };
        var brandOverture = new Brand { Id = Guid.NewGuid(), Name = "Overture",   Domain = "overture3d.com", OfdSlug = "overture",   CreatedAt = now.AddDays(-35) };
        db.Brands.AddRange(brandBambu, brandPrusa, brandESun, brandPoly, brandHatch, brandOverture);

        // ── Spool profiles ──
        db.SpoolProfiles.AddRange(
            new SpoolProfile { Id = Guid.NewGuid(), Name = "Bambu Lab PLA Basic",   Brand = "Bambu Lab",  Material = "PLA",  ColorName = "White",        ColorHex = "#FFFFFF", InitialWeightG = 1000, SpoolWeightG = 200, LowStockThresholdG = 100, Density = 1.24f, DiameterTolerance = 1.75f, ExtruderMin = 200, ExtruderMax = 220, BedMin = 55, BedMax = 60, Price = 24.99m, CreatedAt = now.AddDays(-60), UpdatedAt = now.AddDays(-60) },
            new SpoolProfile { Id = Guid.NewGuid(), Name = "Bambu Lab PETG HF",     Brand = "Bambu Lab",  Material = "PETG", ColorName = "White",        ColorHex = "#FFFFFF", InitialWeightG = 1000, SpoolWeightG = 200, LowStockThresholdG = 100, Density = 1.27f, DiameterTolerance = 1.75f, ExtruderMin = 230, ExtruderMax = 250, BedMin = 70, BedMax = 80, Price = 29.99m, CreatedAt = now.AddDays(-60), UpdatedAt = now.AddDays(-60) },
            new SpoolProfile { Id = Guid.NewGuid(), Name = "Prusament PLA",         Brand = "Prusament",  Material = "PLA",  ColorName = "Galaxy Black", ColorHex = "#1C1F26", InitialWeightG = 1000, SpoolWeightG = 250, LowStockThresholdG = 100, Density = 1.24f, DiameterTolerance = 1.75f, ExtruderMin = 200, ExtruderMax = 220, BedMin = 55, BedMax = 60, Price = 27.99m, CreatedAt = now.AddDays(-55), UpdatedAt = now.AddDays(-55) },
            new SpoolProfile { Id = Guid.NewGuid(), Name = "Prusament PETG",        Brand = "Prusament",  Material = "PETG", ColorName = "Prusa Orange", ColorHex = "#F26C2A", InitialWeightG = 1000, SpoolWeightG = 250, LowStockThresholdG = 100, Density = 1.27f, DiameterTolerance = 1.75f, ExtruderMin = 230, ExtruderMax = 250, BedMin = 70, BedMax = 80, Price = 27.99m, CreatedAt = now.AddDays(-55), UpdatedAt = now.AddDays(-55) },
            new SpoolProfile { Id = Guid.NewGuid(), Name = "eSUN ABS+",             Brand = "eSUN",       Material = "ABS",  ColorName = "White",        ColorHex = "#EDEFF2", InitialWeightG = 1000, SpoolWeightG = 200, LowStockThresholdG = 100, Density = 1.04f, DiameterTolerance = 1.75f, ExtruderMin = 240, ExtruderMax = 260, BedMin = 95, BedMax = 110, Price = 21.99m, CreatedAt = now.AddDays(-50), UpdatedAt = now.AddDays(-50) },
            new SpoolProfile { Id = Guid.NewGuid(), Name = "eSUN PLA Matte",        Brand = "eSUN",       Material = "PLA",  ColorName = "Black",        ColorHex = "#1C1F26", InitialWeightG = 1000, SpoolWeightG = 200, LowStockThresholdG = 100, Density = 1.24f, DiameterTolerance = 1.75f, ExtruderMin = 200, ExtruderMax = 220, BedMin = 55, BedMax = 60, Price = 19.99m, CreatedAt = now.AddDays(-50), UpdatedAt = now.AddDays(-50) },
            new SpoolProfile { Id = Guid.NewGuid(), Name = "Polymaker PolyFlex TPU", Brand = "Polymaker", Material = "TPU",  ColorName = "White",        ColorHex = "#FFFFFF", InitialWeightG = 500,  SpoolWeightG = 150, LowStockThresholdG = 80,  Density = 1.20f, DiameterTolerance = 1.75f, ExtruderMin = 220, ExtruderMax = 235, BedMin = 40, BedMax = 60, Price = 34.99m, CreatedAt = now.AddDays(-45), UpdatedAt = now.AddDays(-45) },
            new SpoolProfile { Id = Guid.NewGuid(), Name = "Hatchbox PLA",          Brand = "Hatchbox",   Material = "PLA",  ColorName = "Yellow",       ColorHex = "#F4B81C", InitialWeightG = 1000, SpoolWeightG = 200, LowStockThresholdG = 100, Density = 1.24f, DiameterTolerance = 1.75f, ExtruderMin = 200, ExtruderMax = 220, BedMin = 55, BedMax = 60, Price = 22.99m, CreatedAt = now.AddDays(-40), UpdatedAt = now.AddDays(-40) }
        );

        // ── Spools ──
        var spBambuJade = new Spool {
            Id = Guid.NewGuid(), Brand = "Bambu Lab", Material = "PLA", ColorName = "Jade Green", ColorHex = "#0E9E6E",
            InitialWeightG = 1000, CurrentWeightG = 750, SpoolWeightG = 200, LowStockThresholdG = 120,
            IsActive = true, IsArchived = false,
            CreatedAt = now.AddDays(-30), LastScannedAt = now.AddHours(-2),
            Notes = "Basic PLA — everyday prints", StockLocation = null,
            Price = 24.99m, Density = 1.24f, DiameterTolerance = 1.75f,
            ExtruderMin = 200, ExtruderMax = 220, BedMin = 55, BedMax = 60
        };
        var spBambuOrange = new Spool {
            Id = Guid.NewGuid(), Brand = "Bambu Lab", Material = "PETG", ColorName = "Lava Orange", ColorHex = "#E8531A",
            InitialWeightG = 1000, CurrentWeightG = 430, SpoolWeightG = 200, LowStockThresholdG = 120,
            IsActive = false, IsArchived = false,
            CreatedAt = now.AddDays(-28), LastScannedAt = now.AddDays(-1),
            Notes = "HF PETG — high flow", StockLocation = "Shelf A2",
            Price = 29.99m, Density = 1.27f, DiameterTolerance = 1.75f,
            ExtruderMin = 230, ExtruderMax = 250, BedMin = 70, BedMax = 80
        };
        var spPrusaGalaxy = new Spool {
            Id = Guid.NewGuid(), Brand = "Prusament", Material = "PLA", ColorName = "Galaxy Black", ColorHex = "#1C1F26",
            InitialWeightG = 1000, CurrentWeightG = 90, SpoolWeightG = 250, LowStockThresholdG = 120,
            IsActive = true, IsArchived = false,
            CreatedAt = now.AddDays(-25), LastScannedAt = now.AddDays(-3),
            Notes = "Galaxy series — matte finish", StockLocation = null,
            Price = 27.99m, Density = 1.24f, DiameterTolerance = 1.75f,
            ExtruderMin = 200, ExtruderMax = 220, BedMin = 55, BedMax = 60
        };
        var spPrusaPurple = new Spool {
            Id = Guid.NewGuid(), Brand = "Prusament", Material = "PLA", ColorName = "Galaxy Purple", ColorHex = "#7C3AED",
            InitialWeightG = 1000, CurrentWeightG = 880, SpoolWeightG = 250, LowStockThresholdG = 120,
            IsActive = false, IsArchived = false,
            CreatedAt = now.AddDays(-22), LastScannedAt = now.AddHours(-5),
            Notes = "Galaxy series — vibrant purple", StockLocation = "Shelf A1",
            Price = 27.99m, Density = 1.24f, DiameterTolerance = 1.75f,
            ExtruderMin = 200, ExtruderMax = 220, BedMin = 55, BedMax = 60
        };
        var spESunWhite = new Spool {
            Id = Guid.NewGuid(), Brand = "eSUN", Material = "ABS", ColorName = "Cool White", ColorHex = "#EDEFF2",
            InitialWeightG = 1000, CurrentWeightG = 610, SpoolWeightG = 200, LowStockThresholdG = 120,
            IsActive = false, IsArchived = false,
            CreatedAt = now.AddDays(-20), LastScannedAt = now.AddDays(-5),
            Notes = "ABS+ — improved toughness", StockLocation = "Drybox 1",
            Price = 21.99m, Density = 1.04f, DiameterTolerance = 1.75f,
            ExtruderMin = 240, ExtruderMax = 260, BedMin = 95, BedMax = 110
        };
        var spESunBlack = new Spool {
            Id = Guid.NewGuid(), Brand = "eSUN", Material = "PLA", ColorName = "Matte Black", ColorHex = "#1C1F26",
            InitialWeightG = 1000, CurrentWeightG = 120, SpoolWeightG = 200, LowStockThresholdG = 120,
            IsActive = false, IsArchived = false,
            CreatedAt = now.AddDays(-18), LastScannedAt = now.AddHours(-2),
            Notes = "PLA Matte — silk-like finish", StockLocation = "Shelf B1",
            Price = 19.99m, Density = 1.24f, DiameterTolerance = 1.75f,
            ExtruderMin = 200, ExtruderMax = 220, BedMin = 55, BedMax = 60
        };
        var spESunRed = new Spool {
            Id = Guid.NewGuid(), Brand = "eSUN", Material = "PLA", ColorName = "Signal Red", ColorHex = "#EF4444",
            InitialWeightG = 1000, CurrentWeightG = 520, SpoolWeightG = 200, LowStockThresholdG = 120,
            IsActive = false, IsArchived = false,
            CreatedAt = now.AddDays(-15), LastScannedAt = now.AddDays(-1),
            Notes = "PLA+ — enhanced strength", StockLocation = "Shelf B2",
            Price = 19.99m, Density = 1.24f, DiameterTolerance = 1.75f,
            ExtruderMin = 200, ExtruderMax = 220, BedMin = 55, BedMax = 60
        };
        var spPolyOrange = new Spool {
            Id = Guid.NewGuid(), Brand = "Polymaker", Material = "PETG", ColorName = "PolyLite Orange", ColorHex = "#E8531A",
            InitialWeightG = 1000, CurrentWeightG = 340, SpoolWeightG = 250, LowStockThresholdG = 120,
            IsActive = false, IsArchived = false,
            CreatedAt = now.AddDays(-12), LastScannedAt = now.AddDays(-2),
            Notes = "PolyLite — easy printing PETG", StockLocation = "Drybox 2",
            Price = 25.99m, Density = 1.27f, DiameterTolerance = 1.75f,
            ExtruderMin = 230, ExtruderMax = 250, BedMin = 70, BedMax = 80
        };
        var spHatchYellow = new Spool {
            Id = Guid.NewGuid(), Brand = "Hatchbox", Material = "PLA", ColorName = "Sunset Yellow", ColorHex = "#F4B81C",
            InitialWeightG = 1000, CurrentWeightG = 55, SpoolWeightG = 200, LowStockThresholdG = 120,
            IsActive = false, IsArchived = false,
            CreatedAt = now.AddDays(-10), LastScannedAt = now.AddDays(-6),
            Notes = "True Colors — vibrant yellow", StockLocation = "Shelf A1",
            Price = 22.99m, Density = 1.24f, DiameterTolerance = 1.75f,
            ExtruderMin = 200, ExtruderMax = 220, BedMin = 55, BedMax = 60
        };
        var spOvertureSlate = new Spool {
            Id = Guid.NewGuid(), Brand = "Overture", Material = "PETG", ColorName = "Matte Slate Grey", ColorHex = "#5B6470",
            InitialWeightG = 1000, CurrentWeightG = 65, SpoolWeightG = 200, LowStockThresholdG = 120,
            IsActive = false, IsArchived = false,
            CreatedAt = now.AddDays(-8), LastScannedAt = now.AddDays(-2),
            Notes = "Matte finish PETG", StockLocation = "Shelf B1",
            Price = 23.99m, Density = 1.27f, DiameterTolerance = 1.75f,
            ExtruderMin = 230, ExtruderMax = 250, BedMin = 70, BedMax = 80
        };
        var spBambuForest = new Spool {
            Id = Guid.NewGuid(), Brand = "Bambu Lab", Material = "PETG", ColorName = "Forest Green", ColorHex = "#1B5E3A",
            InitialWeightG = 1000, CurrentWeightG = 540, SpoolWeightG = 200, LowStockThresholdG = 120,
            IsActive = false, IsArchived = false,
            CreatedAt = now.AddDays(-6), LastScannedAt = now.AddHours(-8),
            Notes = "HF PETG — high flow", StockLocation = "Shelf A2",
            Price = 29.99m, Density = 1.27f, DiameterTolerance = 1.75f,
            ExtruderMin = 230, ExtruderMax = 250, BedMin = 70, BedMax = 80
        };
        var spPolyCoral = new Spool {
            Id = Guid.NewGuid(), Brand = "Polymaker", Material = "TPU", ColorName = "Coral Red", ColorHex = "#E23B49",
            InitialWeightG = 500, CurrentWeightG = 260, SpoolWeightG = 150, LowStockThresholdG = 120,
            IsActive = false, IsArchived = false,
            CreatedAt = now.AddDays(-4), LastScannedAt = now.AddDays(-3),
            Notes = "PolyFlex 90A — flexible", StockLocation = "Drybox 1",
            Price = 34.99m, Density = 1.20f, DiameterTolerance = 1.75f,
            ExtruderMin = 220, ExtruderMax = 235, BedMin = 40, BedMax = 60
        };
        var spPrusaOrange = new Spool {
            Id = Guid.NewGuid(), Brand = "Prusament", Material = "PETG", ColorName = "Prusa Orange", ColorHex = "#F26C2A",
            InitialWeightG = 1000, CurrentWeightG = 910, SpoolWeightG = 250, LowStockThresholdG = 120,
            IsActive = false, IsArchived = false,
            CreatedAt = now.AddDays(-3), LastScannedAt = now.AddHours(-12),
            Notes = "Signature Prusa color", StockLocation = "Shelf A1",
            Price = 27.99m, Density = 1.27f, DiameterTolerance = 1.75f,
            ExtruderMin = 230, ExtruderMax = 250, BedMin = 70, BedMax = 80
        };

        db.Spools.AddRange(
            spBambuJade, spBambuOrange, spPrusaGalaxy, spPrusaPurple, spESunWhite, spESunBlack, spESunRed,
            spPolyOrange, spHatchYellow, spOvertureSlate, spBambuForest, spPolyCoral, spPrusaOrange
        );

        // ── NFC tags ──
        db.NfcTags.AddRange(
            new NfcTag { Id = Guid.NewGuid(), TagUid = "04:A1:B2:C3:D4:E5:01", Type = "NTAG213", SpoolId = spBambuJade.Id,   CreatedAt = now.AddDays(-30) },
            new NfcTag { Id = Guid.NewGuid(), TagUid = "04:A1:B2:C3:D4:E5:02", Type = "NTAG213", SpoolId = spBambuOrange.Id, CreatedAt = now.AddDays(-28) },
            new NfcTag { Id = Guid.NewGuid(), TagUid = "04:A1:B2:C3:D4:E5:03", Type = "NTAG213", SpoolId = spPrusaGalaxy.Id, CreatedAt = now.AddDays(-25) },
            new NfcTag { Id = Guid.NewGuid(), TagUid = "04:A1:B2:C3:D4:E5:04", Type = "NTAG213", SpoolId = spESunBlack.Id,   CreatedAt = now.AddDays(-18) },
            new NfcTag { Id = Guid.NewGuid(), TagUid = "04:A1:B2:C3:D4:E5:05", Type = "NTAG213", SpoolId = spBambuForest.Id, CreatedAt = now.AddDays(-6) }
        );

        // ── Printers ──
        var p1 = new Printer {
            Id = Guid.NewGuid(), Name = "Maker Lab", Brand = "Bambu Lab", Model = "X1 Carbon",
            SerialNumber = "01S00A000000001",
            HasAms = true, Protocol = "mqtt_lan", IpAddress = "192.168.1.10", Port = 8883, AccessCode = "12345678",
            Tray1SpoolId = spBambuJade.Id, Tray2SpoolId = spBambuOrange.Id, Tray3SpoolId = spPrusaGalaxy.Id, Tray4SpoolId = null,
            CreatedAt = now.AddDays(-30)
        };
        var p2 = new Printer {
            Id = Guid.NewGuid(), Name = "Print Farm", Brand = "Bambu Lab", Model = "P1S",
            SerialNumber = "01P00A000000002",
            HasAms = true, Protocol = "mqtt_cloud", IpAddress = "192.168.1.11", Port = 8883, AccessCode = "87654321",
            Tray1SpoolId = spPrusaPurple.Id, Tray2SpoolId = spESunWhite.Id, Tray3SpoolId = null, Tray4SpoolId = null,
            CreatedAt = now.AddDays(-30)
        };
        var p3 = new Printer {
            Id = Guid.NewGuid(), Name = "Garage A1", Brand = "Bambu Lab", Model = "A1 Mini",
            SerialNumber = "01A00A000000003",
            HasAms = true, Protocol = "mqtt_lan", IpAddress = "192.168.1.12", Port = 8883, AccessCode = "11223344",
            Tray1SpoolId = spESunBlack.Id, Tray2SpoolId = spESunRed.Id, Tray3SpoolId = null, Tray4SpoolId = null,
            CreatedAt = now.AddDays(-30)
        };
        var p4 = new Printer {
            Id = Guid.NewGuid(), Name = "Workshop MK4", Brand = "Prusa", Model = "MK4",
            SerialNumber = "SN-MK4-000004",
            HasAms = false, Protocol = "mqtt_lan", IpAddress = "192.168.1.13", Port = null, AccessCode = null,
            ExtraSpoolId = spPrusaOrange.Id,
            CreatedAt = now.AddDays(-30)
        };
        db.Printers.AddRange(p1, p2, p3, p4);

        // ── Print jobs ──
        var job1FinishedAt = now.AddHours(-20);
        var job2FinishedAt = now.AddHours(-44);
        var job3FinishedAt = now.AddHours(-60);
        var job4FinishedAt = now.AddHours(-92);
        var job5FinishedAt = now.AddHours(-110);
        var job6StartedAt  = now.AddMinutes(-45);
        var job7FinishedAt = now.AddHours(-130);

        var job1 = new PrintJob { Id = Guid.NewGuid(), PrinterId = p1.Id, SpoolId = spBambuJade.Id,   PrintFileName = "vase.3mf",      Status = PrintJobStatus.Finished, GramsUsed = 124.5f, StartedAt = now.AddDays(-1),    FinishedAt = job1FinishedAt,  LastUpdatedAt = job1FinishedAt,  FilamentDeducted = true,  Source = "local" };
        var job2 = new PrintJob { Id = Guid.NewGuid(), PrinterId = p1.Id, SpoolId = spBambuOrange.Id, PrintFileName = "bracket.3mf",   Status = PrintJobStatus.Finished, GramsUsed = 43.0f,  StartedAt = now.AddDays(-2),    FinishedAt = job2FinishedAt,  LastUpdatedAt = job2FinishedAt,  FilamentDeducted = true,  Source = "local" };
        var job3 = new PrintJob { Id = Guid.NewGuid(), PrinterId = p1.Id, SpoolId = spPrusaGalaxy.Id, PrintFileName = "lion.3mf",      Status = PrintJobStatus.Finished, GramsUsed = 210.0f, StartedAt = now.AddDays(-3),    FinishedAt = job3FinishedAt,  LastUpdatedAt = job3FinishedAt,  FilamentDeducted = true,  Source = "local" };
        var job4 = new PrintJob { Id = Guid.NewGuid(), PrinterId = p2.Id, SpoolId = spESunWhite.Id,   PrintFileName = "case.3mf",      Status = PrintJobStatus.Finished, GramsUsed = 87.3f,  StartedAt = now.AddDays(-4),    FinishedAt = job4FinishedAt,  LastUpdatedAt = job4FinishedAt,  FilamentDeducted = true,  Source = "bambu-cloud" };
        var job5 = new PrintJob { Id = Guid.NewGuid(), PrinterId = p2.Id, SpoolId = spESunWhite.Id,   PrintFileName = "stand.3mf",     Status = PrintJobStatus.Finished, GramsUsed = 55.2f,  StartedAt = now.AddDays(-5),    FinishedAt = job5FinishedAt,  LastUpdatedAt = job5FinishedAt,  FilamentDeducted = true,  Source = "bambu-cloud" };
        var job6 = new PrintJob { Id = Guid.NewGuid(), PrinterId = p1.Id, SpoolId = spESunBlack.Id,   PrintFileName = "figurine.3mf",  Status = PrintJobStatus.Running,  GramsUsed = 38.4f,  StartedAt = job6StartedAt,      FinishedAt = null,            LastUpdatedAt = now.AddMinutes(-5),  FilamentDeducted = false, Source = "mqtt" };
        var job7 = new PrintJob { Id = Guid.NewGuid(), PrinterId = p3.Id, SpoolId = spPrusaPurple.Id, PrintFileName = "test_cube.3mf", Status = PrintJobStatus.Failed,   GramsUsed = 12.1f,  StartedAt = now.AddDays(-6),    FinishedAt = job7FinishedAt,  LastUpdatedAt = job7FinishedAt,  FilamentDeducted = false, Source = "local" };
        db.PrintJobs.AddRange(job1, job2, job3, job4, job5, job6, job7);

        // ── Print job filaments (AMS multi-slot breakdown) ──
        db.PrintJobFilaments.AddRange(
            // vase.3mf — 3 colors via AMS (p1 X1 Carbon)
            new PrintJobFilament { Id = Guid.NewGuid(), PrintJobId = job1.Id, SpoolId = spBambuJade.Id,   ColorName = "Jade Green",   ColorHex = "#0E9E6E", Material = "PLA",  GramsUsed = 72.0f, SlotIndex = 0 },
            new PrintJobFilament { Id = Guid.NewGuid(), PrintJobId = job1.Id, SpoolId = spBambuOrange.Id, ColorName = "Lava Orange",  ColorHex = "#E8531A", Material = "PETG", GramsUsed = 31.5f, SlotIndex = 1 },
            new PrintJobFilament { Id = Guid.NewGuid(), PrintJobId = job1.Id, SpoolId = spPrusaGalaxy.Id, ColorName = "Galaxy Black", ColorHex = "#1C1F26", Material = "PLA",  GramsUsed = 21.0f, SlotIndex = 2 },
            // bracket.3mf — single color
            new PrintJobFilament { Id = Guid.NewGuid(), PrintJobId = job2.Id, SpoolId = spBambuOrange.Id, ColorName = "Lava Orange",  ColorHex = "#E8531A", Material = "PETG", GramsUsed = 43.0f, SlotIndex = 0 },
            // lion.3mf — single color
            new PrintJobFilament { Id = Guid.NewGuid(), PrintJobId = job3.Id, SpoolId = spPrusaGalaxy.Id, ColorName = "Galaxy Black", ColorHex = "#1C1F26", Material = "PLA",  GramsUsed = 210.0f, SlotIndex = 0 },
            // case.3mf — 2 colors via AMS (p2 P1S)
            new PrintJobFilament { Id = Guid.NewGuid(), PrintJobId = job4.Id, SpoolId = spPrusaPurple.Id, ColorName = "Galaxy Purple", ColorHex = "#7C3AED", Material = "PLA", GramsUsed = 45.3f, SlotIndex = 0 },
            new PrintJobFilament { Id = Guid.NewGuid(), PrintJobId = job4.Id, SpoolId = spESunWhite.Id,   ColorName = "Cool White",   ColorHex = "#EDEFF2", Material = "ABS",  GramsUsed = 42.0f, SlotIndex = 1 },
            // stand.3mf — single color
            new PrintJobFilament { Id = Guid.NewGuid(), PrintJobId = job5.Id, SpoolId = spESunWhite.Id,   ColorName = "Cool White",   ColorHex = "#EDEFF2", Material = "ABS",  GramsUsed = 55.2f, SlotIndex = 0 },
            // figurine.3mf — running, single color
            new PrintJobFilament { Id = Guid.NewGuid(), PrintJobId = job6.Id, SpoolId = spESunBlack.Id,   ColorName = "Matte Black",  ColorHex = "#1C1F26", Material = "PLA",  GramsUsed = 38.4f, SlotIndex = 0 },
            // test_cube.3mf — failed, single color
            new PrintJobFilament { Id = Guid.NewGuid(), PrintJobId = job7.Id, SpoolId = spPrusaPurple.Id, ColorName = "Galaxy Purple", ColorHex = "#7C3AED", Material = "PLA", GramsUsed = 12.1f, SlotIndex = 0 }
        );

        // ── Activities ──
        db.Activities.AddRange(
            new Activity { Id = Guid.NewGuid(), EventType = "PrinterCreated", ResourceType = "Printer",  ResourceId = p1.Id,            ResourceName = p1.Name,                                                         Action = "Added printer " + p1.Name,                     CreatedAt = now.AddDays(-30) },
            new Activity { Id = Guid.NewGuid(), EventType = "PrinterCreated", ResourceType = "Printer",  ResourceId = p2.Id,            ResourceName = p2.Name,                                                         Action = "Added printer " + p2.Name,                     CreatedAt = now.AddDays(-30) },
            new Activity { Id = Guid.NewGuid(), EventType = "PrinterCreated", ResourceType = "Printer",  ResourceId = p3.Id,            ResourceName = p3.Name,                                                         Action = "Added printer " + p3.Name,                     CreatedAt = now.AddDays(-30) },
            new Activity { Id = Guid.NewGuid(), EventType = "PrinterCreated", ResourceType = "Printer",  ResourceId = p4.Id,            ResourceName = p4.Name,                                                         Action = "Added printer " + p4.Name,                     CreatedAt = now.AddDays(-30) },
            new Activity { Id = Guid.NewGuid(), EventType = "SpoolAdded",     ResourceType = "Spool",    ResourceId = spBambuJade.Id,   ResourceName = "Bambu Lab Jade Green",                                          Action = "Added spool Bambu Lab Jade Green",              CreatedAt = now.AddDays(-30) },
            new Activity { Id = Guid.NewGuid(), EventType = "SpoolAdded",     ResourceType = "Spool",    ResourceId = spPrusaGalaxy.Id, ResourceName = "Prusament Galaxy Black",                                        Action = "Added spool Prusament Galaxy Black",            CreatedAt = now.AddDays(-25) },
            new Activity { Id = Guid.NewGuid(), EventType = "PrintCompleted", ResourceType = "PrintJob", ResourceId = job1.Id,          ResourceName = p1.Name,                                                         Action = "vase.3mf — 124.5g used",                       CreatedAt = job1FinishedAt },
            new Activity { Id = Guid.NewGuid(), EventType = "PrintCompleted", ResourceType = "PrintJob", ResourceId = job2.Id,          ResourceName = p1.Name,                                                         Action = "bracket.3mf — 43.0g used",                     CreatedAt = job2FinishedAt },
            new Activity { Id = Guid.NewGuid(), EventType = "PrintCompleted", ResourceType = "PrintJob", ResourceId = job3.Id,          ResourceName = p1.Name,                                                         Action = "lion.3mf — 210.0g used",                       CreatedAt = job3FinishedAt },
            new Activity { Id = Guid.NewGuid(), EventType = "PrintFailed",    ResourceType = "PrintJob", ResourceId = job7.Id,          ResourceName = p3.Name,                                                         Action = "test_cube.3mf — print failed after 12.1g",     CreatedAt = job7FinishedAt },
            new Activity { Id = Guid.NewGuid(), EventType = "SpoolActivated", ResourceType = "Spool",    ResourceId = spBambuJade.Id,   ResourceName = "Bambu Lab Jade Green",                                          Action = "Activated on " + p1.Name,                      CreatedAt = now.AddDays(-1) },
            new Activity { Id = Guid.NewGuid(), EventType = "SpoolScanned",   ResourceType = "Spool",    ResourceId = spESunBlack.Id,   ResourceName = "eSUN Matte Black",                                              Action = "Scanned NFC tag — Matte Black",                CreatedAt = now.AddHours(-2) },
            new Activity { Id = Guid.NewGuid(), EventType = "LowStock",       ResourceType = "Spool",    ResourceId = spPrusaGalaxy.Id, ResourceName = "Prusament Galaxy Black",                                        Action = "Dropped below threshold (90g remaining)",      CreatedAt = now.AddHours(-6) },
            new Activity { Id = Guid.NewGuid(), EventType = "LowStock",       ResourceType = "Spool",    ResourceId = spHatchYellow.Id, ResourceName = "Hatchbox Sunset Yellow",                                        Action = "Dropped below threshold (55g remaining)",      CreatedAt = now.AddDays(-6) }
        );

        await db.SaveChangesAsync();
    }
}
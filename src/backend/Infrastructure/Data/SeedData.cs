using Domain.Models;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Data;

/// <summary>
/// Seeds the development database with realistic demo data.
/// Runs only in Development when the database is empty.
/// </summary>
public static class SeedData
{
    public static async Task SeedAsync(FilamentDbContext db)
    {
        if (await db.Printers.AnyAsync())
            return;

        var now = DateTime.UtcNow;

        // ═══════════════════════════════════════════════════════════════
        // 4 Locations
        // ═══════════════════════════════════════════════════════════════
        var locShelfA1 = MakeLocation("Shelf A1", "shelf", 12, now, -90);
        var locShelfA2 = MakeLocation("Shelf A2", "shelf", 12, now, -90);
        var locDrybox1 = MakeLocation("Drybox 1", "drybox", 6, 20, now, -60);
        var locDrawerB1 = MakeLocation("Drawer B1", "shelf", 8, now, -45);
        var locShelfB2 = MakeLocation("Shelf B2", "shelf", 12, now, -30);
        var locDrybox2 = MakeLocation("Drybox 2", "drybox", 4, 18, now, -14);
        var locations = new[] { locShelfA1, locShelfA2, locDrybox1, locDrawerB1, locShelfB2, locDrybox2 };
        db.Locations.AddRange(locations);

        // ═══════════════════════════════════════════════════════════════
        // AppSettings (unchanged)
        // ═══════════════════════════════════════════════════════════════
        db.AppSettings.AddRange(new[]
        {
            new AppSetting { Key = "alerts.enabled", Value = "false" },
            new AppSetting { Key = "alerts.provider", Value = "ntfy" },
            new AppSetting { Key = "alerts.ntfy_url", Value = "" },
            new AppSetting { Key = "alerts.webhook_url", Value = "" },
            new AppSetting { Key = "alerts.discord_webhook_url", Value = "" },
            new AppSetting { Key = "alerts.notify_low_stock", Value = "true" },
            new AppSetting { Key = "alerts.notify_spool_assigned", Value = "true" },
            new AppSetting { Key = "alerts.notify_spool_added", Value = "true" },
            new AppSetting { Key = "alerts.notify_spool_deleted", Value = "true" },
            new AppSetting { Key = "alerts.notify_printer_deleted", Value = "true" },
            new AppSetting { Key = "filaments.auto_sync", Value = "true" },
            new AppSetting { Key = "filaments.ofd_source_url", Value = "https://openfilament.com/api/filaments" },
            new AppSetting { Key = "app.default_low_stock_threshold_g", Value = "100" },
            new AppSetting { Key = "app.currency", Value = "USD" },
            new AppSetting { Key = "app.language", Value = "en" },
        });

        // ═══════════════════════════════════════════════════════════════
        // 6 Brands
        // ═══════════════════════════════════════════════════════════════
        var brandPolymaker = MakeBrand("Polymaker", "polymaker.com", "polymaker", now, -90);
        var brandBambu = MakeBrand("Bambu Lab", "bambulab.com", "bambu_lab", now, -80);
        var brandEsun = MakeBrand("eSUN", "esun3d.com", "esun", now, -70);
        var brandOverture = MakeBrand("Overture", "overture3d.com", "overture", now, -60);
        var brandPrusament = MakeBrand("Prusament", "prusament.com", "prusament", now, -50);
        var brandSunlu = MakeBrand("Sunlu", "sunlu.com", "sunlu", now, -40);
        var brands = new[] { brandPolymaker, brandBambu, brandEsun, brandOverture, brandPrusament, brandSunlu };
        db.Brands.AddRange(brands);

        // ═══════════════════════════════════════════════════════════════
        // 14 Spool Profiles
        // ═══════════════════════════════════════════════════════════════
        var profPolymakerWhite = MakeProfile("PolyLite PLA White", "Polymaker", "PLA", "White", "#F5F5F5", 1000, 200, 100, 1.24f, 1.75f, 200, 230, 55, 65, 22.99m, now, -90);
        var profPolymakerBlack = MakeProfile("PolyTerra PLA Black", "Polymaker", "PLA", "Matte Black", "#1A1A1A", 1000, 200, 100, 1.24f, 1.75f, 195, 220, 55, 65, 22.99m, now, -80);
        var profPolymakerGreen = MakeProfile("PolySonic PLA Green", "Polymaker", "PLA", "Green", "#4CAF50", 1000, 200, 100, 1.24f, 1.75f, 200, 230, 55, 65, 23.99m, now, -60);
        var profBambuRed = MakeProfile("Bambu PLA Basic Red", "Bambu Lab", "PLA", "Red", "#E80000", 1000, 250, 100, 1.24f, 1.75f, 190, 220, 55, 60, 24.99m, now, -70);
        var profBambuBlue = MakeProfile("Bambu PLA Basic Blue", "Bambu Lab", "PLA", "Blue", "#0055FF", 1000, 250, 100, 1.24f, 1.75f, 190, 220, 55, 60, 24.99m, now, -65);
        var profBambuGray = MakeProfile("Bambu PLA Basic Gray", "Bambu Lab", "PLA", "Gray", "#808080", 1000, 250, 100, 1.24f, 1.75f, 190, 220, 55, 60, 24.99m, now, -60);
        var profBambuOrange = MakeProfile("Bambu PLA Basic Orange", "Bambu Lab", "PLA", "Orange", "#FF6600", 1000, 250, 100, 1.24f, 1.75f, 190, 220, 55, 60, 24.99m, now, -50);
        var profEsunPetg = MakeProfile("eSUN PETG Clear", "eSUN", "PETG", "Clear Natural", "#D4E0E8", 1000, 230, 150, 1.27f, 1.75f, 230, 260, 70, 85, 20.99m, now, -60);
        var profEsunPetgBlack = MakeProfile("eSUN PETG Black", "eSUN", "PETG", "Black", "#222222", 1000, 230, 150, 1.27f, 1.75f, 230, 260, 70, 85, 20.99m, now, -50);
        var profEsunAbs = MakeProfile("eSUN ABS+ White", "eSUN", "ABS", "White", "#F0F0F0", 1000, 220, 100, 1.04f, 1.75f, 240, 270, 95, 110, 18.99m, now, -40);
        var profOvertureTpu = MakeProfile("Overture TPU Black", "Overture", "TPU", "Black", "#222222", 500, 180, 50, 1.21f, 1.75f, 220, 250, 40, 60, 28.99m, now, -40);
        var profPrusamentPla = MakeProfile("Prusament PLA Galaxy Black", "Prusament", "PLA", "Galaxy Black", "#1C1C1C", 1000, 200, 100, 1.24f, 1.75f, 210, 225, 60, 65, 32.99m, now, -30);
        var profSunluSilk = MakeProfile("Sunlu Silk PLA Gold", "Sunlu", "PLA", "Silk Gold", "#D4A017", 1000, 230, 100, 1.24f, 1.75f, 195, 215, 50, 60, 21.99m, now, -20);
        var profSunluMeta = MakeProfile("Sunlu Meta PLA Gray", "Sunlu", "PLA", "Gray", "#999999", 1000, 230, 100, 1.24f, 1.75f, 195, 220, 50, 65, 19.99m, now, -15);
        var profiles = new[]
        {
            profPolymakerWhite, profPolymakerBlack, profPolymakerGreen,
            profBambuRed, profBambuBlue, profBambuGray, profBambuOrange,
            profEsunPetg, profEsunPetgBlack, profEsunAbs,
            profOvertureTpu, profPrusamentPla, profSunluSilk, profSunluMeta,
        };
        db.SpoolProfiles.AddRange(profiles);

        // ═══════════════════════════════════════════════════════════════
        // 23 Spools
        // ═══════════════════════════════════════════════════════════════
        var s1 = MakeSpool("Polymaker", "PLA", "White", "#F5F5F5", 1000, 620, 200, 100, true, false, now, -30, -2, null, "Half-used, printing brackets", "Shelf A1", 22.99m, 1.24f, 1.75f, 200, 230, 55, 65);
        var s2 = MakeSpool("Polymaker", "PLA", "Matte Black", "#1A1A1A", 1000, 1000, 200, 100, false, false, now, -20, null, null, "Sealed, spare", "Shelf A2", 22.99m, 1.24f, 1.75f, 195, 220, 55, 65);
        var s3 = MakeSpool("Bambu Lab", "PLA", "Red", "#E80000", 1000, 350, 250, 100, true, false, now, -25, -12, null, "Low — running out soon", "Drybox 1", 24.99m, 1.24f, 1.75f, 190, 220, 55, 60);
        var s4 = MakeSpool("Bambu Lab", "PLA", "Blue", "#0055FF", 1000, 890, 250, 100, true, false, now, -15, -6, null, "", "Shelf A1", 24.99m, 1.24f, 1.75f, 190, 220, 55, 60);
        var s5 = MakeSpool("eSUN", "PETG", "Clear Natural", "#D4E0E8", 1000, 150, 230, 150, true, false, now, -20, -24, null, "Almost empty — below threshold", "Drawer B1", 20.99m, 1.27f, 1.75f, 230, 260, 70, 85);
        var s6 = MakeSpool("Overture", "TPU", "Black", "#222222", 500, 480, 180, 50, true, false, now, -10, -72, null, "New — one small print done", "Drybox 1", 28.99m, 1.21f, 1.75f, 220, 250, 40, 60);
        var s7 = MakeSpool("Polymaker", "PLA", "Matte Black", "#1A1A1A", 1000, 0, 200, 100, false, true, now, -45, -120, null, "Empty, archived", "Shelf A1", 22.99m, 1.24f, 1.75f, 195, 220, 55, 65);
        s7.ArchivedAt = now.AddDays(-5);

        var s8 = MakeSpool("Bambu Lab", "PLA", "Gray", "#808080", 1000, 780, 250, 100, true, false, now, -12, -4, null, "", "Shelf A1", 24.99m, 1.24f, 1.75f, 190, 220, 55, 60);
        var s9 = MakeSpool("Bambu Lab", "PLA", "Orange", "#FF6600", 1000, 1000, 250, 100, false, false, now, -7, null, null, "Sealed, spare", "Shelf B2", 24.99m, 1.24f, 1.75f, 190, 220, 55, 60);
        var s10 = MakeSpool("Polymaker", "PLA", "Green", "#4CAF50", 1000, 520, 200, 100, true, false, now, -18, -8, null, "", "Drawer B1", 23.99m, 1.24f, 1.75f, 200, 230, 55, 65);
        var s11 = MakeSpool("eSUN", "PETG", "Black", "#222222", 1000, 910, 230, 150, true, false, now, -14, -24, null, "", "Shelf B2", 20.99m, 1.24f, 1.75f, 230, 260, 70, 85);
        var s12 = MakeSpool("eSUN", "ABS", "White", "#F0F0F0", 1000, 980, 220, 100, true, false, now, -8, -48, null, "Enclosure printing only", "Drawer B1", 18.99m, 1.04f, 1.75f, 240, 270, 95, 110);
        var s13 = MakeSpool("Prusament", "PLA", "Galaxy Black", "#1C1C1C", 1000, 220, 200, 100, true, false, now, -6, -2, null, "Mostly used — ~22% left", "Shelf A2", 32.99m, 1.24f, 1.75f, 210, 225, 60, 65);
        var s14 = MakeSpool("Sunlu", "PLA", "Silk Gold", "#D4A017", 1000, 1000, 230, 100, false, false, now, -4, null, null, "For decorative prints", "Shelf B2", 21.99m, 1.24f, 1.75f, 195, 215, 50, 60);
        var s15 = MakeSpool("Sunlu", "PLA", "Gray", "#999999", 1000, 1000, 230, 100, false, false, now, -3, null, null, "Unopened", "Shelf A2", 19.99m, 1.24f, 1.75f, 195, 220, 50, 65);
        var s16 = MakeSpool("Polymaker", "PLA", "White", "#F5F5F5", 1000, 1000, 200, 100, false, false, now, -2, null, null, "Backup spool", "Shelf A2", 22.99m, 1.24f, 1.75f, 200, 230, 55, 65);
        var s17 = MakeSpool("eSUN", "PETG", "Clear Natural", "#D4E0E8", 1000, 1000, 230, 150, false, false, now, -1, null, null, "Backup PETG", "Shelf B2", 20.99m, 1.27f, 1.75f, 230, 260, 70, 85);
        var s18 = MakeSpool("Bambu Lab", "PLA", "Red", "#E80000", 1000, 1000, 250, 100, false, false, now, -1, null, null, "Backup red", "Shelf B2", 24.99m, 1.24f, 1.75f, 190, 220, 55, 60);
        var s19 = MakeSpool("Bambu Lab", "PLA", "Blue", "#0055FF", 1000, 1000, 250, 100, false, false, now, -1, null, null, "Backup blue", "Drawer B1", 24.99m, 1.24f, 1.75f, 190, 220, 55, 60);
        var s20 = MakeSpool("Polymaker", "PLA", "White", "#F5F5F5", 1000, 400, 200, 100, true, false, now, -22, -240, null, "Mid-use on Ender-3", "Shelf A1", 22.99m, 1.24f, 1.75f, 200, 230, 55, 65);
        var s21 = MakeSpool("Sunlu", "PLA", "Silk Gold", "#D4A017", 1000, 850, 230, 100, true, false, now, -5, -12, null, "Decorative lithophane prints", "Shelf A2", 21.99m, 1.24f, 1.75f, 195, 215, 50, 60);
        var s22 = MakeSpool("Overture", "TPU", "Black", "#222222", 500, 500, 180, 50, false, false, now, -2, null, null, "Sealed spare TPU", "Drybox 2", 28.99m, 1.21f, 1.75f, 220, 250, 40, 60);
        var s23 = MakeSpool("Prusament", "PLA", "Galaxy Black", "#1C1C1C", 1000, 1000, 200, 100, false, false, now, -3, null, null, "Spare Prusament", "Shelf B2", 32.99m, 1.24f, 1.75f, 210, 225, 60, 65);

        var spools = new[] { s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15, s16, s17, s18, s19, s20, s21, s22, s23 };
        db.Spools.AddRange(spools);

        var sp = new Dictionary<string, Spool>
        {
            ["spPolyWhite"] = s1, ["spPolyBlack"] = s2, ["spBambuRed"] = s3, ["spBambuBlue"] = s4,
            ["spEsunPetg"] = s5, ["spOvertureTpu"] = s6, ["spPolyBlackEmpty"] = s7, ["spBambuGray"] = s8,
            ["spBambuOrange"] = s9, ["spPolyGreen"] = s10, ["spEsunPetgBlack"] = s11, ["spEsunAbs"] = s12,
            ["spPrusament"] = s13, ["spSunluGold"] = s14, ["spSunluGray"] = s15, ["spPolyWhite2"] = s16,
            ["spEsunPetg2"] = s17, ["spBambuRed2"] = s18, ["spBambuBlue2"] = s19, ["spPolyWhite3"] = s20,
            ["spSunluGold2"] = s21, ["spOvertureTpu2"] = s22, ["spPrusament2"] = s23,
        };

        // ═══════════════════════════════════════════════════════════════
        // 11 NFC Tags
        // ═══════════════════════════════════════════════════════════════
        db.NfcTags.AddRange(new[]
        {
            MakeNfcTag("04:00:00:00:00:00:01", "NTAG213", s1.Id, now, -30),
            MakeNfcTag("04:00:00:00:00:00:02", "NTAG213", s3.Id, now, -25),
            MakeNfcTag("04:00:00:00:00:00:03", "NTAG213", s4.Id, now, -15),
            MakeNfcTag("04:00:00:00:00:00:04", "NTAG213", s5.Id, now, -20),
            MakeNfcTag("04:00:00:00:00:00:05", "NTAG213", s8.Id, now, -12),
            MakeNfcTag("04:00:00:00:00:00:06", "NTAG213", s10.Id, now, -18),
            MakeNfcTag("04:00:00:00:00:00:07", "NTAG213", s11.Id, now, -14),
            MakeNfcTag("04:00:00:00:00:00:08", "NTAG213", s13.Id, now, -6),
            MakeNfcTag("04:00:00:00:00:00:09", "NTAG213", s20.Id, now, -22),
            MakeNfcTag("04:00:00:00:00:00:0A", "NTAG213", s21.Id, now, -5),
            MakeNfcTag("04:00:00:00:00:00:0B", "NTAG213", s12.Id, now, -8),
        });

        // ═══════════════════════════════════════════════════════════════
        // 5 Printers
        // ═══════════════════════════════════════════════════════════════
        var prP1S = MakePrinter("P1S Workshop", "Bambu Lab", "P1S", "BMP1S0000001", true, "mqtt_lan", "192.168.1.100", 8883, "00000000", s1.Id, s4.Id, null, null, null, now, -30);
        var prX1C = MakePrinter("X1C Office", "Bambu Lab", "X1 Carbon", "BMX1C0000001", true, "mqtt_lan", "192.168.1.102", 8883, "11111111", s8.Id, s13.Id, null, null, null, now, -25);
        var prEnder3 = MakePrinter("Ender-3 Garage", "Creality", "Ender 3 V2", "CE3000000001", false, "marlin_serial", "192.168.1.101", null, null, null, null, null, null, s6.Id, now, -20);
        var prKobra = MakePrinter("Kobra 2 Pro", "Anycubic", "Kobra 2 Pro", "AK2000000001", false, "marlin_serial", "192.168.1.103", null, null, null, null, null, null, s20.Id, now, -14);
        var prMini = MakePrinter("Mini Lab", "Prusa", "Mini+", "PM2200000001", false, "marlin_serial", "192.168.1.104", null, null, null, null, null, null, s10.Id, now, -7);

        var printers = new[] { prP1S, prX1C, prEnder3, prKobra, prMini };
        db.Printers.AddRange(printers);

        var pr = new Dictionary<string, Printer>
        {
            ["p1s"] = prP1S, ["x1c"] = prX1C, ["ender3"] = prEnder3, ["kobra"] = prKobra, ["mini"] = prMini,
        };

        // ═══════════════════════════════════════════════════════════════
        // 25 Print Jobs
        // ═══════════════════════════════════════════════════════════════
        var jobs = new List<PrintJob>();
        var jk = new Dictionary<string, PrintJob>(); // job key
        int idx = 0;

        void AddJob(string key, Printer printer, Spool? spool, string file, PrintJobStatus status,
                    float grams, DateTime started, DateTime? finished, DateTime updated,
                    bool deducted, string source, string? notes = null)
        {
            idx++;
            var job = new PrintJob
            {
                Id = Guid.NewGuid(),
                PrinterId = printer.Id,
                SpoolId = spool?.Id,
                PrintFileName = file,
                TaskId = $"T-{idx:D3}",
                Status = status,
                GramsUsed = grams,
                StartedAt = started,
                FinishedAt = finished,
                LastUpdatedAt = updated,
                FilamentDeducted = deducted,
                Source = source,
                Notes = notes,
            };
            jobs.Add(job);
            jk[key] = job;
        }

        // P1S jobs
        AddJob("j01", prP1S, s1, "bracket_v3.3mf", PrintJobStatus.Finished, 42, now.AddDays(-14), now.AddDays(-14).AddHours(3), now.AddDays(-14).AddHours(3), true, "local");
        AddJob("j02", prP1S, s4, "benchy_blue.3mf", PrintJobStatus.Finished, 15, now.AddDays(-7), now.AddDays(-7).AddHours(1).AddMinutes(45), now.AddDays(-7).AddHours(1).AddMinutes(45), true, "local");
        AddJob("j03", prP1S, s3, "red_vase.3mf", PrintJobStatus.Finished, 86, now.AddDays(-3), now.AddDays(-3).AddHours(6), now.AddDays(-3).AddHours(6), true, "local");
        AddJob("j04", prP1S, s1, "parts_tray.3mf", PrintJobStatus.Running, 0, now.AddMinutes(-30), null, now.AddMinutes(-5), false, "mqtt");
        AddJob("j05", prP1S, s8, "lithophane_gray.3mf", PrintJobStatus.Finished, 34, now.AddDays(-10), now.AddDays(-10).AddHours(4), now.AddDays(-10).AddHours(4), true, "local");
        AddJob("j06", prP1S, s3, "red_dragon.3mf", PrintJobStatus.Finished, 120, now.AddDays(-21), now.AddDays(-21).AddHours(8), now.AddDays(-21).AddHours(8), true, "local");
        AddJob("j07", prP1S, s13, "galaxy_bowl.3mf", PrintJobStatus.Finished, 28, now.AddDays(-4), now.AddDays(-4).AddHours(2).AddMinutes(15), now.AddDays(-4).AddHours(2).AddMinutes(15), true, "local");

        // X1C jobs
        AddJob("j08", prX1C, s8, "enclosure_vent.3mf", PrintJobStatus.Finished, 55, now.AddDays(-12), now.AddDays(-12).AddHours(5), now.AddDays(-12).AddHours(5), true, "local");
        AddJob("j09", prX1C, s13, "gridfinity_bin.3mf", PrintJobStatus.Finished, 18, now.AddDays(-8), now.AddDays(-8).AddHours(1).AddMinutes(30), now.AddDays(-8).AddHours(1).AddMinutes(30), true, "local");
        AddJob("j10", prX1C, s4, "blue_cable_clips.3mf", PrintJobStatus.Finished, 9, now.AddDays(-5), now.AddDays(-5).AddMinutes(50), now.AddDays(-5).AddMinutes(50), true, "local");
        AddJob("j11", prX1C, s8, "spool_holder_gray.3mf", PrintJobStatus.Finished, 65, now.AddDays(-2), now.AddDays(-2).AddHours(5).AddMinutes(30), now.AddDays(-2).AddHours(5).AddMinutes(30), true, "local");
        AddJob("j12", prX1C, s8, "storage_bin.3mf", PrintJobStatus.Running, 0, now.AddMinutes(-15), null, now.AddMinutes(-2), false, "mqtt");

        // Ender-3 jobs
        AddJob("j13", prEnder3, s5, "petg_enclosure.3mf", PrintJobStatus.Failed, 12, now.AddDays(-2), now.AddDays(-2).AddMinutes(45), now.AddDays(-2).AddMinutes(45), false, "local", "Layer shift at 60% — bed adhesion issue");
        AddJob("j14", prEnder3, s6, "tpu_gasket.3mf", PrintJobStatus.Finished, 8, now.AddDays(-1), now.AddDays(-1).AddHours(2), now.AddDays(-1).AddHours(2), true, "local");
        AddJob("j15", prEnder3, null, "tpu_phone_case.3mf", PrintJobStatus.Paused, 0, now.AddMinutes(-10), null, now.AddMinutes(-1), false, "local", "Paused — ran out of filament mid-print");
        AddJob("j16", prEnder3, s20, "level_test.3mf", PrintJobStatus.Finished, 3, now.AddDays(-18), now.AddDays(-18).AddMinutes(20), now.AddDays(-18).AddMinutes(20), true, "local");
        AddJob("j17", prEnder3, s6, "tpu_pi_case.3mf", PrintJobStatus.Finished, 22, now.AddDays(-6), now.AddDays(-6).AddHours(3), now.AddDays(-6).AddHours(3), true, "local");

        // Kobra jobs
        AddJob("j18", prKobra, s20, "white_bracket_v2.3mf", PrintJobStatus.Finished, 38, now.AddDays(-11), now.AddDays(-11).AddHours(3).AddMinutes(30), now.AddDays(-11).AddHours(3).AddMinutes(30), true, "local");
        AddJob("j19", prKobra, s10, "green_planter.3mf", PrintJobStatus.Finished, 48, now.AddDays(-4), now.AddDays(-4).AddHours(4), now.AddDays(-4).AddHours(4), true, "local");
        AddJob("j20", prKobra, s10, "green_stand.3mf", PrintJobStatus.Cancelled, 0, now.AddDays(-1).AddHours(-2), now.AddDays(-1).AddHours(-1), now.AddDays(-1).AddHours(-1), false, "local", "Cancelled — wrong settings");
        AddJob("j21", prKobra, s21, "gold_vase.3mf", PrintJobStatus.Finished, 35, now.AddDays(-1), now.AddDays(-1).AddHours(3), now.AddDays(-1).AddHours(3), true, "local");

        // Mini jobs
        AddJob("j22", prMini, s10, "mini_parts_tray.3mf", PrintJobStatus.Finished, 14, now.AddDays(-5), now.AddDays(-5).AddHours(1).AddMinutes(45), now.AddDays(-5).AddHours(1).AddMinutes(45), true, "local");
        AddJob("j23", prMini, s10, "green_holder.3mf", PrintJobStatus.Finished, 22, now.AddDays(-2), now.AddDays(-2).AddHours(2).AddMinutes(30), now.AddDays(-2).AddHours(2).AddMinutes(30), true, "local");
        AddJob("j24", prMini, s14, "gold_lithophane.3mf", PrintJobStatus.Finished, 42, now.AddDays(-1).AddHours(-6), now.AddDays(-1).AddHours(-3), now.AddDays(-1).AddHours(-3), true, "local");
        AddJob("j25", prMini, s12, "abs_vent_ring.3mf", PrintJobStatus.Finished, 18, now.AddHours(-12), now.AddHours(-8), now.AddHours(-8), true, "local");

        db.PrintJobs.AddRange(jobs);

        // ═══════════════════════════════════════════════════════════════
        // 18 Print Job Filaments
        // ═══════════════════════════════════════════════════════════════
        db.PrintJobFilaments.AddRange(new[]
        {
            MakePjFilament(jk["j01"].Id, s1.Id, "White", "#F5F5F5", "PLA", 42, 0),
            MakePjFilament(jk["j02"].Id, s4.Id, "Blue", "#0055FF", "PLA", 15, 0),
            MakePjFilament(jk["j03"].Id, s3.Id, "Red", "#E80000", "PLA", 86, 0),
            MakePjFilament(jk["j05"].Id, s8.Id, "Gray", "#808080", "PLA", 34, 0),
            MakePjFilament(jk["j06"].Id, s3.Id, "Red", "#E80000", "PLA", 120, 0),
            MakePjFilament(jk["j07"].Id, s13.Id, "Galaxy Black", "#1C1C1C", "PLA", 28, 0),
            MakePjFilament(jk["j08"].Id, s8.Id, "Gray", "#808080", "PLA", 55, 0),
            MakePjFilament(jk["j09"].Id, s13.Id, "Galaxy Black", "#1C1C1C", "PLA", 18, 0),
            MakePjFilament(jk["j10"].Id, s4.Id, "Blue", "#0055FF", "PLA", 9, 0),
            MakePjFilament(jk["j11"].Id, s8.Id, "Gray", "#808080", "PLA", 65, 0),
            MakePjFilament(jk["j13"].Id, s5.Id, "Clear Natural", "#D4E0E8", "PETG", 12, 0),
            MakePjFilament(jk["j14"].Id, s6.Id, "Black", "#222222", "TPU", 8, 0),
            MakePjFilament(jk["j18"].Id, s20.Id, "White", "#F5F5F5", "PLA", 38, 0),
            MakePjFilament(jk["j19"].Id, s10.Id, "Green", "#4CAF50", "PLA", 48, 0),
            MakePjFilament(jk["j21"].Id, s21.Id, "Silk Gold", "#D4A017", "PLA", 35, 0),
            MakePjFilament(jk["j22"].Id, s10.Id, "Green", "#4CAF50", "PLA", 14, 0),
            MakePjFilament(jk["j23"].Id, s10.Id, "Green", "#4CAF50", "PLA", 22, 0),
            MakePjFilament(jk["j24"].Id, s14.Id, "Silk Gold", "#D4A017", "PLA", 42, 0),
            MakePjFilament(jk["j25"].Id, s12.Id, "White", "#F0F0F0", "ABS", 18, 0),
        });

        // ═══════════════════════════════════════════════════════════════
        // 36 Activities
        // ═══════════════════════════════════════════════════════════════
        var activities = new List<Activity>();

        void AddAct(string eventType, string resourceType, Guid? resourceId, string resourceName, string action, DateTime createdAt)
        {
            activities.Add(new Activity
            {
                Id = Guid.NewGuid(), EventType = eventType, ResourceType = resourceType,
                ResourceId = resourceId, ResourceName = resourceName, Action = action, CreatedAt = createdAt,
            });
        }

        // Printer creation
        AddAct("PrinterCreated", "Printer", prP1S.Id, "P1S Workshop", "Added printer P1S Workshop", now.AddDays(-30));
        AddAct("PrinterCreated", "Printer", prX1C.Id, "X1C Office", "Added printer X1C Office", now.AddDays(-25));
        AddAct("PrinterCreated", "Printer", prEnder3.Id, "Ender-3 Garage", "Added printer Ender-3 Garage", now.AddDays(-20));
        AddAct("PrinterCreated", "Printer", prKobra.Id, "Kobra 2 Pro", "Added printer Kobra 2 Pro", now.AddDays(-14));
        AddAct("PrinterCreated", "Printer", prMini.Id, "Mini Lab", "Added printer Mini Lab", now.AddDays(-7));

        // Spool added
        AddAct("SpoolAdded", "Spool", s1.Id, "Polymaker White", "Added spool Polymaker White", now.AddDays(-30));
        AddAct("SpoolAdded", "Spool", s3.Id, "Bambu Lab Red", "Added spool Bambu Lab Red", now.AddDays(-25));
        AddAct("SpoolAdded", "Spool", s4.Id, "Bambu Lab Blue", "Added spool Bambu Lab Blue", now.AddDays(-15));
        AddAct("SpoolAdded", "Spool", s5.Id, "eSUN PETG Clear", "Added spool eSUN PETG Clear", now.AddDays(-20));
        AddAct("SpoolAdded", "Spool", s6.Id, "Overture TPU Black", "Added spool Overture TPU Black", now.AddDays(-10));
        AddAct("SpoolAdded", "Spool", s8.Id, "Bambu Lab Gray", "Added spool Bambu Lab Gray", now.AddDays(-12));
        AddAct("SpoolAdded", "Spool", s10.Id, "Polymaker Green", "Added spool Polymaker Green", now.AddDays(-18));
        AddAct("SpoolAdded", "Spool", s11.Id, "eSUN PETG Black", "Added spool eSUN PETG Black", now.AddDays(-14));
        AddAct("SpoolAdded", "Spool", s13.Id, "Prusament Galaxy Black", "Added spool Prusament Galaxy Black", now.AddDays(-6));
        AddAct("SpoolAdded", "Spool", s20.Id, "Polymaker White #3", "Added spool Polymaker White #3", now.AddDays(-22));
        AddAct("SpoolAdded", "Spool", s21.Id, "Sunlu Silk Gold", "Added spool Sunlu Silk Gold", now.AddDays(-5));
        AddAct("SpoolAdded", "Spool", s12.Id, "eSUN ABS+ White", "Added spool eSUN ABS+ White", now.AddDays(-8));
        AddAct("SpoolAdded", "Spool", s14.Id, "Sunlu Silk Gold #2", "Added spool Sunlu Silk Gold #2", now.AddDays(-4));

        // Spool archived
        AddAct("SpoolArchived", "Spool", s7.Id, "Polymaker Matte Black (empty)", "Archived empty Polymaker Matte Black spool", now.AddDays(-5));

        // Spool assigned
        AddAct("SpoolAssigned", "Printer", prP1S.Id, "P1S Workshop", "Assigned Polymaker White to P1S tray 1", now.AddDays(-14));
        AddAct("SpoolAssigned", "Printer", prP1S.Id, "P1S Workshop", "Assigned Bambu Lab Blue to P1S tray 2", now.AddDays(-14));
        AddAct("SpoolAssigned", "Printer", prX1C.Id, "X1C Office", "Assigned Bambu Lab Gray to X1C tray 1", now.AddDays(-12));
        AddAct("SpoolAssigned", "Printer", prX1C.Id, "X1C Office", "Assigned Prusament Galaxy Black to X1C tray 2", now.AddDays(-8));
        AddAct("SpoolAssigned", "Printer", prEnder3.Id, "Ender-3 Garage", "Assigned Overture TPU Black to Ender-3", now.AddDays(-6));
        AddAct("SpoolAssigned", "Printer", prKobra.Id, "Kobra 2 Pro", "Assigned Polymaker White #3 to Kobra 2 Pro", now.AddDays(-14));

        // Print jobs finished
        AddAct("PrintJobFinished", "PrintJob", jk["j01"].Id, "bracket_v3.3mf", "Print bracket_v3.3mf finished (42g PLA)", now.AddDays(-14).AddHours(3));
        AddAct("PrintJobFinished", "PrintJob", jk["j02"].Id, "benchy_blue.3mf", "Print benchy_blue.3mf finished (15g PLA)", now.AddDays(-7).AddHours(1).AddMinutes(45));
        AddAct("PrintJobFinished", "PrintJob", jk["j03"].Id, "red_vase.3mf", "Print red_vase.3mf finished (86g PLA)", now.AddDays(-3).AddHours(6));
        AddAct("PrintJobFinished", "PrintJob", jk["j06"].Id, "red_dragon.3mf", "Print red_dragon.3mf finished (120g PLA)", now.AddDays(-21).AddHours(8));
        AddAct("PrintJobFinished", "PrintJob", jk["j08"].Id, "enclosure_vent.3mf", "Print enclosure_vent.3mf finished (55g PLA)", now.AddDays(-12).AddHours(5));
        AddAct("PrintJobFinished", "PrintJob", jk["j11"].Id, "spool_holder_gray.3mf", "Print spool_holder_gray.3mf finished (65g PLA)", now.AddDays(-2).AddHours(5).AddMinutes(30));
        AddAct("PrintJobFinished", "PrintJob", jk["j14"].Id, "tpu_gasket.3mf", "Print tpu_gasket.3mf finished (8g TPU)", now.AddDays(-1).AddHours(2));
        AddAct("PrintJobFinished", "PrintJob", jk["j21"].Id, "gold_vase.3mf", "Print gold_vase.3mf finished (35g Silk PLA)", now.AddDays(-1).AddHours(3));
        AddAct("PrintJobFinished", "PrintJob", jk["j24"].Id, "gold_lithophane.3mf", "Print gold_lithophane.3mf finished (42g Silk PLA)", now.AddDays(-1).AddHours(-3));
        AddAct("PrintJobFinished", "PrintJob", jk["j25"].Id, "abs_vent_ring.3mf", "Print abs_vent_ring.3mf finished (18g ABS)", now.AddHours(-8));

        // Print jobs failed / cancelled / paused
        AddAct("PrintJobFailed", "PrintJob", jk["j13"].Id, "petg_enclosure.3mf", "Print petg_enclosure.3mf failed — layer shift", now.AddDays(-2).AddMinutes(45));
        AddAct("PrintJobCancelled", "PrintJob", jk["j20"].Id, "green_stand.3mf", "Print green_stand.3mf cancelled — wrong settings", now.AddDays(-1).AddHours(-1));
        AddAct("PrintJobPaused", "PrintJob", jk["j15"].Id, "tpu_phone_case.3mf", "Print tpu_phone_case.3mf paused — out of filament", now.AddMinutes(-1));

        db.Activities.AddRange(activities);

        await db.SaveChangesAsync();
    }

    // ── Factory helpers ──────────────────────────────────────────────
    private static Location MakeLocation(string name, string type, int capacity, DateTime now, int createdAtDays)
        => new() { Id = Guid.NewGuid(), Name = name, Type = type, Capacity = capacity, CreatedAt = now.AddDays(createdAtDays) };

    private static Location MakeLocation(string name, string type, int capacity, int humidity, DateTime now, int createdAtDays)
        => new() { Id = Guid.NewGuid(), Name = name, Type = type, Capacity = capacity, Humidity = humidity, CreatedAt = now.AddDays(createdAtDays) };

    private static Brand MakeBrand(string name, string domain, string ofdSlug, DateTime now, int createdAtDays)
        => new() { Id = Guid.NewGuid(), Name = name, Domain = domain, OfdSlug = ofdSlug, CreatedAt = now.AddDays(createdAtDays) };

    private static SpoolProfile MakeProfile(string name, string brand, string material, string colorName, string colorHex,
        float initW, float spoolW, float lowStock, float? density, float? diaTol,
        int? eMin, int? eMax, int? bMin, int? bMax, decimal? price, DateTime now, int createdAtDays)
        => new()
        {
            Id = Guid.NewGuid(), Name = name, Brand = brand, Material = material,
            ColorName = colorName, ColorHex = colorHex, InitialWeightG = initW, SpoolWeightG = spoolW,
            LowStockThresholdG = lowStock, Density = density, DiameterTolerance = diaTol,
            ExtruderMin = eMin, ExtruderMax = eMax, BedMin = bMin, BedMax = bMax,
            Price = price, CreatedAt = now.AddDays(createdAtDays), UpdatedAt = now.AddDays(createdAtDays),
        };

    private static Spool MakeSpool(string brand, string material, string colorName, string colorHex,
        float initW, float currW, float spoolW, float lowStock,
        bool active, bool archived, DateTime now, int createdAtDays, int? lastScannedHoursAgo, int? lastScannedMinutesAgo,
        string? notes, string? loc, decimal? price, float? density, float? diaTol,
        int? eMin, int? eMax, int? bMin, int? bMax)
    {
        DateTime? lastScanned = null;
        if (lastScannedHoursAgo.HasValue && lastScannedMinutesAgo.HasValue)
            lastScanned = now.AddHours(lastScannedHoursAgo.Value).AddMinutes(lastScannedMinutesAgo.Value);
        else if (lastScannedHoursAgo.HasValue)
            lastScanned = now.AddHours(lastScannedHoursAgo.Value);

        return new Spool
        {
            Id = Guid.NewGuid(), Brand = brand, Material = material,
            ColorName = colorName, ColorHex = colorHex,
            InitialWeightG = initW, CurrentWeightG = currW, SpoolWeightG = spoolW,
            LowStockThresholdG = lowStock, IsActive = active, IsArchived = archived,
            CreatedAt = now.AddDays(createdAtDays), LastScannedAt = lastScanned,
            Notes = notes, StockLocation = loc, Price = price,
            Density = density, DiameterTolerance = diaTol,
            ExtruderMin = eMin, ExtruderMax = eMax, BedMin = bMin, BedMax = bMax,
        };
    }

    private static NfcTag MakeNfcTag(string uid, string type, Guid spoolId, DateTime now, int createdAtDays)
        => new() { Id = Guid.NewGuid(), TagUid = uid, Type = type, SpoolId = spoolId, CreatedAt = now.AddDays(createdAtDays) };

    private static Printer MakePrinter(string name, string brand, string model, string? serial,
        bool hasAms, string proto, string ip, int? port, string? accessCode,
        Guid? t1, Guid? t2, Guid? t3, Guid? t4, Guid? extra, DateTime now, int createdAtDays)
        => new()
        {
            Id = Guid.NewGuid(), Name = name, Brand = brand, Model = model, SerialNumber = serial,
            HasAms = hasAms, Protocol = proto, IpAddress = ip, Port = port, AccessCode = accessCode,
            Tray1SpoolId = t1, Tray2SpoolId = t2, Tray3SpoolId = t3, Tray4SpoolId = t4,
            ExtraSpoolId = extra, CreatedAt = now.AddDays(createdAtDays),
        };

    private static PrintJobFilament MakePjFilament(Guid jobId, Guid? spoolId, string? colorName, string? colorHex, string? material, float grams, int slot)
        => new() { Id = Guid.NewGuid(), PrintJobId = jobId, SpoolId = spoolId, ColorName = colorName, ColorHex = colorHex, Material = material, GramsUsed = grams, SlotIndex = slot };
}
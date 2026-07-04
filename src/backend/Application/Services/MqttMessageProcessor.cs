using System.Text.Json;
using Application.DTOs;
using Application.Interfaces;
using Domain.Models;
using Microsoft.Extensions.Logging;

namespace Application.Services;

public class MqttMessageProcessor(
    ISpoolRepository spoolRepository,
    IPrintJobRepository printJobRepository,
    IPrinterRepository printerRepository,
    IPrinterStatusService statusService,
    IPrinterStatusPusher statusPusher,
    IActivityService activityService,
    IBambuFtpService ftpService,
    IGcodeParserService gcodeParser,
    IBambuCloudTaskService cloudTaskService,
    ILogger<MqttMessageProcessor> logger) : IMqttMessageProcessor
{
    public async Task ProcessAsync(string payload, Guid printerId)
    {
        if (string.IsNullOrEmpty(payload)) return;

        using var doc = JsonDocument.Parse(payload);

        // Handle get_version response — extract dev_name and update printer name if it's a fallback
        if (doc.RootElement.TryGetProperty("info", out var info))
        {
            if (info.TryGetProperty("dev_name", out var devNameEl))
            {
                var devName = devNameEl.GetString();
                if (!string.IsNullOrWhiteSpace(devName))
                    await TryUpdatePrinterNameAsync(printerId, devName);
            }
            return;
        }

        if (!doc.RootElement.TryGetProperty("print", out var print)) return;

        // Update printer name from push_status — Bambu LAN sends dev_name here, not in get_version
        if (print.TryGetProperty("dev_name", out var printDevNameEl))
        {
            var devName = printDevNameEl.GetString();
            if (!string.IsNullOrWhiteSpace(devName))
                await TryUpdatePrinterNameAsync(printerId, devName);
        }

        // Update the printer's real LAN IP when reported via cloud MQTT push_status
        if (print.TryGetProperty("dev_ip", out var ipEl))
        {
            var devIp = ipEl.GetString();
            logger.LogInformation("MQTT dev_ip received for printer {Id}: {Ip}", printerId, devIp);
            if (!string.IsNullOrEmpty(devIp) && statusService.TryUpdateIp(printerId, devIp))
            {
                var printerEntity = await printerRepository.GetByIdAsync(printerId);
                if (printerEntity != null && printerEntity.IpAddress != devIp)
                {
                    printerEntity.IpAddress = devIp;
                    await printerRepository.UpdateAsync(printerEntity);
                    logger.LogInformation("Updated printer {Name} LAN IP to {IP}", printerEntity.Name, devIp);
                }
            }
        }

        var prev = statusService.GetStatus(printerId);

        var state = print.TryGetProperty("gcode_state", out var stateEl)
            ? stateEl.GetString() ?? prev?.GcodeState ?? "IDLE"
            : prev?.GcodeState ?? "IDLE";
        var subtaskName = print.TryGetProperty("subtask_name", out var nameEl) ? nameEl.GetString() : null;
        var gcodeFile   = print.TryGetProperty("gcode_file",   out var gcodeEl) ? gcodeEl.GetString() : null;
        var fileName    = ResolveFileName(subtaskName, gcodeFile);

        // If the filename is missing and we're running, try the Bambu cloud API
        if (fileName == null && state == "RUNNING")
        {
            try
            {
                var printer = await printerRepository.GetByIdAsync(printerId);
                if (printer?.SerialNumber != null && !string.IsNullOrEmpty(printer.CloudToken))
                {
                    var cloudName = await cloudTaskService.GetActiveTaskTitleAsync(
                        printer.SerialNumber, printer.CloudToken);
                    if (!string.IsNullOrEmpty(cloudName))
                    {
                        logger.LogInformation("MQTT: resolved missing filename from cloud API → '{Name}' for printer {Id}", cloudName, printerId);
                        fileName = cloudName;
                    }
                }
            }
            catch (Exception ex)
            {
                logger.LogDebug("MQTT: cloud API filename lookup failed for {Id}: {Message}", printerId, ex.Message);
            }

            // Still missing — ask the printer for a full status update via pushall
            if (fileName == null)
            {
                logger.LogInformation("MQTT: filename missing for printer {Id} — requesting pushall", printerId);
                statusService.RequestPushAll(printerId);
            }
        }

        var rawTaskId   = print.TryGetProperty("task_id",      out var tidEl)   ? tidEl.GetString()   : null;
        var mqttTaskId  = string.IsNullOrEmpty(rawTaskId) || rawTaskId == "0"  ? null : rawTaskId;

        var nozzle = print.TryGetProperty("nozzle_temper", out var nozzleEl)
            ? MathF.Round(nozzleEl.GetSingle()) : prev?.NozzleTempC ?? 0f;
        var bed = print.TryGetProperty("bed_temper", out var bedEl)
            ? MathF.Round(bedEl.GetSingle()) : prev?.BedTempC ?? 0f;

        logger.LogDebug("MQTT status — printer: {Id}, state: {State}, nozzle: {Nozzle}°C, bed: {Bed}°C",
            printerId, state, nozzle, bed);

        if (nozzle == 0 && bed == 0 && prev == null && state == "IDLE") return;

        var status = new PrinterStatus(
            GcodeState: state,
            ProgressPercent: print.TryGetProperty("mc_percent", out var pct) ? pct.GetInt32() : prev?.ProgressPercent ?? 0,
            RemainingMinutes: print.TryGetProperty("mc_remaining_time", out var rem) ? rem.GetInt32() : prev?.RemainingMinutes ?? 0,
            SubtaskName: fileName ?? prev?.SubtaskName,
            LayerNum: print.TryGetProperty("layer_num", out var layer) ? layer.GetInt32() : prev?.LayerNum ?? 0,
            TotalLayerNum: print.TryGetProperty("total_layer_num", out var totalLayer) ? totalLayer.GetInt32() : prev?.TotalLayerNum ?? 0,
            NozzleTempC: nozzle,
            BedTempC: bed,
            UpdatedAt: DateTime.UtcNow);

        statusService.UpdateStatus(printerId, status);
        await statusPusher.PushAsync(status);

        var bestName = status.SubtaskName;

        if (state == "RUNNING")
        {
            var (job, byTaskId) = await ResolveJobAsync(mqttTaskId, printerId);

            // Ignore duplicate MQTT for an already-closed job
            if (job != null && job.Status is PrintJobStatus.Finished or PrintJobStatus.Failed
                                          or PrintJobStatus.Cancelled or PrintJobStatus.Unknown)
            {
                logger.LogDebug("RUNNING MQTT for closed job {Id} — ignoring", job.Id);
                return;
            }

            if (job?.Status == PrintJobStatus.Paused)
            {
                // Resume: printer came back from pause
                job.Status = PrintJobStatus.Running;
                job.LastUpdatedAt = DateTime.UtcNow;
                await printJobRepository.UpdateAsync(job);
                var resumeSpool = job.SpoolId.HasValue ? await spoolRepository.GetByIdAsync(job.SpoolId.Value) : null;
                await LogPrintTransitionAsync(printerId, "PrintResumed", "Resumed", "ti-player-play",
                    bestName ?? job.PrintFileName, BuildSpoolSnapshot(resumeSpool, printJobId: job.Id));
            }
            else if (job?.Status == PrintJobStatus.Running)
            {
                // Ongoing print — check for stale abandoned job (only when found by printer, not by exact taskId)
                if (!byTaskId)
                {
                    bool isDifferentFile = bestName != null && job.PrintFileName != null
                        && !string.Equals(bestName, job.PrintFileName, StringComparison.OrdinalIgnoreCase);
                    bool isStale = (DateTime.UtcNow - job.StartedAt).TotalHours > 12;

                    if (isDifferentFile || isStale)
                    {
                        job.Status = PrintJobStatus.Unknown;
                        job.FinishedAt = DateTime.UtcNow;
                        job.LastUpdatedAt = DateTime.UtcNow;
                        await printJobRepository.UpdateAsync(job);
                        job = null;
                    }
                }

                if (job != null)
                {
                    // Backfill any missing fields in a single UPDATE
                    bool dirty = false;
                    bool fileNameJustLearned = false;

                    if (job.PrintFileName == null && bestName != null)
                    {
                        job.PrintFileName = bestName;
                        fileNameJustLearned = true;
                        dirty = true;
                    }

                    if (job.EstimatedFinishTime == null && status.RemainingMinutes > 0)
                    {
                        job.EstimatedFinishTime = status.RemainingMinutes;
                        dirty = true;
                    }

                    if (dirty)
                    {
                        job.LastUpdatedAt = DateTime.UtcNow;
                        await printJobRepository.UpdateAsync(job);
                        if (fileNameJustLearned && job.PrintFileName != null)
                            await activityService.TryBackfillDescriptionAsync(printerId, "PrintStarted", $"printing - {job.PrintFileName}");
                    }

                    // After a service restart, log PrintStarted so the user sees the reconnected card
                    if (prev?.GcodeState != "RUNNING")
                    {
                        logger.LogInformation("Print reconnected after restart — printer: {PrinterId}, job: {JobId}", printerId, job.Id);
                        var reconnectSpool = job.SpoolId.HasValue ? await spoolRepository.GetByIdAsync(job.SpoolId.Value) : null;
                        await LogPrintTransitionAsync(printerId, "PrintStarted", "Started", "ti-printer",
                            bestName ?? job.PrintFileName, BuildSpoolSnapshot(reconnectSpool, status.RemainingMinutes, job.Id));
                    }
                }
            }

            // Create new job if nothing was found (or stale job was just closed)
            if (job == null)
            {
                await OpenPrintJobAsync(printerId, bestName, mqttTaskId, status.RemainingMinutes);
                var amsSnapshot = ParseAmsRemain(print);
                if (amsSnapshot.Count > 0)
                    statusService.SaveAmsSnapshot(printerId, new AmsSnapshot(amsSnapshot, DateTime.UtcNow));
            }

            return;
        }

        if (state == "PAUSE" && prev?.GcodeState != "PAUSE")
        {
            var (pauseJob, _) = await ResolveJobAsync(mqttTaskId, printerId);
            if (pauseJob != null && pauseJob.Status == PrintJobStatus.Running)
            {
                pauseJob.Status = PrintJobStatus.Paused;
                pauseJob.LastUpdatedAt = DateTime.UtcNow;
                await printJobRepository.UpdateAsync(pauseJob);
            }
            await LogPrintTransitionAsync(printerId, "PrintPaused", "Paused", "ti-player-pause", bestName,
                BuildSpoolSnapshot(null, status.RemainingMinutes, pauseJob?.Id));
            return;
        }

        // Terminal states — close the job if it's still active (works after restart via taskId lookup)
        if (state is not ("FINISH" or "FAILED" or "CANCELLED")) return;

        var (jobToClose, _) = await ResolveJobAsync(mqttTaskId, printerId);
        if (jobToClose == null || jobToClose.Status is not (PrintJobStatus.Running or PrintJobStatus.Paused))
        {
            logger.LogDebug("Terminal MQTT ({State}) for printer {PrinterId} but no active job found — ignoring", state, printerId);
            return;
        }

        var amsRemain = ParseAmsRemain(print);

        float? grams = null;
        if (state == "FINISH")
        {
            grams = await ResolveGramsAsync(printerId, bestName, mqttTaskId);
            if (grams is null)
                grams = ResolveGramsFromAmsRemain(jobToClose, amsRemain);
        }

        await ClosePrintJobAsync(jobToClose, printerId, state, grams, bestName, mqttTaskId);

        // Clear the stored filename once the job ends so the next print starts clean
        var clearedStatus = status with { SubtaskName = null };
        statusService.UpdateStatus(printerId, clearedStatus);
        await statusPusher.PushAsync(clearedStatus);
        statusService.ClearAmsSnapshot(printerId);
    }

    // ── Primary job resolution ───────────────────────────────────────────────────
    // 1. Look up by CloudTaskId — survives service restarts
    // 2. Fall back to active (Running or Paused) job for this printer
    // 3. Associate the taskId with the fallback job if missing
    private async Task<(PrintJob? Job, bool FoundByTaskId)> ResolveJobAsync(string? taskId, Guid printerId)
    {
        if (!string.IsNullOrEmpty(taskId))
        {
            var byTaskId = await printJobRepository.GetByTaskIdAsync(taskId);
            if (byTaskId != null) return (byTaskId, true);
        }

        var byPrinter = await printJobRepository.GetActiveByPrinterIdAsync(printerId);
        if (byPrinter != null)
        {
            if (!string.IsNullOrEmpty(taskId) && (byPrinter.TaskId == null || byPrinter.TaskId == "0"))
            {
                byPrinter.TaskId = taskId;
                byPrinter.LastUpdatedAt = DateTime.UtcNow;
                await printJobRepository.UpdateAsync(byPrinter);
                logger.LogInformation("Associated taskId {TaskId} with existing job {JobId}", taskId, byPrinter.Id);
            }
            return (byPrinter, false);
        }

        return (null, false);
    }

    private static string? ResolveFileName(string? subtaskName, string? gcodeFile)
    {
        // Bambu sometimes sends the print-profile label (e.g. "0.2mm layer, 2 walls, 15% infill")
        // in subtask_name instead of the actual file name; gcode_file holds the real path in that case.
        bool isProfileString = subtaskName != null
            && subtaskName.Contains("layer",  StringComparison.OrdinalIgnoreCase)
            && subtaskName.Contains("infill", StringComparison.OrdinalIgnoreCase);

        if (!isProfileString) return subtaskName;
        return string.IsNullOrEmpty(gcodeFile) ? null : Path.GetFileName(gcodeFile);
    }

    private static Dictionary<string, int> ParseAmsRemain(JsonElement printEl)
    {
        var result = new Dictionary<string, int>();
        if (!printEl.TryGetProperty("ams", out var ams)) return result;
        if (!ams.TryGetProperty("ams", out var amsArray)) return result;

        foreach (var amsUnit in amsArray.EnumerateArray())
        {
            var unitId = amsUnit.TryGetProperty("id", out var idEl) ? idEl.GetString() ?? "0" : "0";
            if (!amsUnit.TryGetProperty("tray", out var trayArray)) continue;

            foreach (var tray in trayArray.EnumerateArray())
            {
                var trayId = tray.TryGetProperty("id", out var trayIdEl) ? trayIdEl.GetString() ?? "0" : "0";
                var remain = tray.TryGetProperty("remain", out var remainEl) ? remainEl.GetInt32() : -1;
                if (remain >= 0)
                    result[$"unit_{unitId}_tray_{trayId}"] = remain;
            }
        }
        return result;
    }

    private float? ResolveGramsFromAmsRemain(PrintJob job, Dictionary<string, int> currentRemain)
    {
        var snapshot = statusService.GetAmsSnapshot(job.PrinterId);
        if (snapshot is null || currentRemain.Count == 0 || snapshot.SlotRemainPct.Count == 0)
        {
            logger.LogWarning("AMS remain snapshot or current data missing — cannot calculate grams from AMS");
            return null;
        }

        if (job.SpoolId is null)
        {
            logger.LogWarning("No spool on job {JobId} — cannot calculate AMS grams", job.Id);
            return null;
        }

        var spool = spoolRepository.GetByIdAsync(job.SpoolId.Value).Result;
        if (spool is null) return null;

        string? bestSlot = null;
        int bestDelta = 0;

        foreach (var (slotKey, startPct) in snapshot.SlotRemainPct)
        {
            if (!currentRemain.TryGetValue(slotKey, out var endPct)) continue;
            var delta = startPct - endPct;
            if (delta > bestDelta)
            {
                bestDelta = delta;
                bestSlot = slotKey;
            }
        }

        if (bestSlot is null || bestDelta <= 0)
        {
            logger.LogInformation("AMS remain unchanged — no filament deducted");
            return null;
        }

        var grams = bestDelta / 100f * spool.CurrentWeightG;
        logger.LogInformation("AMS remain delta {Delta}% on slot {Slot} → {Grams:F1}g (spool {Weight}g)",
            bestDelta, bestSlot, grams, spool.CurrentWeightG);
        return grams;
    }

    private async Task TryUpdatePrinterNameAsync(Guid printerId, string devName)
    {
        try
        {
            var printer = await printerRepository.GetByIdAsync(printerId);
            if (printer == null) return;
            // Only overwrite if the current name looks like an auto-generated fallback
            if (printer.Name == devName) return;
            if (!printer.Name.StartsWith("Bambu ") && !printer.Name.Contains('.')) return;
            printer.Name = devName;
            await printerRepository.UpdateAsync(printer);
            logger.LogInformation("Updated printer {Id} name from MQTT info → {Name}", printerId, devName);
        }
        catch (Exception ex)
        {
            logger.LogDebug("Failed to update printer name: {Message}", ex.Message);
        }
    }

    private async Task OpenPrintJobAsync(Guid printerId, string? fileName, string? taskId, int remainingMinutes)
    {
        var printer = await printerRepository.GetByIdAsync(printerId);
        var spoolId = printer is null ? null
            : printer.HasAms
                ? (printer.Tray1SpoolId ?? printer.Tray2SpoolId ?? printer.Tray3SpoolId ?? printer.Tray4SpoolId)
                : printer.ExtraSpoolId;
        var spool = spoolId.HasValue ? await spoolRepository.GetByIdAsync(spoolId.Value) : null;

        var now = DateTime.UtcNow;
        var jobId = Guid.NewGuid();
        var job = await printJobRepository.CreateAsync(new PrintJob
        {
            Id = jobId,
            PrinterId = printerId,
            SpoolId = spool?.Id,
            PrintFileName = fileName,
            TaskId = taskId,
            Status = PrintJobStatus.Running,
            Source = "mqtt",
            StartedAt = now,
            LastUpdatedAt = now,
            EstimatedFinishTime = remainingMinutes > 0 ? remainingMinutes : null,
        });

        if (job == null) return;

        // If MQTT gave no task ID, ask the Bambu Cloud API immediately
        if (job.TaskId == null)
        {
            if (printer?.Protocol == "mqtt_cloud"
                && !string.IsNullOrEmpty(printer.SerialNumber)
                && !string.IsNullOrEmpty(printer.CloudToken))
            {
                var cloudId = await cloudTaskService.GetActiveTaskIdAsync(printer.SerialNumber, printer.CloudToken);
                if (cloudId != null)
                {
                    job.TaskId = cloudId;
                    job.LastUpdatedAt = DateTime.UtcNow;
                    await printJobRepository.UpdateAsync(job);
                    logger.LogInformation("Backfilled TaskId {TaskId} from cloud API for job {JobId}", cloudId, job.Id);
                }
            }
        }

        logger.LogInformation("Print started — printer: {PrinterId}, file: {File}, taskId: {TaskId}",
            printerId, fileName ?? "pending", job.TaskId ?? "none");
        await LogPrintTransitionAsync(printerId, "PrintStarted", "Started", "ti-printer", fileName, BuildSpoolSnapshot(spool, remainingMinutes, jobId));
    }

    private async Task LogPrintTransitionAsync(Guid printerId, string eventType, string action, string icon, string? fileName, string? snapshot = null)
    {
        var printer = await printerRepository.GetByIdAsync(printerId);
        var printerName = printer?.Name ?? "Unknown printer";
        string? description = null;
        if (fileName != null)
            description = eventType == "PrintStarted"
                ? $"printing - {fileName}"
                : $"{action.ToLower()} {fileName}";
        await activityService.LogAsync(eventType, action, "Printer", printerName, printerId, description, icon, snapshot);
    }

    private static string? BuildSpoolSnapshot(Domain.Models.Spool? spool, int estimatedMins = 0, Guid? printJobId = null)
    {
        if (spool is null && estimatedMins <= 0 && printJobId is null) return null;
        return System.Text.Json.JsonSerializer.Serialize(new
        {
            brand         = spool?.Brand,
            material      = spool?.Material,
            colorHex      = spool?.ColorHex,
            colorName     = spool?.ColorName,
            weight        = spool is null ? (int?)null : (int)Math.Round(spool.CurrentWeightG),
            estimatedMins = estimatedMins > 0 ? estimatedMins : (int?)null,
            printJobId    = printJobId?.ToString(),
        });
    }

    private async Task ClosePrintJobAsync(PrintJob job, Guid printerId, string gcodeState, float? grams, string? fileName, string? taskId = null)
    {
        var now = DateTime.UtcNow;

        job.Status = gcodeState switch
        {
            "FINISH"  => PrintJobStatus.Finished,
            "FAILED"  => PrintJobStatus.Failed,
            _         => PrintJobStatus.Cancelled
        };
        job.FinishedAt = now;
        job.LastUpdatedAt = now;
        bool fileNameJustLearned = job.PrintFileName == null && fileName != null;
        job.PrintFileName ??= fileName;
        if (!string.IsNullOrEmpty(taskId) && job.TaskId == null)
            job.TaskId = taskId;

        Domain.Models.Spool? spool = null;
        if (gcodeState == "FINISH" && grams.HasValue && !job.FilamentDeducted)
        {
            job.GramsUsed = grams.Value;
            job.FilamentDeducted = true;
            spool = await DeductFromSpoolAsync(job.SpoolId, grams.Value);
        }
        else if (gcodeState == "FINISH" && job.FilamentDeducted)
        {
            logger.LogInformation("Filament already deducted for job {Id} — skipping duplicate deduction", job.Id);
            spool = job.SpoolId.HasValue ? await spoolRepository.GetByIdAsync(job.SpoolId.Value) : null;
        }
        else if (job.SpoolId.HasValue)
        {
            spool = await spoolRepository.GetByIdAsync(job.SpoolId.Value);
        }

        await printJobRepository.UpdateAsync(job);

        if (fileNameJustLearned && job.PrintFileName != null)
            await activityService.TryBackfillDescriptionAsync(printerId, "PrintStarted", $"printing - {job.PrintFileName}");

        var printerForActivity = await printerRepository.GetByIdAsync(printerId);
        var printerNameForActivity = printerForActivity?.Name ?? "Unknown printer";

        if (gcodeState == "FINISH")
        {
            var gramsText = grams.HasValue ? $" — {grams.Value:F1}g used" : string.Empty;
            await activityService.LogAsync(
                "PrintCompleted", "Completed", "Printer", printerNameForActivity, printerId,
                $"{job.PrintFileName ?? "unnamed print"}{gramsText}", "ti-check",
                BuildSpoolSnapshot(spool, printJobId: job.Id));
        }
        else if (gcodeState is "FAILED" or "CANCELLED")
        {
            await activityService.LogAsync(
                gcodeState == "FAILED" ? "PrintFailed" : "PrintCancelled",
                gcodeState == "FAILED" ? "Failed" : "Cancelled",
                "Printer", printerNameForActivity, printerId,
                $"{(gcodeState == "FAILED" ? "failed" : "cancelled")}: {job.PrintFileName ?? "unnamed print"}",
                gcodeState == "FAILED" ? "ti-alert-circle" : "ti-ban",
                BuildSpoolSnapshot(spool, printJobId: job.Id));
        }

        logger.LogInformation("Print job {Id} closed — status: {Status}, grams: {Grams}",
            job.Id, job.Status, grams ?? 0);
    }

    private async Task<Domain.Models.Spool?> DeductFromSpoolAsync(Guid? spoolId, float grams)
    {
        if (spoolId == null)
        {
            logger.LogWarning("Print finished but no spool linked to job — skipping deduction");
            return null;
        }

        var spool = await spoolRepository.GetByIdAsync(spoolId.Value);
        if (spool == null)
        {
            logger.LogWarning("Linked spool {SpoolId} not found — skipping deduction", spoolId);
            return null;
        }

        spool.CurrentWeightG = Math.Max(0, spool.CurrentWeightG - grams);
        await spoolRepository.UpdateAsync(spool);
        logger.LogInformation("Deducted {Grams}g from spool {SpoolId}. Remaining: {Weight}g",
            grams, spool.Id, spool.CurrentWeightG);
        return spool;
    }

    private async Task<float?> ResolveGramsAsync(Guid printerId, string? fileName, string? mqttTaskId = null)
    {
        var printer = await printerRepository.GetByIdAsync(printerId);
        if (printer is null) return null;

        // Cloud printer: query Bambu task API — returns grams directly, no FTP needed
        if (printer.Protocol == "mqtt_cloud")
        {
            if (string.IsNullOrEmpty(printer.SerialNumber) || string.IsNullOrEmpty(printer.CloudToken))
            {
                logger.LogWarning("Cloud printer {PrinterId} has no serial/token — cannot query task API", printerId);
                return null;
            }

            // Prefer the taskId from MQTT; fall back to the one stored on the active job
            var taskId = mqttTaskId;
            if (taskId == null)
            {
                var (job, _) = await ResolveJobAsync(null, printerId);
                taskId = job?.TaskId;
            }

            logger.LogInformation("Cloud printer {PrinterId} — querying Bambu task API, taskId='{TaskId}', file='{File}'",
                printerId, taskId, fileName);
            return await cloudTaskService.GetLastTaskGramsAsync(printer.SerialNumber, printer.CloudToken, taskId, fileName);
        }

        // LAN printer: FTP download + gcode parse — requires a file name
        if (string.IsNullOrEmpty(fileName)) return null;

        if (string.IsNullOrEmpty(printer.IpAddress) || string.IsNullOrEmpty(printer.AccessCode))
        {
            logger.LogWarning("LAN printer {PrinterId} has no IP/access code — cannot FTP for filament data", printerId);
            return null;
        }

        var fileBytes = await ftpService.DownloadPrintFileAsync(printer.IpAddress, printer.AccessCode, fileName);
        if (fileBytes is null) return null;

        var mm = gcodeParser.ParseFilamentUsedMm(fileBytes, fileName);
        if (mm is null)
        {
            logger.LogWarning("Could not parse filament mm from '{File}'", fileName);
            return null;
        }

        var (lanJob, _) = await ResolveJobAsync(mqttTaskId, printerId);
        var firstSpoolId = printer.Tray1SpoolId ?? printer.Tray2SpoolId ?? printer.Tray3SpoolId
                           ?? printer.Tray4SpoolId ?? printer.ExtraSpoolId;
        var spool = lanJob?.SpoolId != null
            ? await spoolRepository.GetByIdAsync(lanJob.SpoolId.Value)
            : firstSpoolId.HasValue ? await spoolRepository.GetByIdAsync(firstSpoolId.Value) : null;
        if (spool is null) return null;

        return MmToGrams(mm.Value, spool);
    }

    private static float MmToGrams(float mm, Domain.Models.Spool spool)
    {
        var density = spool.Density ?? MaterialDensityFallback(spool.Material);
        var radius = 1.75f / 2.0;
        return (float)(Math.PI * radius * radius * mm * density / 1000.0);
    }

    private static float MaterialDensityFallback(string material) =>
        material.ToLowerInvariant() switch
        {
            "pla"           => 1.24f,
            "petg"          => 1.27f,
            "abs"           => 1.05f,
            "asa"           => 1.07f,
            "tpu"           => 1.21f,
            "pc"            => 1.20f,
            "nylon" or "pa" => 1.08f,
            _               => 1.24f
        };
}

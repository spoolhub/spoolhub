using Application.DTOs;
using Application.Interfaces;
using System.Text.Json;

namespace Application.Services;

public class NfcScanService(
    INfcTagRepository nfcTagRepository,
    ISpoolService spoolService,
    IActivityService activityService,
    IRealtimeNotifier notifier) : INfcScanService
{
    public async Task<NfcScanResult> ProcessScanAsync(string tagUid)
    {
        var tag = await nfcTagRepository.GetByTagUidAsync(tagUid);

        if (tag is null)
        {
            var unknownResult = new NfcScanResult("unknown", tagUid, null, "Tag not registered");
            await notifier.ScanResultAsync(unknownResult);
            return unknownResult;
        }

        var spool = await spoolService.GetByIdAsync(tag.SpoolId);
        if (spool is not null)
        {
            var name = $"{spool.Brand} {spool.ColorName}";
            var snap = JsonSerializer.Serialize(new
            {
                material  = spool.Material,
                colorHex  = spool.ColorHex,
                weight    = (int)Math.Round(spool.CurrentWeightG),
                brand     = spool.Brand,
                colorName = spool.ColorName,
            });
            await activityService.LogAsync(
                "SpoolScanned", "Scanned", "Spool", name, spool.Id,
                $"Scanned {name} (UID: {tagUid})", "ti-scan", snap);
        }

        var result = new NfcScanResult("found", tagUid, spool, null);
        await notifier.ScanResultAsync(result);
        return result;
    }
}

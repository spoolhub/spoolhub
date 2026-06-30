using Application.DTOs;
using Application.Interfaces;
using Domain.Models;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace Application.Services;

public class NfcTagService(
    INfcTagRepository nfcTagRepository,
    ISpoolRepository spoolRepository,
    IActivityService activityService,
    ILogger<NfcTagService> logger) : INfcTagService
{
    public async Task<IEnumerable<NfcTagResponse>> GetAllAsync()
    {
        var tags = await nfcTagRepository.GetAllAsync();
        return tags.Select(ToResponse);
    }

    public async Task<NfcTagResponse?> GetByIdAsync(Guid id)
    {
        var tag = await nfcTagRepository.GetByIdAsync(id);
        return tag is null ? null : ToResponse(tag);
    }

    public async Task<NfcTagResponse> RegisterAsync(RegisterNfcTagRequest request, bool silent = false)
    {
        var existing = await nfcTagRepository.GetByTagUidAsync(request.TagUid);
        var spool = await spoolRepository.GetByIdAsync(request.SpoolId);
        var spoolName = spool is not null ? $"{spool.Brand} {spool.ColorName} {spool.Material}" : "unknown spool";

        if (existing is not null)
        {
            existing.SpoolId = request.SpoolId;
            var updated = await nfcTagRepository.UpdateAsync(existing);
            logger.LogInformation("Re-assigned NFC tag {TagUid} to spool {SpoolId}", updated.TagUid, updated.SpoolId);
            if (!silent)
                await activityService.LogAsync(
                    "NfcTagRegistered", "Registered", "NfcTag", updated.TagUid, spool?.Id,
                    $"Registered NFC tag {updated.TagUid} to {spoolName}", "ti-scan",
                    SpoolSnapshot(spool));
            return ToResponse(updated);
        }

        var tag = new NfcTag
        {
            Id = Guid.NewGuid(),
            TagUid = request.TagUid,
            Type = request.Type,
            SpoolId = request.SpoolId,
            CreatedAt = DateTime.UtcNow
        };

        var created = await nfcTagRepository.CreateAsync(tag);
        logger.LogInformation("Registered NFC tag {TagUid} for spool {SpoolId}", created.TagUid, created.SpoolId);
        if (!silent)
            await activityService.LogAsync(
                "NfcTagRegistered", "Registered", "NfcTag", created.TagUid, spool?.Id,
                $"Registered NFC tag {created.TagUid} to {spoolName}", "ti-scan",
                SpoolSnapshot(spool));
        return ToResponse(created);
    }

    public async Task<NfcTagResponse?> LookupByUidAsync(string tagUid)
    {
        var tag = await nfcTagRepository.GetByTagUidAsync(tagUid);
        return tag is null ? null : ToResponse(tag);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var tag = await nfcTagRepository.GetByIdAsync(id);
        if (tag is null)
            return false;

        var uid = tag.TagUid;
        var spoolId = tag.SpoolId;
        var spool = await spoolRepository.GetByIdAsync(spoolId);
        await nfcTagRepository.DeleteAsync(id);
        await activityService.LogAsync(
            "NfcTagRemoved", "Removed", "NfcTag", uid, spoolId,
            $"Removed NFC tag {uid} from spool", "ti-scan",
            SpoolSnapshot(spool));
        return true;
    }

    private static string? SpoolSnapshot(Spool? spool)
    {
        if (spool is null) return null;
        return JsonSerializer.Serialize(new
        {
            material      = spool.Material,
            colorHex      = spool.ColorHex,
            weight        = (int)Math.Round(spool.CurrentWeightG),
            brand         = spool.Brand,
            colorName     = spool.ColorName,
            stockLocation = spool.StockLocation,
        });
    }

    private static NfcTagResponse ToResponse(NfcTag tag) => new(
        tag.Id,
        tag.TagUid,
        tag.Type,
        tag.SpoolId,
        tag.CreatedAt);
}

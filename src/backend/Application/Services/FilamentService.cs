using Application.DTOs;
using Application.Interfaces;
using Domain.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Application.Services;

public class FilamentService(
    HttpClient httpClient,
    IMemoryCache cache,
    ILogger<FilamentService> logger,
    IFilamentCacheRepository cacheRepository,
    IBrandRepository brandRepository,
    ISpoolRepository spoolRepository) : IFilamentService
{
    private const string CacheKey   = "filament_profiles";
    private const string CacheAtKey = "filament_profiles_at";
    private const string BaseUrl    = "https://api.openfilamentdatabase.org/api/v1";

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy        = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition      = JsonIgnoreCondition.WhenWritingNull,
    };

    public async Task<IEnumerable<FilamentProfileResponse>> GetAllAsync()
    {
        if (cache.TryGetValue(CacheKey, out IEnumerable<FilamentProfileResponse>? cached) && cached is not null)
            return cached;

        var (json, cachedAt) = await cacheRepository.GetAsync();
        if (json is not null)
        {
            try
            {
                var profiles = JsonSerializer.Deserialize<List<FilamentProfileResponse>>(json, JsonOpts) ?? [];
                if (profiles.Count > 0)
                {
                    LoadToMemory(profiles, cachedAt ?? DateTime.UtcNow);
                    return profiles;
                }
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to deserialize filament cache from SQLite — will refresh");
            }
        }

        return [];
    }

    public async Task RefreshAsync(CancellationToken ct = default)
    {
        try
        {
            var results = await FetchAllAsync(ct);
            if (results.Count > 0)
            {
                var json = JsonSerializer.Serialize(results, JsonOpts);
                await cacheRepository.SaveAsync(json);
                LoadToMemory(results, DateTime.UtcNow);
                logger.LogInformation("Filament cache refreshed — {Count} profiles", results.Count);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Filament cache refresh failed");
        }
    }

    public DateTime? GetCachedAt()
    {
        cache.TryGetValue(CacheAtKey, out DateTime? cachedAt);
        return cachedAt;
    }

    private void LoadToMemory(IEnumerable<FilamentProfileResponse> profiles, DateTime cachedAt)
    {
        cache.Set(CacheKey,   profiles,  TimeSpan.FromHours(24));
        cache.Set(CacheAtKey, cachedAt,  TimeSpan.FromHours(48));
    }

    private async Task<List<FilamentProfileResponse>> FetchAllAsync(CancellationToken ct = default)
    {
        var dbBrands = await brandRepository.GetAllAsync();
        var slugs = dbBrands
            .Select(b => b.OfdSlug)
            .Where(s => !string.IsNullOrEmpty(s))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var index = await httpClient.GetFromJsonAsync<BrandsIndex>($"{BaseUrl}/brands/index.json", ct);
        if (index is null) return [];

        // No registered brands — try to auto-detect from spool brand names
        if (slugs.Count == 0)
        {
            slugs = await AutoDetectBrandsFromSpoolsAsync(index, ct);
            if (slugs.Count == 0)
            {
                logger.LogInformation("No brands registered and no spool brand matches — skipping OFD fetch");
                return [];
            }
        }

        var brands = index.Brands
            .Where(b => b.MaterialCount > 0 && slugs.Contains(b.Slug))
            .ToList();
        logger.LogInformation("OFD: selected brands: {Slugs}", string.Join(", ", brands.Select(b => b.Slug)));

        // Map OFD slug → DB brand name so profiles use the same name shown in the UI
        var slugToDbName = dbBrands
            .Where(b => !string.IsNullOrEmpty(b.OfdSlug))
            .ToDictionary(b => b.OfdSlug, b => b.Name, StringComparer.OrdinalIgnoreCase);

        using var semaphore = new SemaphoreSlim(10);

        var brandTasks = brands.Select(async b =>
        {
            await semaphore.WaitAsync(ct);
            try { return await httpClient.GetFromJsonAsync<BrandDetail>($"{BaseUrl}/brands/{b.Slug}/index.json", ct); }
            catch (Exception ex) { logger.LogWarning(ex, "OFD: failed to fetch brand detail for {Slug}", b.Slug); return null; }
            finally { semaphore.Release(); }
        });
        var brandDetails = (await Task.WhenAll(brandTasks)).Where(x => x is not null).Cast<BrandDetail>().ToList();
        logger.LogInformation("OFD: loaded {Count}/{Total} brand details", brandDetails.Count, brands.Count);

        var materialPairs = brandDetails.SelectMany(bd =>
        {
            var displayName = slugToDbName.TryGetValue(bd.Slug, out var dbName) ? dbName : bd.Name;
            return bd.Materials.Select(m => (BrandName: displayName, BrandSlug: bd.Slug, Material: m));
        }).ToList();

        var materialTasks = materialPairs.Select(async p =>
        {
            await semaphore.WaitAsync(ct);
            try
            {
                var detail = await httpClient.GetFromJsonAsync<MaterialDetail>($"{BaseUrl}/brands/{p.BrandSlug}/materials/{p.Material.Slug}/index.json", ct);
                return detail is null ? null : (p.BrandName, p.BrandSlug, detail);
            }
            catch (Exception ex) { logger.LogWarning(ex, "OFD: failed material {Brand}/{Mat}", p.BrandSlug, p.Material.Slug); return ((string BrandName, string BrandSlug, MaterialDetail detail)?)null; }
            finally { semaphore.Release(); }
        });
        var materialDetails = (await Task.WhenAll(materialTasks)).Where(x => x is not null).Select(x => x!.Value).ToList();

        var filamentPairs = materialDetails.SelectMany(m =>
            m.detail.Filaments.Select(f => (m.BrandName, MaterialSlug: m.detail.Slug, MaterialType: m.detail.Material, Filament: f, BrandSlug: m.BrandSlug))).ToList();

        var filamentTasks = filamentPairs.Select(async p =>
        {
            await semaphore.WaitAsync(ct);
            try
            {
                var detail = await httpClient.GetFromJsonAsync<FilamentDetail>($"{BaseUrl}/brands/{p.BrandSlug}/materials/{p.MaterialSlug}/filaments/{p.Filament.Slug}/index.json", ct);
                if (detail is null) return Array.Empty<FilamentProfileResponse>();

                // One card per color variant — each spool color is its own entry
                if (detail.Variants.Count == 0)
                    return [new FilamentProfileResponse(
                        p.BrandName, detail.Name, p.MaterialType,
                        detail.Density, detail.ExtruderMin, detail.ExtruderMax,
                        detail.BedMin, detail.BedMax,
                        null, null, null,
                        detail.DiameterTolerance, detail.Discontinued,
                        detail.DataSheetUrl, detail.SafetySheetUrl)];

                return detail.Variants
                    .Select(v => new FilamentProfileResponse(
                        p.BrandName, detail.Name, p.MaterialType,
                        detail.Density, detail.ExtruderMin, detail.ExtruderMax,
                        detail.BedMin, detail.BedMax,
                        v.ColorHex, v.Name, null,
                        detail.DiameterTolerance, detail.Discontinued,
                        detail.DataSheetUrl, detail.SafetySheetUrl))
                    .ToArray();
            }
            catch (Exception ex) { logger.LogWarning(ex, "OFD: failed filament {Brand}/{Mat}/{Fil}", p.BrandSlug, p.MaterialSlug, p.Filament.Slug); return Array.Empty<FilamentProfileResponse>(); }
            finally { semaphore.Release(); }
        });

        var results = (await Task.WhenAll(filamentTasks)).SelectMany(x => x).ToList();
        logger.LogInformation("OFD: built {Count} filament profiles", results.Count);
        return results;
    }

    private async Task<HashSet<string>> AutoDetectBrandsFromSpoolsAsync(BrandsIndex index, CancellationToken ct)
    {
        var spools = await spoolRepository.GetAllAsync();
        var spoolBrands = spools
            .Select(s => s.Brand)
            .Where(b => !string.IsNullOrWhiteSpace(b))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        if (spoolBrands.Count == 0) return [];

        var matched = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var ofdBrand in index.Brands.Where(b => b.MaterialCount > 0))
        {
            var isMatch = spoolBrands.Any(sb =>
                ofdBrand.Name.Contains(sb, StringComparison.OrdinalIgnoreCase) ||
                sb.Contains(ofdBrand.Name, StringComparison.OrdinalIgnoreCase));

            if (!isMatch) continue;

            matched.Add(ofdBrand.Slug);

            if (await brandRepository.GetBySlugAsync(ofdBrand.Slug) is null)
            {
                await brandRepository.AddAsync(new Brand
                {
                    Id = Guid.NewGuid(),
                    Name = ofdBrand.Name,
                    OfdSlug = ofdBrand.Slug,
                    CreatedAt = DateTime.UtcNow,
                });
                logger.LogInformation("Auto-registered OFD brand '{Name}' ({Slug}) from spool data", ofdBrand.Name, ofdBrand.Slug);
            }
        }

        return matched;
    }

    private record BrandsIndex([property: JsonPropertyName("brands")] List<BrandSummary> Brands);
    private record BrandSummary([property: JsonPropertyName("name")] string Name, [property: JsonPropertyName("slug")] string Slug, [property: JsonPropertyName("material_count")] int MaterialCount);
    private record BrandDetail([property: JsonPropertyName("name")] string Name, [property: JsonPropertyName("slug")] string Slug, [property: JsonPropertyName("materials")] List<MaterialSummary> Materials);
    private record MaterialSummary([property: JsonPropertyName("material")] string Material, [property: JsonPropertyName("slug")] string Slug, [property: JsonPropertyName("filament_count")] int FilamentCount);
    private record MaterialDetail([property: JsonPropertyName("material")] string Material, [property: JsonPropertyName("slug")] string Slug, [property: JsonPropertyName("filaments")] List<FilamentSummary> Filaments);
    private record FilamentSummary([property: JsonPropertyName("name")] string Name, [property: JsonPropertyName("slug")] string Slug);
    private record FilamentDetail(
        [property: JsonPropertyName("name")] string Name,
        [property: JsonPropertyName("density")] float? Density,
        [property: JsonPropertyName("min_print_temperature")] int? ExtruderMin,
        [property: JsonPropertyName("max_print_temperature")] int? ExtruderMax,
        [property: JsonPropertyName("min_bed_temperature")] int? BedMin,
        [property: JsonPropertyName("max_bed_temperature")] int? BedMax,
        [property: JsonPropertyName("diameter_tolerance")] float? DiameterTolerance,
        [property: JsonPropertyName("discontinued")] bool Discontinued,
        [property: JsonPropertyName("data_sheet_url")] string? DataSheetUrl,
        [property: JsonPropertyName("safety_sheet_url")] string? SafetySheetUrl,
        [property: JsonPropertyName("variants")] List<VariantSummary> Variants);
    private record VariantSummary(
        [property: JsonPropertyName("name")] string Name,
        [property: JsonPropertyName("color_hex")] string? ColorHex);
}

using Application.DTOs;
using Application.Interfaces;
using Domain.Models;
using Microsoft.Extensions.Logging;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace Application.Services;

public class BrandService(
    IBrandRepository brandRepository,
    IActivityService activityService,
    IHttpClientFactory httpClientFactory,
    ILogger<BrandService> logger) : IBrandService
{
    private const string BaseUrl = "https://api.openfilamentdatabase.org/api/v1";

    public async Task<IEnumerable<BrandResponse>> GetAllAsync()
    {
        var brands = await brandRepository.GetAllAsync();
        return brands.Select(b => new BrandResponse(b.Id, b.Name, b.Domain, b.OfdSlug, b.CreatedAt));
    }

    public async Task<BrandResponse?> AddAsync(AddBrandRequest request)
    {
        var existing = await brandRepository.GetBySlugAsync(request.OfdSlug);
        if (existing is not null) return null;

        var brand = new Brand
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Domain = request.Domain ?? string.Empty,
            OfdSlug = request.OfdSlug,
            CreatedAt = DateTime.UtcNow,
        };
        var saved = await brandRepository.AddAsync(brand);
        await activityService.LogAsync(
            "BrandAdded", "Added", "Brand", saved.Name, saved.Id,
            $"Added {saved.Name} brand to library", "ti-circle-plus");
        return new BrandResponse(saved.Id, saved.Name, saved.Domain, saved.OfdSlug, saved.CreatedAt);
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var brand = await brandRepository.GetByIdAsync(id);
        if (brand is not null)
        {
            await activityService.LogAsync(
                "BrandDeleted", "Deleted", "Brand", brand.Name, id,
                $"Deleted {brand.Name} brand from library", "ti-trash");
        }
        return await brandRepository.DeleteAsync(id);
    }

    public async Task<IEnumerable<OfdBrandResult>> SearchOfdAsync(string query, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(query)) return [];
        try
        {
            using var client = httpClientFactory.CreateClient("ofd");
            var index = await client.GetFromJsonAsync<BrandsIndex>($"{BaseUrl}/brands/index.json", ct);
            if (index is null) return [];

            return index.Brands
                .Where(b => b.MaterialCount > 0 && b.Name.Contains(query, StringComparison.OrdinalIgnoreCase))
                .OrderBy(b => b.Name)
                .Take(10)
                .Select(b => new OfdBrandResult(b.Name, b.Slug, b.MaterialCount));
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "OFD brand search failed for query: {Query}", query);
            return [];
        }
    }

    private record BrandsIndex([property: JsonPropertyName("brands")] List<BrandSummary> Brands);
    private record BrandSummary(
        [property: JsonPropertyName("name")] string Name,
        [property: JsonPropertyName("slug")] string Slug,
        [property: JsonPropertyName("material_count")] int MaterialCount);
}

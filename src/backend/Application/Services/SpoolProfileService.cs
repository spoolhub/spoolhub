using Application.DTOs;
using Application.Interfaces;
using Domain.Models;

namespace Application.Services;

public class SpoolProfileService(ISpoolProfileRepository repository) : ISpoolProfileService
{
    public async Task<IEnumerable<SpoolProfileResponse>> GetAllAsync()
    {
        var profiles = await repository.GetAllAsync();
        var counts = await repository.GetSpoolCountsAsync();
        return profiles.Select(p => ToResponse(p, counts.GetValueOrDefault(p.Id, 0)));
    }

    public async Task<SpoolProfileResponse?> GetByIdAsync(Guid id)
    {
        var profile = await repository.GetByIdAsync(id);
        if (profile is null) return null;
        var counts = await repository.GetSpoolCountsAsync();
        return ToResponse(profile, counts.GetValueOrDefault(profile.Id, 0));
    }

    public async Task<SpoolProfileResponse> AddAsync(AddSpoolProfileRequest request)
    {
        var profile = new SpoolProfile
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Brand = request.Brand,
            Material = request.Material,
            ColorName = request.ColorName,
            ColorHex = request.ColorHex,
            InitialWeightG = request.InitialWeightG,
            SpoolWeightG = request.SpoolWeightG,
            LowStockThresholdG = request.LowStockThresholdG,
            Density = request.Density,
            DiameterTolerance = request.DiameterTolerance,
            ExtruderMin = request.ExtruderMin,
            ExtruderMax = request.ExtruderMax,
            BedMin = request.BedMin,
            BedMax = request.BedMax,
            Price = request.Price,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var saved = await repository.AddAsync(profile);
        return ToResponse(saved);
    }

    public async Task<SpoolProfileResponse?> UpdateAsync(Guid id, AddSpoolProfileRequest request)
    {
        var profile = await repository.GetByIdAsync(id);
        if (profile is null) return null;
        profile.Name = request.Name.Trim();
        profile.Brand = request.Brand;
        profile.Material = request.Material;
        profile.ColorName = request.ColorName;
        profile.ColorHex = request.ColorHex;
        profile.InitialWeightG = request.InitialWeightG;
        profile.SpoolWeightG = request.SpoolWeightG;
        profile.LowStockThresholdG = request.LowStockThresholdG;
        profile.Density = request.Density;
        profile.DiameterTolerance = request.DiameterTolerance;
        profile.ExtruderMin = request.ExtruderMin;
        profile.ExtruderMax = request.ExtruderMax;
        profile.BedMin = request.BedMin;
        profile.BedMax = request.BedMax;
        profile.Price = request.Price;
        profile.UpdatedAt = DateTime.UtcNow;
        await repository.UpdateAsync(profile);
        return ToResponse(profile);
    }

    public async Task<bool> DeleteAsync(Guid id) =>
        await repository.DeleteAsync(id);

    private static SpoolProfileResponse ToResponse(SpoolProfile p, int spoolCount = 0) => new(
        p.Id, p.Name, p.Brand, p.Material, p.ColorName, p.ColorHex,
        p.InitialWeightG, p.SpoolWeightG, p.LowStockThresholdG,
        p.Density, p.DiameterTolerance,
        p.ExtruderMin, p.ExtruderMax, p.BedMin, p.BedMax,
        p.Price, p.CreatedAt, p.UpdatedAt, spoolCount
    );
}

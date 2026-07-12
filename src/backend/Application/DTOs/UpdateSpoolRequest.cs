using System.ComponentModel.DataAnnotations;

namespace Application.DTOs;

public record UpdateSpoolRequest(
    string? Brand,
    string? Material,
    string? ColorName,
    string? ColorHex,
    [Range(0, double.MaxValue)] float? CurrentWeightG,
    [Range(0, double.MaxValue)] float? SpoolWeightG,
    [Range(0, double.MaxValue)] float? LowStockThresholdG,
    string? Notes,
    bool? IsActive,
    [Range(0.001, double.MaxValue)] float? InitialWeightG = null,
    [Range(0, double.MaxValue)] decimal? Price = null,
    string? StockLocation = null,
    [Range(0.001, double.MaxValue)] float? Density = null,
    [Range(0.001, double.MaxValue)] float? DiameterTolerance = null,
    [Range(0, 500)] int? ExtruderMin = null,
    [Range(0, 500)] int? ExtruderMax = null,
    [Range(0, 200)] int? BedMin = null,
    [Range(0, 200)] int? BedMax = null
);

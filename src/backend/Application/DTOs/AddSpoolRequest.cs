using System.ComponentModel.DataAnnotations;

namespace Application.DTOs;

public record AddSpoolRequest(
    [Required] string Brand,
    [Required] string Material,
    [Required] string ColorName,
    [Required] string ColorHex,
    [Range(0.001, double.MaxValue, ErrorMessage = "InitialWeightG must be greater than 0")] float InitialWeightG,
    [Range(0, double.MaxValue, ErrorMessage = "CurrentWeightG must be 0 or greater")] float CurrentWeightG,
    [Range(0, double.MaxValue)] float SpoolWeightG = 200,
    [Range(0, double.MaxValue)] float LowStockThresholdG = 100,
    bool IsActive = false,
    string? Notes = null,
    [Range(0.001, double.MaxValue)] float? Density = null,
    [Range(0.001, double.MaxValue)] float? DiameterTolerance = null,
    [Range(0, 500)] int? ExtruderMin = null,
    [Range(0, 500)] int? ExtruderMax = null,
    [Range(0, 200)] int? BedMin = null,
    [Range(0, 200)] int? BedMax = null,
    string? TagUid = null,
    [Range(0, double.MaxValue)] decimal? Price = null,
    string? StockLocation = null
);

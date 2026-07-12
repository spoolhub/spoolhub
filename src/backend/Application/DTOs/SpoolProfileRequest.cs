using System.ComponentModel.DataAnnotations;

namespace Application.DTOs;

public record AddSpoolProfileRequest(
    [Required][MaxLength(100)] string Name,
    [Required] string Brand,
    [Required] string Material,
    [Required] string ColorName,
    [Required] string ColorHex,
    [Range(0.001, double.MaxValue)] float InitialWeightG,
    [Range(0, double.MaxValue)] float SpoolWeightG = 200,
    [Range(0, double.MaxValue)] float LowStockThresholdG = 100,
    [Range(0.001, double.MaxValue)] float? Density = null,
    [Range(0.001, double.MaxValue)] float? DiameterTolerance = null,
    [Range(0, 500)] int? ExtruderMin = null,
    [Range(0, 500)] int? ExtruderMax = null,
    [Range(0, 200)] int? BedMin = null,
    [Range(0, 200)] int? BedMax = null,
    [Range(0, double.MaxValue)] decimal? Price = null
);

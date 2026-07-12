namespace Application.DTOs;

public record SpoolProfileResponse(
    Guid Id,
    string Name,
    string Brand,
    string Material,
    string ColorName,
    string ColorHex,
    float InitialWeightG,
    float SpoolWeightG,
    float LowStockThresholdG,
    float? Density,
    float? DiameterTolerance,
    int? ExtruderMin,
    int? ExtruderMax,
    int? BedMin,
    int? BedMax,
    decimal? Price,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    int SpoolCount
);

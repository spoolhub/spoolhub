namespace Application.DTOs;

public record FilamentProfileResponse(
    string Brand,
    string FilamentName,
    string Material,
    float? Density,
    int? ExtruderMin,
    int? ExtruderMax,
    int? BedMin,
    int? BedMax,
    string? ColorHex,
    string? ColorName,
    List<string> VariantColors,
    float? DiameterTolerance,
    bool Discontinued,
    string? DataSheetUrl,
    string? SafetySheetUrl
);

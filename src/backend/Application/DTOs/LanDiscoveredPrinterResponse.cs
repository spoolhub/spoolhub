namespace Application.DTOs;

public record LanDiscoveredPrinterResponse(
    string SerialNumber,
    string IpAddress,
    string Name,
    string Model,
    string? AccessCode
);

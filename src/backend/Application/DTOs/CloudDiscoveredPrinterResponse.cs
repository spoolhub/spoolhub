namespace Application.DTOs;

public record CloudDiscoveredPrinterResponse(
    string SerialNumber,
    string Name,
    string Model,
    bool Online,
    bool AlreadyAdded = false
);

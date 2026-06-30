namespace Application.DTOs;

public record CloudLoginResult(
    bool RequiresVerification,
    string? Message = null,
    IReadOnlyList<CloudDiscoveredPrinterResponse>? AvailablePrinters = null
);

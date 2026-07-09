namespace Application.DTOs;

public record CloudVerifyResult(
    IReadOnlyList<CloudDiscoveredPrinterResponse>? AvailablePrinters = null,
    string? ErrorMessage = null
);

namespace Application.DTOs;

public record TraySpoolSummary(Guid Id, string Brand, string Material, string ColorName, string ColorHex);

public record PrinterResponse(
    Guid Id,
    string Name,
    string Brand,
    string Model,
    string? SerialNumber,
    string IpAddress,
    int? Port,
    string Protocol,
    bool HasAms,
    DateTime CreatedAt,
    TraySpoolSummary? Tray1Spool,
    TraySpoolSummary? Tray2Spool,
    TraySpoolSummary? Tray3Spool,
    TraySpoolSummary? Tray4Spool,
    TraySpoolSummary? ExtraSpool
);

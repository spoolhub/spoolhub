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
    TraySpoolSummary? ExtraSpool,
    int? Tray1RemainPct,
    int? Tray2RemainPct,
    int? Tray3RemainPct,
    int? Tray4RemainPct,
    bool Tray1Occupied,
    bool Tray2Occupied,
    bool Tray3Occupied,
    bool Tray4Occupied,
    bool? ExtraSpoolOccupied,
    int? ExtraSpoolRemainPct,
    TrayMqttHint? Tray1Mqtt,
    TrayMqttHint? Tray2Mqtt,
    TrayMqttHint? Tray3Mqtt,
    TrayMqttHint? Tray4Mqtt,
    TrayMqttHint? ExtraMqtt
);

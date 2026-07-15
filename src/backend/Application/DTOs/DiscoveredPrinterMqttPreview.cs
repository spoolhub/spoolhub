namespace Application.DTOs;

public record DiscoveredSpoolSlotPreview(
    int Slot,
    bool Occupied,
    int? RemainPct,
    string? Material,
    string? ColorHex,
    string? ColorName,
    string? Brand,
    bool IsBambuFilament);

public record DiscoveredPrinterMqttPreview(
    bool HasAms,
    IReadOnlyList<DiscoveredSpoolSlotPreview> Trays,
    DiscoveredSpoolSlotPreview? ExtraTray);

namespace Application.DTOs;

public record PrinterStatus(
    string GcodeState,
    int ProgressPercent,
    int RemainingMinutes,
    string? SubtaskName,
    int LayerNum,
    int TotalLayerNum,
    float NozzleTempC,
    float BedTempC,
    DateTime UpdatedAt,
    string? ConnectionError = null);

public record AmsSnapshot(
    Dictionary<string, int> SlotRemainPct,
    DateTime CapturedAt);

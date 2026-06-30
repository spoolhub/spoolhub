using System.ComponentModel.DataAnnotations;

namespace Application.DTOs;

public record MockPrinterStatusRequest(
    [Required] string  GcodeState,
    [Range(0, 100)]    int     ProgressPercent,
    [Range(0, int.MaxValue)] int     RemainingMinutes,
    string?            SubtaskName,
    [Range(0, int.MaxValue)] int     LayerNum,
    [Range(0, int.MaxValue)] int     TotalLayerNum,
    float              NozzleTempC,
    float              BedTempC
);

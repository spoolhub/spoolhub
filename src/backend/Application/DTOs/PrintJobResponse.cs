namespace Application.DTOs;

public record PrintJobResponse(
    Guid     Id,
    Guid     PrinterId,
    string?  PrinterName,
    Guid?    SpoolId,
    string?  SpoolBrand,
    string?  SpoolColorName,
    string?  SpoolColorHex,
    string?  SpoolMaterial,
    string?  PrintFileName,
    string?  TaskId,
    string   Status,
    float    GramsUsed,
    bool     FilamentDeducted,
    DateTime StartedAt,
    DateTime? FinishedAt,
    int?      EstimatedFinishTime,
    string   Source,
    string?  Notes,
    IReadOnlyList<PrintJobFilamentResponse> Filaments
);

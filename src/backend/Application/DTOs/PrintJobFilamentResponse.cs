namespace Application.DTOs;

public record PrintJobFilamentResponse(
    Guid Id,
    Guid? SpoolId,
    string? ColorName,
    string? ColorHex,
    string? Material,
    float GramsUsed,
    int SlotIndex);

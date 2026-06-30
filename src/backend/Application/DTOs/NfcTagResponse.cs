namespace Application.DTOs;

public record NfcTagResponse(
    Guid Id,
    string TagUid,
    string Type,
    Guid SpoolId,
    DateTime CreatedAt);

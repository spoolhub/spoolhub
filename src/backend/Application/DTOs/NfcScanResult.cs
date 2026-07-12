namespace Application.DTOs;

public record NfcScanResult(
    string Status,
    string TagUid,
    SpoolResponse? Spool,
    string? Message
);

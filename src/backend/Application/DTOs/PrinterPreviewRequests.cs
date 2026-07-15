namespace Application.DTOs;

public record CloudPrinterPreviewRequest(string SerialNumber);

public record LanPrinterPreviewRequest(
    string SerialNumber,
    string IpAddress,
    string AccessCode);

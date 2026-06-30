namespace Application.DTOs;

public record CloudPendingPrinter(
    string SerialNumber,
    string Name,
    string Model,
    string AccessCode
);

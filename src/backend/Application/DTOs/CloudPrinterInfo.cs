namespace Application.DTOs;

public record CloudPrinterInfo(
    string SerialNumber,
    string Name,
    string Model,
    string ModelCode,
    string AccessCode,
    float NozzleDiameter,
    bool Online,
    string PrintStatus
);

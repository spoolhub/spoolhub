namespace Application.DTOs;

public record UpdatePrinterRequest(
    string? Name,
    string? Brand,
    string? Model,
    string? SerialNumber,
    string? IpAddress,
    int? Port,
    string? Protocol,
    bool? HasAms
);

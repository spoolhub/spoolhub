using System.ComponentModel.DataAnnotations;

namespace Application.DTOs;

public record RegisterLanPrinterRequest(
    [Required] string Name,
    [Required] string Brand,
    [Required] string Model,
    [Required] string IpAddress,
    int? Port = null,
    string? SerialNumber = null,
    bool HasAms = false,
    string? AccessCode = null
);

using System.ComponentModel.DataAnnotations;

namespace Application.DTOs;

public record UpdateLocationRequest(
    string? Name,
    string? Type,
    [Range(1, 60)] int? Capacity,
    [Range(0, 100)] int? Humidity
);

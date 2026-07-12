namespace Application.DTOs;

public record LocationResponse(Guid Id, string Name, string Type, int Capacity, int? Humidity, DateTime CreatedAt);

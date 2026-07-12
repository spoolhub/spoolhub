namespace Application.DTOs;

public record UserResponse(Guid Id, string Username, string? FullName, DateTime CreatedAt);

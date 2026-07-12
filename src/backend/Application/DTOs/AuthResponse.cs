namespace Application.DTOs;

public record AuthResponse(Guid Id, string Username, string? FullName, string Token, DateTime ExpiresAt);

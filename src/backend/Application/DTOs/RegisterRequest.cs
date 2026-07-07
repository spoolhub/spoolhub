using System.ComponentModel.DataAnnotations;

namespace Application.DTOs;

public record RegisterRequest(
    [Required] string Username,
    string? FullName,
    [Required] [MinLength(8)] string Password
);

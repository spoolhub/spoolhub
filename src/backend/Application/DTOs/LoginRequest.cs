using System.ComponentModel.DataAnnotations;

namespace Application.DTOs;

public record LoginRequest(
    [Required] string Username,
    [Required] string Password
);

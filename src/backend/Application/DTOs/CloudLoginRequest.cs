using System.ComponentModel.DataAnnotations;

namespace Application.DTOs;

public record CloudLoginRequest(
    [Required] string Brand,
    [Required] string Email,
    [Required] string Password
);

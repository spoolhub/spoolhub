using System.ComponentModel.DataAnnotations;

namespace Application.DTOs;

public record CloudLoginRequest(
    [Required] string Brand,
    [Required, EmailAddress] string Email,
    [Required] string Password
);

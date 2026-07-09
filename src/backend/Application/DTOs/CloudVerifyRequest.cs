using System.ComponentModel.DataAnnotations;

namespace Application.DTOs;

public record CloudVerifyRequest([Required, RegularExpression(@"^\d{6}$", ErrorMessage = "Verification code must be 6 digits")] string Code);

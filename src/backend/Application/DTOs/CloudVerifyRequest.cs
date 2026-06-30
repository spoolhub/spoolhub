using System.ComponentModel.DataAnnotations;

namespace Application.DTOs;

public record CloudVerifyRequest([Required] string Code);

using System.ComponentModel.DataAnnotations;

namespace Application.DTOs;

public record WriteUrlRequest([Required] string Url);

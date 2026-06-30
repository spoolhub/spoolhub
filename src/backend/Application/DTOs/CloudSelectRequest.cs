using System.ComponentModel.DataAnnotations;

namespace Application.DTOs;

public record CloudSelectRequest([Required] IReadOnlyList<string> Serials);

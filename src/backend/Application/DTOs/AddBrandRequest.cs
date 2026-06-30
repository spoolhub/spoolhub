using System.ComponentModel.DataAnnotations;

namespace Application.DTOs;

public record AddBrandRequest(
    [Required] string Name,
    string? Domain,
    [Required] string OfdSlug);

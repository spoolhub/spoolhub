using System.ComponentModel.DataAnnotations;

namespace Application.DTOs;

public record RegisterNfcTagRequest(
    [Required] string TagUid,
    [Required] Guid SpoolId,
    [Required] string Type);

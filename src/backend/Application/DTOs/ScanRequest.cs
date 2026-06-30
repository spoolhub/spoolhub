using System.ComponentModel.DataAnnotations;

namespace Application.DTOs;

public record ScanRequest(
    [Required] string TagUid
);

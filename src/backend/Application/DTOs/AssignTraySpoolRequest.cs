namespace Application.DTOs;

public record AssignTraySpoolRequest(Guid? SpoolId, string? DisplacedStockLocation = null);

namespace Application.DTOs;

public record AssignPrinterRequest(Guid? PrinterId, int? AmsSlot);

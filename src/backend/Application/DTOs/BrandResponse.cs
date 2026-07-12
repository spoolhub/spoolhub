namespace Application.DTOs;

public record BrandResponse(Guid Id, string Name, string Domain, string OfdSlug, DateTime CreatedAt);

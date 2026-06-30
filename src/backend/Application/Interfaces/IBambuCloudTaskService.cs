namespace Application.Interfaces;

public interface IBambuCloudTaskService
{
    Task<float?> GetLastTaskGramsAsync(string serialNumber, string encryptedToken, string? taskId, string? expectedTitle, CancellationToken ct = default);
    Task<string?> GetActiveTaskIdAsync(string serialNumber, string encryptedToken, CancellationToken ct = default);
}

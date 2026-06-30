namespace Application.Interfaces;

public record CloudPendingSession(
    string Brand,
    string Email,
    string Password,
    string LoginType,
    string? AccessToken = null,
    string? UserId = null,
    IReadOnlyList<Application.DTOs.CloudPendingPrinter>? PendingPrinters = null
);

public interface ICloudSessionStore
{
    void SetPending(CloudPendingSession session);
    CloudPendingSession? GetPending();
    void Clear();
}

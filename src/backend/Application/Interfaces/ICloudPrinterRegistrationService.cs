using Application.DTOs;

namespace Application.Interfaces;

public interface ICloudPrinterRegistrationService
{
    Task<CloudLoginResult> LoginAsync(CloudLoginRequest request, CancellationToken ct);
    Task<IReadOnlyList<CloudDiscoveredPrinterResponse>> VerifyAsync(CloudVerifyRequest request, CancellationToken ct);
    Task<IReadOnlyList<PrinterResponse>> SelectAsync(IReadOnlyList<string> serials, CancellationToken ct);
}

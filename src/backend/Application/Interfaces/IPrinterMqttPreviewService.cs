using Application.DTOs;

namespace Application.Interfaces;

public interface IPrinterMqttPreviewService
{
    Task<DiscoveredPrinterMqttPreview?> PreviewCloudAsync(string serialNumber, CancellationToken ct = default);

    Task<DiscoveredPrinterMqttPreview?> PreviewLanAsync(
        string serialNumber,
        string ipAddress,
        string accessCode,
        CancellationToken ct = default);
}

using Application.DTOs;

namespace Application.Interfaces;

public interface ICloudBrandHandler
{
    string Brand { get; }
    Task<CloudLoginResult> LoginAsync(string email, string password, CancellationToken ct);
    Task<IReadOnlyList<CloudDiscoveredPrinterResponse>> VerifyAsync(string code, CancellationToken ct);
    Task<IReadOnlyList<PrinterResponse>> SelectAsync(IReadOnlyList<string> serials, CancellationToken ct);
}

namespace Application.Interfaces;

public interface IBambuFtpService
{
    Task<byte[]?> DownloadPrintFileAsync(string ip, string accessCode, string subtaskName, CancellationToken ct = default);
}

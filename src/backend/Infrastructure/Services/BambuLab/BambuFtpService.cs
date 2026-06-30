using Application.Interfaces;
using FluentFTP;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services.BambuLab;

public class BambuFtpService(ILogger<BambuFtpService> logger) : IBambuFtpService
{
    private const int FtpPort = 990;

    public async Task<byte[]?> DownloadPrintFileAsync(
        string ip, string accessCode, string subtaskName, CancellationToken ct = default)
    {
        var candidates = BuildCandidatePaths(subtaskName);

        try
        {
            using var ftp = new AsyncFtpClient(ip, "bblp", accessCode, FtpPort);
            ftp.Config.EncryptionMode = FtpEncryptionMode.Implicit;
            ftp.Config.ValidateAnyCertificate = true;
            ftp.Config.ConnectTimeout = 8000;
            ftp.Config.ReadTimeout = 15000;

            await ftp.Connect(ct);

            foreach (var path in candidates)
            {
                if (!await ftp.FileExists(path, ct)) continue;

                using var ms = new MemoryStream();
                await ftp.DownloadStream(ms, path, token: ct);
                logger.LogInformation("FTP: downloaded '{Path}' ({Bytes} bytes) from {Ip}", path, ms.Length, ip);
                return ms.ToArray();
            }

            logger.LogWarning("FTP: no print file found on {Ip} for '{Name}'. Tried: {Paths}",
                ip, subtaskName, string.Join(", ", candidates));
            return null;
        }
        catch (Exception ex)
        {
            logger.LogWarning("FTP: connection to {Ip} failed: {Message}", ip, ex.Message);
            return null;
        }
    }

    private static string[] BuildCandidatePaths(string name)
    {
        var with3mf = name.EndsWith(".gcode.3mf", StringComparison.OrdinalIgnoreCase) ? name : $"{name}.gcode.3mf";
        var withGcode = name.EndsWith(".gcode", StringComparison.OrdinalIgnoreCase) ? name : $"{name}.gcode";

        return
        [
            $"/cache/{with3mf}",
            $"/{with3mf}",
            $"/cache/{withGcode}",
            $"/{withGcode}",
        ];
    }
}

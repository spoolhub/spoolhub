using System.IO.Compression;
using System.Text;
using System.Text.RegularExpressions;
using Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace Application.Services;

public class GcodeParserService(ILogger<GcodeParserService> logger) : IGcodeParserService
{
    private static readonly Regex FilamentMmRegex =
        new(@";\s*filament used \[mm\]\s*=\s*([\d.]+)", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public float? ParseFilamentUsedMm(byte[] fileBytes, string fileName)
    {
        try
        {
            var gcodeText = fileName.EndsWith(".3mf", StringComparison.OrdinalIgnoreCase)
                ? ExtractGcodeHeader(fileBytes)
                : Encoding.UTF8.GetString(fileBytes);

            return FindMm(gcodeText);
        }
        catch (Exception ex)
        {
            logger.LogWarning("Gcode parse failed for '{File}': {Message}", fileName, ex.Message);
            return null;
        }
    }

    private static string ExtractGcodeHeader(byte[] fileBytes)
    {
        using var ms = new MemoryStream(fileBytes);
        using var zip = new ZipArchive(ms, ZipArchiveMode.Read);

        var entry = zip.Entries.FirstOrDefault(e =>
            e.FullName.EndsWith(".gcode", StringComparison.OrdinalIgnoreCase));

        if (entry is null)
            throw new InvalidOperationException("No .gcode file inside .3mf archive");

        using var reader = new StreamReader(entry.Open(), Encoding.UTF8);
        var sb = new StringBuilder();
        for (var i = 0; i < 300 && !reader.EndOfStream; i++)
            sb.AppendLine(reader.ReadLine());
        return sb.ToString();
    }

    private float? FindMm(string text)
    {
        var match = FilamentMmRegex.Match(text);
        if (!match.Success) return null;

        var raw = match.Groups[1].Value;
        if (float.TryParse(raw, System.Globalization.NumberStyles.Float,
            System.Globalization.CultureInfo.InvariantCulture, out var mm) && mm > 0)
            return mm;

        return null;
    }
}

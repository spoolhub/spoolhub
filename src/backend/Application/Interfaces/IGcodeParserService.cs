namespace Application.Interfaces;

public interface IGcodeParserService
{
    float? ParseFilamentUsedMm(byte[] fileBytes, string fileName);
}

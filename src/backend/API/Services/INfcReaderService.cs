namespace API.Services;

public interface INfcReaderService
{
    void WriteNdefUri(string url);
}

using API.Services;
using Microsoft.AspNetCore.SignalR;

namespace API.Hubs;

public class NfcScanHub(Acr122UService readerService) : Hub
{
    public override async Task OnConnectedAsync()
    {
        await Clients.Caller.SendAsync("ReaderStatus", new
        {
            connected = readerService.ActiveReader != null,
            name = readerService.ActiveReader,
            availableReaders = readerService.AvailableReaders
        });
        await base.OnConnectedAsync();
    }

    public Task SelectReader(string readerName) =>
        readerService.SelectReaderAsync(readerName);

    public Task DisconnectReader() =>
        readerService.DisconnectReaderAsync();
}

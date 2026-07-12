using API.Hubs;
using Application.DTOs;
using Application.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace API.Services;

public class PrinterStatusPusher(IHubContext<PrinterHub> hubContext) : IPrinterStatusPusher
{
    public Task PushAsync(PrinterStatus status) =>
        hubContext.Clients.All.SendAsync("PrinterStatus", status);
}

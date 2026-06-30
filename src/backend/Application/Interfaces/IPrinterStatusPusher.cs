using Application.DTOs;

namespace Application.Interfaces;

public interface IPrinterStatusPusher
{
    Task PushAsync(PrinterStatus status);
}

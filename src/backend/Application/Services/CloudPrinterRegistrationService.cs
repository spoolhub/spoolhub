using Application.DTOs;
using Application.Exceptions;
using Application.Interfaces;

namespace Application.Services;

public class CloudPrinterRegistrationService(
    CloudBrandHandlerFactory handlerFactory,
    ICloudSessionStore sessionStore) : ICloudPrinterRegistrationService
{
    public Task<CloudLoginResult> LoginAsync(CloudLoginRequest request, CancellationToken ct)
    {
        var handler = handlerFactory.GetHandler(request.Brand);
        return handler.LoginAsync(request.Email, request.Password, ct);
    }

    public Task<CloudVerifyResult> VerifyAsync(CloudVerifyRequest request, CancellationToken ct)
    {
        var pending = sessionStore.GetPending()
            ?? throw new BadRequestException("No pending 2FA verification — call register/cloud first");
        var handler = handlerFactory.GetHandler(pending.Brand);
        return handler.VerifyAsync(request.Code, ct);
    }

    public Task<IReadOnlyList<PrinterResponse>> SelectAsync(IReadOnlyList<string> serials, CancellationToken ct)
    {
        var pending = sessionStore.GetPending()
            ?? throw new BadRequestException("No pending cloud session — login first");
        var handler = handlerFactory.GetHandler(pending.Brand);
        return handler.SelectAsync(serials, ct);
    }
}

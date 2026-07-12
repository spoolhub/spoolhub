using Application.DTOs;
using Application.Exceptions;
using Application.Interfaces;
using Application.Services;
using NSubstitute;

namespace Test;

public class CloudPrinterRegistrationServiceTests
{
    private readonly ICloudBrandHandler _handler = Substitute.For<ICloudBrandHandler>();
    private readonly ICloudSessionStore _sessionStore = Substitute.For<ICloudSessionStore>();
    private readonly CloudBrandHandlerFactory _factory;
    private readonly CloudPrinterRegistrationService _sut;

    public CloudPrinterRegistrationServiceTests()
    {
        _handler.Brand.Returns("Bambu Lab");
        _factory = new CloudBrandHandlerFactory([_handler]);
        _sut = new CloudPrinterRegistrationService(_factory, _sessionStore);
    }

    // ── LoginAsync ────────────────────────────────────────────────────────────

    [Fact]
    public async Task LoginAsync_DelegatesToHandler()
    {
        var request = new CloudLoginRequest("Bambu Lab", "user@test.com", "pass123");
        var expected = new CloudLoginResult(false);
        _handler.LoginAsync("user@test.com", "pass123", Arg.Any<CancellationToken>())
            .Returns(expected);

        var result = await _sut.LoginAsync(request, CancellationToken.None);

        Assert.Same(expected, result);
        await _handler.Received(1).LoginAsync("user@test.com", "pass123", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task LoginAsync_ThrowsForUnsupportedBrand()
    {
        var request = new CloudLoginRequest("Unknown Brand", "u@test.com", "pass");

        await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.LoginAsync(request, CancellationToken.None));
    }

    // ── VerifyAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task VerifyAsync_DelegatesToHandlerWithPendingSession()
    {
        var pending = new CloudPendingSession("Bambu Lab", "user@test.com", "pass123", "verifyCode");
        _sessionStore.GetPending().Returns(pending);
        _handler.VerifyAsync("123456", Arg.Any<CancellationToken>())
            .Returns(new CloudVerifyResult(AvailablePrinters: []));

        await _sut.VerifyAsync(new CloudVerifyRequest("123456"), CancellationToken.None);

        await _handler.Received(1).VerifyAsync("123456", Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task VerifyAsync_ThrowsWhenNoPendingSession()
    {
        _sessionStore.GetPending().Returns((CloudPendingSession?)null);

        await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.VerifyAsync(new CloudVerifyRequest("123456"), CancellationToken.None));
    }
}

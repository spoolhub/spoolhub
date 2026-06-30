using API.Controllers;
using API.Services;
using Application.DTOs;
using Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;

namespace Test;

public class NfcTagControllerTests
{
    private readonly INfcTagService _nfcTagService = Substitute.For<INfcTagService>();
    private readonly INfcScanService _nfcScanService = Substitute.For<INfcScanService>();
    private readonly INfcReaderService _readerService = Substitute.For<INfcReaderService>();
    private readonly NfcTagController _sut;

    public NfcTagControllerTests()
    {
        _sut = new NfcTagController(_nfcTagService, _nfcScanService, _readerService);
    }

    [Fact]
    public async Task GetAllTags_ReturnsOkWithTags()
    {
        _nfcTagService.GetAllAsync().Returns([BuildResponse(), BuildResponse()]);

        var result = await _sut.GetAllTags();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.IsAssignableFrom<IEnumerable<NfcTagResponse>>(ok.Value);
    }

    [Fact]
    public async Task GetTagById_WhenFound_ReturnsOk()
    {
        var response = BuildResponse();
        _nfcTagService.GetByIdAsync(response.Id).Returns(response);

        var result = await _sut.GetTagById(response.Id);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(response, ok.Value);
    }

    [Fact]
    public async Task GetTagById_WhenNotFound_ReturnsNotFound()
    {
        _nfcTagService.GetByIdAsync(Arg.Any<Guid>()).Returns((NfcTagResponse?)null);

        var result = await _sut.GetTagById(Guid.NewGuid());

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task RegisterTag_ReturnsCreated()
    {
        var request = new RegisterNfcTagRequest("04:AA:BB:CC", Guid.NewGuid(), "NFC-A");
        var response = BuildResponse();
        _nfcTagService.RegisterAsync(request).Returns(response);

        var result = await _sut.RegisterTag(request);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        Assert.Equal(201, created.StatusCode);
        Assert.Equal(response, created.Value);
    }

    [Fact]
    public async Task DeleteTag_WhenFound_ReturnsNoContent()
    {
        _nfcTagService.DeleteAsync(Arg.Any<Guid>()).Returns(true);

        var result = await _sut.DeleteTag(Guid.NewGuid());

        Assert.IsType<NoContentResult>(result);
    }

    [Fact]
    public async Task DeleteTag_WhenNotFound_ReturnsNotFound()
    {
        _nfcTagService.DeleteAsync(Arg.Any<Guid>()).Returns(false);

        var result = await _sut.DeleteTag(Guid.NewGuid());

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task ScanTag_WhenTagUidIsValid_ReturnsOk()
    {
        var scanResult = new NfcScanResult("unknown", "04:AA:BB:CC", null, "Tag not registered");
        _nfcScanService.ProcessScanAsync("04:AA:BB:CC").Returns(scanResult);

        var result = await _sut.ScanTag(new ScanRequest("04:AA:BB:CC"));

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(scanResult, ok.Value);
    }

    private static NfcTagResponse BuildResponse() => new(
        Guid.NewGuid(), "04:AA:BB:CC", "NFC-A", Guid.NewGuid(), DateTime.UtcNow);
}

using Application.DTOs;
using Application.Interfaces;
using Application.Services;
using Domain.Models;
using NSubstitute;

namespace Test;

public class NfcScanServiceTests
{
    private readonly INfcTagRepository _nfcRepo = Substitute.For<INfcTagRepository>();
    private readonly ISpoolService _spoolService = Substitute.For<ISpoolService>();
    private readonly IActivityService _activity = Substitute.For<IActivityService>();
    private readonly IRealtimeNotifier _notifier = Substitute.For<IRealtimeNotifier>();
    private readonly NfcScanService _sut;

    public NfcScanServiceTests() => _sut = new NfcScanService(_nfcRepo, _spoolService, _activity, _notifier);

    [Fact]
    public async Task ProcessScanAsync_WhenTagNotFound_ReturnsUnknown()
    {
        _nfcRepo.GetByTagUidAsync(Arg.Any<string>()).Returns((NfcTag?)null);

        var result = await _sut.ProcessScanAsync("04:AA:BB:CC");

        Assert.Equal("unknown", result.Status);
        Assert.Null(result.Spool);
        Assert.Equal("04:AA:BB:CC", result.TagUid);
    }

    [Fact]
    public async Task ProcessScanAsync_WhenTagFound_ReturnsFound()
    {
        var spoolId = Guid.NewGuid();
        var tag = new NfcTag { TagUid = "04:AA:BB:CC", SpoolId = spoolId };
        var spoolResponse = BuildSpoolResponse(spoolId);

        _nfcRepo.GetByTagUidAsync("04:AA:BB:CC").Returns(tag);
        _spoolService.GetByIdAsync(spoolId).Returns(spoolResponse);

        var result = await _sut.ProcessScanAsync("04:AA:BB:CC");

        Assert.Equal("found", result.Status);
        Assert.NotNull(result.Spool);
        Assert.Equal(spoolId, result.Spool.Id);
    }

    [Fact]
    public async Task ProcessScanAsync_WhenTagFound_CallsGetByIdWithCorrectId()
    {
        var spoolId = Guid.NewGuid();
        var tag = new NfcTag { TagUid = "04:AA:BB:CC", SpoolId = spoolId };

        _nfcRepo.GetByTagUidAsync("04:AA:BB:CC").Returns(tag);
        _spoolService.GetByIdAsync(spoolId).Returns(BuildSpoolResponse(spoolId));

        await _sut.ProcessScanAsync("04:AA:BB:CC");

        await _spoolService.Received(1).GetByIdAsync(spoolId);
    }

    [Fact]
    public async Task ProcessScanAsync_WhenTagFound_DoesNotCallActivate()
    {
        var spoolId = Guid.NewGuid();
        var tag = new NfcTag { TagUid = "04:AA:BB:CC", SpoolId = spoolId };

        _nfcRepo.GetByTagUidAsync("04:AA:BB:CC").Returns(tag);
        _spoolService.GetByIdAsync(spoolId).Returns(BuildSpoolResponse(spoolId));

        await _sut.ProcessScanAsync("04:AA:BB:CC");

        await _spoolService.DidNotReceive().ActivateAsync(Arg.Any<Guid>());
    }

    private static SpoolResponse BuildSpoolResponse(Guid id) => new(
        id, "Bambu", "PLA", "White", "#FFFFFF",
        1000, 800, 200, 100,
        true, false, DateTime.UtcNow, null, null,
        null, null, null, null, null, null,
        false, null, [], null, null, null, null, null);
}

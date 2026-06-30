using Application.DTOs;
using Application.Interfaces;
using Application.Services;
using Domain.Models;
using Microsoft.Extensions.Logging.Abstractions;
using NSubstitute;

namespace Test;

public class NfcTagServiceTests
{
    private readonly INfcTagRepository _repo = Substitute.For<INfcTagRepository>();
    private readonly ISpoolRepository _spoolRepo = Substitute.For<ISpoolRepository>();
    private readonly IActivityService _activity = Substitute.For<IActivityService>();
    private readonly NfcTagService _sut;

    public NfcTagServiceTests() =>
        _sut = new NfcTagService(_repo, _spoolRepo, _activity, NullLogger<NfcTagService>.Instance);

    [Fact]
    public async Task GetAllAsync_ReturnsAllTags()
    {
        _repo.GetAllAsync().Returns([BuildTag(), BuildTag()]);

        var result = await _sut.GetAllAsync();

        Assert.Equal(2, result.Count());
    }

    [Fact]
    public async Task GetByIdAsync_WhenFound_ReturnsResponse()
    {
        var tag = BuildTag();
        _repo.GetByIdAsync(tag.Id).Returns(tag);

        var result = await _sut.GetByIdAsync(tag.Id);

        Assert.NotNull(result);
        Assert.Equal(tag.Id, result.Id);
        Assert.Equal(tag.TagUid, result.TagUid);
    }

    [Fact]
    public async Task GetByIdAsync_WhenNotFound_ReturnsNull()
    {
        _repo.GetByIdAsync(Arg.Any<Guid>()).Returns((NfcTag?)null);

        var result = await _sut.GetByIdAsync(Guid.NewGuid());

        Assert.Null(result);
    }

    [Fact]
    public async Task RegisterAsync_WhenNewTag_CreatesTagWithCorrectFields()
    {
        _repo.GetByTagUidAsync(Arg.Any<string>()).Returns((NfcTag?)null);
        _repo.CreateAsync(Arg.Any<NfcTag>()).Returns(x => x.Arg<NfcTag>());

        var request = new RegisterNfcTagRequest("04:AA:BB:CC", Guid.NewGuid(), "NFC-A");
        var result = await _sut.RegisterAsync(request);

        Assert.Equal("04:AA:BB:CC", result.TagUid);
        Assert.Equal("NFC-A", result.Type);
        Assert.Equal(request.SpoolId, result.SpoolId);
        await _repo.Received(1).CreateAsync(Arg.Any<NfcTag>());
    }

    [Fact]
    public async Task RegisterAsync_WhenTagAlreadyExists_ReassignsSpoolId()
    {
        var newSpoolId = Guid.NewGuid();
        var existing = BuildTag();
        _repo.GetByTagUidAsync(existing.TagUid).Returns(existing);
        _repo.UpdateAsync(Arg.Any<NfcTag>()).Returns(x => x.Arg<NfcTag>());

        var result = await _sut.RegisterAsync(new RegisterNfcTagRequest(existing.TagUid, newSpoolId, "NFC-A"));

        Assert.Equal(newSpoolId, result.SpoolId);
        await _repo.Received(1).UpdateAsync(Arg.Any<NfcTag>());
        await _repo.DidNotReceive().CreateAsync(Arg.Any<NfcTag>());
    }

    [Fact]
    public async Task DeleteAsync_WhenFound_ReturnsTrue()
    {
        var tag = BuildTag();
        _repo.GetByIdAsync(tag.Id).Returns(tag);

        var result = await _sut.DeleteAsync(tag.Id);

        Assert.True(result);
        await _repo.Received(1).DeleteAsync(tag.Id);
    }

    [Fact]
    public async Task DeleteAsync_WhenNotFound_ReturnsFalse()
    {
        _repo.GetByIdAsync(Arg.Any<Guid>()).Returns((NfcTag?)null);

        var result = await _sut.DeleteAsync(Guid.NewGuid());

        Assert.False(result);
        await _repo.DidNotReceive().DeleteAsync(Arg.Any<Guid>());
    }

    private static NfcTag BuildTag() => new()
    {
        Id = Guid.NewGuid(),
        TagUid = "04:AA:BB:CC",
        Type = "NFC-A",
        SpoolId = Guid.NewGuid(),
        CreatedAt = DateTime.UtcNow
    };
}

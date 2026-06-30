using Application.DTOs;
using Application.Interfaces;
using Application.Services;
using Domain.Models;
using Microsoft.Extensions.Logging;
using NSubstitute;

namespace Test;

public class BrandServiceTests
{
    private readonly IBrandRepository _repo = Substitute.For<IBrandRepository>();
    private readonly IActivityService _activity = Substitute.For<IActivityService>();
    private readonly IHttpClientFactory _httpClientFactory = Substitute.For<IHttpClientFactory>();
    private readonly BrandService _sut;

    public BrandServiceTests()
    {
        _httpClientFactory.CreateClient("ofd").Returns(new HttpClient());
        _sut = new BrandService(_repo, _activity, _httpClientFactory, Substitute.For<ILogger<BrandService>>());
    }

    [Fact]
    public async Task GetAllAsync_MapsRepoResultsToDtos()
    {
        var brands = new List<Brand>
        {
            new() { Id = Guid.NewGuid(), Name = "Bambu Lab", Domain = "bambulab.com", OfdSlug = "bambu_lab", CreatedAt = DateTime.UtcNow },
            new() { Id = Guid.NewGuid(), Name = "eSUN",      Domain = "esun3d.com",   OfdSlug = "esun_3d",   CreatedAt = DateTime.UtcNow },
        };
        _repo.GetAllAsync().Returns(brands);

        var result = (await _sut.GetAllAsync()).ToList();

        Assert.Equal(2, result.Count);
        Assert.Equal("Bambu Lab", result[0].Name);
        Assert.Equal("bambu_lab", result[0].OfdSlug);
    }

    [Fact]
    public async Task AddAsync_SavesBrandAndReturnsMappedDto()
    {
        var request = new AddBrandRequest("Bambu Lab", "bambulab.com", "bambu_lab");
        _repo.GetBySlugAsync("bambu_lab").Returns((Brand?)null);
        _repo.AddAsync(Arg.Any<Brand>()).Returns(ci => ci.Arg<Brand>());

        var result = await _sut.AddAsync(request);

        Assert.NotNull(result);
        Assert.Equal("Bambu Lab", result.Name);
        Assert.Equal("bambulab.com", result.Domain);
        Assert.Equal("bambu_lab", result.OfdSlug);
        Assert.NotEqual(Guid.Empty, result.Id);
        await _repo.Received(1).AddAsync(Arg.Is<Brand>(b =>
            b.Name == "Bambu Lab" && b.OfdSlug == "bambu_lab"));
    }

    [Fact]
    public async Task AddAsync_WhenSlugExists_ReturnsNull()
    {
        var request = new AddBrandRequest("Bambu Lab", "bambulab.com", "bambu_lab");
        _repo.GetBySlugAsync("bambu_lab").Returns(new Brand { Id = Guid.NewGuid(), Name = "Bambu Lab", OfdSlug = "bambu_lab" });

        var result = await _sut.AddAsync(request);

        Assert.Null(result);
        await _repo.DidNotReceive().AddAsync(Arg.Any<Brand>());
    }

    [Fact]
    public async Task DeleteAsync_WhenExists_ReturnsTrue()
    {
        var id = Guid.NewGuid();
        _repo.DeleteAsync(id).Returns(true);

        var result = await _sut.DeleteAsync(id);

        Assert.True(result);
    }

    [Fact]
    public async Task DeleteAsync_WhenNotFound_ReturnsFalse()
    {
        _repo.DeleteAsync(Arg.Any<Guid>()).Returns(false);

        var result = await _sut.DeleteAsync(Guid.NewGuid());

        Assert.False(result);
    }

    [Fact]
    public async Task SearchOfdAsync_WhenQueryEmpty_ReturnsEmpty()
    {
        var result = await _sut.SearchOfdAsync(string.Empty);

        Assert.Empty(result);
    }

    [Fact]
    public async Task SearchOfdAsync_WhenHttpFails_ReturnsEmpty()
    {
        var factory = Substitute.For<IHttpClientFactory>();
        factory.CreateClient("ofd").Returns(new HttpClient(new ThrowingHandler()));
        var sut = new BrandService(_repo, _activity, factory, Substitute.For<ILogger<BrandService>>());

        var result = await sut.SearchOfdAsync("bambu");

        Assert.Empty(result);
    }

    private sealed class ThrowingHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) =>
            throw new HttpRequestException("Simulated network failure");
    }
}

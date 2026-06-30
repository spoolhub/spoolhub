using Application.DTOs;
using Application.Interfaces;
using Application.Services;
using Domain.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using NSubstitute;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

// NullLogger is not guaranteed to be reachable via transitive refs — use NSubstitute instead.

namespace Test;

public class FilamentServiceTests
{
    private readonly IFilamentCacheRepository _cacheRepo = Substitute.For<IFilamentCacheRepository>();
    private readonly IBrandRepository _brandRepo = Substitute.For<IBrandRepository>();
    private readonly ISpoolRepository _spoolRepo = Substitute.For<ISpoolRepository>();
    private readonly MemoryCache _memCache = new(new MemoryCacheOptions());
    private readonly FilamentService _sut;

    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy        = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition      = JsonIgnoreCondition.WhenWritingNull,
    };

    public FilamentServiceTests()
    {
        _brandRepo.GetAllAsync().Returns([]);
        _spoolRepo.GetAllAsync().Returns([]);
        _sut = new FilamentService(
            new HttpClient(),
            _memCache,
            Substitute.For<ILogger<FilamentService>>(),
            _cacheRepo,
            _brandRepo,
            _spoolRepo);
    }

    [Fact]
    public async Task GetAllAsync_WhenMemoryCachePopulated_DoesNotHitSqlite()
    {
        var profiles = new List<FilamentProfileResponse> { BuildProfile() };
        _memCache.Set("filament_profiles", profiles.AsEnumerable());

        var result = await _sut.GetAllAsync();

        Assert.Single(result);
        await _cacheRepo.DidNotReceive().GetAsync();
    }

    [Fact]
    public async Task GetAllAsync_WhenSqliteCacheHit_ReturnsDeserializedProfiles()
    {
        var profiles = new List<FilamentProfileResponse> { BuildProfile() };
        var json = JsonSerializer.Serialize(profiles, JsonOpts);
        _cacheRepo.GetAsync().Returns((json, DateTime.UtcNow));

        var result = await _sut.GetAllAsync();

        Assert.Single(result);
        Assert.Equal("Bambu Lab", result.First().Brand);
    }

    [Fact]
    public async Task GetAllAsync_WhenSqliteCacheReturnsNull_ReturnsEmpty()
    {
        _cacheRepo.GetAsync().Returns(((string?)null, (DateTime?)null));

        var result = await _sut.GetAllAsync();

        Assert.Empty(result);
    }

    [Fact]
    public async Task GetAllAsync_WhenSqliteJsonIsInvalid_ReturnsEmpty()
    {
        _cacheRepo.GetAsync().Returns(("not valid json {{", DateTime.UtcNow));

        var result = await _sut.GetAllAsync();

        Assert.Empty(result);
    }

    [Fact]
    public void GetCachedAt_WhenTimestampSet_ReturnsIt()
    {
        var timestamp = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        _memCache.Set("filament_profiles_at", (DateTime?)timestamp);

        var result = _sut.GetCachedAt();

        Assert.Equal(timestamp, result);
    }

    [Fact]
    public void GetCachedAt_WhenNotSet_ReturnsNull()
    {
        var result = _sut.GetCachedAt();

        Assert.Null(result);
    }

    [Fact]
    public async Task RefreshAsync_WhenBrandsTableEmptyButSpoolsHaveBrandNames_AutoDetectsAndFetchesMatchingOfdBrands()
    {
        // Arrange: no registered brands, but spools reference "eSUN 3D"
        var brandRepo = Substitute.For<IBrandRepository>();
        brandRepo.GetAllAsync().Returns([]);
        brandRepo.GetBySlugAsync(Arg.Any<string>()).Returns((Brand?)null);

        var spoolRepo = Substitute.For<ISpoolRepository>();
        spoolRepo.GetAllAsync().Returns([
            new Domain.Models.Spool { Brand = "eSUN 3D", Material = "PLA", ColorName = "White", ColorHex = "#FFFFFF" },
        ]);

        var ofdResponses = new Dictionary<string, string>
        {
            ["https://api.openfilamentdatabase.org/api/v1/brands/index.json"] =
                """{"brands":[{"name":"eSUN","slug":"esun","material_count":1},{"name":"Bambu Lab","slug":"bambu-lab","material_count":5}]}""",
            ["https://api.openfilamentdatabase.org/api/v1/brands/esun/index.json"] =
                """{"name":"eSUN","slug":"esun","materials":[{"material":"PLA","slug":"pla","filament_count":1}]}""",
            ["https://api.openfilamentdatabase.org/api/v1/brands/esun/materials/pla/index.json"] =
                """{"material":"PLA","slug":"pla","filaments":[{"name":"Standard PLA","slug":"standard-pla"}]}""",
            ["https://api.openfilamentdatabase.org/api/v1/brands/esun/materials/pla/filaments/standard-pla/index.json"] =
                """{"name":"Standard PLA","density":1.24,"min_print_temperature":190,"max_print_temperature":220,"min_bed_temperature":35,"max_bed_temperature":45,"diameter_tolerance":0.02,"discontinued":false,"data_sheet_url":null,"safety_sheet_url":null,"variants":[{"name":"White","color_hex":"#FFFFFF"}]}""",
        };

        var cacheRepo = Substitute.For<IFilamentCacheRepository>();
        var sut = new FilamentService(
            new HttpClient(new FakeHttpHandler(ofdResponses)),
            new MemoryCache(new MemoryCacheOptions()),
            Substitute.For<ILogger<FilamentService>>(),
            cacheRepo,
            brandRepo,
            spoolRepo);

        // Act
        await sut.RefreshAsync();

        // Assert: eSUN matched from spool brand name and auto-registered
        await brandRepo.Received(1).AddAsync(Arg.Is<Brand>(b => b.OfdSlug == "esun"));
        await cacheRepo.Received(1).SaveAsync(Arg.Is<string>(s => s.Contains("eSUN")));
        // Bambu Lab was NOT fetched (no matching spool brand)
        await brandRepo.DidNotReceive().AddAsync(Arg.Is<Brand>(b => b.OfdSlug == "bambu-lab"));
    }

    [Fact]
    public async Task RefreshAsync_BrandsWithEmptyOfdSlug_DoNotBlockBrandsWithValidSlugs()
    {
        // Arrange: one brand with a valid OFD slug, one with an empty slug (the bug scenario)
        var brandRepo = Substitute.For<IBrandRepository>();
        brandRepo.GetAllAsync().Returns([
            new Brand { Name = "eSUN",          OfdSlug = "esun" },
            new Brand { Name = "Unknown Brand", OfdSlug = ""     },
        ]);

        var ofdResponses = new Dictionary<string, string>
        {
            ["https://api.openfilamentdatabase.org/api/v1/brands/index.json"] =
                """{"brands":[{"name":"eSUN","slug":"esun","material_count":1}]}""",
            ["https://api.openfilamentdatabase.org/api/v1/brands/esun/index.json"] =
                """{"name":"eSUN","slug":"esun","materials":[{"material":"PLA","slug":"pla","filament_count":1}]}""",
            ["https://api.openfilamentdatabase.org/api/v1/brands/esun/materials/pla/index.json"] =
                """{"material":"PLA","slug":"pla","filaments":[{"name":"Standard PLA","slug":"standard-pla"}]}""",
            ["https://api.openfilamentdatabase.org/api/v1/brands/esun/materials/pla/filaments/standard-pla/index.json"] =
                """{"name":"Standard PLA","density":1.24,"min_print_temperature":190,"max_print_temperature":220,"min_bed_temperature":35,"max_bed_temperature":45,"diameter_tolerance":0.02,"discontinued":false,"data_sheet_url":null,"safety_sheet_url":null,"variants":[{"name":"White","color_hex":"#FFFFFF"}]}""",
        };

        var spoolRepo = Substitute.For<ISpoolRepository>();
        spoolRepo.GetAllAsync().Returns([]);
        var cacheRepo = Substitute.For<IFilamentCacheRepository>();
        var sut = new FilamentService(
            new HttpClient(new FakeHttpHandler(ofdResponses)),
            new MemoryCache(new MemoryCacheOptions()),
            Substitute.For<ILogger<FilamentService>>(),
            cacheRepo,
            brandRepo,
            spoolRepo);

        // Act
        await sut.RefreshAsync();

        // Assert: eSUN profiles were fetched and persisted despite the empty-slug brand
        await cacheRepo.Received(1).SaveAsync(Arg.Is<string>(s => s.Contains("eSUN")));
    }

    private static FilamentProfileResponse BuildProfile() => new(
        "Bambu Lab", "Basic PLA", "PLA",
        1.24f, 190, 220, 35, 45,
        "#FFFFFF", "Jade White", null,
        0.02f, false, null, null);

    private sealed class FakeHttpHandler(Dictionary<string, string> responses) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            var url = request.RequestUri!.ToString();
            if (responses.TryGetValue(url, out var body))
                return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new StringContent(body, Encoding.UTF8, "application/json")
                });
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.NotFound));
        }
    }
}

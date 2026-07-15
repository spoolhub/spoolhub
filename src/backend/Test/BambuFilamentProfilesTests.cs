using Application.Services;

namespace Test;

public class BambuFilamentProfilesTests
{
    [Theory]
    [InlineData("GFL03", "eSUN PLA+", "eSUN", "PLA+")]
    [InlineData("GFA00", "Bambu PLA Basic", "Bambu Lab", "PLA Basic")]
    [InlineData("GFL99", "Generic PLA", null, "PLA")]
    public void TryGetProfileName_ParsesKnownPresets(string idx, string name, string? brand, string? material)
    {
        Assert.Equal(name, BambuFilamentProfiles.TryGetProfileName(idx));
        var parsed = BambuFilamentProfiles.ParseProfileName(name);
        Assert.Equal(brand, parsed.Brand);
        Assert.Equal(material, parsed.MaterialHint);
    }

    [Fact]
    public void ResolveBrand_UsesTrayInfoIdxWhenSubBrandMissing()
    {
        Assert.Equal("eSUN", BambuFilamentProfiles.ResolveBrand(null, "GFL03", null, false));
        Assert.Equal("Polymaker", BambuFilamentProfiles.ResolveBrand("Polymaker", "GFL00", null, false));
        Assert.Equal("Bambu Lab", BambuFilamentProfiles.ResolveBrand(null, "GFA00", null, true));
        Assert.Null(BambuFilamentProfiles.ResolveBrand(null, "GFL99", null, false));
    }
}

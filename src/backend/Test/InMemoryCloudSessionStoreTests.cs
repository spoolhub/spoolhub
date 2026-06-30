using Application.Interfaces;
using Application.Services;

namespace Test;

public class InMemoryCloudSessionStoreTests
{
    private readonly InMemoryCloudSessionStore _sut = new();

    [Fact]
    public void GetPending_WhenNothingSet_ReturnsNull()
    {
        Assert.Null(_sut.GetPending());
    }

    [Fact]
    public void SetPending_ThenGetPending_ReturnsSameSession()
    {
        var session = new CloudPendingSession("Bambu Lab", "user@example.com", "pass", "verifyCode");
        _sut.SetPending(session);
        var result = _sut.GetPending();
        Assert.NotNull(result);
        Assert.Equal("Bambu Lab", result.Brand);
        Assert.Equal("user@example.com", result.Email);
    }

    [Fact]
    public void Clear_AfterSetPending_ReturnsNull()
    {
        _sut.SetPending(new CloudPendingSession("Bambu Lab", "user@example.com", "pass", "verifyCode"));
        _sut.Clear();
        Assert.Null(_sut.GetPending());
    }

    [Fact]
    public void SetPending_Overwrites_PreviousSession()
    {
        _sut.SetPending(new CloudPendingSession("Brand A", "a@a.com", "passA", "verifyCode"));
        _sut.SetPending(new CloudPendingSession("Brand B", "b@b.com", "passB", "verifyCode"));
        var result = _sut.GetPending();
        Assert.Equal("Brand B", result!.Brand);
    }

    [Fact]
    public void Clear_CalledWhenEmpty_DoesNotThrow()
    {
        var ex = Record.Exception(() => _sut.Clear());
        Assert.Null(ex);
    }
}

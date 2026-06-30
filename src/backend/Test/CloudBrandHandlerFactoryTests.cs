using Application.DTOs;
using Application.Exceptions;
using Application.Interfaces;
using Application.Services;
using NSubstitute;

namespace Test;

public class CloudBrandHandlerFactoryTests
{
    private static ICloudBrandHandler MakeHandler(string brand)
    {
        var h = Substitute.For<ICloudBrandHandler>();
        h.Brand.Returns(brand);
        return h;
    }

    [Fact]
    public void GetHandler_ReturnsMatchingHandler()
    {
        var handler = MakeHandler("Bambu Lab");
        var factory = new CloudBrandHandlerFactory([handler]);

        var result = factory.GetHandler("Bambu Lab");

        Assert.Same(handler, result);
    }

    [Fact]
    public void GetHandler_IsCaseInsensitive()
    {
        var handler = MakeHandler("Bambu Lab");
        var factory = new CloudBrandHandlerFactory([handler]);

        var result = factory.GetHandler("bambu lab");

        Assert.Same(handler, result);
    }

    [Fact]
    public void GetHandler_ThrowsForUnknownBrand()
    {
        var factory = new CloudBrandHandlerFactory([MakeHandler("Bambu Lab")]);

        Assert.Throws<BadRequestException>(() => factory.GetHandler("Unknown Brand"));
    }

    [Fact]
    public void GetHandler_ReturnsCorrectHandlerWhenMultipleRegistered()
    {
        var bambu = MakeHandler("Bambu Lab");
        var prusa = MakeHandler("Prusa");
        var factory = new CloudBrandHandlerFactory([bambu, prusa]);

        Assert.Same(prusa, factory.GetHandler("Prusa"));
        Assert.Same(bambu, factory.GetHandler("Bambu Lab"));
    }

    [Fact]
    public void GetHandler_ThrowsWhenNoHandlersRegistered()
    {
        var factory = new CloudBrandHandlerFactory([]);

        Assert.Throws<BadRequestException>(() => factory.GetHandler("Bambu Lab"));
    }
}

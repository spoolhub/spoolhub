using Application.Exceptions;
using Application.Interfaces;

namespace Application.Services;

public class CloudBrandHandlerFactory(IEnumerable<ICloudBrandHandler> handlers)
{
    public ICloudBrandHandler GetHandler(string brand) =>
        handlers.FirstOrDefault(h => h.Brand.Equals(brand, StringComparison.OrdinalIgnoreCase))
            ?? throw new BadRequestException($"Brand '{brand}' is not supported for cloud login");
}

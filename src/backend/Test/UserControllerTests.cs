using System.Security.Claims;
using API.Controllers;
using Application.DTOs;
using Application.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NSubstitute;

namespace Test;

public class UserControllerTests
{
    private readonly IUserService _service = Substitute.For<IUserService>();
    private readonly UserController _sut;

    public UserControllerTests()
    {
        _sut = new UserController(_service);
    }

    private void SetUser(Guid userId)
    {
        var identity = new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId.ToString())], "test");
        _sut.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) },
        };
    }

    private static UserResponse BuildResponse(Guid id) =>
        new(id, "mira.kovac", "Mira Kovač", DateTime.UtcNow);

    [Fact]
    public async Task GetMe_ReturnsOkWithUser()
    {
        var id = Guid.NewGuid();
        SetUser(id);
        var response = BuildResponse(id);
        _service.GetByIdAsync(id).Returns(response);

        var result = await _sut.GetMe();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(response, ok.Value);
    }

    [Fact]
    public async Task GetMe_WhenMissing_ReturnsNotFound()
    {
        var id = Guid.NewGuid();
        SetUser(id);
        _service.GetByIdAsync(id).Returns((UserResponse?)null);

        var result = await _sut.GetMe();

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task UpdateMe_ReturnsOkWithUpdatedUser()
    {
        var id = Guid.NewGuid();
        SetUser(id);
        var request = new UpdateUserRequest("New Name");
        var response = BuildResponse(id) with { FullName = "New Name" };
        _service.UpdateProfileAsync(id, request).Returns(response);

        var result = await _sut.UpdateMe(request);

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.Equal(response, ok.Value);
    }

    [Fact]
    public async Task ChangePassword_ReturnsNoContent()
    {
        var id = Guid.NewGuid();
        SetUser(id);
        var request = new ChangePasswordRequest("oldpass12", "newpass123");

        var result = await _sut.ChangePassword(request);

        Assert.IsType<NoContentResult>(result);
        await _service.Received(1).ChangePasswordAsync(id, request);
    }
}

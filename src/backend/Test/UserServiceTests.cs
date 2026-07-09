using Application.DTOs;
using Application.Exceptions;
using Application.Interfaces;
using Application.Services;
using Domain.Models;
using NSubstitute;

namespace Test;

public class UserServiceTests
{
    private readonly IUserRepository _repo = Substitute.For<IUserRepository>();
    private readonly UserService _sut;

    public UserServiceTests()
    {
        _sut = new UserService(_repo);
    }

    private static User BuildUser() => new()
    {
        Id = Guid.NewGuid(),
        Username = "mira.kovac",
        FullName = "Mira Kovač",
        PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
        CreatedAt = DateTime.UtcNow,
    };

    [Fact]
    public async Task UpdateProfileAsync_UpdatesFullName()
    {
        var user = BuildUser();
        _repo.GetByIdAsync(user.Id).Returns(user);
        _repo.UpdateAsync(Arg.Any<User>()).Returns(ci => ci.Arg<User>());

        var result = await _sut.UpdateProfileAsync(user.Id, new UpdateUserRequest("New Name"));

        Assert.Equal("New Name", result.FullName);
        await _repo.Received(1).UpdateAsync(Arg.Is<User>(u => u.FullName == "New Name"));
    }

    [Fact]
    public async Task ChangePasswordAsync_WithWrongCurrentPassword_Throws()
    {
        var user = BuildUser();
        _repo.GetByIdAsync(user.Id).Returns(user);

        await Assert.ThrowsAsync<BadRequestException>(() =>
            _sut.ChangePasswordAsync(user.Id, new ChangePasswordRequest("wrong", "newpassword")));
    }

    [Fact]
    public async Task ChangePasswordAsync_WithValidPassword_UpdatesHash()
    {
        var user = BuildUser();
        _repo.GetByIdAsync(user.Id).Returns(user);
        _repo.UpdateAsync(Arg.Any<User>()).Returns(ci => ci.Arg<User>());

        await _sut.ChangePasswordAsync(user.Id, new ChangePasswordRequest("password123", "newpassword1"));

        await _repo.Received(1).UpdateAsync(Arg.Is<User>(u =>
            BCrypt.Net.BCrypt.Verify("newpassword1", u.PasswordHash)));
    }
}

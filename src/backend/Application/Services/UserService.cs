using Application.DTOs;
using Application.Exceptions;
using Application.Interfaces;
using BCrypt.Net;

namespace Application.Services;

public class UserService(IUserRepository repo) : IUserService
{
    public async Task<UserResponse?> GetByIdAsync(Guid id)
    {
        var user = await repo.GetByIdAsync(id);
        return user is null ? null : ToResponse(user);
    }

    public async Task<UserResponse> UpdateProfileAsync(Guid id, UpdateUserRequest request)
    {
        var user = await repo.GetByIdAsync(id);
        if (user is null)
            throw new BadRequestException("User not found.");

        user.FullName = string.IsNullOrWhiteSpace(request.FullName) ? null : request.FullName.Trim();
        var updated = await repo.UpdateAsync(user);
        return ToResponse(updated);
    }

    public async Task ChangePasswordAsync(Guid id, ChangePasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 8)
            throw new BadRequestException("New password must be at least 8 characters.");

        var user = await repo.GetByIdAsync(id);
        if (user is null)
            throw new BadRequestException("User not found.");

        if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            throw new BadRequestException("Current password is incorrect.");

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
        await repo.UpdateAsync(user);
    }

    private static UserResponse ToResponse(Domain.Models.User user) =>
        new(user.Id, user.Username, user.FullName, user.CreatedAt);
}

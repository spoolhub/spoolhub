using Application.DTOs;

namespace Application.Interfaces;

public interface IUserService
{
    Task<UserResponse?> GetByIdAsync(Guid id);
    Task<UserResponse> UpdateProfileAsync(Guid id, UpdateUserRequest request);
    Task ChangePasswordAsync(Guid id, ChangePasswordRequest request);
}

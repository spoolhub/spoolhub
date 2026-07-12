using Domain.Models;

namespace Application.Interfaces;

public interface IUserRepository
{
    Task<User?> GetByUsernameAsync(string username);
    Task<User?> GetByIdAsync(Guid id);
    Task<User> AddAsync(User user);
    Task<User> UpdateAsync(User user);
}

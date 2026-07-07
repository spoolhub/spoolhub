using Application.Interfaces;
using Domain.Models;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public class UserRepository(FilamentDbContext db) : IUserRepository
{
    public async Task<User?> GetByUsernameAsync(string username) =>
        await db.Users.FirstOrDefaultAsync(u => u.Username == username);

    public async Task<User> AddAsync(User user)
    {
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return user;
    }
}

using Application.Interfaces;
using Domain.Models;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public class BrandRepository(FilamentDbContext db) : IBrandRepository
{
    public async Task<IEnumerable<Brand>> GetAllAsync() =>
        await db.Brands.OrderBy(b => b.Name).ToListAsync();

    public async Task<Brand?> GetByIdAsync(Guid id) =>
        await db.Brands.FindAsync(id);

    public async Task<Brand?> GetBySlugAsync(string ofdSlug) =>
        await db.Brands.FirstOrDefaultAsync(b => b.OfdSlug == ofdSlug);

    public async Task<Brand> AddAsync(Brand brand)
    {
        db.Brands.Add(brand);
        await db.SaveChangesAsync();
        return brand;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        var brand = await db.Brands.FindAsync(id);
        if (brand is null) return false;
        db.Brands.Remove(brand);
        await db.SaveChangesAsync();
        return true;
    }
}

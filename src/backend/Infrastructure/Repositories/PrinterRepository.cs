using Application.Interfaces;
using Domain.Models;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public class PrinterRepository(FilamentDbContext db) : IPrinterRepository
{
    public async Task<IEnumerable<Printer>> GetAllAsync()
    {
        return await db.Printers
            .OrderBy(p => p.Name)
            .ToListAsync();
    }

    public async Task<Printer?> GetByIdAsync(Guid id)
    {
        return await db.Printers
            .FirstOrDefaultAsync(p => p.Id == id);
    }

    public async Task<Printer?> GetBySpoolIdAsync(Guid spoolId)
    {
        return await db.Printers
            .FirstOrDefaultAsync(p =>
                p.Tray1SpoolId == spoolId ||
                p.Tray2SpoolId == spoolId ||
                p.Tray3SpoolId == spoolId ||
                p.Tray4SpoolId == spoolId ||
                p.ExtraSpoolId == spoolId);
    }

    public async Task<IEnumerable<Printer>> GetActiveAsync()
    {
        return await db.Printers
            .OrderBy(p => p.Name)
            .ToListAsync();
    }

    public async Task<Printer> CreateAsync(Printer printer)
    {
        db.Printers.Add(printer);
        await db.SaveChangesAsync();
        return printer;
    }

    public async Task<Printer> UpdateAsync(Printer printer)
    {
        db.Printers.Update(printer);
        await db.SaveChangesAsync();
        return printer;
    }

    public async Task DeleteAsync(Guid id)
    {
        await db.Printers
            .Where(p => p.Id == id)
            .ExecuteDeleteAsync();
    }
}

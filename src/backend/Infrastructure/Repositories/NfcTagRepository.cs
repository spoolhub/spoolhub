using Application.Interfaces;
using Domain.Models;
using Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories;

public class NfcTagRepository(FilamentDbContext db) : INfcTagRepository
{
    public async Task<IEnumerable<NfcTag>> GetAllAsync()
    {
        return await db.NfcTags.ToListAsync();
    }

    public async Task<NfcTag?> GetByIdAsync(Guid id)
    {
        return await db.NfcTags.FindAsync(id);
    }

    public async Task<NfcTag?> GetByTagUidAsync(string tagUid)
    {
        return await db.NfcTags
            .Include(t => t.Spool)
            .FirstOrDefaultAsync(t => t.TagUid == tagUid);
    }

    public async Task<IEnumerable<NfcTag>> GetBySpoolIdAsync(Guid spoolId)
    {
        return await db.NfcTags
            .Where(t => t.SpoolId == spoolId)
            .ToListAsync();
    }

    public async Task<NfcTag> CreateAsync(NfcTag nfcTag)
    {
        db.NfcTags.Add(nfcTag);
        await db.SaveChangesAsync();
        return nfcTag;
    }

    public async Task<NfcTag> UpdateAsync(NfcTag nfcTag)
    {
        db.Entry(nfcTag).State = EntityState.Modified;
        await db.SaveChangesAsync();
        return nfcTag;
    }

    public async Task DeleteAsync(Guid id)
    {
        await db.NfcTags
            .Where(t => t.Id == id)
            .ExecuteDeleteAsync();
    }
}

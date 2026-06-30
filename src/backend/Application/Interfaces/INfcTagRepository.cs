using Domain.Models;

namespace Application.Interfaces;

public interface INfcTagRepository
{
    Task<IEnumerable<NfcTag>> GetAllAsync();
    Task<NfcTag?> GetByIdAsync(Guid id);
    Task<NfcTag?> GetByTagUidAsync(string tagUid);
    Task<IEnumerable<NfcTag>> GetBySpoolIdAsync(Guid spoolId);
    Task<NfcTag> CreateAsync(NfcTag nfcTag);
    Task<NfcTag> UpdateAsync(NfcTag nfcTag);
    Task DeleteAsync(Guid id);
}

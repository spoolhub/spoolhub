namespace Application.Interfaces;

using Application.DTOs;

public interface INfcTagService
{
    Task<IEnumerable<NfcTagResponse>> GetAllAsync();
    Task<NfcTagResponse?> GetByIdAsync(Guid id);
    Task<NfcTagResponse> RegisterAsync(RegisterNfcTagRequest request, bool silent = false);
    Task<NfcTagResponse?> LookupByUidAsync(string tagUid);
    Task<bool> DeleteAsync(Guid id);
}

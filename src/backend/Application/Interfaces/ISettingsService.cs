using Application.DTOs;

namespace Application.Interfaces;

public interface ISettingsService
{
    Task<AlertSettingsDto> GetAlertSettingsAsync();
    Task SaveAlertSettingsAsync(AlertSettingsDto dto);
    Task<FilamentSettingsDto> GetFilamentSettingsAsync(DateTime? lastSynced);
    Task SaveFilamentSettingsAsync(UpdateFilamentSettingsRequest dto);
    Task<AppDefaultsDto> GetAppDefaultsAsync();
    Task SaveAppDefaultsAsync(AppDefaultsDto dto);
}

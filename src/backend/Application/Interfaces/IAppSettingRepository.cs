namespace Application.Interfaces;

public interface IAppSettingRepository
{
    Task<string?> GetAsync(string key);
    Task SetAsync(string key, string value);
}

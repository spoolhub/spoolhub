using System.Text.Json;

namespace Application.Interfaces;

public interface IAmsMqttSyncService
{
    Task SyncFromMqttAsync(Guid printerId, JsonElement printEl);
}

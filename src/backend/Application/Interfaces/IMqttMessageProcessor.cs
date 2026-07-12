namespace Application.Interfaces;

public interface IMqttMessageProcessor
{
    Task ProcessAsync(string payload, Guid printerId);
}

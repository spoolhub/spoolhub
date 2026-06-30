using System.Threading.Channels;

namespace API.Services;

public record LogEntry(string Timestamp, string Level, string Category, string Message);

public class LogBuffer
{
    private const int MaxHistory = 500;

    private readonly List<LogEntry> _history = new(MaxHistory + 1);
    private readonly Channel<LogEntry> _channel =
        Channel.CreateUnbounded<LogEntry>(new UnboundedChannelOptions { SingleReader = true });

    public ChannelReader<LogEntry> Reader => _channel.Reader;

    public void Add(LogEntry entry)
    {
        lock (_history)
        {
            _history.Add(entry);
            if (_history.Count > MaxHistory)
                _history.RemoveAt(0);
        }
        _channel.Writer.TryWrite(entry);
    }

    public IReadOnlyList<LogEntry> GetHistory(int limit = 200)
    {
        lock (_history)
        {
            var skip = Math.Max(0, _history.Count - limit);
            return _history.Skip(skip).ToList();
        }
    }
}

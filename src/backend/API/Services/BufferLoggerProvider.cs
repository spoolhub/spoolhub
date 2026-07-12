namespace API.Services;

public sealed class BufferLoggerProvider(LogBuffer buffer) : ILoggerProvider
{
    public ILogger CreateLogger(string categoryName) => new BufferLogger(buffer, categoryName);
    public void Dispose() { }
}

file sealed class BufferLogger(LogBuffer buffer, string category) : ILogger
{
    // Short name: "Application.Services.MqttMessageProcessor" → "MqttMessageProcessor"
    private static string Short(string cat) =>
        cat.LastIndexOf('.') is >= 0 and var i ? cat[(i + 1)..] : cat;

    public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;

    public bool IsEnabled(LogLevel logLevel)
    {
        if (logLevel < LogLevel.Information) return false;
        // suppress noisy infrastructure categories below Warning
        if (logLevel < LogLevel.Warning)
        {
            if (category.StartsWith("Microsoft.AspNetCore.Hosting",           StringComparison.Ordinal)) return false;
            if (category.StartsWith("Microsoft.AspNetCore.Routing",           StringComparison.Ordinal)) return false;
            if (category.StartsWith("Microsoft.AspNetCore.StaticFiles",       StringComparison.Ordinal)) return false;
            if (category.StartsWith("Microsoft.EntityFrameworkCore.Database", StringComparison.Ordinal)) return false;
            if (category.StartsWith("Microsoft.EntityFrameworkCore.Model",    StringComparison.Ordinal)) return false;
        }
        return true;
    }

    public void Log<TState>(
        LogLevel logLevel, EventId eventId, TState state,
        Exception? exception, Func<TState, Exception?, string> formatter)
    {
        if (!IsEnabled(logLevel)) return;

        var message = formatter(state, exception);
        if (string.IsNullOrEmpty(message)) return;

        if (exception != null)
            message = $"{message} — {exception.GetType().Name}: {exception.Message}";

        buffer.Add(new LogEntry(
            Timestamp: DateTime.UtcNow.ToString("HH:mm:ss.fff"),
            Level:     logLevel.ToString().ToUpperInvariant(),
            Category:  Short(category),
            Message:   message));
    }
}

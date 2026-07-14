using Serilog.Core;
using Serilog.Events;
using Serilog.Formatting.Display;

namespace API.Services;

/// <summary>
/// Writes rolling daily log files with a handle we own and can close instantly
/// for safe downloads of the active log file.
/// </summary>
public sealed class FileLogSink : ILogEventSink, IDisposable
{
    private static readonly TimeSpan AutoResumeAfter = TimeSpan.FromMinutes(5);

    private readonly object _sync = new();
    private readonly string _logsDirectory;
    private readonly MessageTemplateTextFormatter _formatter;
    private StreamWriter? _writer;
    private string? _openPath;
    private int _pauseCount;
    private Timer? _autoResumeTimer;

    public FileLogSink(string logsPath, string outputTemplate)
    {
        _logsDirectory = Path.GetDirectoryName(logsPath) ?? Path.Combine(AppContext.BaseDirectory, "logs");
        Directory.CreateDirectory(_logsDirectory);
        _formatter = new MessageTemplateTextFormatter(outputTemplate);
        OpenWriter();
    }

    public void BeginViewing()
    {
        lock (_sync)
        {
            _pauseCount++;
            if (_pauseCount == 1)
                CloseWriter();

            _autoResumeTimer ??= new Timer(AutoResumeCallback, null, Timeout.Infinite, Timeout.Infinite);
            _autoResumeTimer.Change(AutoResumeAfter, Timeout.InfiniteTimeSpan);
        }
    }

    public void EndViewing()
    {
        lock (_sync)
        {
            if (_pauseCount == 0) return;
            _pauseCount--;
            if (_pauseCount == 0)
            {
                _autoResumeTimer?.Change(Timeout.Infinite, Timeout.Infinite);
                OpenWriter();
            }
        }
    }

    public void ExtendViewing()
    {
        lock (_sync)
        {
            if (_pauseCount == 0) return;
            _autoResumeTimer?.Change(AutoResumeAfter, Timeout.InfiniteTimeSpan);
        }
    }

    public void Emit(LogEvent logEvent)
    {
        if (!Monitor.TryEnter(_sync))
            return;

        try
        {
            if (_pauseCount > 0 || _writer is null) return;
            try
            {
                EnsureCurrentFile();
                _formatter.Format(logEvent, _writer);
                _writer.WriteLine();
            }
            catch (Exception)
            {
                // Drop file log entries rather than crash the host.
            }
        }
        finally
        {
            Monitor.Exit(_sync);
        }
    }

    /// <summary>
    /// Reads a log file for download. Only closes the active log writer when the
    /// requested file is today's rolling log; older files are read without touching the sink.
    /// </summary>
    public byte[] ReadLogFileForDownload(string sourcePath)
    {
        var isActive = string.Equals(sourcePath, CurrentLogPath(), StringComparison.OrdinalIgnoreCase);

        if (isActive)
        {
            lock (_sync)
            {
                CloseWriter();
            }

            // Brief pause so Windows releases the file handle after we close our writer.
            Thread.Sleep(100);
        }

        try
        {
            return ReadBytesWithRetry(sourcePath);
        }
        finally
        {
            if (isActive)
            {
                lock (_sync)
                {
                    if (_pauseCount == 0)
                        OpenWriter();
                }
            }
        }
    }

    private static byte[] ReadBytesWithRetry(string sourcePath)
    {
        for (var attempt = 0; attempt < 8; attempt++)
        {
            try
            {
                using var stream = new FileStream(
                    sourcePath,
                    FileMode.Open,
                    FileAccess.Read,
                    FileShare.ReadWrite | FileShare.Delete,
                    bufferSize: 65536,
                    FileOptions.SequentialScan);
                using var buffer = new MemoryStream((int)Math.Min(stream.Length, int.MaxValue));
                stream.CopyTo(buffer);
                return buffer.ToArray();
            }
            catch (IOException) when (attempt < 7)
            {
                Thread.Sleep(50 * (attempt + 1));
            }
        }

        throw new IOException($"Could not read log file '{Path.GetFileName(sourcePath)}'.");
    }

    public static bool IsCurrentLogFile(string filename) =>
        filename.Equals($"spoolhub{DateTime.UtcNow:yyyyMMdd}.txt", StringComparison.OrdinalIgnoreCase);

    private void AutoResumeCallback(object? _)
    {
        lock (_sync)
        {
            if (_pauseCount == 0) return;
            _pauseCount = 0;
            OpenWriter();
        }
    }

    private void EnsureCurrentFile()
    {
        var path = CurrentLogPath();
        if (path == _openPath) return;
        CloseWriter();
        OpenWriter();
    }

    private string CurrentLogPath() =>
        Path.Combine(_logsDirectory, $"spoolhub{DateTime.UtcNow:yyyyMMdd}.txt");

    private void OpenWriter()
    {
        if (_writer is not null) return;

        var path = CurrentLogPath();
        var stream = new FileStream(
            path,
            FileMode.Append,
            FileAccess.Write,
            FileShare.ReadWrite | FileShare.Delete,
            bufferSize: 4096,
            FileOptions.SequentialScan);

        _writer = new StreamWriter(stream) { AutoFlush = true };
        _openPath = path;
    }

    private void CloseWriter()
    {
        if (_writer is null) return;
        try
        {
            _writer.Flush();
            _writer.Dispose();
        }
        catch (Exception)
        {
            // Ignore flush/dispose errors on the active log file.
        }
        _writer = null;
        _openPath = null;
    }

    public void Dispose()
    {
        _autoResumeTimer?.Dispose();
        lock (_sync)
        {
            CloseWriter();
        }
    }
}

using MediaBrowser.Controller.Library;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MusicLook.Inbox;

/// <summary>Background service that periodically sorts the inbox folder into the music library folder.</summary>
public sealed class InboxService : BackgroundService
{
    private static readonly TimeSpan MaxScanDelay = TimeSpan.FromMinutes(10);

    private readonly ILogger<InboxService> _logger;
    private readonly ILibraryManager _library;
    private DateTime? _pendingScanSince;

    /// <summary>Initializes a new instance of the <see cref="InboxService"/> class.</summary>
    public InboxService(ILogger<InboxService> logger, ILibraryManager library)
    {
        _logger = logger;
        _library = library;
    }

    /// <inheritdoc />
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await Task.Delay(TimeSpan.FromSeconds(20), stoppingToken).ConfigureAwait(false);
            while (!stoppingToken.IsCancellationRequested)
            {
                var interval = RunOnce();
                await Task.Delay(interval, stoppingToken).ConfigureAwait(false);
            }
        }
        catch (OperationCanceledException)
        {
            // shutting down
        }
    }

    private TimeSpan RunOnce()
    {
        var cfg = Plugin.Instance?.Configuration;
        var interval = TimeSpan.FromSeconds(Math.Clamp(cfg?.InboxIntervalSeconds ?? 60, 15, 3600));
        if (cfg is null || !cfg.InboxEnabled)
        {
            return interval;
        }

        var inbox = cfg.InboxPath?.Trim() ?? string.Empty;
        var library = cfg.LibraryPath?.Trim() ?? string.Empty;
        if (!Path.IsPathRooted(inbox) || !Path.IsPathRooted(library) || !Directory.Exists(inbox) || !Directory.Exists(library))
        {
            _logger.LogWarning("Music Look: Eingangs- oder Bibliotheksordner fehlt oder ist kein absoluter Pfad.");
            return interval;
        }

        try
        {
            var minAge = TimeSpan.FromSeconds(Math.Clamp(cfg.InboxMinAgeSeconds, 5, 3600));
            var r = InboxSorter.Run(inbox, library, minAge, false, _logger);
            if (r.Moved + r.Duplicates > 0)
            {
                _logger.LogInformation("Music Look: {Moved} einsortiert, {Dups} Duplikate, {Skipped} uebersprungen", r.Moved, r.Duplicates, r.Skipped);
            }

            // Network shares often do not report file changes, so ask Jellyfin to scan. The scan starts once the inbox
            // is quiet (a run without moves) or after at most ten minutes, so a long upload does not trigger a scan every minute.
            if (r.Moved > 0)
            {
                _pendingScanSince ??= DateTime.UtcNow;
            }

            if (_pendingScanSince is not null && (r.Moved == 0 || DateTime.UtcNow - _pendingScanSince.Value > MaxScanDelay))
            {
                _pendingScanSince = null;
                _library.QueueLibraryScan();
                _logger.LogInformation("Music Look: Bibliotheks-Scan angefordert");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Music Look: Sortieren fehlgeschlagen");
        }

        return interval;
    }
}

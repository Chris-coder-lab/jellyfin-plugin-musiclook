using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.MusicLook.Configuration;

/// <summary>Server-side settings of the plugin.</summary>
public class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>Gets or sets the accent colour (hex, e.g. #1ed760).</summary>
    public string AccentColor { get; set; } = "#1ed760";

    /// <summary>Gets or sets a value indicating whether Jam sessions are enabled.</summary>
    public bool JamEnabled { get; set; } = true;

    /// <summary>Gets or sets the maximum number of members per Jam.</summary>
    public int JamMaxMembers { get; set; } = 8;

    /// <summary>Gets or sets a value indicating whether the inbox sorter is active.</summary>
    public bool InboxEnabled { get; set; }

    /// <summary>Gets or sets the inbox folder (absolute path) where all MP3 files are dropped.</summary>
    public string InboxPath { get; set; } = string.Empty;

    /// <summary>Gets or sets the music library folder (absolute path) that Jellyfin scans.</summary>
    public string LibraryPath { get; set; } = string.Empty;

    /// <summary>Gets or sets the seconds between two sort runs (15-3600).</summary>
    public int InboxIntervalSeconds { get; set; } = 60;

    /// <summary>Gets or sets the minimum file age in seconds before a file is moved (5-3600).</summary>
    public int InboxMinAgeSeconds { get; set; } = 30;
}

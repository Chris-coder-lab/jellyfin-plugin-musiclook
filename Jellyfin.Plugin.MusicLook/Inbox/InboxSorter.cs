using System.Globalization;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MusicLook.Inbox;

/// <summary>Counts of one sort run.</summary>
public sealed record SortResult(int Moved, int Duplicates, int Skipped);

/// <summary>
/// Sorts MP3 files from an inbox folder into &lt;library&gt;/&lt;artist&gt;/&lt;album&gt;/ using ID3 tags, then the file name.
/// Port of tools/sort_inbox.py (tested there). Never overwrites, never deletes; identical duplicates go to _Duplikate.
/// </summary>
public static class InboxSorter
{
    /// <summary>Folder name for files without any artist information.</summary>
    public const string UnknownArtist = "Unbekannter Künstler";

    /// <summary>Folder (inside the inbox) that receives identical duplicates.</summary>
    public const string DuplicatesDir = "_Duplikate";

    private static readonly string[] SidecarExtensions = { ".lrc", ".elrc", ".txt" };

    private static readonly Regex InvalidChars = new(@"[<>:""/\\|?*\x00-\x1f]", RegexOptions.Compiled);
    private static readonly Regex Spaces = new(@"\s+", RegexOptions.Compiled);
    private static readonly Regex FileTrack = new(@"^([0-9]{1,3})\s*[-._)]\s*(?=\D)", RegexOptions.Compiled);
    private static readonly Regex FileSplit = new(@"\s+[-–—]\s+", RegexOptions.Compiled);
    private static readonly Regex Digits = new(@"^\s*([0-9]{1,4})", RegexOptions.Compiled);

    private static readonly HashSet<string> Reserved = new(StringComparer.Ordinal)
    {
        "CON", "PRN", "AUX", "NUL",
        "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
        "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
    };

    /// <summary>Makes a single path segment safe (no separators, no dots at the ends, no reserved names).</summary>
    public static string Sanitize(string? name, string fallback)
    {
        var s = InvalidChars.Replace(name ?? string.Empty, "_");
        s = Spaces.Replace(s, " ").Trim().Trim('.').Trim();
        if (s.Length == 0)
        {
            return fallback;
        }

        if (Reserved.Contains(s.Split('.')[0].ToUpperInvariant()))
        {
            s = "_" + s;
        }

        if (s.Length > 100)
        {
            s = char.IsHighSurrogate(s[99]) ? s[..99] : s[..100];
        }

        s = s.TrimEnd('.', ' ');
        return s.Length == 0 ? fallback : s;
    }

    /// <summary>Splits "NN - Artist - Title" style names.</summary>
    public static (string? Artist, string Title, int? Track) ParseFilename(string stem)
    {
        var s = stem.Trim();
        int? track = null;
        var m = FileTrack.Match(s);
        if (m.Success)
        {
            track = int.Parse(m.Groups[1].Value, CultureInfo.InvariantCulture);
            s = s[m.Length..];
        }

        var parts = FileSplit.Split(s, 2);
        if (parts.Length == 2 && parts[0].Trim().Length > 0 && parts[1].Trim().Length > 0)
        {
            return (parts[0].Trim(), parts[1].Trim(), track);
        }

        return (null, s.Trim(), track);
    }

    /// <summary>Plans the target (artist folder, album folder, file name) for one file.</summary>
    public static (string ArtistDir, string AlbumDir, string FileName) Plan(string path)
    {
        var tags = Id3Reader.Read(path);
        var stem = Path.GetFileNameWithoutExtension(path);
        var (fArtist, fTitle, fTrack) = ParseFilename(stem);

        var title = tags.Title ?? (fTitle.Length > 0 ? fTitle : stem);
        var artist = FirstName(tags.AlbumArtist ?? tags.Artist ?? fArtist ?? string.Empty);
        if (artist.Length == 0)
        {
            artist = UnknownArtist;
        }

        var album = (tags.Album ?? string.Empty).Trim();
        var track = Positive(ParseNumber(tags.Track)) ?? Positive(fTrack);
        var disc = Positive(ParseNumber(tags.Disc));

        var artistDir = Sanitize(artist, UnknownArtist);
        var safeTitle = Sanitize(title, "Unbekannter Titel");
        if (album.Length > 0)
        {
            var prefix = string.Empty;
            if (track is not null)
            {
                prefix = (disc is > 1 ? disc.Value.ToString(CultureInfo.InvariantCulture) + "-" : string.Empty)
                         + track.Value.ToString("00", CultureInfo.InvariantCulture) + " - ";
            }

            return (artistDir, Sanitize(album, "Unbekanntes Album"), prefix + safeTitle + ".mp3");
        }

        return (artistDir, Sanitize(title + " - Single", "Single"), safeTitle + ".mp3");
    }

    /// <summary>Runs one sort pass.</summary>
    public static SortResult Run(string inbox, string library, TimeSpan minAge, bool dryRun, ILogger? log)
    {
        inbox = Path.GetFullPath(inbox);
        library = Path.GetFullPath(library);
        if (Inside(library, inbox) || Inside(inbox, library))
        {
            throw new ArgumentException("Eingang und Bibliothek duerfen sich nicht ueberlappen.");
        }

        int moved = 0, dups = 0, skipped = 0;
        var now = DateTime.UtcNow;
        foreach (var src in EnumerateMp3(inbox))
        {
            try
            {
                if (now - File.GetLastWriteTimeUtc(src) < minAge)
                {
                    skipped++;
                    continue;
                }

                var (artistDir, albumDir, fileName) = Plan(src);
                var aDir = FindDir(library, artistDir);
                var bDir = FindDir(aDir, albumDir);
                var target = Path.Combine(bDir, fileName);
                if (!Inside(target, library) || IsLink(aDir) || IsLink(bDir))
                {
                    log?.LogWarning("Music Look: uebersprungen (Zielpfad unsicher): {Src}", src);
                    skipped++;
                    continue;
                }

                string dest;
                if (File.Exists(target) && new FileInfo(target).Length == new FileInfo(src).Length && SameContent(target, src))
                {
                    dest = UniquePath(Path.Combine(inbox, DuplicatesDir, Path.GetFileName(src)));
                    dups++;
                    log?.LogInformation("Music Look: Duplikat {Src} -> {Dest}", src, dest);
                }
                else
                {
                    dest = UniquePath(target);
                    moved++;
                    log?.LogInformation("Music Look: {Src} -> {Dest}", src, dest);
                }

                if (!dryRun)
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(dest)!);
                    File.Move(src, dest);
                    MoveSidecars(src, dest, log);
                }
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                log?.LogWarning(ex, "Music Look: Datei uebersprungen: {Src}", src);
                skipped++;
            }
        }

        if (!dryRun)
        {
            RemoveEmptyDirs(inbox);
        }

        return new SortResult(moved, dups, skipped);
    }

    /// <summary>
    /// Moves lyric files with exactly the same base name as the MP3 (e.g. "Song.lrc", "Song.txt") along with it and renames
    /// them to the new base name, so Jellyfin finds the lyrics next to the sorted file. Never overwrites.
    /// </summary>
    private static void MoveSidecars(string src, string dest, ILogger? log)
    {
        try
        {
            var srcDir = Path.GetDirectoryName(src)!;
            var srcStem = Path.GetFileNameWithoutExtension(src);
            foreach (var side in Directory.EnumerateFiles(srcDir).ToList())
            {
                if (!string.Equals(Path.GetFileNameWithoutExtension(side), srcStem, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                var ext = Path.GetExtension(side).ToLowerInvariant();
                if (Array.IndexOf(SidecarExtensions, ext) < 0 || IsLink(side))
                {
                    continue;
                }

                var target = Path.ChangeExtension(dest, ext);
                if (File.Exists(target))
                {
                    continue;
                }

                File.Move(side, target);
                log?.LogInformation("Music Look: Songtext {Src} -> {Dest}", side, target);
            }
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            log?.LogWarning(ex, "Music Look: Songtext-Datei konnte nicht verschoben werden: {Src}", src);
        }
    }

    private static int? ParseNumber(string? text)
    {
        var m = Digits.Match(text ?? string.Empty);
        return m.Success ? int.Parse(m.Groups[1].Value, CultureInfo.InvariantCulture) : null;
    }

    private static int? Positive(int? v) => v is > 0 ? v : null;

    private static string FirstName(string text) => text.Split(';', '\0')[0].Trim();

    private static IEnumerable<string> EnumerateMp3(string root)
    {
        var stack = new Stack<string>();
        stack.Push(root);
        while (stack.Count > 0)
        {
            var dir = stack.Pop();
            IEnumerable<string> files;
            IEnumerable<string> subs;
            try
            {
                files = Directory.EnumerateFiles(dir, "*.mp3").OrderBy(f => f, StringComparer.Ordinal).ToList();
                subs = Directory.EnumerateDirectories(dir).ToList();
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                continue;
            }

            foreach (var f in files)
            {
                if (!IsLink(f))
                {
                    yield return f;
                }
            }

            foreach (var d in subs)
            {
                if (!string.Equals(Path.GetFileName(d), DuplicatesDir, StringComparison.Ordinal) && !IsLink(d))
                {
                    stack.Push(d);
                }
            }
        }
    }

    private static string FindDir(string parent, string name)
    {
        try
        {
            foreach (var d in Directory.EnumerateDirectories(parent))
            {
                if (string.Equals(Path.GetFileName(d), name, StringComparison.OrdinalIgnoreCase) && !IsLink(d))
                {
                    return d;
                }
            }
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            // folder does not exist yet
        }

        return Path.Combine(parent, name);
    }

    private static bool IsLink(string path)
    {
        try
        {
            return File.Exists(path) || Directory.Exists(path)
                ? (File.GetAttributes(path) & FileAttributes.ReparsePoint) != 0
                : false;
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            return true;
        }
    }

    private static bool Inside(string child, string parent)
    {
        var c = Path.GetFullPath(child).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        var p = Path.GetFullPath(parent).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        return c.StartsWith(p, OperatingSystem.IsWindows() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal);
    }

    private static bool SameContent(string a, string b)
    {
        using var fa = File.OpenRead(a);
        using var fb = File.OpenRead(b);
        return SHA1.HashData(fa).AsSpan().SequenceEqual(SHA1.HashData(fb));
    }

    private static string UniquePath(string path)
    {
        if (!File.Exists(path))
        {
            return path;
        }

        var dir = Path.GetDirectoryName(path)!;
        var stem = Path.GetFileNameWithoutExtension(path);
        var ext = Path.GetExtension(path);
        for (var n = 2; ; n++)
        {
            var candidate = Path.Combine(dir, $"{stem} ({n}){ext}");
            if (!File.Exists(candidate))
            {
                return candidate;
            }
        }
    }

    private static void RemoveEmptyDirs(string inbox)
    {
        var dups = Path.Combine(inbox, DuplicatesDir);
        IEnumerable<string> dirs;
        try
        {
            dirs = Directory.GetDirectories(inbox, "*", SearchOption.AllDirectories).OrderByDescending(d => d.Length).ToList();
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
        {
            return;
        }

        foreach (var d in dirs)
        {
            if (Inside(d, dups) || IsLink(d))
            {
                continue;
            }

            try
            {
                if (!Directory.EnumerateFileSystemEntries(d).Any())
                {
                    Directory.Delete(d);
                }
            }
            catch (Exception ex) when (ex is IOException or UnauthorizedAccessException)
            {
                // keep it
            }
        }
    }
}

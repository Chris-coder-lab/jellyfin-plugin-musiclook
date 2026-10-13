using System.Buffers.Binary;
using System.Text;

namespace Jellyfin.Plugin.MusicLook.Inbox;

/// <summary>Relevant ID3 fields of a file.</summary>
public sealed record Id3Tags(string? Title, string? Artist, string? AlbumArtist, string? Album, string? Track, string? Disc);

/// <summary>Minimal, dependency-free ID3v2.2/2.3/2.4 and ID3v1 reader (only text frames, never reads whole files).</summary>
public static class Id3Reader
{
    private const int MaxFrame = 65536;

    private static readonly Dictionary<string, string> FrameKeys = new()
    {
        ["TIT2"] = "title", ["TPE1"] = "artist", ["TPE2"] = "album_artist", ["TALB"] = "album",
        ["TRCK"] = "track", ["TPOS"] = "disc",
        ["TT2"] = "title", ["TP1"] = "artist", ["TP2"] = "album_artist", ["TAL"] = "album",
        ["TRK"] = "track", ["TPA"] = "disc",
    };

    /// <summary>Reads the tags; returns empty tags when the file has none or cannot be read.</summary>
    public static Id3Tags Read(string path)
    {
        var tags = new Dictionary<string, string>();
        try
        {
            using var fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
            ReadV2(fs, tags);
            ReadV1(fs, tags);
        }
        catch (IOException)
        {
            // unreadable: fall back to the file name
        }
        catch (UnauthorizedAccessException)
        {
        }

        string? Get(string k) => tags.TryGetValue(k, out var v) && v.Length > 0 ? v : null;
        return new Id3Tags(Get("title"), Get("artist"), Get("album_artist"), Get("album"), Get("track"), Get("disc"));
    }

    private static long Synchsafe(ReadOnlySpan<byte> b) => ((long)b[0] << 21) | ((long)b[1] << 14) | ((long)b[2] << 7) | b[3];

    private static bool IsFrameId(string id)
    {
        if (id.Length < 3)
        {
            return false;
        }

        foreach (var c in id)
        {
            if (!((c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9')))
            {
                return false;
            }
        }

        return true;
    }

    private static void ReadV2(FileStream fs, Dictionary<string, string> tags)
    {
        fs.Seek(0, SeekOrigin.Begin);
        var head = new byte[10];
        if (fs.ReadAtLeast(head, 10, false) < 10 || head[0] != 'I' || head[1] != 'D' || head[2] != '3')
        {
            return;
        }

        int ver = head[3];
        if (ver < 2 || ver > 4 || ((head[6] | head[7] | head[8] | head[9]) & 0x80) != 0)
        {
            return;
        }

        int flags = head[5];
        long end = 10 + Synchsafe(head.AsSpan(6, 4));
        long pos = 10;
        if (ver >= 3 && (flags & 0x40) != 0)
        {
            var ext = new byte[4];
            fs.Seek(10, SeekOrigin.Begin);
            if (fs.ReadAtLeast(ext, 4, false) < 4)
            {
                return;
            }

            pos = 10 + (ver == 4 ? Synchsafe(ext) : (long)BinaryPrimitives.ReadUInt32BigEndian(ext) + 4);
        }

        var hl = ver == 2 ? 6 : 10;
        var hdr = new byte[hl];
        while (pos + hl <= end)
        {
            fs.Seek(pos, SeekOrigin.Begin);
            if (fs.ReadAtLeast(hdr, hl, false) < hl)
            {
                break;
            }

            string id;
            long size;
            var fflags = 0;
            if (ver == 2)
            {
                id = Encoding.ASCII.GetString(hdr, 0, 3);
                size = (hdr[3] << 16) | (hdr[4] << 8) | hdr[5];
            }
            else
            {
                id = Encoding.ASCII.GetString(hdr, 0, 4);
                size = ver == 4 ? Synchsafe(hdr.AsSpan(4, 4)) : BinaryPrimitives.ReadUInt32BigEndian(hdr.AsSpan(4, 4));
                fflags = (hdr[8] << 8) | hdr[9];
            }

            if (!IsFrameId(id) || size <= 0 || pos + hl + size > end)
            {
                break;
            }

            var unusable = (ver == 4 && (fflags & 0x000C) != 0) || (ver == 3 && (fflags & 0x00C0) != 0);
            if (FrameKeys.TryGetValue(id, out var key) && !unusable && !tags.ContainsKey(key) && size <= MaxFrame)
            {
                var payload = new byte[size];
                if (fs.ReadAtLeast(payload, (int)size, false) < size)
                {
                    break;
                }

                if (ver == 4 && (fflags & 0x0001) != 0 && payload.Length >= 4)
                {
                    payload = payload[4..];
                }

                var text = DecodeText(payload);
                if (text.Length > 0)
                {
                    tags[key] = text;
                }
            }

            pos += hl + size;
        }
    }

    private static void ReadV1(FileStream fs, Dictionary<string, string> tags)
    {
        if (fs.Length < 128)
        {
            return;
        }

        var b = new byte[128];
        fs.Seek(-128, SeekOrigin.End);
        if (fs.ReadAtLeast(b, 128, false) < 128 || b[0] != 'T' || b[1] != 'A' || b[2] != 'G')
        {
            return;
        }

        string Field(int offset)
        {
            var s = Encoding.Latin1.GetString(b, offset, 30);
            var i = s.IndexOf('\0');
            return (i >= 0 ? s[..i] : s).Trim();
        }

        void Set(string key, string value)
        {
            if (value.Length > 0 && !tags.ContainsKey(key))
            {
                tags[key] = value;
            }
        }

        Set("title", Field(3));
        Set("artist", Field(33));
        Set("album", Field(63));
        if (b[125] == 0 && b[126] != 0)
        {
            Set("track", b[126].ToString(System.Globalization.CultureInfo.InvariantCulture));
        }
    }

    private static string DecodeText(byte[] data)
    {
        if (data.Length == 0)
        {
            return string.Empty;
        }

        var raw = data.AsSpan(1);
        string s;
        switch (data[0])
        {
            case 1:
                if (raw.Length >= 2 && raw[0] == 0xFE && raw[1] == 0xFF)
                {
                    s = Encoding.BigEndianUnicode.GetString(raw[2..]);
                }
                else if (raw.Length >= 2 && raw[0] == 0xFF && raw[1] == 0xFE)
                {
                    s = Encoding.Unicode.GetString(raw[2..]);
                }
                else
                {
                    s = Encoding.Unicode.GetString(raw);
                }

                break;
            case 2:
                s = Encoding.BigEndianUnicode.GetString(raw);
                break;
            case 3:
                s = Encoding.UTF8.GetString(raw);
                break;
            default:
                s = Encoding.Latin1.GetString(raw);
                break;
        }

        var i = s.IndexOf('\0');
        return (i >= 0 ? s[..i] : s).Trim();
    }
}

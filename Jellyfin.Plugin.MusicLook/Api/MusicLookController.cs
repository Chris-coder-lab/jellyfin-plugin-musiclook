using System.IO.Compression;
using System.Reflection;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Jellyfin.Plugin.MusicLook.Jam;
using MediaBrowser.Controller.Entities.Audio;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Playlists;
using MediaBrowser.Controller.Providers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.MusicLook.Api;

/// <summary>Serves the client files and the Jam / user-list / playlist endpoints.</summary>
[ApiController]
[Route("MusicLook")]
public class MusicLookController : ControllerBase
{
    private const int MaxCoverBytes = 2_500_000;
    private const int MaxDescriptionLength = 500;
    private const int MaxZipTracks = 2000;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly JamService _jam;
    private readonly IUserManager _users;
    private readonly ILibraryManager _library;
    private readonly IPlaylistManager _playlists;
    private readonly IProviderManager _providers;

    /// <summary>Initializes a new instance of the <see cref="MusicLookController"/> class.</summary>
    public MusicLookController(
        JamService jam,
        IUserManager users,
        ILibraryManager library,
        IPlaylistManager playlists,
        IProviderManager providers)
    {
        _jam = jam;
        _users = users;
        _library = library;
        _playlists = playlists;
        _providers = providers;
    }

    /// <summary>Gets the client script.</summary>
    [HttpGet("client.js")]
    [AllowAnonymous]
    [ResponseCache(Duration = 300)]
    public IActionResult ClientJs() => Embedded("Web.musiclook.js", "application/javascript");

    /// <summary>Gets the script of the Spotify-style app view.</summary>
    [HttpGet("app.js")]
    [AllowAnonymous]
    [ResponseCache(Duration = 300)]
    public IActionResult AppJs() => Embedded("Web.musiclookapp.js", "application/javascript");

    /// <summary>Gets the audio worklet of the equalizer (noise reduction and de-esser run in the listener's browser).</summary>
    [HttpGet("eqdsp.js")]
    [AllowAnonymous]
    [ResponseCache(Duration = 300)]
    public IActionResult EqDspJs() => Embedded("Web.eqdsp.js", "application/javascript");

    /// <summary>Gets the client stylesheet.</summary>
    [HttpGet("client.css")]
    [AllowAnonymous]
    [ResponseCache(Duration = 300)]
    public IActionResult ClientCss() => Embedded("Web.musiclook.css", "text/css");

    /// <summary>Gets the Figtree font (SIL Open Font License), served from the plugin so no external request is needed.</summary>
    [HttpGet("figtree.woff2")]
    [AllowAnonymous]
    [ResponseCache(Duration = 86400)]
    public IActionResult Font() => Embedded("Web.figtree.woff2", "font/woff2");

    /// <summary>Gets the public client configuration.</summary>
    [HttpGet("Config")]
    [Authorize]
    public IActionResult Config()
    {
        var c = Plugin.Instance?.Configuration;
        return JsonResult(new
        {
            accentColor = c?.AccentColor ?? "#1ed760",
            jamEnabled = c?.JamEnabled ?? true,
            spotifyHome = c?.SpotifyHome ?? true,
            podcastKeywords = Keywords(c?.PodcastKeywords),
            audiobookKeywords = Keywords(c?.AudiobookKeywords),
            shareBaseUrl = (c?.ShareBaseUrl ?? string.Empty).Trim()
        });
    }

    private static string[] Keywords(string? raw) =>
        (raw ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(k => k.Length <= 40)
            .Take(20)
            .Select(k => k.ToLowerInvariant())
            .Select(k => k == "hörbüch" ? "hörbücher" : k)   // frueherer Standardwert, der "Hörbücher" nur ueber einen Umweg traf
            .Distinct()
            .ToArray();

    /// <summary>Lists the other users (id and name) for playlist sharing.</summary>
    [HttpGet("Users")]
    [Authorize]
    public IActionResult Users()
    {
        var me = CurrentUserId();
        if (me is null)
        {
            return Unauthorized();
        }

        var list = ListUsers()
            .Where(u => u.Id != me.Value)
            .OrderBy(u => u.Name, StringComparer.CurrentCultureIgnoreCase)
            .Select(u => new { id = u.Id, name = u.Name })
            .ToList();
        return JsonResult(list);
    }

    // Older Jellyfin versions expose a Users property, newer ones GetUsers(); reflection keeps the plugin
    // independent of that difference (and of the namespace of the User entity). Hidden and disabled accounts
    // are left out, exactly like Jellyfin's own public user list does.
    private IEnumerable<(Guid Id, string Name)> ListUsers()
    {
        var type = _users.GetType();
        var source = type.GetMethod("GetUsers", Type.EmptyTypes)?.Invoke(_users, null)
                     ?? type.GetProperty("Users")?.GetValue(_users);
        if (source is not System.Collections.IEnumerable items)
        {
            yield break;
        }

        foreach (var item in items)
        {
            if (item is null)
            {
                continue;
            }

            var itemType = item.GetType();
            if (itemType.GetProperty("Id")?.GetValue(item) is Guid id
                && itemType.GetProperty("Username")?.GetValue(item) is string name
                && !HasPermission(item, "IsHidden")
                && !HasPermission(item, "IsDisabled"))
            {
                yield return (id, name);
            }
        }
    }

    // User.Permissions is a collection of entries with a Kind (enum) and a Value (bool).
    private static bool HasPermission(object user, string kind)
    {
        if (user.GetType().GetProperty("Permissions")?.GetValue(user) is not System.Collections.IEnumerable permissions)
        {
            return false;
        }

        foreach (var permission in permissions)
        {
            if (permission is null)
            {
                continue;
            }

            var permissionType = permission.GetType();
            if (string.Equals(permissionType.GetProperty("Kind")?.GetValue(permission)?.ToString(), kind, StringComparison.Ordinal)
                && permissionType.GetProperty("Value")?.GetValue(permission) is true)
            {
                return true;
            }
        }

        return false;
    }

    // ---------- Playlists ----------

    /// <summary>Lists the audio playlists the current user may see, with owner and permissions.</summary>
    [HttpGet("Playlists")]
    [Authorize]
    public IActionResult PlaylistList()
    {
        var me = CurrentUserId();
        if (me is null)
        {
            return Unauthorized();
        }

        var covers = CoverMarkers.Snapshot();
        var names = new Dictionary<Guid, string>();
        var list = _playlists.GetPlaylists(me.Value)
            .Where(p => p.MediaType == Jellyfin.Data.Enums.MediaType.Audio)
            .Select(p => ToInfo(p, me.Value, covers, names))
            .ToList();
        return JsonResult(list);
    }

    /// <summary>Gets owner, permissions and visibility of one playlist.</summary>
    [HttpGet("Playlist/{id}")]
    [Authorize]
    public IActionResult PlaylistGet([FromRoute] Guid id)
    {
        var me = CurrentUserId();
        if (me is null)
        {
            return Unauthorized();
        }

        var playlist = _playlists.GetPlaylistForUser(id, me.Value);
        if (playlist is null)
        {
            return NotFound();
        }

        return JsonResult(ToInfo(playlist, me.Value, CoverMarkers.Snapshot(), new Dictionary<Guid, string>()));
    }

    /// <summary>Sets the description of a playlist (owner or editor).</summary>
    [HttpPost("Playlist/{id}/Details")]
    [Authorize]
    public async Task<IActionResult> PlaylistDetails([FromRoute] Guid id, [FromBody] PlaylistDetailsRequest body)
    {
        var error = EditCheck(id, out var playlist);
        if (error is not null || playlist is null)
        {
            return error ?? NotFound();
        }

        var text = (body.Description ?? string.Empty).Trim();
        if (text.Length > MaxDescriptionLength)
        {
            text = text.Substring(0, MaxDescriptionLength);
        }

        playlist.Overview = text.Length == 0 ? null : text;
        await playlist.UpdateToRepositoryAsync(ItemUpdateType.MetadataEdit, CancellationToken.None).ConfigureAwait(false);
        return NoContent();
    }

    /// <summary>
    /// Sets the cover image of a playlist (owner or editor). The body is the JPEG file, base64 encoded like in Jellyfin's own
    /// image API. Jellyfin's own endpoint is limited to administrators.
    /// </summary>
    [HttpPost("Playlist/{id}/Cover")]
    [Authorize]
    [RequestSizeLimit(MaxCoverBytes * 4 / 3 + 4096)]
    public async Task<IActionResult> PlaylistCoverSet([FromRoute] Guid id)
    {
        var error = EditCheck(id, out var playlist);
        if (error is not null || playlist is null)
        {
            return error ?? NotFound();
        }

        string text;
        using (var reader = new StreamReader(Request.Body, Encoding.ASCII))
        {
            text = await reader.ReadToEndAsync(HttpContext.RequestAborted).ConfigureAwait(false);
        }

        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(text.Trim());
        }
        catch (FormatException)
        {
            return BadRequest(new { error = "base64_required" });
        }

        if (bytes.Length < 16 || bytes.Length > MaxCoverBytes || bytes[0] != 0xFF || bytes[1] != 0xD8 || bytes[2] != 0xFF)
        {
            return BadRequest(new { error = "jpeg_required" });
        }

        using var image = new MemoryStream(bytes, false);
        await _providers.SaveImage(playlist, image, "image/jpeg", MediaBrowser.Model.Entities.ImageType.Primary, null, CancellationToken.None).ConfigureAwait(false);
        await playlist.UpdateToRepositoryAsync(ItemUpdateType.ImageUpdate, CancellationToken.None).ConfigureAwait(false);
        CoverMarkers.Set(id, true);
        return NoContent();
    }

    /// <summary>Removes the custom cover so the automatic cover is used again.</summary>
    [HttpDelete("Playlist/{id}/Cover")]
    [Authorize]
    public async Task<IActionResult> PlaylistCoverDelete([FromRoute] Guid id)
    {
        var error = EditCheck(id, out var playlist);
        if (error is not null || playlist is null)
        {
            return error ?? NotFound();
        }

        await playlist.DeleteImageAsync(MediaBrowser.Model.Entities.ImageType.Primary, 0).ConfigureAwait(false);
        CoverMarkers.Set(id, false);
        return NoContent();
    }

    private const int MaxSpotifyBytes = 6_000_000;

    private static readonly Regex SpotifyScriptTag = new("<script([^>]*)>(.*?)</script>", RegexOptions.Singleline | RegexOptions.IgnoreCase | RegexOptions.Compiled, TimeSpan.FromSeconds(3));
    private static readonly Regex SpotifyMetaTag = new("<meta[^>]*?(?:property|name)=\"([^\"]+)\"[^>]*?content=\"([^\"]*)\"", RegexOptions.Singleline | RegexOptions.IgnoreCase | RegexOptions.Compiled, TimeSpan.FromSeconds(3));
    private static readonly HttpClient SpotifyHttp = CreateSpotifyHttp();

    private static HttpClient CreateSpotifyHttp()
    {
        var handler = new HttpClientHandler { AllowAutoRedirect = false };
        var client = new HttpClient(handler) { Timeout = TimeSpan.FromSeconds(15) };
        client.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36");
        client.DefaultRequestHeaders.TryAddWithoutValidation("Accept-Language", "en-US,en;q=0.8");
        return client;
    }

    private static bool HostIs(Uri uri, string domain) =>
        uri.Host.Equals(domain, StringComparison.OrdinalIgnoreCase) || uri.Host.EndsWith("." + domain, StringComparison.OrdinalIgnoreCase);

    private static bool IsSpotifyPageHost(Uri uri) => HostIs(uri, "open.spotify.com");

    private static bool IsSpotifyImageHost(Uri uri) => HostIs(uri, "scdn.co") || HostIs(uri, "spotifycdn.com");

    /// <summary>Fetches a Spotify URL and follows redirects only to allowed hosts (no requests to other servers).</summary>
    private static async Task<HttpResponseMessage?> SpotifyFetch(Uri start, Func<Uri, bool> allowed, CancellationToken token)
    {
        var uri = start;
        for (var hop = 0; hop < 4; hop++)
        {
            var res = await SpotifyHttp.GetAsync(uri, HttpCompletionOption.ResponseHeadersRead, token).ConfigureAwait(false);
            var code = (int)res.StatusCode;
            if (code >= 300 && code < 400 && res.Headers.Location is not null)
            {
                var next = res.Headers.Location.IsAbsoluteUri ? res.Headers.Location : new Uri(uri, res.Headers.Location);
                res.Dispose();
                if (next.Scheme != Uri.UriSchemeHttps || !allowed(next))
                {
                    return null;
                }

                uri = next;
                continue;
            }

            return res;
        }

        return null;
    }

    /// <summary>
    /// Reads the public embed page of a Spotify playlist and returns its JSON data blocks and og: meta tags. The browser evaluates them,
    /// because the page layout is not documented by Spotify and may change.
    /// </summary>
    [HttpGet("Spotify/Playlist")]
    [Authorize]
    public async Task<IActionResult> SpotifyPlaylist([FromQuery] string id)
    {
        if (string.IsNullOrEmpty(id) || !Regex.IsMatch(id, "^[A-Za-z0-9]{22}$"))
        {
            return BadRequest(new { error = "bad_id" });
        }

        try
        {
            using var res = await SpotifyFetch(new Uri("https://open.spotify.com/embed/playlist/" + id), IsSpotifyPageHost, HttpContext.RequestAborted).ConfigureAwait(false);
            if (res is null)
            {
                return StatusCode(502, new { error = "redirect" });
            }

            if (!res.IsSuccessStatusCode)
            {
                return StatusCode(502, new { error = "spotify_" + (int)res.StatusCode });
            }

            if (res.Content.Headers.ContentLength > MaxSpotifyBytes)
            {
                return StatusCode(502, new { error = "too_large" });
            }

            var html = await res.Content.ReadAsStringAsync(HttpContext.RequestAborted).ConfigureAwait(false);
            var scripts = new List<string>();
            foreach (Match m in SpotifyScriptTag.Matches(html))
            {
                var attrs = m.Groups[1].Value;
                if (attrs.Contains("application/json", StringComparison.OrdinalIgnoreCase)
                    || attrs.Contains("__NEXT_DATA__", StringComparison.Ordinal)
                    || attrs.Contains("resource", StringComparison.OrdinalIgnoreCase))
                {
                    var body = m.Groups[2].Value.Trim();
                    if (body.Length > 0 && body.Length < 4_000_000)
                    {
                        scripts.Add(body);
                    }

                    if (scripts.Count >= 6)
                    {
                        break;
                    }
                }
            }

            var meta = new Dictionary<string, string>();
            foreach (Match m in SpotifyMetaTag.Matches(html))
            {
                var key = m.Groups[1].Value.ToLowerInvariant();
                if (key.StartsWith("og:", StringComparison.Ordinal) && !meta.ContainsKey(key))
                {
                    meta[key] = System.Net.WebUtility.HtmlDecode(m.Groups[2].Value);
                }
            }

            return JsonResult(new { scripts, meta });
        }
        catch (HttpRequestException)
        {
            return StatusCode(502, new { error = "unreachable" });
        }
        catch (TaskCanceledException) when (!HttpContext.RequestAborted.IsCancellationRequested)
        {
            return StatusCode(504, new { error = "timeout" });
        }
    }

    /// <summary>Loads a playlist cover from Spotify's image servers (only those hosts) so the browser can use it without cross-origin limits.</summary>
    [HttpGet("Spotify/Image")]
    [Authorize]
    public async Task<IActionResult> SpotifyImage([FromQuery] string url)
    {
        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps || !IsSpotifyImageHost(uri))
        {
            return BadRequest(new { error = "bad_url" });
        }

        try
        {
            using var res = await SpotifyFetch(uri, IsSpotifyImageHost, HttpContext.RequestAborted).ConfigureAwait(false);
            if (res is null || !res.IsSuccessStatusCode)
            {
                return StatusCode(502, new { error = "image_failed" });
            }

            var type = res.Content.Headers.ContentType?.MediaType ?? string.Empty;
            if (!type.StartsWith("image/", StringComparison.OrdinalIgnoreCase) || res.Content.Headers.ContentLength > MaxSpotifyBytes)
            {
                return StatusCode(502, new { error = "not_image" });
            }

            var bytes = await res.Content.ReadAsByteArrayAsync(HttpContext.RequestAborted).ConfigureAwait(false);
            if (bytes.Length > MaxSpotifyBytes)
            {
                return StatusCode(502, new { error = "too_large" });
            }

            return File(bytes, type);
        }
        catch (HttpRequestException)
        {
            return StatusCode(502, new { error = "unreachable" });
        }
        catch (TaskCanceledException) when (!HttpContext.RequestAborted.IsCancellationRequested)
        {
            return StatusCode(504, new { error = "timeout" });
        }
    }

    /// <summary>Removes the current user from the shares of a playlist (also possible without edit rights).</summary>
    [HttpPost("Playlist/{id}/Leave")]
    [Authorize]
    public async Task<IActionResult> PlaylistLeave([FromRoute] Guid id)
    {
        var me = CurrentUserId();
        if (me is null)
        {
            return Unauthorized();
        }

        var playlist = _playlists.GetPlaylistForUser(id, me.Value);
        var share = playlist?.Shares.FirstOrDefault(s => s.UserId.Equals(me.Value));
        if (playlist is null || share is null)
        {
            return NotFound();
        }

        await _playlists.RemoveUserFromShares(id, me.Value, share).ConfigureAwait(false);
        return NoContent();
    }

    /// <summary>Streams all downloadable tracks of a playlist as a ZIP file.</summary>
    [HttpGet("Playlist/{id}/Download")]
    [Authorize]
    public async Task<IActionResult> PlaylistDownload([FromRoute] Guid id)
    {
        var me = CurrentUserId();
        if (me is null)
        {
            return Unauthorized();
        }

        var playlist = _playlists.GetPlaylistForUser(id, me.Value);
        var user = _users.GetUserById(me.Value);
        if (playlist is null || user is null)
        {
            return NotFound();
        }

        var tracks = playlist.GetManageableItems()
            .Select(t => t.Item2)
            .OfType<Audio>()
            .Where(a => a.IsVisible(user) && a.CanDownload(user) && !string.IsNullOrEmpty(a.Path) && System.IO.File.Exists(a.Path))
            .Take(MaxZipTracks)
            .ToList();
        if (tracks.Count == 0)
        {
            return NotFound();
        }

        var fileName = SafeName(playlist.Name) + ".zip";
        Response.ContentType = "application/zip";
        Response.Headers["Content-Disposition"] = "attachment; filename=\"playlist.zip\"; filename*=UTF-8''" + Uri.EscapeDataString(fileName);
        Response.Headers["X-Content-Type-Options"] = "nosniff";

        // ZipArchive writes synchronously; Kestrel forbids that unless it is allowed for this request.
        var bodyControl = HttpContext.Features.Get<IHttpBodyControlFeature>();
        if (bodyControl is not null)
        {
            bodyControl.AllowSynchronousIO = true;
        }

        using (var zip = new ZipArchive(Response.Body, ZipArchiveMode.Create, leaveOpen: true))
        {
            for (var i = 0; i < tracks.Count; i++)
            {
                var audio = tracks[i];
                var artist = audio.Artists.Count > 0 ? audio.Artists[0] : audio.AlbumArtists.Count > 0 ? audio.AlbumArtists[0] : string.Empty;
                var label = string.IsNullOrWhiteSpace(artist) ? audio.Name : artist + " - " + audio.Name;
                var entryName = (i + 1).ToString("D3", System.Globalization.CultureInfo.InvariantCulture) + " - " + SafeName(label) + Path.GetExtension(audio.Path);
                var entry = zip.CreateEntry(entryName, CompressionLevel.NoCompression);
                var entryStream = entry.Open();
                await using (entryStream.ConfigureAwait(false))
                {
                    var file = System.IO.File.OpenRead(audio.Path);
                    await using (file.ConfigureAwait(false))
                    {
                        await file.CopyToAsync(entryStream, HttpContext.RequestAborted).ConfigureAwait(false);
                    }
                }
            }
        }

        return new EmptyResult();
    }

    private static string SafeName(string? value)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var sb = new StringBuilder();
        foreach (var ch in value ?? string.Empty)
        {
            sb.Append(Array.IndexOf(invalid, ch) >= 0 || ch == '/' || ch == '\\' ? '_' : ch);
        }

        var result = sb.ToString().Trim().Trim('.');
        if (result.Length == 0)
        {
            return "Titel";
        }

        return result.Length > 120 ? result.Substring(0, 120) : result;
    }

    // Returns null when the current user may edit the playlist (owner or share with edit right).
    private IActionResult? EditCheck(Guid id, out Playlist? playlist)
    {
        playlist = null;
        var me = CurrentUserId();
        if (me is null)
        {
            return Unauthorized();
        }

        playlist = _playlists.GetPlaylistForUser(id, me.Value);
        if (playlist is null)
        {
            return NotFound();
        }

        var canEdit = playlist.OwnerUserId.Equals(me.Value)
                      || playlist.Shares.Any(s => s.CanEdit && s.UserId.Equals(me.Value));
        return canEdit ? null : Forbid();
    }

    private PlaylistInfo ToInfo(Playlist p, Guid me, ISet<Guid> covers, IDictionary<Guid, string> names)
    {
        var isOwner = p.OwnerUserId.Equals(me);
        var share = p.Shares.FirstOrDefault(s => s.UserId.Equals(me));
        if (!names.TryGetValue(p.OwnerUserId, out var ownerName))
        {
            ownerName = p.OwnerUserId == Guid.Empty ? string.Empty : _users.GetUserById(p.OwnerUserId)?.Username ?? string.Empty;
            names[p.OwnerUserId] = ownerName;
        }

        return new PlaylistInfo(
            p.Id,
            p.OwnerUserId,
            ownerName,
            isOwner,
            isOwner || (share is not null && share.CanEdit),
            p.OpenAccess,
            share is not null,
            covers.Contains(p.Id));
    }

    // ---------- Jam ----------

    /// <summary>Creates a Jam.</summary>
    [HttpPost("Jam")]
    [Authorize]
    public IActionResult JamCreate()
    {
        if (!JamAllowed(out var me))
        {
            return NotFound();
        }

        var max = Plugin.Instance?.Configuration.JamMaxMembers ?? 8;
        return ToResponse(_jam.Create(me, max));
    }

    /// <summary>Joins a Jam.</summary>
    [HttpPost("Jam/{code}/Join")]
    [Authorize]
    public IActionResult JamJoin([FromRoute] string code)
    {
        if (!JamAllowed(out var me) || !JamService.IsValidCode(code))
        {
            return NotFound();
        }

        return ToResponse(_jam.Join(code, me));
    }

    /// <summary>Leaves a Jam.</summary>
    [HttpPost("Jam/{code}/Leave")]
    [Authorize]
    public IActionResult JamLeave([FromRoute] string code)
    {
        if (!JamAllowed(out var me) || !JamService.IsValidCode(code))
        {
            return NotFound();
        }

        var r = _jam.Leave(code, me);
        return r.Error is null ? NoContent() : ToResponse(r);
    }

    /// <summary>Gets the Jam state; returns 204 when unchanged since <paramref name="since"/>.</summary>
    [HttpGet("Jam/{code}")]
    [Authorize]
    public IActionResult JamGet([FromRoute] string code, [FromQuery] long since = 0)
    {
        if (!JamAllowed(out var me) || !JamService.IsValidCode(code))
        {
            return NotFound();
        }

        var r = _jam.Get(code, me, since);
        return r.Error is null && r.State is null ? NoContent() : ToResponse(r);
    }

    /// <summary>Appends tracks (comma separated ids) to the Jam queue.</summary>
    [HttpPost("Jam/{code}/Add")]
    [Authorize]
    public IActionResult JamAdd([FromRoute] string code, [FromQuery] string ids)
    {
        if (!JamAllowed(out var me) || !JamService.IsValidCode(code))
        {
            return NotFound();
        }

        var parsed = new List<Guid>();
        foreach (var part in (ids ?? string.Empty).Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            if (!Guid.TryParse(part, out var id) || id == Guid.Empty || parsed.Count >= 200)
            {
                return BadRequest();
            }

            if (_library.GetItemById<Audio>(id, me) is null)
            {
                return BadRequest();
            }

            parsed.Add(id);
        }

        return ToResponse(_jam.Add(code, me, parsed));
    }

    /// <summary>Removes a queue entry.</summary>
    [HttpPost("Jam/{code}/Remove")]
    [Authorize]
    public IActionResult JamRemove([FromRoute] string code, [FromQuery] int index)
    {
        if (!JamAllowed(out var me) || !JamService.IsValidCode(code))
        {
            return NotFound();
        }

        return ToResponse(_jam.Remove(code, me, index));
    }

    /// <summary>Advances the queue (compare-and-set on <paramref name="from"/>).</summary>
    [HttpPost("Jam/{code}/Advance")]
    [Authorize]
    public IActionResult JamAdvance([FromRoute] string code, [FromQuery] int from, [FromQuery] int? to = null)
    {
        if (!JamAllowed(out var me) || !JamService.IsValidCode(code))
        {
            return NotFound();
        }

        return ToResponse(_jam.Advance(code, me, from, to));
    }

    private bool JamAllowed(out Guid user)
    {
        user = Guid.Empty;
        if (Plugin.Instance?.Configuration.JamEnabled == false)
        {
            return false;
        }

        var id = CurrentUserId();
        if (id is null)
        {
            return false;
        }

        user = id.Value;
        return true;
    }

    private Guid? CurrentUserId()
    {
        // "Jellyfin-UserId" is the claim Jellyfin's own authentication handler sets.
        var claim = User.FindFirst("Jellyfin-UserId")
                    ?? User.Claims.FirstOrDefault(c => c.Type.EndsWith("UserId", StringComparison.OrdinalIgnoreCase));
        return claim is not null && Guid.TryParse(claim.Value, out var id) && id != Guid.Empty ? id : null;
    }

    private IActionResult ToResponse(JamResult r)
    {
        if (r.Error is null)
        {
            return r.State is null ? NoContent() : JsonResult(r.State);
        }

        return r.Error switch
        {
            "not_found" => NotFound(),
            "forbidden" => Forbid(),
            "rate" => StatusCode(StatusCodes.Status429TooManyRequests),
            _ => BadRequest(new { error = r.Error })
        };
    }

    private ContentResult JsonResult(object value) =>
        Content(JsonSerializer.Serialize(value, JsonOptions), "application/json");

    private IActionResult Embedded(string name, string contentType)
    {
        var assembly = typeof(Plugin).Assembly;
        var stream = assembly.GetManifestResourceStream($"{typeof(Plugin).Namespace}.{name}");
        if (stream is null)
        {
            return NotFound();
        }

        Response.Headers["X-Content-Type-Options"] = "nosniff";
        var isText = contentType.StartsWith("text/", StringComparison.Ordinal) || contentType == "application/javascript";
        return File(stream, isText ? contentType + "; charset=utf-8" : contentType);
    }
}

/// <summary>Request body for the playlist description.</summary>
/// <param name="Description">The new description (empty removes it).</param>
public sealed record PlaylistDetailsRequest(string? Description);

/// <summary>Owner and permissions of a playlist as seen by the current user.</summary>
/// <param name="Id">Playlist id.</param>
/// <param name="OwnerId">Owner user id.</param>
/// <param name="OwnerName">Owner user name.</param>
/// <param name="IsOwner">Whether the current user owns the playlist.</param>
/// <param name="CanEdit">Whether the current user may change the playlist.</param>
/// <param name="IsPublic">Whether every user may see the playlist.</param>
/// <param name="SharedWithMe">Whether the playlist was shared with the current user.</param>
/// <param name="CustomCover">Whether the cover was set by a user (otherwise the client builds one from the tracks).</param>
public sealed record PlaylistInfo(
    Guid Id,
    Guid OwnerId,
    string OwnerName,
    bool IsOwner,
    bool CanEdit,
    bool IsPublic,
    bool SharedWithMe,
    bool CustomCover);

/// <summary>Remembers which playlists carry a user-chosen cover (Jellyfin also generates covers automatically).</summary>
internal static class CoverMarkers
{
    private static readonly object Gate = new();
    private static HashSet<Guid>? _ids;

    public static ISet<Guid> Snapshot()
    {
        lock (Gate)
        {
            return new HashSet<Guid>(Load());
        }
    }

    public static void Set(Guid id, bool present)
    {
        lock (Gate)
        {
            var ids = Load();
            var changed = present ? ids.Add(id) : ids.Remove(id);
            if (changed)
            {
                Save(ids);
            }
        }
    }

    private static string? FilePath()
    {
        var folder = Plugin.Instance?.DataFolderPath;
        return string.IsNullOrEmpty(folder) ? null : Path.Combine(folder, "custom-covers.json");
    }

    private static HashSet<Guid> Load()
    {
        if (_ids is not null)
        {
            return _ids;
        }

        var ids = new HashSet<Guid>();
        try
        {
            var path = FilePath();
            if (path is not null && System.IO.File.Exists(path))
            {
                foreach (var text in JsonSerializer.Deserialize<List<string>>(System.IO.File.ReadAllText(path)) ?? new List<string>())
                {
                    if (Guid.TryParse(text, out var id))
                    {
                        ids.Add(id);
                    }
                }
            }
        }
        catch (Exception)
        {
            // an unreadable marker file only means that generated covers are shown
        }

        _ids = ids;
        return ids;
    }

    private static void Save(HashSet<Guid> ids)
    {
        try
        {
            var path = FilePath();
            if (path is null)
            {
                return;
            }

            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            System.IO.File.WriteAllText(path, JsonSerializer.Serialize(ids.Select(i => i.ToString("N")).ToList()));
        }
        catch (Exception)
        {
            // best effort
        }
    }
}

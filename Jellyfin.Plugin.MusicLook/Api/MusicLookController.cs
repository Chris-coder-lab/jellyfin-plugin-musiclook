using System.Reflection;
using System.Text.Json;
using Jellyfin.Plugin.MusicLook.Jam;
using MediaBrowser.Controller.Entities.Audio;
using MediaBrowser.Controller.Library;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.MusicLook.Api;

/// <summary>Serves the client files and the Jam / user-list endpoints.</summary>
[ApiController]
[Route("MusicLook")]
public class MusicLookController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly JamService _jam;
    private readonly IUserManager _users;
    private readonly ILibraryManager _library;

    /// <summary>Initializes a new instance of the <see cref="MusicLookController"/> class.</summary>
    public MusicLookController(JamService jam, IUserManager users, ILibraryManager library)
    {
        _jam = jam;
        _users = users;
        _library = library;
    }

    /// <summary>Gets the client script.</summary>
    [HttpGet("client.js")]
    [AllowAnonymous]
    [ResponseCache(Duration = 300)]
    public IActionResult ClientJs() => Embedded("Web.musiclook.js", "application/javascript");

    /// <summary>Gets the client stylesheet.</summary>
    [HttpGet("client.css")]
    [AllowAnonymous]
    [ResponseCache(Duration = 300)]
    public IActionResult ClientCss() => Embedded("Web.musiclook.css", "text/css");

    /// <summary>Gets the public client configuration.</summary>
    [HttpGet("Config")]
    [Authorize]
    public IActionResult Config()
    {
        var c = Plugin.Instance?.Configuration;
        return JsonResult(new
        {
            accentColor = c?.AccentColor ?? "#1ed760",
            jamEnabled = c?.JamEnabled ?? true
        });
    }

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
    // independent of that difference (and of the namespace of the User entity).
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
                && itemType.GetProperty("Username")?.GetValue(item) is string name)
            {
                yield return (id, name);
            }
        }
    }

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

            if (_library.GetItemById(id) is not Audio)
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
        return File(stream, contentType + "; charset=utf-8");
    }
}

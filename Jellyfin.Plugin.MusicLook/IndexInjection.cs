using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Net.Http.Headers;

namespace Jellyfin.Plugin.MusicLook;

/// <summary>Pure helper that adds the Music Look stylesheet and script to the web client's index.html.</summary>
public static class IndexHtml
{
    private const string Marker = "MusicLook/client.js";

    /// <summary>Inserts the tags before the closing body tag. Returns the same instance when nothing changes.</summary>
    /// <param name="html">The original index.html.</param>
    /// <param name="version">Plugin version, used only to bust browser caches.</param>
    /// <returns>The patched html.</returns>
    public static string Inject(string html, string version)
    {
        if (html.Contains(Marker, StringComparison.Ordinal))
        {
            return html;
        }

        var v = Uri.EscapeDataString(version);

        // Relative to /web/ (or <baseurl>/web/), so a configured base URL keeps working.
        var tags = "<link rel=\"stylesheet\" href=\"../MusicLook/client.css?v=" + v + "\">"
                 + "<script defer src=\"../" + Marker + "?v=" + v + "\"></script>";
        var index = html.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
        return index < 0 ? html + tags : html.Insert(index, tags);
    }

    /// <summary>Checks whether a request path addresses the web client's start page.</summary>
    /// <param name="path">The request path including a possible base URL.</param>
    /// <returns><c>true</c> for /web/ and /web/index.html.</returns>
    public static bool IsIndexPath(string? path)
    {
        if (string.IsNullOrEmpty(path))
        {
            return false;
        }

        return path.EndsWith("/web/", StringComparison.OrdinalIgnoreCase)
               || path.EndsWith("/web/index.html", StringComparison.OrdinalIgnoreCase);
    }
}

/// <summary>Adds the middleware in front of Jellyfin's own pipeline.</summary>
public sealed class IndexInjectionStartupFilter : IStartupFilter
{
    /// <inheritdoc />
    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
    {
        return app =>
        {
            app.UseMiddleware<IndexInjectionMiddleware>();
            next(app);
        };
    }
}

/// <summary>
/// Patches the response of the web client's start page. Only GET requests for /web/ and /web/index.html are
/// touched; everything else passes through unchanged. If anything goes wrong the original page is served.
/// </summary>
public sealed class IndexInjectionMiddleware
{
    private const int MaxPageBytes = 1024 * 1024;

    private readonly RequestDelegate _next;

    /// <summary>Initializes a new instance of the <see cref="IndexInjectionMiddleware"/> class.</summary>
    /// <param name="next">The next middleware.</param>
    public IndexInjectionMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    /// <summary>Handles one request.</summary>
    /// <param name="context">The http context.</param>
    /// <returns>A task that completes when the response is written.</returns>
    public async Task InvokeAsync(HttpContext context)
    {
        if (!HttpMethods.IsGet(context.Request.Method) || !IndexHtml.IsIndexPath(context.Request.Path.Value))
        {
            await _next(context).ConfigureAwait(false);
            return;
        }

        var request = context.Request;
        var response = context.Response;
        var clientEtag = request.Headers[HeaderNames.IfNoneMatch].ToString();

        // Without these headers the static file middleware always answers with the complete, uncompressed file,
        // which is what we need to patch it. The (tiny) result is sent uncompressed.
        request.Headers.Remove(HeaderNames.AcceptEncoding);
        request.Headers.Remove(HeaderNames.IfNoneMatch);
        request.Headers.Remove(HeaderNames.IfModifiedSince);
        request.Headers.Remove(HeaderNames.IfRange);
        request.Headers.Remove(HeaderNames.Range);

        var original = response.Body;
        using var buffer = new MemoryStream();
        response.Body = buffer;
        try
        {
            await _next(context).ConfigureAwait(false);
        }
        finally
        {
            response.Body = original;
        }

        var body = buffer.ToArray();
        var contentType = response.ContentType ?? string.Empty;
        var patchable = response.StatusCode == StatusCodes.Status200OK
                        && body.Length > 0
                        && body.Length <= MaxPageBytes
                        && contentType.StartsWith("text/html", StringComparison.OrdinalIgnoreCase)
                        && !response.Headers.ContainsKey(HeaderNames.ContentEncoding);

        if (patchable)
        {
            try
            {
                var html = Encoding.UTF8.GetString(body);
                var version = Plugin.Instance?.Version.ToString() ?? "0";
                var patched = IndexHtml.Inject(html, version);
                if (!ReferenceEquals(patched, html))
                {
                    body = Encoding.UTF8.GetBytes(patched);
                }
            }
            catch (Exception)
            {
                // keep the original bytes
            }

            var etag = "\"" + Convert.ToHexString(SHA256.HashData(body), 0, 8).ToLowerInvariant() + "\"";
            response.Headers.Remove(HeaderNames.LastModified);
            response.Headers[HeaderNames.ETag] = etag;
            response.Headers[HeaderNames.CacheControl] = "no-cache";

            if (string.Equals(clientEtag, etag, StringComparison.Ordinal))
            {
                response.StatusCode = StatusCodes.Status304NotModified;
                response.ContentLength = null;
                return;
            }
        }

        if (body.Length > 0)
        {
            response.ContentLength = body.Length;
            await original.WriteAsync(body, context.RequestAborted).ConfigureAwait(false);
        }
    }
}

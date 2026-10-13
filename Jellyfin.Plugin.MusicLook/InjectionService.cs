using System.Reflection;
using System.Runtime.Loader;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MusicLook;

/// <summary>Payload object the File Transformation plugin hands to the callback.</summary>
public class PatchRequestPayload
{
    /// <summary>Gets or sets the current file contents.</summary>
    [JsonPropertyName("contents")]
    public string? Contents { get; set; }
}

/// <summary>Callback that adds the Music Look stylesheet and script to index.html.</summary>
public static class IndexTransformer
{
    private const string Marker = "MusicLook/client.js";

    /// <summary>Inserts the tags before the closing body tag (idempotent).</summary>
    public static string Transform(PatchRequestPayload payload)
    {
        var html = payload.Contents ?? string.Empty;
        if (html.Contains(Marker, StringComparison.Ordinal))
        {
            return html;
        }

        var version = Plugin.Instance?.Version.ToString() ?? "0";
        // Relative to /web/ (or <baseurl>/web/), so a configured base URL keeps working.
        var tags = $"<link rel=\"stylesheet\" href=\"../MusicLook/client.css?v={version}\">"
                 + $"<script defer src=\"../{Marker}?v={version}\"></script>";
        var i = html.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
        return i < 0 ? html + tags : html.Insert(i, tags);
    }
}

/// <summary>
/// Registers the index.html transformation with the File Transformation plugin via reflection,
/// retrying while that plugin is still loading.
/// </summary>
public sealed class InjectionService : IHostedService
{
    private const string InterfaceType = "Jellyfin.Plugin.FileTransformation.PluginInterface";
    private const string RegisterMethod = "RegisterTransformation";

    private readonly ILogger<InjectionService> _logger;
    private CancellationTokenSource? _cts;

    /// <summary>Initializes a new instance of the <see cref="InjectionService"/> class.</summary>
    public InjectionService(ILogger<InjectionService> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public Task StartAsync(CancellationToken cancellationToken)
    {
        _cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        var token = _cts.Token;
        _ = Task.Run(() => RegisterLoopAsync(token), token);
        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task StopAsync(CancellationToken cancellationToken)
    {
        _cts?.Cancel();
        return Task.CompletedTask;
    }

    private async Task RegisterLoopAsync(CancellationToken ct)
    {
        try
        {
            for (var attempt = 0; attempt < 12; attempt++)
            {
                await Task.Delay(TimeSpan.FromSeconds(attempt == 0 ? 3 : 10), ct).ConfigureAwait(false);
                if (TryRegister())
                {
                    return;
                }
            }

            _logger.LogWarning(
                "Music Look: File Transformation plugin not found or registration failed. "
                + "Install File Transformation (3.0.0.0 or newer) or add <link rel=stylesheet href=\"/MusicLook/client.css\"> and "
                + "<script src=\"/MusicLook/client.js\"> to the web client manually.");
        }
        catch (OperationCanceledException)
        {
            // shutting down
        }
    }

    private bool TryRegister()
    {
        try
        {
            var type = AssemblyLoadContext.All
                .SelectMany(c => c.Assemblies)
                .Select(a => a.GetType(InterfaceType, false))
                .FirstOrDefault(t => t is not null);
            var method = type?.GetMethod(RegisterMethod, BindingFlags.Public | BindingFlags.Static);
            var parameter = method?.GetParameters().FirstOrDefault();
            if (type is null || method is null || parameter is null || method.GetParameters().Length != 1)
            {
                return false;
            }

            var json = JsonSerializer.Serialize(new
            {
                id = Plugin.Instance?.Id ?? Guid.Empty,
                fileNamePattern = "index\\.html",
                callbackAssembly = typeof(IndexTransformer).Assembly.FullName,
                callbackClass = typeof(IndexTransformer).FullName,
                callbackMethod = nameof(IndexTransformer.Transform)
            });

            object argument;
            if (parameter.ParameterType == typeof(string))
            {
                argument = json;
            }
            else
            {
                var parse = parameter.ParameterType.GetMethod("Parse", BindingFlags.Public | BindingFlags.Static, new[] { typeof(string) });
                if (parse is null)
                {
                    return false;
                }

                argument = parse.Invoke(null, new object[] { json })!;
            }

            method.Invoke(null, new[] { argument });
            _logger.LogInformation("Music Look: registered index.html transformation with File Transformation.");
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Music Look: registration attempt failed");
            return false;
        }
    }
}

using Jellyfin.Plugin.MusicLook.Jam;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace Jellyfin.Plugin.MusicLook;

/// <summary>Registers the plugin services.</summary>
public class PluginServiceRegistrator : IPluginServiceRegistrator
{
    /// <inheritdoc />
    public void RegisterServices(IServiceCollection serviceCollection, IServerApplicationHost applicationHost)
    {
        serviceCollection.AddSingleton<JamService>();
        serviceCollection.AddTransient<IStartupFilter, IndexInjectionStartupFilter>();
        serviceCollection.AddHostedService<Inbox.InboxService>();
    }
}

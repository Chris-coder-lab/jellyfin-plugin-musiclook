/* Music Look - App-Ansicht (Spotify-Stil) fuer Musikbibliotheken.
   Baut auf musiclook.js (window.MusicLook) auf. Nutzt nur die Jellyfin-REST-API und die Plugin-Endpunkte unter
   /MusicLook; es werden keine Token oder Daten nach aussen gesendet. Icons: Material Design Icons (Apache-2.0). */
(function () {
  'use strict';
  var ML = window.MusicLook;
  if (!ML || ML.app || (ML.version || 0) < 2) return;

  var call = ML.call, el = ML.el, btn = ML.button, toast = ML.toast, uid = ML.uid, nid = ML.nid, ID_RE = ML.ID_RE;
  var LANG = String(navigator.language || 'en').toLowerCase().indexOf('de') === 0 ? 'de' : 'en';

  /* ---------- Texte ---------- */
  var STR = {
    de: {
      tabHome: 'Start', tabSearch: 'Suche', tabLibrary: 'Bibliothek',
      chipAll: 'Alle', chipMusic: 'Musik', chipPodcasts: 'Podcasts', chipAudiobooks: 'Hörbücher',
      greetMorning: 'Guten Morgen', greetDay: 'Guten Tag', greetEvening: 'Guten Abend',
      liked: 'Lieblingssongs', yourPlaylists: 'Deine Playlists', sharedPlaylists: 'Mit dir geteilt', recentlyPlayed: 'Zuletzt gespielt',
      recentlyAdded: 'Neu hinzugefügt', newPlaylist: 'Neue Playlist', latestEpisodes: 'Neueste Folgen', shows: 'Sendungen',
      audiobooksShelf: 'Hörbücher', loading: 'Lade …', loadFailed: 'Fehler beim Laden.', retry: 'Erneut versuchen', nothingYet: 'Hier ist noch nichts.',
      noPodcastLib: 'Keine Podcast-Bibliothek gefunden. Bibliotheken, deren Name „{0}“ enthält, erscheinen hier (einstellbar in den Plugin-Einstellungen).',
      noAudiobookLib: 'Keine Hörbuch-Bibliothek gefunden. Bibliotheken, deren Name „{0}“ enthält, erscheinen hier (einstellbar in den Plugin-Einstellungen).',
      noPlaylistsYet: 'Du hast noch keine Playlists. Lege deine erste an.',
      playlist: 'Playlist', album: 'Album', artist: 'Künstler', song: 'Titel', songs: 'Titel', albums: 'Alben', artists: 'Künstler', playlists: 'Playlists',
      tracks1: '1 Titel', tracksN: '{0} Titel', ownerLine: 'Playlist • {0}', albumLine: 'Album • {0}',
      play: 'Wiedergabe', pause: 'Pause', shuffle: 'Zufallswiedergabe', download: 'Herunterladen', share: 'Teilen', more: 'Mehr', back: 'Zurück',
      close: 'Schließen', cancel: 'Abbrechen', save: 'Speichern', del: 'Löschen', done: 'Fertig', jam: 'Jam', next: 'Weiter', prev: 'Zurück',
      privateBadge: 'Privat', publicBadge: 'Öffentlich', sharedBadge: 'Mit dir geteilt', invite: 'Mitwirkende einladen',
      mShare: 'Teilen', mAddHere: 'Zu dieser Playlist hinzufügen', mEdit: 'Playlist bearbeiten', mDetails: 'Name und Details', mCover: 'Cover ändern',
      mDelete: 'Playlist löschen', mDownload: 'Herunterladen', mQueue: 'Zur Warteschlange hinzufügen', mAddOther: 'Zu einer anderen Playlist hinzufügen',
      mInvite: 'Mitwirkende einladen', mJam: 'Jam starten', mLeave: 'Aus meiner Bibliothek entfernen', mPrivate: 'Auf privat umstellen', mPublic: 'Öffentlich machen',
      mAddToPlaylist: 'Zu Playlist hinzufügen', mRemoveFromPlaylist: 'Aus dieser Playlist entfernen', mAlbum: 'Album anzeigen', mArtist: 'Künstler*in aufrufen',
      mSpeed: 'Geschwindigkeit ändern', mRadio: 'Zum Song-Radio', mInfo: 'Songinfos', mUnlike: 'Aus Lieblingssongs entfernen', mLike: 'Zu Lieblingssongs hinzufügen',
      mClassic: 'Klassische Ansicht', mSpotify: 'Spotify-Ansicht', mNewPlaylist: 'Neue Playlist erstellen',
      copyLink: 'Link kopieren', linkCopied: 'Link kopiert', shareNative: 'Teilen …',
      shareHint: 'Den Link können nur Personen öffnen, die Zugriff auf die Playlist haben. Gib den Zugriff unten frei.',
      shareLinkTrack: 'Der Link öffnet das Album des Titels.', sharePeople: 'Personen mit Zugriff',
      detailsTitle: 'Details bearbeiten', nameLabel: 'Name', descLabel: 'Beschreibung', descPh: 'Beschreibung hinzufügen',
      chooseImage: 'Bild auswählen', removeImage: 'Bild entfernen', coverSaved: 'Cover gespeichert', coverRemoved: 'Cover entfernt', coverFailed: 'Cover konnte nicht gespeichert werden',
      coverHint: 'Ohne eigenes Bild entsteht das Cover aus vier Alben-Covern der Titel.', detailsSaved: 'Gespeichert', detailsFailed: 'Speichern fehlgeschlagen',
      deleteTitle: 'Playlist löschen?', deleteText: 'Die Playlist „{0}“ wird gelöscht. Die Titel selbst bleiben in deiner Bibliothek erhalten.', deleted: 'Playlist gelöscht', deleteFailed: 'Löschen fehlgeschlagen',
      dlTitle: 'Playlist herunterladen', dlText: 'Alle Titel werden als ZIP-Datei auf dein Gerät geladen und lassen sich dort mit jeder Musik-App abspielen. Vorausgesetzt ist die Berechtigung zum Herunterladen.',
      dlStart: 'ZIP herunterladen', dlStarted: 'Download gestartet',
      editTitle: 'Playlist bearbeiten', moveUp: 'Nach oben', moveDown: 'Nach unten', removeTrack: 'Entfernen', editFailed: 'Änderung fehlgeschlagen',
      addSongsTitle: 'Titel hinzufügen', searchSongsPh: 'Titel, Alben oder Künstler suchen', added: 'Hinzugefügt', addFailed: 'Hinzufügen fehlgeschlagen',
      addToTitle: 'Zu Playlist hinzufügen', addedTo: 'Zu „{0}“ hinzugefügt', playlistCreated: 'Playlist „{0}“ erstellt', createFailed: 'Erstellen fehlgeschlagen',
      newPlaylistPh: 'Name der neuen Playlist', createPlaylist: 'Erstellen', toJam: 'Zur Jam-Warteschlange', jamAdded: 'Zur Jam hinzugefügt', jamFailed: 'Jam: Aktion fehlgeschlagen',
      queued: 'Zur Warteschlange hinzugefügt', playFailed: 'Wiedergabe konnte nicht gestartet werden', left: 'Aus deiner Bibliothek entfernt', leaveFailed: 'Entfernen fehlgeschlagen',
      madePrivate: 'Playlist ist jetzt privat', madePublic: 'Playlist ist jetzt öffentlich', visibilityFailed: 'Umstellen fehlgeschlagen',
      searchPh: 'Was möchtest du hören?', searchHint: 'Suche nach Titeln, Alben, Künstlern und Playlists.', noResults: 'Keine Treffer für „{0}“.',
      loadMore: 'Mehr laden', libPlaylists: 'Playlists', libAlbums: 'Alben', libArtists: 'Künstler', yourLibrary: 'Deine Bibliothek',
      nowPlaying: 'Wiedergabe', queue: 'Warteschlange', queueEmpty: 'Die Warteschlange ist leer.', speedTitle: 'Geschwindigkeit', speedNormal: 'Normal',
      volume: 'Lautstärke', repeat: 'Wiederholen', repeatOne: 'Titel wiederholen', repeatOff: 'Wiederholen aus', noPlayer: 'Es läuft gerade nichts.',
      infoTitle: 'Songinfos', iTitle: 'Titel', iArtist: 'Künstler', iAlbum: 'Album', iYear: 'Jahr', iLength: 'Länge', iFormat: 'Format', iBitrate: 'Bitrate',
      iSampleRate: 'Abtastrate', iSize: 'Größe', iGenre: 'Genre', iTrack: 'Titelnummer', radioFailed: 'Song-Radio nicht verfügbar',
      pickArtist: 'Künstler*in wählen', hours: 'Std.', minutes: 'Min.', seconds: 'Sek.', byOwner: 'von {0}'
    },
    en: {
      tabHome: 'Home', tabSearch: 'Search', tabLibrary: 'Library',
      chipAll: 'All', chipMusic: 'Music', chipPodcasts: 'Podcasts', chipAudiobooks: 'Audiobooks',
      greetMorning: 'Good morning', greetDay: 'Good afternoon', greetEvening: 'Good evening',
      liked: 'Liked Songs', yourPlaylists: 'Your playlists', sharedPlaylists: 'Shared with you', recentlyPlayed: 'Recently played',
      recentlyAdded: 'Recently added', newPlaylist: 'New playlist', latestEpisodes: 'Latest episodes', shows: 'Shows',
      audiobooksShelf: 'Audiobooks', loading: 'Loading …', loadFailed: 'Loading failed.', retry: 'Try again', nothingYet: 'Nothing here yet.',
      noPodcastLib: 'No podcast library found. Libraries whose name contains "{0}" show up here (configurable in the plugin settings).',
      noAudiobookLib: 'No audiobook library found. Libraries whose name contains "{0}" show up here (configurable in the plugin settings).',
      noPlaylistsYet: 'You have no playlists yet. Create your first one.',
      playlist: 'Playlist', album: 'Album', artist: 'Artist', song: 'Song', songs: 'Songs', albums: 'Albums', artists: 'Artists', playlists: 'Playlists',
      tracks1: '1 track', tracksN: '{0} tracks', ownerLine: 'Playlist • {0}', albumLine: 'Album • {0}',
      play: 'Play', pause: 'Pause', shuffle: 'Shuffle', download: 'Download', share: 'Share', more: 'More', back: 'Back',
      close: 'Close', cancel: 'Cancel', save: 'Save', del: 'Delete', done: 'Done', jam: 'Jam', next: 'Next', prev: 'Previous',
      privateBadge: 'Private', publicBadge: 'Public', sharedBadge: 'Shared with you', invite: 'Invite collaborators',
      mShare: 'Share', mAddHere: 'Add to this playlist', mEdit: 'Edit playlist', mDetails: 'Name and details', mCover: 'Change cover',
      mDelete: 'Delete playlist', mDownload: 'Download', mQueue: 'Add to queue', mAddOther: 'Add to another playlist',
      mInvite: 'Invite collaborators', mJam: 'Start a Jam', mLeave: 'Remove from my library', mPrivate: 'Make private', mPublic: 'Make public',
      mAddToPlaylist: 'Add to playlist', mRemoveFromPlaylist: 'Remove from this playlist', mAlbum: 'Go to album', mArtist: 'Go to artist',
      mSpeed: 'Change speed', mRadio: 'Go to song radio', mInfo: 'Song info', mUnlike: 'Remove from Liked Songs', mLike: 'Add to Liked Songs',
      mClassic: 'Classic view', mSpotify: 'Spotify view', mNewPlaylist: 'Create new playlist',
      copyLink: 'Copy link', linkCopied: 'Link copied', shareNative: 'Share …',
      shareHint: 'Only people with access to the playlist can open the link. Grant access below.',
      shareLinkTrack: 'The link opens the album of the track.', sharePeople: 'People with access',
      detailsTitle: 'Edit details', nameLabel: 'Name', descLabel: 'Description', descPh: 'Add a description',
      chooseImage: 'Choose image', removeImage: 'Remove image', coverSaved: 'Cover saved', coverRemoved: 'Cover removed', coverFailed: 'Could not save the cover',
      coverHint: 'Without your own image the cover is built from four album covers.', detailsSaved: 'Saved', detailsFailed: 'Could not save',
      deleteTitle: 'Delete playlist?', deleteText: 'The playlist "{0}" will be deleted. The tracks themselves stay in your library.', deleted: 'Playlist deleted', deleteFailed: 'Could not delete',
      dlTitle: 'Download playlist', dlText: 'All tracks are downloaded to your device as a ZIP file and can be played there with any music app. You need the permission to download.',
      dlStart: 'Download ZIP', dlStarted: 'Download started',
      editTitle: 'Edit playlist', moveUp: 'Move up', moveDown: 'Move down', removeTrack: 'Remove', editFailed: 'Change failed',
      addSongsTitle: 'Add tracks', searchSongsPh: 'Search tracks, albums or artists', added: 'Added', addFailed: 'Could not add',
      addToTitle: 'Add to playlist', addedTo: 'Added to "{0}"', playlistCreated: 'Playlist "{0}" created', createFailed: 'Could not create',
      newPlaylistPh: 'Name of the new playlist', createPlaylist: 'Create', toJam: 'Add to Jam queue', jamAdded: 'Added to the Jam', jamFailed: 'Jam: action failed',
      queued: 'Added to queue', playFailed: 'Playback could not be started', left: 'Removed from your library', leaveFailed: 'Could not remove',
      madePrivate: 'Playlist is now private', madePublic: 'Playlist is now public', visibilityFailed: 'Could not change',
      searchPh: 'What do you want to listen to?', searchHint: 'Search for tracks, albums, artists and playlists.', noResults: 'No results for "{0}".',
      loadMore: 'Load more', libPlaylists: 'Playlists', libAlbums: 'Albums', libArtists: 'Artists', yourLibrary: 'Your library',
      nowPlaying: 'Now playing', queue: 'Queue', queueEmpty: 'The queue is empty.', speedTitle: 'Speed', speedNormal: 'Normal',
      volume: 'Volume', repeat: 'Repeat', repeatOne: 'Repeat track', repeatOff: 'Repeat off', noPlayer: 'Nothing is playing.',
      infoTitle: 'Song info', iTitle: 'Title', iArtist: 'Artist', iAlbum: 'Album', iYear: 'Year', iLength: 'Length', iFormat: 'Format', iBitrate: 'Bitrate',
      iSampleRate: 'Sample rate', iSize: 'Size', iGenre: 'Genre', iTrack: 'Track number', radioFailed: 'Song radio not available',
      pickArtist: 'Choose artist', hours: 'hr', minutes: 'min', seconds: 'sec', byOwner: 'by {0}'
    }
  };
  function t(key, a, b) {
    var s = (STR[LANG] && STR[LANG][key]) || STR.en[key] || key;
    if (a != null) s = s.replace('{0}', a);
    if (b != null) s = s.replace('{1}', b);
    return s;
  }
  function countText(n) { return n === 1 ? t('tracks1') : t('tracksN', n); }

  /* ---------- Icons (Material Design Icons, Apache-2.0) ---------- */
  var ICONS = {
    play: 'M8 5v14l11-7z',
    pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
    next: 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z',
    prev: 'M6 6h2v12H6zm3.5 6l8.5 6V6z',
    shuffle: 'M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z',
    repeat: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z',
    repeat_one: 'M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z',
    heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    heart_o: 'M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z',
    more: 'M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
    more_v: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
    add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
    back: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z',
    down: 'M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z',
    search: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    library: 'M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 5h-3v5.5c0 1.38-1.12 2.5-2.5 2.5S10 13.88 10 12.5s1.12-2.5 2.5-2.5c.57 0 1.08.19 1.5.51V5h4v2zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z',
    download: 'M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z',
    person_add: 'M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    share: 'M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z',
    queue: 'M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z',
    playlist_add: 'M14 10H2v2h12v-2zm0-4H2v2h12V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM2 16h8v-2H2v2z',
    edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    del: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
    album: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z',
    person: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    speed: 'M20.38 8.57l-1.23 1.85a8 8 0 0 1-.22 7.58H5.07A8 8 0 0 1 15.58 6.85l1.85-1.23A10 10 0 0 0 3.35 19a2 2 0 0 0 1.72 1h13.85a2 2 0 0 0 1.74-1 10 10 0 0 0-.27-10.44zm-9.79 6.84a2 2 0 0 0 2.83 0l5.66-8.49-8.49 5.66a2 2 0 0 0 0 2.83z',
    info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
    radio: 'M3.24 6.15C2.51 6.43 2 7.17 2 8v12c0 1.1.89 2 2 2h16c1.11 0 2-.9 2-2V8c0-1.11-.89-2-2-2H8.3l8.26-3.34L15.88 1 3.24 6.15zM7 20c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-8h-2v-2h-2v2H4V8h16v4z',
    group: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    lock: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z',
    public: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
    check: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    remove: 'M7 11v2h10v-2H7zm5-9C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
    up_arrow: 'M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z',
    down_arrow: 'M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z',
    volume: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
    note: 'M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z',
    link: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z',
    camera: 'M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z',
    chevron: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
    phone: 'M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z',
    computer: 'M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z',
    tv: 'M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z',
    devices: 'M4 6h18V4H4c-1.1 0-2 .9-2 2v11H0v3h14v-3H4V6zm19 2h-6c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h6c.55 0 1-.45 1-1V9c0-.55-.45-1-1-1zm-1 9h-4v-7h4v7z'
  };

  ICONS.expand = 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z';
  ICONS.clock = 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z';
  ICONS.mic = 'M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z';
  ICONS.volume_off = 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z';
  ICONS.volume_low = 'M18.5 12A4.5 4.5 0 0 0 16 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z';
  ICONS.sort = 'M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z';
  ICONS.plus_circle = 'M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z';
  ICONS.check_circle = 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z';
  ICONS.book = 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z';
  ICONS.folder = 'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z';

  /* Kontur-Symbole im Stil von Spotify (Zufallswiedergabe, Wiederholen). */
  var STROKE_ICONS = {
    shuffle: 'M3 7h2.6c1.6 0 3.1.8 4 2.1l4.1 5.8c.9 1.3 2.4 2.1 4 2.1H21M3 17h2.6c1.4 0 2.7-.6 3.6-1.7M13.6 8.8C14.5 7.7 15.8 7 17.3 7H21M18.4 4.3L21 7l-2.6 2.7M18.4 14.3L21 17l-2.6 2.7',
    repeat: 'M4 11.5V10a3 3 0 0 1 3-3h13M17.4 4.3L20 7l-2.6 2.7M20 12.5V14a3 3 0 0 1-3 3H4M6.6 14.3L4 17l2.6 2.7',
    repeat_one: 'M4 11.5V10a3 3 0 0 1 3-3h13M17.4 4.3L20 7l-2.6 2.7M20 12.5V14a3 3 0 0 1-3 3H4M6.6 14.3L4 17l2.6 2.7M11 10.6l1.6-1v6.2'
  };

  function icon(name, cls) {
    var s = el('span', 'ml-ic' + (cls ? ' ' + cls : ''));
    if (STROKE_ICONS[name]) {
      s.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="' + STROKE_ICONS[name] + '"></path></svg>';
      s.classList.add('ml-ic-stroke');
      return s;
    }
    s.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><path d="' + (ICONS[name] || ICONS.note) + '"></path></svg>';
    return s;
  }
  function iconBtn(name, label, cls, onClick) {
    var b = btn('ml-icon-btn' + (cls ? ' ' + cls : ''));
    b.setAttribute('aria-label', label);
    b.title = label;
    b.appendChild(icon(name));
    if (onClick) b.addEventListener('click', function (e) { e.stopPropagation(); onClick(e); });
    return b;
  }
  function add(parent) {
    for (var i = 1; i < arguments.length; i++) { if (arguments[i]) parent.appendChild(arguments[i]); }
    return parent;
  }

  /* ---------- Hilfsfunktionen ---------- */
  // Ab 900 px Breite (Browser am Computer, Tablet quer) gilt die Desktop-Ansicht mit Seitenleiste und Player-Leiste.
  var wideMq = window.matchMedia ? window.matchMedia('(min-width: 900px)') : null;
  function isWide() { return !!(wideMq && wideMq.matches); }
  function fmtLong(ticks) {
    var sec = Math.round((ticks || 0) / 1e7);
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    if (h > 0) return h + ' ' + t('hours') + ' ' + m + ' ' + t('minutes');
    if (m > 0) return m + ' ' + t('minutes') + ' ' + s + ' ' + t('seconds');
    return s + ' ' + t('seconds');
  }
  function fmtClock(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    var ss = (s < 10 ? '0' : '') + s;
    return h > 0 ? h + ':' + (m < 10 ? '0' : '') + m + ':' + ss : m + ':' + ss;
  }
  function clamp(v, lo, hi) { return Math.min(hi, Math.max(lo, v)); }
  function shuffled(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var x = a[i]; a[i] = a[j]; a[j] = x;
    }
    return a;
  }
  function debounce(fn, ms) {
    var timer = null;
    return function () {
      var args = arguments, self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, ms);
    };
  }
  function greeting() {
    var h = new Date().getHours();
    return t(h < 11 ? 'greetMorning' : h < 18 ? 'greetDay' : 'greetEvening');
  }
  function firstArtist(item) {
    if (!item) return '';
    if (item.Artists && item.Artists.length) return item.Artists.join(', ');
    return item.AlbumArtist || '';
  }
  // Kuenstler eines Albums: bei mehr als zwei Album-Kuenstlern (Sammelordner) "Verschiedene Kuenstler", nie eine endlose Liste.
  function albumArtistLine(item) {
    if (!item) return '';
    var names = (item.AlbumArtists || []).map(function (a) { return a.Name; }).filter(Boolean);
    if (!names.length && item.AlbumArtist) names = [item.AlbumArtist];
    if (!names.length) names = item.Artists || [];
    if (names.length > 2) return t('variousArtists');
    return names.join(', ');
  }
  function albumArtistItems(item) {
    if (!item) return [];
    if (item.AlbumArtists && item.AlbumArtists.length) return item.AlbumArtists;
    return item.ArtistItems || [];
  }

  /* ---------- Bilder und Links ---------- */
  function imgUrl(id, tag, w) {
    var c = ML.client();
    if (!c || !id) return null;
    var p = { maxWidth: w || 300, quality: 90 };
    if (tag) p.tag = tag;
    return c.getUrl('Items/' + id + '/Images/Primary', p);
  }
  // Cover eines Eintrags: eigenes Bild, bei Titeln das Album-Cover.
  function itemImg(item, w) {
    if (!item) return null;
    var tags = item.ImageTags || {};
    if (tags.Primary) return imgUrl(item.Id, tags.Primary, w);
    if (item.AlbumId && item.AlbumPrimaryImageTag) return imgUrl(item.AlbumId, item.AlbumPrimaryImageTag, w);
    return null;
  }
  function hintImg(h, w) {
    if (!h) return null;
    if (h.PrimaryImageTag) return imgUrl(h.ItemId || h.Id, h.PrimaryImageTag, w);
    if (h.Type === 'Audio' && h.AlbumId) return imgUrl(h.AlbumId, null, w);
    return null;
  }
  function userImgUrl(userId) {
    var c = ML.client();
    return c && userId ? c.getUrl('Users/' + userId + '/Images/Primary', { maxWidth: 96, quality: 90 }) : null;
  }
  function serverId() {
    var c = ML.client();
    var info = c && c.serverInfo ? c.serverInfo() : null;
    return (info && info.Id) || '';
  }
  // Wie der Web-Client: Alben, Playlists, Künstler und Einzeltitel -> Detailseite, Ordner -> Liste, Musikbibliothek -> Musik.
  function hrefFor(item) {
    var sid = item.ServerId || serverId();
    var tail = sid ? '&serverId=' + sid : '';
    if (item.CollectionType === 'music') return '#/music?topParentId=' + item.Id + '&collectionType=music';
    if (item.Type === 'MusicGenre') return '#/list?musicGenreId=' + item.Id + tail;
    if (['Playlist', 'MusicAlbum', 'MusicArtist'].indexOf(item.Type) >= 0) return '#/details?id=' + item.Id + tail;
    if (item.IsFolder && item.Id) return '#/list?parentId=' + item.Id + tail;
    return '#/details?id=' + item.Id + tail;
  }
  // Offene Ebenen (Player, Menues) werden zuerst geschlossen; erst dann wechselt die Seite.
  function go(href) {
    var target = href.charAt(0) === '#' ? href : '#' + href;
    OV.closeAll(function () { location.hash = target; });
  }

  /* ---------- Verlauf fuer Ebenen ----------
     Jede Ebene (Player-Seite, Warteschlange, Menues) bekommt einen eigenen Eintrag im Browser-Verlauf. "Zurueck" (Geraetetaste,
     Wischgeste, Browser) schliesst dadurch erst die Ebene und bleibt auf der Playlist, statt die Seite zu verlassen. */
  var OV = (function () {
    var stack = [];        // offene Ebenen: { close: function (fromHistory), hasEntry, closed }
    var applied = 0;       // so viele eigene Verlaufseintraege liegen aktuell ueber der Seite
    var queue = [], busy = false, timer = null, expected = -1;

    function depthOf(st) { return st && typeof st.mlOv === 'number' ? st.mlOv : 0; }
    function entryCount() { return stack.filter(function (e) { return e.hasEntry; }).length; }
    function next() {
      if (busy) return;
      var op = queue.shift();
      if (op) op();
    }
    function finish() { busy = false; expected = -1; clearTimeout(timer); next(); }
    function back(n) {
      if (n <= 0) { next(); return; }
      busy = true;
      expected = applied - n;
      applied = expected;
      clearTimeout(timer);
      timer = setTimeout(finish, 600);   // falls das Ereignis ausbleibt
      try { window.history.go(-n); } catch (e) { finish(); }
    }
    function sync() {
      // Eintraege abbauen, die zu keiner offenen Ebene mehr gehoeren.
      queue.push(function () { back(applied - entryCount()); });
      next();
    }

    function push(close) {
      var e = { close: close, hasEntry: false, closed: false };
      stack.push(e);
      queue.push(function () {
        if (e.closed) { next(); return; }
        try {
          var st = {};
          var cur = window.history.state || {};
          Object.keys(cur).forEach(function (k) { st[k] = cur[k]; });
          st.mlOv = applied + 1;
          window.history.pushState(st, '');
          applied++;
          e.hasEntry = true;
        } catch (err) { /* ohne Verlaufseintrag */ }
        next();
      });
      next();
      return e;
    }
    // Die Ebene wurde per Knopf geschlossen (oder durch eine uebergeordnete Ebene).
    function release(e) {
      if (!e || e.closed) return;
      e.closed = true;
      var i = stack.indexOf(e);
      if (i >= 0) stack.splice(i, 1);
      sync();
    }
    function closeAll(then) {
      var open = stack.splice(0);
      open.reverse().forEach(function (e) { e.closed = true; e.close(true); });
      queue.push(function () { back(applied - entryCount()); });
      if (then) queue.push(function () { try { then(); } finally { next(); } });
      next();
    }

    window.addEventListener('popstate', function (ev) {
      var st = window.history.state;
      var d = depthOf(st);
      if (busy && d === expected && (st || expected === 0)) { ev.stopImmediatePropagation(); finish(); return; }
      if (!applied && !stack.length) return;            // keine Ebene betroffen
      if (st == null) {                                  // Seitenwechsel ueber die Adresse: Ebenen wegraeumen
        var all = stack.splice(0);
        all.reverse().forEach(function (e) { e.closed = true; e.close(true); });
        applied = 0; busy = false; clearTimeout(timer); queue.length = 0;
        return;
      }
      if (d < applied) {                                 // Nutzer ist zurueckgegangen
        ev.stopImmediatePropagation();
        var keep = 0, drop = [];
        stack.forEach(function (e) {
          if (e.hasEntry) { keep++; if (keep > d) drop.push(e); } else drop.push(e);
        });
        drop.reverse().forEach(function (e) {
          var i = stack.indexOf(e); if (i >= 0) stack.splice(i, 1);
          e.closed = true; e.close(true);
        });
        applied = d;
        return;
      }
      if (d > applied) {                                 // vorwaerts in eine nicht mehr vorhandene Ebene
        ev.stopImmediatePropagation();
        applied = d; sync();
      }
    }, true);

    return { push: push, release: release, closeAll: closeAll, count: function () { return stack.length; } };
  })();

  /* ---------- Teilen: Adresse des Servers ---------- */
  function hostLooksPublic(host) {
    return /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i.test(host) && !/^\d+(\.\d+){3}$/.test(host);
  }
  // Basis fuer Links: Einstellung "Link-Adresse", sonst die Adresse des Servers (nicht die der App).
  function shareBase() {
    var custom = String((ML.config() || {}).shareBaseUrl || '').trim().replace(/\s+/g, '');
    var root = '';
    if (custom) {
      root = /^https?:\/\//i.test(custom) ? custom : 'https://' + custom;
      root = root.replace(/[#?].*$/, '').replace(/\/+$/, '').replace(/\/web(\/index\.html)?$/i, '');
    } else {
      var here = location.href.split('#')[0];
      var okHere = /^https?:\/\//i.test(here) && !/^https?:\/\/(appassets\.androidplatform\.net|localhost|127\.0\.0\.1)(:|\/|$)/i.test(here);
      if (okHere) return here;
      var c = ML.client();
      try { root = String((c && c.serverAddress && c.serverAddress()) || '').replace(/\/+$/, ''); } catch (e) { root = ''; }
      if (!root) return here;
    }
    return root + '/web/index.html';
  }
  function linkFor(id) { return shareBase() + '#/details?id=' + id + (serverId() ? '&serverId=' + serverId() : ''); }
  function shareHostIsPublic() {
    try { return hostLooksPublic(new URL(shareBase()).hostname); } catch (e) { return false; }
  }

  // Cover-Kachel mit Platzhalter; das Bild legt sich darueber und verschwindet bei Ladefehlern wieder.
  function cover(url, cls) {
    var d = el('div', 'ml-cover' + (cls ? ' ' + cls : ''));
    d.appendChild(icon('note', 'ml-cover-ph'));
    if (url) {
      var i = el('img');
      i.alt = ''; i.loading = 'lazy'; i.decoding = 'async'; i.draggable = false;
      i.addEventListener('error', function () { if (i.parentNode) i.parentNode.removeChild(i); });
      i.src = url;
      d.appendChild(i);
    }
    return d;
  }

  /* Farbpalette aus dem Cover (wie bei Spotify: kraeftige, abgedunkelte Tinte der Cover-Farbe).
     Liefert null, wenn das Bild nicht lesbar ist. */
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn;
    if (d > 0) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: h, s: s, l: l };
  }
  function hslCss(h, s, l) { return 'hsl(' + Math.round(h) + ',' + Math.round(s * 100) + '%,' + Math.round(l * 100) + '%)'; }
  function coverPalette(img) {
    try {
      var N = 16;
      var c = document.createElement('canvas');
      c.width = N; c.height = N;
      var g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, N, N);
      var d = g.getImageData(0, 0, N, N).data;
      var r = 0, gr = 0, b = 0, w = 0;
      for (var i = 0; i < d.length; i += 4) {
        var mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
        var weight = 1 + (mx - mn) / 48;            // kraeftige Farben zaehlen mehr als Grau
        if (mx < 28 || mn > 228) weight *= 0.15;     // fast Schwarz / fast Weiss kaum beachten
        r += d[i] * weight; gr += d[i + 1] * weight; b += d[i + 2] * weight; w += weight;
      }
      if (!w) return null;
      var hsl = rgbToHsl(r / w, gr / w, b / w);
      var sat = hsl.s < 0.08 ? hsl.s : clamp(hsl.s * 1.15, 0.3, 0.72);   // Graue Cover bleiben grau
      return { base: hslCss(hsl.h, sat, 0.3), deep: hslCss(hsl.h, sat * 0.75, 0.1), card: hslCss(hsl.h, sat, 0.4) };
    } catch (e) { return null; }
  }
  function setPalette(host, pal) {
    if (!pal) { ['--ml-hero', '--ml-hero-deep', '--ml-hero-card'].forEach(function (k) { host.style.removeProperty(k); }); return; }
    host.style.setProperty('--ml-hero', pal.base);
    host.style.setProperty('--ml-hero-deep', pal.deep);
    host.style.setProperty('--ml-hero-card', pal.card);
  }
  function applyHeroColor(host, img) {
    function run() { var pal = coverPalette(img); if (pal) setPalette(host, pal); }
    if (img.complete && img.naturalWidth) run(); else img.addEventListener('load', run, { once: true });
  }

  /* ---------- Daten ---------- */
  var libCache = { at: 0, list: null, all: [] };
  var plCache = { at: 0, list: null };

  function getItems(params) {
    var p = { UserId: uid() };
    Object.keys(params || {}).forEach(function (k) { p[k] = params[k]; });
    return call('GET', 'Items', p).then(function (r) {
      return r ? { items: r.Items || [], total: r.TotalRecordCount || 0 } : { items: [], total: 0 };
    });
  }
  function itemsOf(params) { return getItems(params).then(function (r) { return r.items; }); }

  function categoryOf(lib) {
    var cfg = ML.config();
    // Umlaute werden aufgeloest, damit "Hörbücher" und "Hoerbuecher" gleich behandelt werden.
    function norm(s) { return String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss'); }
    var name = norm(lib.Name);
    function hit(list) { return (list || []).some(function (k) { return k && name.indexOf(norm(k)) >= 0; }); }
    if (hit(cfg.podcastKeywords)) return 'podcasts';
    if (hit(cfg.audiobookKeywords)) return 'audiobooks';
    return lib.CollectionType === 'music' ? 'music' : null;
  }

  // Alle Bibliotheken, die zu einem der Reiter Musik / Podcasts / Hörbücher gehören.
  function loadLibraries() {
    if (libCache.list && Date.now() - libCache.at < 120000) return Promise.resolve(libCache.list);
    return call('GET', 'Users/' + uid() + '/Views').then(function (r) {
      var out = [], all = [];
      ((r && r.Items) || []).forEach(function (lib) {
        var cat = categoryOf(lib);
        all.push({ id: lib.Id, name: lib.Name, type: lib.CollectionType || '', cat: cat || '' });
        if (cat) out.push({ id: lib.Id, name: lib.Name, type: lib.CollectionType || '', cat: cat });
      });
      libCache = { at: Date.now(), list: out, all: all };
      if (plCache.list) storeLists();
      return out;
    });
  }

  // Playlists, die der Benutzer sehen darf, samt Besitzer und Rechten (Plugin-Endpunkt) und Namen/Beschreibung (Jellyfin).
  function loadPlaylists(force) {
    if (!force && plCache.list && Date.now() - plCache.at < 30000) return Promise.resolve(plCache.list);
    return Promise.all([
      call('GET', 'MusicLook/Playlists').catch(function () { return []; }),
      itemsOf({ IncludeItemTypes: 'Playlist', Recursive: true, MediaTypes: 'Audio', SortBy: 'SortName', Fields: 'Overview,ChildCount,DateCreated' })
    ]).then(function (res) {
      var meta = {};
      (res[0] || []).forEach(function (m) { meta[nid(m.id)] = m; });
      var list = res[1].map(function (it) {
        var m = meta[nid(it.Id)] || { ownerId: '', ownerName: '', isOwner: false, canEdit: false, isPublic: false, sharedWithMe: false, customCover: false };
        return { id: it.Id, item: it, info: m };
      });
      plCache = { at: Date.now(), list: list };
      storeLists();
      return list;
    });
  }

  /* ---------- Sofort anzeigen, im Hintergrund auffrischen ----------
     Waehrend eines Bibliotheksscans antwortet der Server langsam. Damit die Ansicht trotzdem sofort steht, merkt sich die App
     Playlists und Bibliotheken im Browser und zeigt beim naechsten Oeffnen zuerst den letzten Stand. */
  function storeLists() {
    try {
      var data = JSON.stringify({ uid: uid(), pls: plCache.list || [], all: libCache.all || [] });
      if (data.length < 600000) window.localStorage.setItem('ml.lists1', data);
    } catch (e) { /* Speicher voll oder gesperrt */ }
  }
  function storedLists() {
    try {
      var s = JSON.parse(window.localStorage.getItem('ml.lists1') || 'null');
      if (s && s.uid === uid() && Array.isArray(s.pls)) return s;
    } catch (e) { /* ungueltig */ }
    return null;
  }
  // Letzter bekannter Stand (Speicher oder Browser) oder null.
  function peekLists() {
    var pls = plCache.list, all = libCache.all && libCache.all.length ? libCache.all : null;
    if (!pls || !all) {
      var st = storedLists();
      if (!st) return null;
      pls = pls || st.pls; all = all || st.all;
    }
    var libs = all.filter(function (l) { return l.cat; });
    return { pls: pls, libs: libs };
  }
  function plSig(list) {
    return (list || []).map(function (p) {
      return [p.id, p.item.Name, p.item.ChildCount || 0, JSON.stringify(p.item.ImageTags || {}), p.info.customCover ? 1 : 0, p.info.isOwner ? 1 : 0, p.info.isPublic ? 1 : 0].join('|');
    }).join(';');
  }
  function libSig(list) { return (list || []).map(function (l) { return l.id + '|' + l.name + '|' + l.cat; }).join(';'); }
  // pid: nur dieses Playlist-Cover neu bestimmen (z. B. nach dem Hinzufuegen eines Titels); ohne pid nur die Liste.
  function invalidatePlaylists(pid) {
    plCache.at = 0;
    sideDirty = true;
    scheduleSide();
    if (pid) forgetCover(pid);
  }

  function loadPlaylistTracks(id) {
    var out = [];
    function page(start) {
      return call('GET', 'Playlists/' + id + '/Items', { UserId: uid(), StartIndex: start, Limit: 500 }).then(function (r) {
        var items = (r && r.Items) || [];
        out = out.concat(items);
        var total = (r && r.TotalRecordCount) || 0;
        return items.length >= 500 && out.length < total && out.length < 5000 ? page(start + 500) : out;
      });
    }
    return page(0);
  }
  function loadAlbumTracks(id) {
    return itemsOf({ ParentId: id, IncludeItemTypes: 'Audio', Recursive: true, SortBy: 'ParentIndexNumber,IndexNumber,SortName', Limit: 1000 });
  }
  function loadLikedTracks() {
    return itemsOf({ IsFavorite: true, IncludeItemTypes: 'Audio,AudioBook', Recursive: true, SortBy: 'DatePlayed,SortName', SortOrder: 'Descending,Ascending', Limit: 2000, Fields: 'ParentId' });
  }
  function loadItem(id, fields) {
    return itemsOf({ Ids: id, Fields: fields || 'Overview,ChildCount,Genres' }).then(function (a) { return a[0] || null; });
  }
  function idsOf(tracks) { return tracks.map(function (x) { return x.Id; }); }

  /* ---------- Wiedergabe (ueber die Sitzung des Web-Clients) ---------- */
  var sessCache = { at: 0, s: null };
  function getSession(force) {
    // Steuert der Player gerade ein anderes Geraet (Geraete-Wechsel), gehen alle Befehle dorthin.
    var remote = typeof Player !== 'undefined' && Player && Player.targetId ? Player.targetId() : null;
    if (remote) return Promise.resolve({ Id: remote, remote: true });
    if (!force && sessCache.s && Date.now() - sessCache.at < 20000) return Promise.resolve(sessCache.s);
    return ML.mySession().then(function (s) { sessCache = { at: Date.now(), s: s }; return s; });
  }
  // Fuehrt fn mit der eigenen Sitzung aus; bei Fehlern einmal mit frisch ermittelter Sitzung.
  function withSession(fn) {
    return getSession().then(function (s) {
      if (!s) throw new Error('no session');
      return fn(s);
    }).catch(function () {
      return getSession(true).then(function (s) {
        if (!s) throw new Error('no session');
        return fn(s);
      });
    });
  }
  function sessionCall(s, path, params) { return call('POST', 'Sessions/' + s.Id + '/' + path, params || null); }

  var PLAY_CHUNK = 150;   // Die Titel stehen in der Adresse; so bleibt sie unter ca. 5 KB.

  // Wartet, bis der erste Titel laeuft, damit nachfolgende "PlayLast"-Befehle die Warteschlange erweitern statt neu zu starten.
  function waitForPlaying(id, tries) {
    var look = typeof Player !== 'undefined' && Player && Player.sessionNow ? Player.sessionNow : ML.mySession;
    return look().then(function (s) {
      var np = s && s.NowPlayingItem;
      if (np && nid(np.Id) === nid(id)) return true;
      if (tries <= 0) return false;
      return new Promise(function (r) { setTimeout(r, 500); }).then(function () { return waitForPlaying(id, tries - 1); });
    }, function () { return false; });
  }

  // Spielt die Titel ab dem Index start; sehr lange Listen werden ab start nachgeladen.
  // opts.positionTicks: Startposition im ersten Titel (Geraete-Wechsel).
  function playIds(ids, start, opts) {
    ids = (ids || []).filter(function (id) { return ID_RE.test(id); });
    opts = opts || {};
    if (!ids.length) return Promise.resolve();
    start = clamp(start || 0, 0, ids.length - 1);
    var head, startIndex, rest = [];
    if (ids.length <= PLAY_CHUNK) { head = ids; startIndex = start; }
    else {
      var tail = ids.slice(start);
      head = tail.slice(0, PLAY_CHUNK); startIndex = 0;
      rest = ML.chunk(tail.slice(PLAY_CHUNK), PLAY_CHUNK);
    }
    return withSession(function (s) {
      var first = { playCommand: 'PlayNow', itemIds: head.join(','), startIndex: startIndex };
      if (opts.positionTicks > 0) first.startPositionTicks = Math.round(opts.positionTicks);
      return sessionCall(s, 'Playing', first).then(function () {
        if (!rest.length) return null;
        return waitForPlaying(head[startIndex], 16).then(function () {
          return rest.reduce(function (p, part) {
            return p.then(function () { return sessionCall(s, 'Playing', { playCommand: 'PlayLast', itemIds: part.join(',') }); });
          }, Promise.resolve());
        });
      });
    }).then(function () { Player.kick(); return true; }, function () { toast(t('playFailed')); return false; });
  }

  function queueIds(ids) {
    ids = (ids || []).filter(function (id) { return ID_RE.test(id); });
    if (!ids.length) return Promise.resolve();
    return withSession(function (s) {
      return ML.chunk(ids, PLAY_CHUNK).reduce(function (p, part) {
        return p.then(function () { return sessionCall(s, 'Playing', { playCommand: 'PlayLast', itemIds: part.join(',') }); });
      }, Promise.resolve());
    }).then(function () { toast(t('queued')); Player.kick(); }, function () { toast(t('playFailed')); });
  }

  // Herz: neue Route (ab Jellyfin 10.9), bei Fehlern die alte; die Antwort des Servers wird geprueft.
  function setFavorite(id, on) {
    var verb = on ? 'POST' : 'DELETE';
    return call(verb, 'UserFavoriteItems/' + id, { userId: uid() }).catch(function () {
      return call(verb, 'Users/' + uid() + '/FavoriteItems/' + id);
    }).then(function (r) {
      if (r && typeof r.IsFavorite === 'boolean' && r.IsFavorite !== on) throw new Error('not saved');
      likedDirty = true;
      return r;
    });
  }
  var likedDirty = false;
  function setFavorites(ids, on) {
    return ids.reduce(function (p, id) { return p.then(function () { return setFavorite(id, on); }); }, Promise.resolve());
  }

  function jamWith(ids) {
    return ML.jamAddIds(ids).then(function () { toast(t('jamAdded')); }, function () { toast(t('jamFailed')); });
  }

  function songRadio(track) {
    return call('GET', 'Songs/' + track.Id + '/InstantMix', { UserId: uid(), Limit: 100 }).then(function (r) {
      var ids = ((r && r.Items) || []).map(function (i) { return i.Id; }).filter(function (id) { return nid(id) !== nid(track.Id); });
      if (!ids.length) { toast(t('radioFailed')); return; }
      return playIds([track.Id].concat(ids), 0);
    }, function () { toast(t('radioFailed')); });
  }

  /* ---------- Sheets und Menues ---------- */
  function makeSheet(opts) {
    opts = opts || {};
    var backdrop = el('div', 'ml-backdrop' + (opts.top ? ' ml-top' : ''));
    var sheet = el('div', 'ml-sheet' + (opts.cls ? ' ' + opts.cls : ''));
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    if (opts.title) sheet.setAttribute('aria-label', opts.title);
    backdrop.appendChild(sheet);
    var closed = false, unfit = null, entry = null;
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
    function close(fromHistory) {
      if (closed) return;
      closed = true;
      if (unfit) { unfit(); unfit = null; }
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      document.removeEventListener('keydown', onKey, true);
      if (fromHistory !== true) OV.release(entry);
      if (opts.onClose) opts.onClose();
    }
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(backdrop);
    entry = OV.push(close);
    // Die Bildschirmtastatur verkleinert nur den sichtbaren Bereich; das Sheet bleibt dadurch ueber der Tastatur.
    if (ML.fitViewport) unfit = ML.fitViewport(backdrop);
    // Eingabefelder bleiben sichtbar: oben ausgerichtete Dialoge + Feld in die Mitte des sichtbaren Bereichs rollen.
    backdrop.addEventListener('focusin', function (e) {
      var f = e.target;
      if (!f || (f.tagName !== 'INPUT' && f.tagName !== 'TEXTAREA')) return;
      [60, 350].forEach(function (ms) {
        setTimeout(function () { try { f.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (err) { /* ignorieren */ } }, ms);
      });
    });
    return { sheet: sheet, close: close };
  }

  function sheetTitle(ui, text, sub) {
    ui.sheet.appendChild(el('h3', 'ml-sheet-title', text));
    if (sub) ui.sheet.appendChild(el('div', 'ml-sheet-sub', sub));
  }

  // Kontextmenue im Spotify-Stil: Kopf mit Cover und Titel, darunter Eintraege mit Symbol.
  function openMenu(head, entries) {
    var ui = makeSheet({ cls: 'ml-menu', title: head.title });
    var top = el('div', 'ml-menu-head');
    if (head.coverEl) { head.coverEl.classList.add('ml-menu-cover'); top.appendChild(head.coverEl); }
    else top.appendChild(cover(head.cover, 'ml-menu-cover' + (head.round ? ' ml-round' : '')));
    var text = el('div', 'ml-menu-text');
    text.appendChild(el('div', 'ml-menu-title', head.title));
    if (head.subtitle) text.appendChild(el('div', 'ml-menu-sub', head.subtitle));
    top.appendChild(text);
    ui.sheet.appendChild(top);
    entries.forEach(function (e) {
      if (!e || e.hidden) return;
      var b = btn('ml-menu-item' + (e.danger ? ' ml-danger' : ''));
      b.appendChild(icon(e.icon || 'note'));
      b.appendChild(el('span', 'ml-menu-label', e.label));
      b.addEventListener('click', function () { ui.close(); e.run(); });
      ui.sheet.appendChild(b);
    });
    return ui;
  }

  function confirmSheet(title, text, label, danger) {
    return new Promise(function (resolve) {
      var answered = false;
      var ui = makeSheet({ title: title, onClose: function () { if (!answered) resolve(false); } });
      sheetTitle(ui, title);
      ui.sheet.appendChild(el('p', 'ml-sheet-text', text));
      var row = el('div', 'ml-sheet-actions');
      var no = btn('ml-pill ml-flat', t('cancel'));
      var yes = btn('ml-pill ' + (danger ? 'ml-danger-pill' : 'ml-primary'), label);
      no.addEventListener('click', function () { ui.close(); });
      yes.addEventListener('click', function () { answered = true; ui.close(); resolve(true); });
      add(row, no, yes);
      ui.sheet.appendChild(row);
    });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = el('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
      document.body.appendChild(ta);
      ta.select();
      try { if (document.execCommand('copy')) resolve(); else reject(new Error('copy')); } catch (e) { reject(e); }
      if (ta.parentNode) ta.parentNode.removeChild(ta);
    });
  }

  // Teilen: Link kopieren oder ueber das Teilen-Menue des Geraets; bei eigenen Playlists zusaetzlich Personen einladen.
  function openShare(opts) {
    var ui = makeSheet({ cls: 'ml-menu', title: t('share') });
    var top = el('div', 'ml-menu-head');
    top.appendChild(cover(opts.cover, 'ml-menu-cover'));
    var text = el('div', 'ml-menu-text');
    text.appendChild(el('div', 'ml-menu-title', opts.title));
    if (opts.subtitle) text.appendChild(el('div', 'ml-menu-sub', opts.subtitle));
    top.appendChild(text);
    ui.sheet.appendChild(top);

    function row(ic, label, fn) {
      var b = btn('ml-menu-item');
      b.appendChild(icon(ic));
      b.appendChild(el('span', 'ml-menu-label', label));
      b.addEventListener('click', fn);
      ui.sheet.appendChild(b);
    }
    var urlBox = el('input', 'ml-field ml-share-url');
    urlBox.type = 'text'; urlBox.readOnly = true; urlBox.value = opts.url; urlBox.setAttribute('aria-label', t('copyLink'));
    urlBox.addEventListener('focus', function () { try { urlBox.select(); } catch (e) { /* ignorieren */ } });
    ui.sheet.appendChild(urlBox);
    row('link', t('copyLink'), function () {
      copyText(opts.url).then(function () { toast(t('linkCopied')); ui.close(); }, function () { try { urlBox.focus(); urlBox.select(); } catch (e) { /* ignorieren */ } toast(t('copyManual')); });
    });
    if (navigator.share) {
      row('share', t('shareNative'), function () {
        navigator.share({ title: opts.title, text: opts.subtitle || opts.title, url: opts.url }).then(function () { ui.close(); }, function () { /* abgebrochen */ });
      });
    }
    if (opts.invite) row('person_add', t('mInvite'), function () { ui.close(); ML.openShareSheet(opts.invite); });
    ui.sheet.appendChild(el('div', 'ml-sheet-note', opts.note || t('shareHint')));
    if (!shareHostIsPublic()) ui.sheet.appendChild(el('div', 'ml-sheet-note ml-warn', t('shareLinkWarn')));
  }

  /* ---------- Zu Playlist hinzufuegen ---------- */
  function createPlaylistWith(name, ids) {
    var parts = ML.chunk(ids, 80);
    // IsPublic muss ausdruecklich false sein: Jellyfin legt Playlists sonst oeffentlich an.
    return call('POST', 'Playlists', null, { Name: name, Ids: parts[0] || [], UserId: uid(), MediaType: 'Audio', IsPublic: false }).then(function (r) {
      var pid = r && (r.Id || r.id);
      if (!pid) throw new Error('no id');
      return parts.slice(1).reduce(function (p, part) { return p.then(function () { return addToPlaylistIds(pid, part); }); }, Promise.resolve()).then(function () {
        invalidatePlaylists(pid);
        return pid;
      });
    });
  }
  function addToPlaylistIds(pid, ids) {
    return ML.chunk(ids, 80).reduce(function (p, part) {
      return p.then(function () { return call('POST', 'Playlists/' + pid + '/Items', { Ids: part.join(','), UserId: uid() }); });
    }, Promise.resolve()).then(function (r) { forgetCover(pid); plCache.at = 0; return r; });
  }

  function playlistRow(label, sub, img, onClick, coverEl) {
    var b = btn('ml-list-row');
    b.appendChild(coverEl || cover(img, 'ml-row-cover'));
    var txt = el('div', 'ml-row-text');
    txt.appendChild(el('div', 'ml-row-title', label));
    if (sub) txt.appendChild(el('div', 'ml-row-sub', sub));
    b.appendChild(txt);
    b.addEventListener('click', onClick);
    return b;
  }

  function playlistCoverUrl(pl, w) {
    var tags = pl.item.ImageTags || {};
    return pl.info.customCover && tags.Primary ? imgUrl(pl.id, tags.Primary, w || 120) : null;
  }

  // Dialog fuer den Namen einer neuen Playlist. Oben ausgerichtet, damit die Bildschirmtastatur ihn nie verdeckt.
  function newPlaylistDialog(ids, opts) {
    opts = opts || {};
    var ui = makeSheet({ cls: 'ml-dialog', top: true, title: t('mNewPlaylist') });
    sheetTitle(ui, t('mNewPlaylist'), ids && ids.length ? countText(ids.length) : '');
    var input = el('input', 'ml-field ml-field-box');
    input.type = 'text'; input.maxLength = 100; input.placeholder = t('newPlaylistPh'); input.setAttribute('autocomplete', 'off');
    ui.sheet.appendChild(input);
    var row = el('div', 'ml-sheet-actions');
    var no = btn('ml-pill ml-flat', t('cancel'));
    var make = btn('ml-pill ml-primary', t('createPlaylist'));
    no.addEventListener('click', function () { ui.close(); });
    add(row, no, make);
    ui.sheet.appendChild(row);
    function submit() {
      var name = input.value.trim();
      if (!name) { input.focus(); return; }
      make.disabled = true;
      createPlaylistWith(name, ids || []).then(function (pid) {
        ui.close(); toast(t('playlistCreated', name));
        if (opts.onCreated) opts.onCreated(pid); else if (opts.onDone) opts.onDone();
      }, function () { make.disabled = false; toast(t('createFailed')); });
    }
    make.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    setTimeout(function () { try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); } }, 150);
  }

  // Auswahl: neue Playlist oder eine vorhandene (nur bearbeitbare), bei laufender Jam auch deren Warteschlange.
  function addToPlaylist(ids, opts) {
    ids = (ids || []).filter(function (id) { return ID_RE.test(id); });
    if (!ids.length) return;
    opts = opts || {};
    var ui = makeSheet({ title: t('addToTitle') });
    sheetTitle(ui, t('addToTitle'), countText(ids.length));

    var jamState = ML.jamState();
    if (jamState.code) {
      var jb = btn('ml-menu-item');
      jb.appendChild(icon('group'));
      jb.appendChild(el('span', 'ml-menu-label', t('toJam')));
      jb.addEventListener('click', function () { ui.close(); jamWith(ids); });
      ui.sheet.appendChild(jb);
    }

    var create = btn('ml-menu-item');
    create.appendChild(icon('add'));
    create.appendChild(el('span', 'ml-menu-label', t('mNewPlaylist')));
    create.addEventListener('click', function () { ui.close(); newPlaylistDialog(ids, opts); });
    ui.sheet.appendChild(create);

    var likeRow = btn('ml-menu-item');
    likeRow.appendChild(icon('heart'));
    likeRow.appendChild(el('span', 'ml-menu-label', t('liked')));
    likeRow.addEventListener('click', function () {
      likeRow.disabled = true;
      setFavorites(ids, true).then(function () {
        toast(t('addedTo', t('liked'))); ui.close();
        ids.forEach(function (id) { Player.refreshFavorite(id, true); });
        if (opts.onDone) opts.onDone();
      }, function () { likeRow.disabled = false; toast(t('addFailed')); });
    });
    ui.sheet.appendChild(likeRow);

    var list = el('div', 'ml-sheet-list');
    ui.sheet.appendChild(list);
    list.appendChild(el('div', 'ml-sheet-note', t('loading')));
    loadPlaylists(true).then(function (all) {
      list.textContent = '';
      all.filter(function (p) { return p.info.canEdit && (!opts.excludeId || nid(p.id) !== nid(opts.excludeId)); }).forEach(function (p) {
        var sub = p.item.ChildCount != null ? countText(p.item.ChildCount) : '';
        list.appendChild(playlistRow(p.item.Name, sub, null, function () {
          addToPlaylistIds(p.id, ids).then(function () {
            invalidatePlaylists(p.id); toast(t('addedTo', p.item.Name)); ui.close(); if (opts.onDone) opts.onDone();
          }, function () { toast(t('addFailed')); });
        }, playlistCover(p, 'ml-row-cover', 120)));
      });
    }, function () { list.textContent = ''; list.appendChild(el('div', 'ml-sheet-note', t('loadFailed'))); });
  }

  /* ---------- Titel zu einer Playlist (oder zu den Lieblingssongs) hinzufuegen (Suche) ---------- */
  // target: Playlist { id, item } oder { liked: true } fuer die Lieblingssongs (Herz).
  function openAddSongs(target, onChanged) {
    var changed = false, liked = !!target.liked;
    var title = liked ? t('liked') : target.item.Name;
    var ui = makeSheet({ cls: 'ml-tall', title: t('addSongsTitle'), onClose: function () { if (changed && onChanged) onChanged(); } });
    sheetTitle(ui, t('addSongsTitle'), title);
    var input = el('input', 'ml-field ml-search-field');
    input.type = 'search'; input.placeholder = t('searchSongsPh'); input.setAttribute('autocomplete', 'off');
    ui.sheet.appendChild(input);
    var list = el('div', 'ml-sheet-list');
    ui.sheet.appendChild(list);
    var seq = 0;

    function show(items) {
      list.textContent = '';
      items.forEach(function (it) {
        var row = el('div', 'ml-list-row ml-static');
        row.appendChild(cover(itemImg(it, 96), 'ml-row-cover'));
        var txt = el('div', 'ml-row-text');
        txt.appendChild(el('div', 'ml-row-title', it.Name));
        txt.appendChild(el('div', 'ml-row-sub', firstArtist(it)));
        row.appendChild(txt);
        var on = liked && !!(it.UserData && it.UserData.IsFavorite);
        var b = iconBtn(liked ? (on ? 'heart' : 'heart_o') : 'add', liked ? (on ? t('mUnlike') : t('mLike')) : t('mAddToPlaylist'), 'ml-add-btn' + (on ? ' ml-on' : ''));
        b.addEventListener('click', function () {
          b.disabled = true;
          if (liked) {
            var want = !on;
            setFavorite(it.Id, want).then(function () {
              on = want; changed = true;
              it.UserData = it.UserData || {}; it.UserData.IsFavorite = on;
              b.disabled = false; b.classList.toggle('ml-on', on);
              b.textContent = ''; b.appendChild(icon(on ? 'heart' : 'heart_o'));
              Player.refreshFavorite(it.Id, on);
            }, function () { b.disabled = false; toast(t('addFailed')); });
            return;
          }
          addToPlaylistIds(target.id, [it.Id]).then(function () {
            b.textContent = ''; b.appendChild(icon('check')); b.classList.add('ml-on'); changed = true;
            hintCover(target.id, it);
          }, function () { b.disabled = false; toast(t('addFailed')); });
        });
        row.appendChild(b);
        list.appendChild(row);
      });
      if (!items.length) list.appendChild(el('div', 'ml-sheet-note', t('nothingYet')));
    }
    function run() {
      var q = input.value.trim();
      var my = ++seq;
      var params = q ? { SearchTerm: q, Limit: 40 } : { SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 30 };
      params.IncludeItemTypes = 'Audio'; params.Recursive = true;
      itemsOf(params).then(function (items) { if (my === seq) show(items); }, function () {
        if (my === seq) { list.textContent = ''; list.appendChild(el('div', 'ml-sheet-note', t('loadFailed'))); }
      });
    }
    input.addEventListener('input', debounce(run, 300));
    run();
  }

  /* ---------- Songinfos ---------- */
  function openSongInfo(track) {
    var ui = makeSheet({ title: t('infoTitle') });
    sheetTitle(ui, t('infoTitle'));
    var table = el('div', 'ml-info');
    ui.sheet.appendChild(table);
    function line(label, value) {
      if (value == null || value === '') return;
      var r = el('div', 'ml-info-row');
      r.appendChild(el('span', 'ml-info-k', label));
      r.appendChild(el('span', 'ml-info-v', String(value)));
      table.appendChild(r);
    }
    function render(it) {
      table.textContent = '';
      var src = (it.MediaSources && it.MediaSources[0]) || {};
      var stream = (src.MediaStreams || []).filter(function (s) { return s.Type === 'Audio'; })[0] || {};
      line(t('iTitle'), it.Name);
      line(t('iArtist'), firstArtist(it));
      line(t('iAlbum'), it.Album);
      line(t('iTrack'), it.IndexNumber != null ? ((it.ParentIndexNumber ? it.ParentIndexNumber + '-' : '') + it.IndexNumber) : '');
      line(t('iYear'), it.ProductionYear);
      line(t('iGenre'), (it.Genres || []).join(', '));
      line(t('iLength'), it.RunTimeTicks ? fmtClock(it.RunTimeTicks / 1e7) : '');
      line(t('iFormat'), String(src.Container || stream.Codec || '').toUpperCase());
      line(t('iBitrate'), (stream.BitRate || src.Bitrate) ? Math.round((stream.BitRate || src.Bitrate) / 1000) + ' kbit/s' : '');
      line(t('iSampleRate'), stream.SampleRate ? (stream.SampleRate / 1000) + ' kHz' : '');
      line(t('iSize'), src.Size ? (src.Size / 1048576).toFixed(1) + ' MB' : '');
    }
    render(track);
    loadItem(track.Id, 'MediaSources,Genres').then(function (it) { if (it) render(it); }, function () { /* Basisdaten bleiben */ });
  }

  /* ---------- Geschwindigkeit ---------- */
  var SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
  var speed = 1;
  try { speed = parseFloat(window.localStorage.getItem('ml.speed')) || 1; } catch (e) { speed = 1; }
  if (SPEEDS.indexOf(speed) < 0) speed = 1;
  function applySpeed() {
    var a = document.querySelector('audio.mediaPlayerAudio');
    if (!a) return;
    try { a.defaultPlaybackRate = speed; a.playbackRate = speed; a.preservesPitch = true; if ('mozPreservesPitch' in a) a.mozPreservesPitch = true; } catch (e) { /* ignorieren */ }
  }
  function openSpeed() {
    var ui = makeSheet({ title: t('speedTitle') });
    sheetTitle(ui, t('speedTitle'));
    SPEEDS.forEach(function (v) {
      var b = btn('ml-menu-item' + (v === speed ? ' ml-on' : ''));
      b.appendChild(icon(v === speed ? 'check' : 'speed'));
      b.appendChild(el('span', 'ml-menu-label', v === 1 ? t('speedNormal') : v + '×'));
      b.addEventListener('click', function () {
        speed = v; ML.safeStore('ml.speed', String(v)); applySpeed(); ui.close();
      });
      ui.sheet.appendChild(b);
    });
  }

  /* ---------- Download ---------- */
  function startDownload(url, filename, title, itemId) {
    var item = { url: url, itemId: itemId, serverId: serverId(), title: title, filename: filename };
    var shell = window.NativeShell;
    if (shell && shell.downloadFiles) { shell.downloadFiles([item]); return; }
    if (shell && shell.downloadFile) { shell.downloadFile(item); return; }
    var a = document.createElement('a');
    a.href = url; a.download = filename; a.rel = 'noopener';
    document.body.appendChild(a); a.click();
    if (a.parentNode) a.parentNode.removeChild(a);
  }

  function openDownload(pl) {
    var ui = makeSheet({ title: t('dlTitle') });
    sheetTitle(ui, t('dlTitle'), pl.item.Name);
    ui.sheet.appendChild(el('p', 'ml-sheet-text', t('dlText')));
    var go = btn('ml-pill ml-primary', t('dlStart'));
    go.addEventListener('click', function () {
      var c = ML.client();
      var url = c.getUrl('MusicLook/Playlist/' + pl.id + '/Download', { api_key: c.accessToken() });
      startDownload(url, pl.item.Name + '.zip', pl.item.Name, pl.id);
      toast(t('dlStarted'));
      ui.close();
    });
    ui.sheet.appendChild(go);
  }

  /* ---------- Cover und Details bearbeiten ---------- */
  function postText(path, text) {
    var c = ML.client();
    return c.ajax({ type: 'POST', url: c.getUrl(path), data: text, contentType: 'text/plain' });
  }

  // Quadratischer Ausschnitt, hoechstens 800 x 800, als JPEG (base64 ohne Praefix).
  function imageFileToJpeg(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        try {
          var w = img.naturalWidth, h = img.naturalHeight;
          if (!w || !h) throw new Error('empty image');
          var side = Math.min(w, h), out = Math.min(800, side);
          var cv = document.createElement('canvas');
          cv.width = out; cv.height = out;
          var g = cv.getContext('2d');
          g.fillStyle = '#000'; g.fillRect(0, 0, out, out);
          g.drawImage(img, (w - side) / 2, (h - side) / 2, side, side, 0, 0, out, out);
          var data = cv.toDataURL('image/jpeg', 0.86);
          URL.revokeObjectURL(url);
          resolve({ base64: data.slice(data.indexOf(',') + 1), preview: data });
        } catch (e) { URL.revokeObjectURL(url); reject(e); }
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('unreadable image')); };
      img.src = url;
    });
  }

  function openDetails(ctx, opts) {
    var pl = ctx.pl;
    var pending = null, removeCover = false;
    var ui = makeSheet({ cls: 'ml-tall', title: t('detailsTitle') });
    sheetTitle(ui, t('detailsTitle'));

    var file = el('input');
    file.type = 'file'; file.accept = 'image/*'; file.hidden = true;
    var preview = el('button', 'ml-cover-edit');
    preview.type = 'button';
    preview.setAttribute('aria-label', t('chooseImage'));
    function showPreview(url, noCustom) {
      preview.textContent = '';
      preview.appendChild(url ? cover(url, 'ml-cover-edit-img') : noCustom ? mosaic(ctx.tracks, 'ml-cover-edit-img') : coverFor(ctx, 'ml-cover-edit-img'));
      preview.appendChild(el('span', 'ml-cover-edit-badge')).appendChild(icon('camera'));
    }
    showPreview(null);
    preview.addEventListener('click', function () { file.click(); });
    file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      if (!f) return;
      imageFileToJpeg(f).then(function (r) { pending = r.base64; removeCover = false; showPreview(r.preview); refresh(); }, function () { toast(t('coverFailed')); });
    });
    ui.sheet.appendChild(file);
    ui.sheet.appendChild(preview);
    ui.sheet.appendChild(el('div', 'ml-sheet-note ml-center', t('coverHint')));

    var nameLabel = el('label', 'ml-label', t('nameLabel'));
    var name = el('input', 'ml-field ml-field-box');
    name.type = 'text'; name.maxLength = 100; name.value = pl.item.Name || '';
    var descLabel = el('label', 'ml-label', t('descLabel'));
    var desc = el('textarea', 'ml-field ml-field-box ml-textarea');
    desc.maxLength = 500; desc.rows = 3; desc.placeholder = t('descPh'); desc.value = pl.item.Overview || '';
    add(ui.sheet, nameLabel, name, descLabel, desc);

    var row = el('div', 'ml-sheet-actions');
    var drop = btn('ml-pill ml-flat', t('removeImage'));
    var save = btn('ml-pill ml-primary', t('save'));
    drop.addEventListener('click', function () { pending = null; removeCover = true; showPreview(null, true); refresh(); });
    function refresh() { drop.hidden = !((pl.info.customCover && !removeCover) || pending); }
    refresh();
    add(row, drop, save);
    ui.sheet.appendChild(row);

    save.addEventListener('click', function () {
      var newName = name.value.trim();
      if (!newName) { name.focus(); return; }
      save.disabled = true;
      var job = Promise.resolve();
      if (newName !== pl.item.Name) job = job.then(function () { return call('POST', 'Playlists/' + pl.id, null, { Name: newName }); });
      if (desc.value.trim() !== (pl.item.Overview || '').trim()) job = job.then(function () { return call('POST', 'MusicLook/Playlist/' + pl.id + '/Details', null, { description: desc.value }); });
      if (pending) job = job.then(function () { return postText('MusicLook/Playlist/' + pl.id + '/Cover', pending); });
      else if (removeCover && pl.info.customCover) job = job.then(function () { return call('DELETE', 'MusicLook/Playlist/' + pl.id + '/Cover'); });
      job.then(function () {
        invalidatePlaylists();
        toast(t('detailsSaved'));
        ui.close();
        ctx.reload();
      }, function () { save.disabled = false; toast(pending ? t('coverFailed') : t('detailsFailed')); });
    });
    if (opts && opts.pickCover) file.click();
  }

  /* ---------- Titel-Zeilen ---------- */
  function openArtist(artists) {
    if (!artists || !artists.length) return;
    if (artists.length === 1) { go('#/details?id=' + artists[0].Id + (serverId() ? '&serverId=' + serverId() : '')); return; }
    openMenu({ title: t('pickArtist'), cover: null }, artists.map(function (a) {
      return { icon: 'person', label: a.Name, run: function () { go('#/details?id=' + a.Id + (serverId() ? '&serverId=' + serverId() : '')); } };
    }));
  }

  // Herz eines Titels umschalten; Liste und Player werden aktualisiert.
  function toggleLike(track, ctx, index, heartBtn) {
    var was = !!(track.UserData && track.UserData.IsFavorite);
    if (heartBtn) heartBtn.disabled = true;
    return setFavorite(track.Id, !was).then(function () {
      track.UserData = track.UserData || {};
      track.UserData.IsFavorite = !was;
      Player.refreshFavorite(track.Id, !was);
      toast(t(!was ? 'likedAdded' : 'likedRemoved'));
      if (ctx && ctx.kind === 'liked' && was) {
        var i = ctx.tracks.indexOf(track);
        if (i >= 0) ctx.tracks.splice(i, 1);
        ctx.renderTracks();
      } else if (heartBtn) {
        heartBtn.disabled = false;
        heartBtn.classList.toggle('ml-on', !was);
        heartBtn.textContent = '';
        heartBtn.appendChild(icon(!was ? 'heart' : 'heart_o'));
      }
    }, function () { if (heartBtn) heartBtn.disabled = false; toast(t('likedFailed')); });
  }

  function trackMenu(track, ctx, index) {
    var liked = !!(track.UserData && track.UserData.IsFavorite);
    var inPlaylist = ctx.kind === 'playlist' && ctx.canEdit && track.PlaylistItemId;
    openMenu({ title: track.Name, subtitle: firstArtist(track), cover: itemImg(track, 120) }, [
      { icon: 'share', label: t('mShare'), run: function () {
        openShare({ url: linkFor(track.AlbumId || track.Id), title: track.Name, subtitle: firstArtist(track), cover: itemImg(track, 120), note: t('shareLinkTrack') });
      } },
      { icon: 'playlist_add', label: t('mAddToPlaylist'), run: function () { addToPlaylist([track.Id]); } },
      { icon: liked ? 'heart' : 'heart_o', label: liked ? t('mUnlike') : t('mLike'), run: function () { toggleLike(track, ctx, index); } },
      { hidden: !inPlaylist, icon: 'remove', label: t('mRemoveFromPlaylist'), run: function () {
        call('DELETE', 'Playlists/' + ctx.pl.id + '/Items', { entryIds: track.PlaylistItemId }).then(function () {
          ctx.tracks.splice(index, 1); invalidatePlaylists(); ctx.renderTracks();
        }, function () { toast(t('editFailed')); });
      } },
      { icon: 'queue', label: t('mQueue'), run: function () { queueIds([track.Id]); } },
      { hidden: !track.AlbumId, icon: 'album', label: t('mAlbum'), run: function () {
        go('#/details?id=' + track.AlbumId + (serverId() ? '&serverId=' + serverId() : ''));
      } },
      { hidden: !(track.ArtistItems && track.ArtistItems.length), icon: 'person', label: t('mArtist'), run: function () { openArtist(track.ArtistItems); } },
      { icon: 'speed', label: t('mSpeed'), run: openSpeed },
      { hidden: !ML.config().jamEnabled, icon: 'group', label: t('mJam'), run: function () { jamWith([track.Id]); } },
      { icon: 'radio', label: t('mRadio'), run: function () { songRadio(track); } },
      { icon: 'info', label: t('mInfo'), run: function () { openSongInfo(track); } }
    ]);
  }

  /* Titeltabelle am Computer: # | Titel | Album | Dauer (wie bei Spotify) */
  function tableHead(ctx) {
    if (!isWide() || ctx.edit) return null;
    var h = el('div', 'ml-thead' + (ctx.kind === 'album' ? ' ml-trow-2' : ''));
    h.appendChild(el('div', 'ml-trow-num', t('colNum')));
    h.appendChild(el('div', null, t('colTitle')));
    if (ctx.kind !== 'album') h.appendChild(el('div', null, t('colAlbum')));
    var d = el('div', 'ml-trow-dur'); d.appendChild(icon('clock')); d.title = t('colDuration');
    h.appendChild(d);
    h.appendChild(el('div')); h.appendChild(el('div'));
    return h;
  }

  function trackRowWide(track, i, ctx) {
    var row = el('div', 'ml-track ml-trow' + (ctx.kind === 'album' ? ' ml-trow-2' : ''));
    row.dataset.id = track.Id;
    row.setAttribute('role', 'button');
    row.tabIndex = 0;
    var num = el('div', 'ml-trow-num');
    num.appendChild(el('span', 'ml-trow-n', String(i + 1)));
    num.appendChild(icon('play', 'ml-trow-play'));
    row.appendChild(num);
    var main = el('div', 'ml-trow-main');
    if (ctx.kind !== 'album') main.appendChild(cover(itemImg(track, 96), 'ml-trow-cover'));
    var tx = el('div', 'ml-trow-text');
    tx.appendChild(el('div', 'ml-track-title', track.Name));
    var sub = firstArtist(track);
    if (sub) tx.appendChild(el('div', 'ml-track-sub', sub));
    main.appendChild(tx);
    row.appendChild(main);
    if (ctx.kind !== 'album') {
      var alb = el('div', 'ml-trow-album');
      if (track.AlbumId && track.Album) {
        var al = btn('ml-trow-albumlink', track.Album);
        al.addEventListener('click', function (e) { e.stopPropagation(); go('#/details?id=' + track.AlbumId + (serverId() ? '&serverId=' + serverId() : '')); });
        alb.appendChild(al);
      } else alb.textContent = track.Album || '';
      row.appendChild(alb);
    }
    row.appendChild(el('div', 'ml-trow-dur', track.RunTimeTicks ? fmtClock(track.RunTimeTicks / 1e7) : ''));
    var isLiked = !!(track.UserData && track.UserData.IsFavorite);
    var heart = iconBtn(isLiked ? 'heart' : 'heart_o', isLiked ? t('mUnlike') : t('mLike'), 'ml-track-heart' + (isLiked ? ' ml-on' : ''));
    heart.addEventListener('click', function (e) { e.stopPropagation(); toggleLike(track, ctx, i, heart); });
    row.appendChild(heart);
    row.appendChild(iconBtn('more_v', t('more'), 'ml-track-more', function () { trackMenu(track, ctx, i); }));
    function play() { playIds(idsOf(ctx.tracks), i); }
    row.addEventListener('click', play);
    row.addEventListener('dblclick', play);
    row.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target === row) { e.preventDefault(); play(); } });
    return row;
  }

  function trackRow(track, i, ctx) {
    if (isWide() && !ctx.edit) return trackRowWide(track, i, ctx);
    var row = el('div', 'ml-track');
    row.dataset.id = track.Id;
    var main = el('div', 'ml-track-main');
    main.appendChild(el('div', 'ml-track-title', track.Name));
    var sub = firstArtist(track);
    if (sub) main.appendChild(el('div', 'ml-track-sub', sub));

    if (ctx.edit) {
      row.classList.add('ml-editing');
      var rm = iconBtn('remove', t('removeTrack'), 'ml-remove-btn', function () {
        call('DELETE', 'Playlists/' + ctx.pl.id + '/Items', { entryIds: track.PlaylistItemId }).then(function () {
          ctx.tracks.splice(i, 1); invalidatePlaylists(); ctx.renderTracks();
        }, function () { toast(t('editFailed')); });
      });
      add(row, rm, cover(itemImg(track, 96), 'ml-track-cover'), main);
      var up = iconBtn('up_arrow', t('moveUp'), '', function () { moveTrack(ctx, i, -1); });
      var down = iconBtn('down_arrow', t('moveDown'), '', function () { moveTrack(ctx, i, 1); });
      up.disabled = i === 0; down.disabled = i === ctx.tracks.length - 1;
      add(row, up, down);
      return row;
    }

    row.setAttribute('role', 'button');
    row.tabIndex = 0;
    row.appendChild(cover(itemImg(track, 96), 'ml-track-cover'));
    row.appendChild(main);
    var isLiked = !!(track.UserData && track.UserData.IsFavorite);
    if (ctx.kind === 'liked' || isWide()) {
      var heart = iconBtn(isLiked ? 'heart' : 'heart_o', isLiked ? t('mUnlike') : t('mLike'), 'ml-track-heart' + (isLiked ? ' ml-on' : ''));
      heart.addEventListener('click', function (e) { e.stopPropagation(); toggleLike(track, ctx, i, heart); });
      row.appendChild(heart);
    }
    var more = iconBtn('more_v', t('more'), 'ml-track-more', function () { trackMenu(track, ctx, i); });
    row.appendChild(more);
    function play() { playIds(idsOf(ctx.tracks), i); }
    row.addEventListener('click', play);
    row.addEventListener('keydown', function (e) { if ((e.key === 'Enter' || e.key === ' ') && e.target === row) { e.preventDefault(); play(); } });
    return row;
  }

  function moveTrack(ctx, i, dir) {
    var j = i + dir;
    if (j < 0 || j >= ctx.tracks.length) return;
    var track = ctx.tracks[i];
    call('POST', 'Playlists/' + ctx.pl.id + '/Items/' + track.PlaylistItemId + '/Move/' + j).then(function () {
      ctx.tracks.splice(i, 1);
      ctx.tracks.splice(j, 0, track);
      ctx.renderTracks();
    }, function () { toast(t('editFailed')); });
  }

  /* ---------- Cover einer Detailseite ---------- */
  // Mosaik aus vier verschiedenen Album-Covern; bei weniger Covern das erste, sonst ein Platzhalter.
  function mosaic(tracks, cls) {
    var seen = {}, urls = [];
    for (var i = 0; i < tracks.length && urls.length < 4; i++) {
      var key = tracks[i].AlbumId || tracks[i].Id;
      if (seen[key]) continue;
      var u = itemImg(tracks[i], 300);
      if (!u) continue;
      seen[key] = true; urls.push(u);
    }
    if (urls.length >= 4) {
      var g = el('div', 'ml-mosaic' + (cls ? ' ' + cls : ''));
      urls.forEach(function (u2) { g.appendChild(cover(u2, 'ml-mosaic-cell')); });
      return g;
    }
    return cover(urls[0] || null, cls);
  }

  function coverFor(ctx, cls) {
    if (ctx.kind === 'liked') {
      var h = el('div', 'ml-cover ml-liked-cover' + (cls ? ' ' + cls : ''));
      h.appendChild(icon('heart'));
      return h;
    }
    if (ctx.kind === 'album') {
      var au = itemImg(ctx.album, 600);
      return au ? cover(au, cls) : mosaic(ctx.tracks, cls);
    }
    var pl = ctx.pl;
    var custom = playlistCoverUrl(pl, 600);
    return custom ? cover(custom, cls) : mosaic(ctx.tracks, cls);
  }

  function avatar(userId, name) {
    var a = el('span', 'ml-avatar');
    a.appendChild(el('span', 'ml-avatar-initial', String(name || '?').charAt(0).toUpperCase()));
    var u = userImgUrl(userId);
    if (u) {
      var i = el('img');
      i.alt = ''; i.addEventListener('error', function () { if (i.parentNode) i.parentNode.removeChild(i); });
      i.src = u;
      a.appendChild(i);
    }
    return a;
  }

  var meCache = null;
  function loadMe() {
    if (!meCache) meCache = call('GET', 'Users/' + uid()).then(function (u) { return { id: u.Id, name: u.Name, admin: !!(u.Policy && u.Policy.IsAdministrator) }; }, function () { meCache = null; return { id: uid(), name: '' }; });
    return meCache;
  }

  /* ---------- Playlist-Menue ---------- */
  function playlistMenu(ctx) {
    var pl = ctx.pl, info = pl ? pl.info : null;
    var ids = idsOf(ctx.tracks);
    var title = ctx.kind === 'liked' ? t('liked') : ctx.kind === 'album' ? ctx.album.Name : pl.item.Name;
    var sub = ctx.kind === 'playlist' ? t('ownerLine', info.ownerName || '') : ctx.kind === 'album' ? t('albumLine', albumArtistLine(ctx.album)) : t('playlist');
    var entries = [];
    var jamOk = ML.config().jamEnabled;

    if (ctx.kind === 'playlist') {
      entries = [
        { icon: 'share', label: t('mShare'), run: function () { shareList(ctx); } },
        { hidden: !info.canEdit, icon: 'playlist_add', label: t('mAddHere'), run: function () { openAddSongs(pl, ctx.reload); } },
        { hidden: !info.canEdit, icon: 'edit', label: t('mEdit'), run: function () { ctx.edit = true; ctx.renderAll(); } },
        { hidden: !info.canEdit, icon: 'edit', label: t('mDetails'), run: function () { openDetails(ctx); } },
        { hidden: !info.canEdit, icon: 'camera', label: t('mCover'), run: function () { openDetails(ctx, { pickCover: true }); } },
        { hidden: !info.isOwner, icon: 'del', label: t('mDelete'), danger: true, run: function () { deletePlaylist(ctx); } },
        { icon: 'download', label: t('mDownload'), run: function () { openDownload(pl); } },
        { icon: 'queue', label: t('mQueue'), run: function () { queueIds(ids); } },
        { icon: 'playlist_add', label: t('mAddOther'), run: function () { addToPlaylist(ids, { excludeId: pl.id }); } },
        { hidden: !info.isOwner, icon: 'person_add', label: t('mInvite'), run: function () { ML.openShareSheet(pl.id); } },
        { hidden: !jamOk, icon: 'group', label: t('mJam'), run: function () { jamWith(ids); } },
        { hidden: !(info.sharedWithMe && !info.isOwner), icon: 'close', label: t('mLeave'), run: function () { leavePlaylist(ctx); } },
        { hidden: !info.isOwner, icon: info.isPublic ? 'lock' : 'public', label: info.isPublic ? t('mPrivate') : t('mPublic'), run: function () { toggleVisibility(ctx); } }
      ];
    } else if (ctx.kind === 'album') {
      entries = [
        { hidden: ctx.book && ctx.album.Type !== 'MusicAlbum', icon: 'share', label: t('mShare'), run: function () {
          openShare({ url: linkFor(ctx.album.Id), title: ctx.album.Name, subtitle: albumArtistLine(ctx.album), cover: itemImg(ctx.album, 120), note: '' });
        } },
        { icon: 'playlist_add', label: t('mAddToPlaylist'), run: function () { addToPlaylist(ids); } },
        { icon: 'queue', label: t('mQueue'), run: function () { queueIds(ids); } },
        { hidden: !jamOk, icon: 'group', label: t('mJam'), run: function () { jamWith(ids); } },
        { hidden: !albumArtistItems(ctx.album).length, icon: 'person', label: t('mArtist'), run: function () { openArtist(albumArtistItems(ctx.album)); } }
      ];
    } else {
      entries = [
        { icon: 'queue', label: t('mQueue'), run: function () { queueIds(ids); } },
        { icon: 'playlist_add', label: t('mAddToPlaylist'), run: function () { addToPlaylist(ids); } },
        { hidden: !jamOk, icon: 'group', label: t('mJam'), run: function () { jamWith(ids); } }
      ];
    }
    openMenu({ title: title, subtitle: sub, cover: null, coverEl: coverFor(ctx, '') }, entries);
  }

  function shareList(ctx) {
    var pl = ctx.pl;
    openShare({
      url: linkFor(pl.id), title: pl.item.Name, subtitle: t('ownerLine', pl.info.ownerName || ''),
      cover: playlistCoverUrl(pl, 120) || itemImg(ctx.tracks[0], 120), invite: pl.info.isOwner ? pl.id : null
    });
  }

  function deletePlaylist(ctx) {
    var pl = ctx.pl;
    confirmSheet(t('deleteTitle'), t('deleteText', pl.item.Name), t('del'), true).then(function (yes) {
      if (!yes) return;
      // Stock-Endpunkt: loescht nur die Playlist, nie die verlinkten Titel.
      call('DELETE', 'Items/' + pl.id).then(function () {
        invalidatePlaylists(); toast(t('deleted')); leaveDetail();
      }, function () { toast(t('deleteFailed')); });
    });
  }

  function leavePlaylist(ctx) {
    call('POST', 'MusicLook/Playlist/' + ctx.pl.id + '/Leave').then(function () {
      invalidatePlaylists(); toast(t('left')); leaveDetail();
    }, function () { toast(t('leaveFailed')); });
  }

  function toggleVisibility(ctx) {
    var pl = ctx.pl, makePublic = !pl.info.isPublic;
    call('POST', 'Playlists/' + pl.id, null, { IsPublic: makePublic }).then(function () {
      pl.info.isPublic = makePublic; invalidatePlaylists();
      toast(t(makePublic ? 'madePublic' : 'madePrivate'));
      ctx.renderAll();
    }, function () { toast(t('visibilityFailed')); });
  }

  // Zurueck zur vorherigen Ansicht der App (Browser-Verlauf), sonst zur Musik-Startseite.
  function leaveDetail() {
    var lib = state.libraryId;
    if (state.trail.length > 1 && window.history.length > 1) window.history.back();
    else go('#/music' + (lib ? '?topParentId=' + lib + '&collectionType=music' : ''));
  }

  /* ---------- Zusatztexte ---------- */
  (function () {
    var extra = {
      de: {
        jellyfinHome: 'Jellyfin-Startseite', appMenu: 'Menü', emptyPlaylist: 'Diese Playlist ist leer.', addFirstSongs: 'Titel hinzufügen',
        upNext: 'Als Nächstes', openPlayer: 'Wiedergabe öffnen', collapse: 'Minimieren', seekLabel: 'Position', queueNow: 'Läuft gerade',
        backToSpotify: 'Spotify-Ansicht', likedSub: 'Playlist • {0}', moreTracks: 'Weitere Titel', noPlaylistsShared: 'Noch nichts mit dir geteilt.',
        playingFrom: 'Wiedergabe', shuffleOn: 'Zufall an', shuffleOff: 'Zufall aus', speedBadge: '{0}×', unknownArtist: 'Unbekannter Künstler',
        yourLibraryTitle: 'Deine Bibliothek', createdBy: 'von {0}', mute: 'Stumm', invitePeople: 'Personen hinzufügen',
        variousArtists: 'Verschiedene Künstler',
        mixedNote: 'Dieser Ordner enthält Titel aus {0} verschiedenen Alben (laut Tags). Jellyfin fasst sie zu einem Album zusammen, deshalb sind sie hier nach Album gruppiert.',
        allSongs: 'Alle Titel', playAllSongs: 'Alle abspielen', shuffleAllSongs: 'Zufällig abspielen', songsOfSearch: 'Titel',
        popularSongs: 'Beliebte Titel', showMore: 'Mehr anzeigen', showLess: 'Weniger anzeigen', artistAlbums: 'Alben',
        aboutArtist: 'Über den Künstler', artistPage: 'Künstlerseite', albumsCount1: '1 Album', albumsCountN: '{0} Alben',
        devices: 'Geräte', thisDevice: 'Dieses Gerät', deviceIdle: 'Bereit', devicePlaying: 'Spielt: {0}', deviceActive: 'Aktives Gerät',
        devicesNone: 'Keine weiteren Geräte gefunden. Melde dich auf einem anderen Gerät mit diesem Konto an und öffne Jellyfin.',
        deviceSwitched: 'Wiedergabe auf „{0}“', deviceFailed: 'Wechsel fehlgeschlagen', devicesLoading: 'Suche Geräte …',
        deviceNote: 'Lautsprecher und Bluetooth dieses Geräts stellst du in den Systemeinstellungen des Geräts ein.',
        connectedTo: 'Auf {0}', devicePick: 'Wiedergabegerät wählen',
        lyrics: 'Songtext', lyricsNone: 'Kein Songtext vorhanden. Lege eine .lrc- oder .txt-Datei mit exakt dem gleichen Namen wie die Musikdatei in deren Ordner.',
        lyricsMore: 'Songtext anzeigen', lyricsLoading: 'Lade Songtext …',
        credits: 'Credits', fromAlbum: 'Aus dem Album', openQueue: 'Warteschlange öffnen', fullInfo: 'Songinfos',
        roleComposer: 'Komponist*in', roleLyricist: 'Texter*in', roleProducer: 'Produzent*in', roleArranger: 'Arrangeur*in', roleConductor: 'Dirigent*in',
        roleArtist: 'Interpret*in', roleAlbumArtist: 'Album-Künstler*in', roleGenre: 'Genre', roleYear: 'Jahr', roleAlbum: 'Album',
        addPlus: 'Zu Playlist hinzufügen', shareTrack: 'Teilen', queueTitle: 'Warteschlange', nextFrom: 'Als Nächstes aus der Warteschlange'
      },
      en: {
        jellyfinHome: 'Jellyfin home', appMenu: 'Menu', emptyPlaylist: 'This playlist is empty.', addFirstSongs: 'Add tracks',
        upNext: 'Up next', openPlayer: 'Open player', collapse: 'Collapse', seekLabel: 'Position', queueNow: 'Playing now',
        backToSpotify: 'Spotify view', likedSub: 'Playlist • {0}', moreTracks: 'More tracks', noPlaylistsShared: 'Nothing shared with you yet.',
        playingFrom: 'Playing', shuffleOn: 'Shuffle on', shuffleOff: 'Shuffle off', speedBadge: '{0}×', unknownArtist: 'Unknown artist',
        yourLibraryTitle: 'Your library', createdBy: 'by {0}', mute: 'Mute', invitePeople: 'Add people',
        variousArtists: 'Various artists',
        mixedNote: 'This folder contains tracks from {0} different albums (according to their tags). Jellyfin merges them into one album, so they are grouped by album here.',
        allSongs: 'All tracks', playAllSongs: 'Play all', shuffleAllSongs: 'Shuffle play', songsOfSearch: 'Tracks',
        popularSongs: 'Popular tracks', showMore: 'Show more', showLess: 'Show less', artistAlbums: 'Albums',
        aboutArtist: 'About the artist', artistPage: 'Artist page', albumsCount1: '1 album', albumsCountN: '{0} albums',
        devices: 'Devices', thisDevice: 'This device', deviceIdle: 'Ready', devicePlaying: 'Playing: {0}', deviceActive: 'Active device',
        devicesNone: 'No other devices found. Sign in with this account on another device and open Jellyfin.',
        deviceSwitched: 'Playing on "{0}"', deviceFailed: 'Could not switch', devicesLoading: 'Looking for devices …',
        deviceNote: 'Speakers and Bluetooth of this device are chosen in the system settings of the device.',
        connectedTo: 'On {0}', devicePick: 'Choose playback device',
        lyrics: 'Lyrics', lyricsNone: 'No lyrics available. Put a .lrc or .txt file with exactly the same name as the music file in its folder.',
        lyricsMore: 'Show lyrics', lyricsLoading: 'Loading lyrics …',
        credits: 'Credits', fromAlbum: 'From the album', openQueue: 'Open queue', fullInfo: 'Song info',
        roleComposer: 'Composer', roleLyricist: 'Lyricist', roleProducer: 'Producer', roleArranger: 'Arranger', roleConductor: 'Conductor',
        roleArtist: 'Performed by', roleAlbumArtist: 'Album artist', roleGenre: 'Genre', roleYear: 'Year', roleAlbum: 'Album',
        addPlus: 'Add to playlist', shareTrack: 'Share', queueTitle: 'Queue', nextFrom: 'Next from queue'
      }
    };
    Object.keys(extra).forEach(function (l) { Object.keys(extra[l]).forEach(function (k) { STR[l][k] = extra[l][k]; }); });
  })();

  /* ---------- Zusatztexte (Version 1.0.1) ---------- */
  (function () {
    var more = {
      de: {
        shareLinkWarn: 'Hinweis: Diese Adresse sieht nicht wie eine öffentliche Internetadresse aus. Messenger wie WhatsApp zeigen solche Links oft nicht als anklickbar an. Trage in den Plugin-Einstellungen unter „Link-Adresse“ die öffentliche Adresse deines Servers ein (z. B. https://musik.deinedomain.de).',
        copyManual: 'Kopieren nicht möglich – bitte den markierten Link von Hand kopieren',
        likedAdded: 'Zu Lieblingssongs hinzugefügt', likedRemoved: 'Aus Lieblingssongs entfernt', likedFailed: 'Herz konnte nicht gespeichert werden',
        emptyLiked: 'Tippe bei einem Titel auf das Herz, dann erscheint er hier.',
        likedHint: 'Playlist • {0}',
        colNum: '#', colTitle: 'Titel', colAlbum: 'Album', colDuration: 'Dauer', colAdded: 'Hinzugefügt am',
        yourLib: 'Deine Bibliothek', dashboardLbl: 'Dashboard', settingsLbl: 'Einstellungen', nextTrack: 'Nächster Titel', fromQueue: 'Aus der Warteschlange', nothingPlaying: 'Es läuft gerade nichts.',
        openFullView: 'Vollbild-Ansicht', hideRight: 'Ansicht ausblenden', showRight: 'Wiedergabe-Ansicht einblenden',
        bookLabel: 'Hörbuch', chapters: 'Kapitel', chapter1: '1 Kapitel', chaptersN: '{0} Kapitel', openFolder: 'Ordner öffnen',
        audiobookDiag: 'Gefundene Bibliotheken auf deinem Server:', diagNone: 'Keine Bibliothek gefunden.',
        diagHow: 'Eine Bibliothek zählt als Hörbuch-Bibliothek, wenn ihr Name einen dieser Begriffe enthält: {0}. Zusätzlich werden Musik-Alben mit dem Genre „Hörbuch“, „Hörspiel“ oder „Audiobook“ gezeigt.',
        diagType: 'Typ', diagUnknownType: 'gemischt', books: 'Bücher', otherItems: 'Weitere Einträge', playBook: 'Hörbuch abspielen', continueBook: 'Weiterhören',
        genreShelf: 'Hörbücher (nach Genre)', folderEmpty: 'Dieser Ordner enthält keine abspielbaren Dateien.'
      },
      en: {
        shareLinkWarn: 'Note: this address does not look like a public internet address. Messengers such as WhatsApp often do not make such links clickable. Enter the public address of your server under "Link address" in the plugin settings (e.g. https://music.yourdomain.com).',
        copyManual: 'Copy failed – please copy the selected link by hand',
        likedAdded: 'Added to Liked Songs', likedRemoved: 'Removed from Liked Songs', likedFailed: 'Could not save the heart',
        emptyLiked: 'Tap the heart on a track and it will show up here.',
        likedHint: 'Playlist • {0}',
        colNum: '#', colTitle: 'Title', colAlbum: 'Album', colDuration: 'Length', colAdded: 'Date added',
        yourLib: 'Your library', dashboardLbl: 'Dashboard', settingsLbl: 'Settings', nextTrack: 'Next track', fromQueue: 'From the queue', nothingPlaying: 'Nothing is playing.',
        openFullView: 'Full screen view', hideRight: 'Hide view', showRight: 'Show now playing view',
        bookLabel: 'Audiobook', chapters: 'Chapters', chapter1: '1 chapter', chaptersN: '{0} chapters', openFolder: 'Open folder',
        audiobookDiag: 'Libraries found on your server:', diagNone: 'No library found.',
        diagHow: 'A library counts as an audiobook library when its name contains one of these terms: {0}. In addition, music albums with the genre "Audiobook", "Hörbuch" or "Hörspiel" are shown.',
        diagType: 'Type', diagUnknownType: 'mixed', books: 'Books', otherItems: 'More items', playBook: 'Play audiobook', continueBook: 'Continue',
        genreShelf: 'Audiobooks (by genre)', folderEmpty: 'This folder contains no playable files.'
      }
    };
    Object.keys(more).forEach(function (l) { Object.keys(more[l]).forEach(function (k) { STR[l][k] = more[l][k]; }); });
  })();

  /* ---------- Zustand ---------- */
  var state = { libraryId: null, tab: 'home', chip: 'all', libSeg: 'playlists', classic: false, key: '', view: 0, trail: [] };
  // Die klassische Ansicht gilt nur bis zum Neustart der App/des Tabs (sessionStorage); ein alter, dauerhaft gespeicherter Wert wird entfernt.
  ML.safeStore('ml.classic', null);
  try { if (window.sessionStorage.getItem('ml.classic') === '1') state.classic = true; } catch (e) { /* ohne Speicher: Spotify-Ansicht */ }
  var scrollMem = {};
  var sideDirty = true;
  var root = null, scroller = null, content = null, nav = null, bottomBar = null, classicFab = null;
  var latestRoute = null;

  function bodyCls(name, on) { document.body.classList.toggle(name, !!on); }

  function homeHash() {
    return '#/music' + (state.libraryId ? '?topParentId=' + state.libraryId + '&collectionType=music' : '');
  }
  function ensureLibrary() {
    if (state.libraryId) return Promise.resolve(state.libraryId);
    return loadLibraries().then(function (libs) {
      var m = libs.filter(function (l) { return l.cat === 'music' && l.type === 'music'; })[0];
      if (m) state.libraryId = m.id;
      return state.libraryId;
    }, function () { return null; });
  }
  function likedHash() { return homeHash() + (state.libraryId ? '&' : '?') + 'mlview=liked'; }

  function musicLibIds(libs) { return libs.filter(function (l) { return l.cat === 'music'; }).map(function (l) { return l.id; }); }

  // Fuehrt params je Bibliothek aus und mischt die Ergebnisse nach sortFn.
  function perLibrary(libIds, params, sortFn, limit) {
    var ids = libIds.length ? libIds : [null];
    return Promise.all(ids.map(function (id) {
      var p = {};
      Object.keys(params).forEach(function (k) { p[k] = params[k]; });
      if (id) p.ParentId = id;
      return itemsOf(p).catch(function () { return []; });
    })).then(function (lists) {
      var all = [].concat.apply([], lists);
      if (sortFn) all.sort(sortFn);
      return limit ? all.slice(0, limit) : all;
    });
  }

  /* ---------- Kacheln und Reihen ---------- */
  var lazyQueue = [], lazyActive = 0;
  function runLazy() {
    while (lazyActive < 4 && lazyQueue.length) {
      lazyActive++;
      lazyQueue.shift()().then(done, done);
    }
    function done() { lazyActive--; runLazy(); }
  }

  /* Playlist-Cover: Paare (Id, Bild-Tag) der ersten Alben-Cover, im Speicher und in localStorage gemerkt.
     So erscheint das Cover beim naechsten Start sofort; im Hintergrund wird es aufgefrischt. */
  var COVER_KEY = 'ml.pc3', coverMem = null;
  function coverStore() {
    if (coverMem) return coverMem;
    coverMem = {};
    try { var raw = window.localStorage.getItem(COVER_KEY); if (raw) coverMem = JSON.parse(raw) || {}; } catch (e) { coverMem = {}; }
    return coverMem;
  }
  var saveTimer = null;
  function saveCovers() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      var st = coverStore();
      var keys = Object.keys(st);
      if (keys.length > 80) {
        keys.sort(function (a, b) { return (st[a].at || 0) - (st[b].at || 0); });
        keys.slice(0, keys.length - 80).forEach(function (k) { delete st[k]; });
      }
      try { window.localStorage.setItem(COVER_KEY, JSON.stringify(st)); } catch (e) { /* Speicher gesperrt */ }
    }, 400);
  }
  function pairOf(tr) {
    if (!tr) return null;
    var tags = tr.ImageTags || {};
    if (tr.AlbumId && tr.AlbumPrimaryImageTag) return [tr.AlbumId, tr.AlbumPrimaryImageTag];
    if (tags.Primary) return [tr.Id, tags.Primary];
    return null;
  }
  function pairsOf(tracks) {
    var seen = {}, out = [];
    for (var i = 0; i < tracks.length && out.length < 4; i++) {
      var p = pairOf(tracks[i]);
      if (!p || seen[p[0]]) continue;
      seen[p[0]] = true; out.push(p);
    }
    return out;
  }
  function forgetCover(pid) { var st = coverStore(); delete st[nid(pid)]; saveCovers(); }
  // Sofortiges Cover nach dem Hinzufuegen eines Titels (ohne auf den Server zu warten).
  function hintCover(pid, track) {
    var p = pairOf(track);
    if (!p) return;
    var st = coverStore(), k = nid(pid), e = st[k] || { pairs: [], n: -1, at: 0 };
    if (!e.pairs.some(function (x) { return x[0] === p[0]; }) && e.pairs.length < 4) e.pairs.push(p);
    e.n = -1; e.at = 0;
    st[k] = e; saveCovers();
  }
  function fillCover(holder, pairs) {
    var m = mosaic(pairs.map(function (p) { return { Id: p[0], AlbumId: p[0], AlbumPrimaryImageTag: p[1] }; }), '');
    ML.qsa('img, .ml-mosaic', holder).forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
    if (m.classList.contains('ml-mosaic')) { holder.textContent = ''; holder.appendChild(m); return; }
    var im = m.querySelector('img');
    if (im) holder.appendChild(im);
  }

  // Cover einer Playlist: eigenes Bild, sonst Mosaik aus den ersten Titeln (wird nachgeladen).
  function playlistCover(pl, cls, w) {
    var custom = playlistCoverUrl(pl, w || 300);
    if (custom) return cover(custom, cls);
    var holder = cover(null, cls);
    var key = nid(pl.id), st = coverStore(), e = st[key];
    var n = pl.item.ChildCount;
    if (n === 0) return holder;                               // leere Playlist: Platzhalter
    if (e && e.pairs.length) fillCover(holder, e.pairs);
    var fresh = e && n != null && e.n === n && Date.now() - (e.at || 0) < 180000;
    if (fresh) return holder;
    lazyQueue.push(function () {
      return call('GET', 'Playlists/' + pl.id + '/Items', { UserId: uid(), Limit: 40, EnableUserData: false, Fields: '' }).then(function (r) {
        var tracks = (r && r.Items) || [];
        var pairs = pairsOf(tracks);
        if (!pairs.length) { delete st[key]; saveCovers(); return; }
        var changed = !e || JSON.stringify(e.pairs) !== JSON.stringify(pairs);
        st[key] = { pairs: pairs, n: n != null ? n : (r && r.TotalRecordCount) || tracks.length, at: Date.now() };
        saveCovers();
        if (changed) fillCover(holder, pairs);
      }, function () { /* Platzhalter bleibt */ });
    });
    runLazy();
    return holder;
  }

  function tile(opts) {
    var b = btn('ml-tile' + (opts.round ? ' ml-round-tile' : ''));
    b.appendChild(opts.coverEl || cover(opts.img, 'ml-tile-cover' + (opts.round ? ' ml-round' : '')));
    b.appendChild(el('div', 'ml-tile-title', opts.title));
    if (opts.sub) b.appendChild(el('div', 'ml-tile-sub', opts.sub));
    b.addEventListener('click', opts.onClick);
    return b;
  }

  function itemTile(item) {
    var round = item.Type === 'MusicArtist';
    var sub = item.Type === 'MusicAlbum' ? albumArtistLine(item) : item.Type === 'MusicArtist' ? t('artist') : item.Type === 'Audio' ? firstArtist(item) : '';
    return tile({
      title: item.Name, sub: sub, round: round, img: itemImg(item, 300),
      onClick: function () { go(hrefFor(item)); }
    });
  }

  function playlistTile(pl) {
    var c = playlistCover(pl, 'ml-tile-cover', 300);
    var sub = pl.info.sharedWithMe && !pl.info.isOwner ? t('byOwner', pl.info.ownerName || '') : (pl.item.ChildCount != null ? countText(pl.item.ChildCount) : t('playlist'));
    return tile({ title: pl.item.Name, sub: sub, coverEl: c, onClick: function () { go(hrefFor(pl.item)); } });
  }

  function shelf(host, title, tiles, extraClass) {
    if (!tiles.length) return null;
    var box = el('section', 'ml-shelf' + (extraClass ? ' ' + extraClass : ''));
    box.appendChild(el('h2', 'ml-shelf-title', title));
    var row = el('div', 'ml-shelf-row');
    tiles.forEach(function (x) { row.appendChild(x); });
    box.appendChild(row);
    host.appendChild(box);
    return box;
  }

  function emptyNote(host, text, actionLabel, action) {
    var box = el('div', 'ml-empty');
    box.appendChild(icon('note', 'ml-empty-ic'));
    box.appendChild(el('p', null, text));
    if (actionLabel) {
      var b = btn('ml-pill ml-primary', actionLabel);
      b.addEventListener('click', action);
      box.appendChild(b);
    }
    host.appendChild(box);
  }

  function failNote(host, retry) {
    var box = el('div', 'ml-empty');
    box.appendChild(el('p', null, t('loadFailed')));
    var b = btn('ml-pill', t('retry'));
    b.addEventListener('click', retry);
    box.appendChild(b);
    host.appendChild(box);
  }

  /* ---------- Neue Playlist ---------- */
  function openCreatePlaylist() {
    newPlaylistDialog([], { onCreated: function (pid) { go('#/details?id=' + pid + (serverId() ? '&serverId=' + serverId() : '')); } });
  }

  /* ---------- Kopfzeile (Profil + Chips) ---------- */
  function openAppMenu() {
    loadMe().then(function (me) {
      var av = avatar(me.id, me.name);
      av.classList.add('ml-big');
      openMenu({ title: me.name || t('yourLibraryTitle'), subtitle: '', coverEl: av }, [
        { icon: 'add', label: t('mNewPlaylist'), run: openCreatePlaylist },
        { hidden: !ML.config().jamEnabled, icon: 'group', label: t('jam'), run: function () { ML.openJamSheet(); } },
        { icon: 'album', label: t('mClassic'), run: function () { setClassic(true); } },
        { icon: 'home', label: t('jellyfinHome'), run: function () { go('#/home'); } },
        { hidden: !me.admin, icon: 'info', label: t('dashboardLbl'), run: function () { go('#/dashboard'); } },
        { icon: 'person', label: t('settingsLbl'), run: function () { go('#/mypreferencesmenu'); } }
      ]);
    });
  }

  function profileButton() {
    var b = btn('ml-profile-btn');
    b.setAttribute('aria-label', t('appMenu'));
    b.appendChild(avatar(uid(), ''));
    loadMe().then(function (me) {
      b.textContent = '';
      b.appendChild(avatar(me.id || uid(), me.name));
    });
    b.addEventListener('click', openAppMenu);
    return b;
  }

  function chipRow(items, current, onPick, cls) {
    var row = el('div', 'ml-chips' + (cls ? ' ' + cls : ''));
    items.forEach(function (it) {
      var c = btn('ml-chip' + (it.key === current ? ' ml-on' : ''), it.label);
      c.setAttribute('aria-pressed', it.key === current ? 'true' : 'false');
      c.addEventListener('click', function () {
        qsa('.ml-chip', row).forEach(function (x) { x.classList.remove('ml-on'); x.setAttribute('aria-pressed', 'false'); });
        c.classList.add('ml-on'); c.setAttribute('aria-pressed', 'true');
        onPick(it.key);
      });
      row.appendChild(c);
    });
    return row;
  }
  function qsa(sel, rootEl) { return ML.qsa(sel, rootEl); }

  /* ---------- Startseite ---------- */
  function renderHome(host, seq) {
    host.textContent = '';
    var head = el('div', 'ml-topbar');
    head.appendChild(profileButton());
    var chips = chipRow([
      { key: 'all', label: t('chipAll') }, { key: 'music', label: t('chipMusic') },
      { key: 'podcasts', label: t('chipPodcasts') }, { key: 'audiobooks', label: t('chipAudiobooks') }
    ], state.chip, function (k) { state.chip = k; fillHome(body, seq); }, 'ml-top-chips');
    head.appendChild(chips);
    host.appendChild(head);
    var body = el('div', 'ml-home-body');
    host.appendChild(body);
    fillHome(body, seq);
  }

  function quickTile(titleText, coverEl, onClick) {
    var b = btn('ml-quick');
    b.appendChild(coverEl);
    b.appendChild(el('span', 'ml-quick-title', titleText));
    b.addEventListener('click', onClick);
    return b;
  }

  function likedCoverEl(cls) {
    var h = el('div', 'ml-cover ml-liked-cover' + (cls ? ' ' + cls : ''));
    h.appendChild(icon('heart'));
    return h;
  }

  function fillHome(body, seq) {
    var chip = state.chip;
    var pre = peekLists();
    function paint(libs, pls) {
      body.textContent = '';
      if (chip === 'podcasts') return fillMedia(body, seq, libs.filter(function (l) { return l.cat === 'podcasts'; }), 'podcasts');
      if (chip === 'audiobooks') return fillMedia(body, seq, libs.filter(function (l) { return l.cat === 'audiobooks'; }), 'audiobooks');
      return fillMusic(body, seq, libs, pls, chip === 'all');
    }
    var sig = null;
    if (pre) { sig = libSig(pre.libs) + '#' + plSig(pre.pls); body.textContent = ''; paint(pre.libs, pre.pls); }
    else { body.textContent = ''; body.appendChild(el('div', 'ml-muted ml-pad', t('loading'))); }
    Promise.all([loadLibraries(), loadPlaylists(true)]).then(function (res) {
      if (seq !== state.view) return;
      if (sig !== null && sig === libSig(res[0]) + '#' + plSig(res[1])) return;
      var top = scroller ? scroller.scrollTop : 0;
      paint(res[0], res[1]);
      if (scroller && top) scroller.scrollTop = top;
    }, function () {
      if (seq !== state.view || sig !== null) return;
      body.textContent = '';
      failNote(body, function () { fillHome(body, seq); });
    });
  }

  function fillMusic(body, seq, libs, pls, withMedia) {
    var mine = pls.filter(function (p) { return p.info.isOwner; });
    var shared = pls.filter(function (p) { return !p.info.isOwner; });
    var musicIds = musicLibIds(libs);

    // Schnellzugriff: Lieblingssongs und die ersten Playlists, zweispaltig wie bei Spotify.
    var grid = el('div', 'ml-quick-grid');
    grid.appendChild(quickTile(t('liked'), likedCoverEl('ml-quick-cover'), function () { ensureLibrary().then(function () { go(likedHash()); }); }));
    mine.concat(shared).slice(0, 7).forEach(function (p) {
      grid.appendChild(quickTile(p.item.Name, playlistCover(p, 'ml-quick-cover', 120), function () { go(hrefFor(p.item)); }));
    });
    body.appendChild(grid);

    // Deine Playlists (mit Kachel zum Anlegen)
    var newTile = tile({
      title: t('newPlaylist'), coverEl: (function () {
        var c = el('div', 'ml-cover ml-tile-cover ml-new-cover'); c.appendChild(icon('add')); return c;
      })(), onClick: openCreatePlaylist
    });
    var mineBox = shelf(body, t('yourPlaylists'), [newTile].concat(mine.map(playlistTile)));
    if (!mine.length && mineBox) mineBox.appendChild(el('p', 'ml-muted ml-pad', t('noPlaylistsYet')));
    shelf(body, t('sharedPlaylists'), shared.map(playlistTile));

    var slotPlayed = el('div'), slotAdded = el('div');
    body.appendChild(slotPlayed); body.appendChild(slotAdded);
    var slotMedia = el('div');
    body.appendChild(slotMedia);

    perLibrary(musicIds, { IncludeItemTypes: 'Audio', Recursive: true, Filters: 'IsPlayed', SortBy: 'DatePlayed', SortOrder: 'Descending', Limit: 40 },
      function (a, b) {
        var x = (a.UserData && a.UserData.LastPlayedDate) || '', y = (b.UserData && b.UserData.LastPlayedDate) || '';
        return x < y ? 1 : x > y ? -1 : 0;
      }, 60).then(function (tracks) {
      if (seq !== state.view) return;
      var seen = {}, albums = [];
      tracks.forEach(function (tr) {
        if (!tr.AlbumId || seen[tr.AlbumId]) return;
        seen[tr.AlbumId] = true;
        albums.push({ Id: tr.AlbumId, Name: tr.Album || tr.Name, Type: 'MusicAlbum', AlbumArtist: tr.AlbumArtist, ImageTags: tr.AlbumPrimaryImageTag ? { Primary: tr.AlbumPrimaryImageTag } : {}, ServerId: tr.ServerId });
      });
      shelf(slotPlayed, t('recentlyPlayed'), albums.slice(0, 20).map(itemTile));
    }, function () { /* Reihe entfaellt */ });

    perLibrary(musicIds, { IncludeItemTypes: 'MusicAlbum', Recursive: true, SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 30, Fields: 'DateCreated' },
      function (a, b) { return (a.DateCreated || '') < (b.DateCreated || '') ? 1 : -1; }, 30).then(function (albums) {
      if (seq !== state.view) return;
      shelf(slotAdded, t('recentlyAdded'), albums.map(itemTile));
      if (!albums.length && !mine.length && !shared.length) emptyNote(slotAdded, t('nothingYet'));
    }, function () { /* Reihe entfaellt */ });

    if (withMedia) {
      var extra = libs.filter(function (l) { return l.cat === 'podcasts' || l.cat === 'audiobooks'; });
      if (extra.length) {
        loadMediaShelves(extra).then(function (groups) {
          if (seq !== state.view) return;
          groups.forEach(function (g) { shelf(slotMedia, g.title, g.tiles); });
        }, function () { /* ignorieren */ });
      }
    }
  }

  /* ---------- Hoerbuecher und Podcasts ---------- */
  function folderHash(libId, itemId) {
    return '#/music?topParentId=' + libId + '&collectionType=music&mlview=folder&mlid=' + itemId;
  }
  function isFolderish(it) { return !!(it && (it.IsFolder || it.Type === 'MusicAlbum' || it.Type === 'Folder' || it.Type === 'BoxSet' || it.Type === 'Series')); }
  function isAudioItem(it) { return !!(it && (it.Type === 'Audio' || it.Type === 'AudioBook' || it.MediaType === 'Audio')); }
  function isBookFile(it) { return !!(it && (it.Type === 'Book' || it.MediaType === 'Book')); }

  // Cover eines Ordners: eigenes Bild, sonst das Cover des ersten Titels darin (wird nachgeladen und gemerkt).
  function folderCover(item, cls, w) {
    var img = itemImg(item, w || 300);
    if (img) return cover(img, cls);
    var holder = cover(null, cls), key = 'f' + nid(item.Id), st = coverStore(), e = st[key];
    if (e && e.pairs.length) { fillCover(holder, e.pairs); return holder; }
    lazyQueue.push(function () {
      return itemsOf({ ParentId: item.Id, Recursive: true, IncludeItemTypes: 'Audio,AudioBook', Limit: 12, SortBy: 'SortName', EnableUserData: false, Fields: '' }).then(function (tracks) {
        var pairs = pairsOf(tracks).slice(0, 1);
        if (!pairs.length) return;
        st[key] = { pairs: pairs, n: 0, at: Date.now() }; saveCovers();
        fillCover(holder, pairs);
      }, function () { /* Platzhalter bleibt */ });
    });
    runLazy();
    return holder;
  }

  function mediaTile(lib, item, cat) {
    var folderish = isFolderish(item);
    var n = item.ChildCount;
    var sub = cat === 'audiobooks' ? (folderish && n ? (n === 1 ? t('chapter1') : t('chaptersN', n)) : t('bookLabel')) : (item.Type === 'Audio' ? firstArtist(item) : '');
    return tile({
      title: item.Name, sub: sub, coverEl: folderCover(item, 'ml-tile-cover', 300),
      onClick: function () { if (folderish) go(folderHash(lib.id, item.Id)); else playIds([item.Id], 0); }
    });
  }

  // Reihen fuer Podcast- bzw. Hoerbuch-Bibliotheken. Hoerbuecher werden nach der Ordnerstruktur der Bibliothek gezeigt
  // (egal ob als Musik-, Buecher- oder gemischte Bibliothek angelegt).
  function loadMediaShelves(libs) {
    return Promise.all(libs.map(function (lib) {
      if (lib.cat === 'podcasts' && lib.type === 'music') {
        return Promise.all([
          itemsOf({ ParentId: lib.id, IncludeItemTypes: 'MusicAlbum', Recursive: true, SortBy: 'SortName', Limit: 60 }).catch(function () { return []; }),
          itemsOf({ ParentId: lib.id, IncludeItemTypes: 'Audio', Recursive: true, SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 20 }).catch(function () { return []; })
        ]).then(function (r) {
          return [
            { title: libs.length > 1 ? lib.name : t('shows'), tiles: r[0].map(itemTile) },
            {
              title: t('latestEpisodes') + (libs.length > 1 ? ' • ' + lib.name : ''),
              tiles: r[1].map(function (ep) {
                return tile({ title: ep.Name, sub: ep.Album || firstArtist(ep), img: itemImg(ep, 300), onClick: function () { playIds([ep.Id], 0); } });
              })
            }
          ];
        });
      }
      return itemsOf({ ParentId: lib.id, Limit: 120, SortBy: 'SortName', Fields: 'ChildCount' }).then(function (items) {
        items = items.filter(function (it) { return !isBookFile(it); });
        var folders = items.filter(isFolderish), files = items.filter(function (it) { return !isFolderish(it) && isAudioItem(it); });
        var out = [];
        if (folders.length) out.push({ title: libs.length > 1 || lib.cat === 'audiobooks' ? lib.name : t('shows'), tiles: folders.map(function (it) { return mediaTile(lib, it, lib.cat); }) });
        if (files.length) out.push({ title: folders.length ? t('otherItems') + ' • ' + lib.name : lib.name, tiles: files.map(function (it) { return mediaTile(lib, it, lib.cat); }) });
        return out;
      }, function () { return []; });
    })).then(function (parts) { return [].concat.apply([], parts); });
  }

  // Alben aus Musikbibliotheken, deren Genre nach Hoerbuch aussieht (wenn es keine eigene Hoerbuch-Bibliothek gibt).
  function loadGenreAudiobooks() {
    var words = ['hörbuch', 'hoerbuch', 'audiobook', 'hörspiel', 'hoerspiel', 'spoken'];
    ((ML.config().audiobookKeywords) || []).forEach(function (k) { k = String(k || '').toLowerCase(); if (k && words.indexOf(k) < 0) words.push(k); });
    return call('GET', 'MusicGenres', { UserId: uid(), Limit: 500 }).then(function (r) {
      var names = ((r && r.Items) || []).map(function (g) { return g.Name; }).filter(function (n) {
        var low = String(n || '').toLowerCase();
        return words.some(function (w) { return low.indexOf(w) >= 0; });
      });
      if (!names.length) return [];
      return itemsOf({ IncludeItemTypes: 'MusicAlbum', Recursive: true, Genres: names.join('|'), SortBy: 'SortName', Limit: 120, Fields: 'ChildCount' });
    }).catch(function () { return []; });
  }

  // Hilfetext, wenn keine Hoerbuch-/Podcast-Bibliothek erkannt wurde: zeigt, welche Bibliotheken der Server meldet.
  function mediaDiagnosis(host, cat) {
    var kw = (cat === 'podcasts' ? ML.config().podcastKeywords : ML.config().audiobookKeywords) || [];
    var box = el('div', 'ml-empty ml-diag');
    box.appendChild(icon('book', 'ml-empty-ic'));
    box.appendChild(el('p', null, t(cat === 'podcasts' ? 'noPodcastLib' : 'noAudiobookLib', kw.join(', '))));
    loadLibraries().then(function () {
      var all = libCache.all || [];
      var list = el('div', 'ml-diag-list');
      list.appendChild(el('div', 'ml-diag-title', t('audiobookDiag')));
      if (!all.length) list.appendChild(el('div', 'ml-muted', t('diagNone')));
      all.forEach(function (l) {
        list.appendChild(el('div', 'ml-diag-row', l.name + ' – ' + t('diagType') + ': ' + (l.type || t('diagUnknownType')) + (l.cat ? ' → ' + l.cat : '')));
      });
      box.appendChild(list);
      if (cat === 'audiobooks') box.appendChild(el('p', 'ml-muted', t('diagHow', kw.join(', '))));
    }, function () { /* kein Hilfetext */ });
    host.appendChild(box);
  }

  function fillMedia(body, seq, libs, cat) {
    body.appendChild(el('div', 'ml-muted ml-pad', t('loading')));
    var shelves = libs.length ? loadMediaShelves(libs) : Promise.resolve([]);
    var genre = cat === 'audiobooks' && !libs.length ? loadGenreAudiobooks() : Promise.resolve([]);
    Promise.all([shelves, genre]).then(function (res) {
      if (seq !== state.view) return;
      body.textContent = '';
      var any = false;
      res[0].forEach(function (g) { if (shelf(body, g.title, g.tiles)) any = true; });
      if (res[1].length) {
        any = true;
        shelf(body, t('genreShelf'), res[1].map(itemTile));
      }
      if (!any) {
        if (!libs.length) mediaDiagnosis(body, cat);
        else emptyNote(body, t('nothingYet'));
      }
    }, function () {
      if (seq !== state.view) return;
      body.textContent = '';
      failNote(body, function () { body.textContent = ''; fillMedia(body, seq, libs, cat); });
    });
  }

  /* ---------- Suche ---------- */
  var searchTerm = '';
  var SEARCH_PAGE = 100;

  // Titel-Liste (Zeilen wie in Playlists) mit "Mehr laden"; ctx.tracks waechst mit jeder Seite.
  function songListCtx() {
    var ctx = { kind: 'songs', tracks: [], canEdit: false, shown: 0, listEl: null };
    ctx.renderTracks = function () {
      if (!ctx.listEl) return;
      ctx.listEl.textContent = '';
      var head = ctx.tracks.length ? tableHead(ctx) : null;
      if (head) ctx.listEl.appendChild(head);
      ctx.tracks.forEach(function (tr, i) { ctx.listEl.appendChild(trackRow(tr, i, ctx)); });
      markPlaying();
    };
    return ctx;
  }

  function renderSearch(host, seq) {
    host.textContent = '';
    var head = el('div', 'ml-search-head');
    head.appendChild(el('h1', 'ml-page-title', t('tabSearch')));
    var input = el('input', 'ml-field ml-search-big');
    input.type = 'search'; input.placeholder = t('searchPh'); input.setAttribute('autocomplete', 'off'); input.value = searchTerm;
    head.appendChild(input);
    host.appendChild(head);
    var out = el('div', 'ml-search-out');
    host.appendChild(out);
    var token = 0;

    function row(opts) {
      var b = btn('ml-list-row');
      b.appendChild(cover(opts.img, 'ml-row-cover' + (opts.round ? ' ml-round' : '')));
      var txt = el('div', 'ml-row-text');
      txt.appendChild(el('div', 'ml-row-title', opts.title));
      if (opts.sub) txt.appendChild(el('div', 'ml-row-sub', opts.sub));
      b.appendChild(txt);
      b.addEventListener('click', opts.onClick);
      return b;
    }
    function group(title, rows) {
      if (!rows.length) return;
      out.appendChild(el('h2', 'ml-shelf-title', title));
      rows.forEach(function (r) { out.appendChild(r); });
    }
    function link(h) { return '#/details?id=' + (h.ItemId || h.Id) + (serverId() ? '&serverId=' + serverId() : ''); }

    // Ohne Suchbegriff: alle Titel der Musikbibliothek in einer Liste (alphabetisch), mit Abspielen/Zufall.
    function showAll(my) {
      out.textContent = '';
      var ctx = songListCtx();
      var bar = el('div', 'ml-allbar');
      var heading = el('h2', 'ml-shelf-title ml-allbar-title', t('allSongs'));
      var count = el('span', 'ml-muted ml-allbar-count', '');
      heading.appendChild(count);
      bar.appendChild(heading);
      var acts = el('div', 'ml-allbar-actions');
      var shuf = iconBtn('shuffle', t('shuffleAllSongs'), 'ml-shuffle-btn', function () {
        getItems(libParams({ Fields: '', EnableImages: false, EnableUserData: false, Limit: 1500 })).then(function (r) {
          if (r.items.length) playIds(shuffled(idsOf(r.items)), 0);
        }, function () { toast(t('playFailed')); });
      });
      var all = iconBtn('play', t('playAllSongs'), 'ml-play-btn', function () { if (ctx.tracks.length) playIds(idsOf(ctx.tracks), 0); });
      add(acts, shuf, all);
      bar.appendChild(acts);
      out.appendChild(bar);
      ctx.listEl = el('div', 'ml-tracks');
      out.appendChild(ctx.listEl);
      var head0 = tableHead(ctx);
      if (head0) ctx.listEl.appendChild(head0);
      var start = 0, total = null;

      function libParams(extra) {
        var p = { IncludeItemTypes: 'Audio', Recursive: true, SortBy: 'SortName' };
        if (state.libraryId) p.ParentId = state.libraryId;
        Object.keys(extra || {}).forEach(function (k) { p[k] = extra[k]; });
        return p;
      }
      function page() {
        var more = out.querySelector('.ml-more');
        if (more) more.remove();
        getItems(libParams({ StartIndex: start, Limit: SEARCH_PAGE })).then(function (r) {
          if (my !== token || seq !== state.view) return;
          total = r.total;
          r.items.forEach(function (tr) { ctx.listEl.appendChild(trackRow(tr, ctx.tracks.length, ctx)); ctx.tracks.push(tr); });
          start += r.items.length;
          count.textContent = ' ' + countText(total);
          markPlaying();
          if (!ctx.tracks.length) out.appendChild(el('p', 'ml-muted ml-pad', t('nothingYet')));
          if (r.items.length && start < total) {
            var m = btn('ml-pill ml-more', t('loadMore'));
            m.addEventListener('click', function () { m.disabled = true; page(); });
            out.appendChild(m);
          }
        }, function () { if (my === token && seq === state.view) failNote(out, function () { showAll(my); }); });
      }
      ensureLibrary().then(page, page);
    }

    function run() {
      var q = input.value.trim();
      searchTerm = input.value;
      var my = ++token;
      out.textContent = '';
      if (!q) { showAll(my); return; }
      out.appendChild(el('div', 'ml-muted ml-pad', t('loading')));
      var hintsReq = call('GET', 'Search/Hints', { searchTerm: q, UserId: uid(), Limit: 30, IncludeItemTypes: 'MusicAlbum,MusicArtist,Playlist', IncludeMedia: true });
      var songsReq = itemsOf({ IncludeItemTypes: 'Audio', Recursive: true, SearchTerm: q, SortBy: 'SortName', Limit: 200 });
      Promise.all([hintsReq, songsReq.catch(function () { return []; })]).then(function (res) {
        var hints = (res[0] && res[0].SearchHints) || [];
        var artists = hints.filter(function (h) { return h.Type === 'MusicArtist'; });
        // Titel der gefundenen Kuenstler gehoeren ebenfalls in die Titelliste.
        var artistIds = artists.slice(0, 3).map(function (h) { return h.ItemId || h.Id; }).filter(function (id) { return ID_RE.test(id); });
        var byArtist = artistIds.length
          ? itemsOf({ IncludeItemTypes: 'Audio', Recursive: true, ArtistIds: artistIds.join(','), SortBy: 'Album,ParentIndexNumber,IndexNumber', Limit: 200 }).catch(function () { return []; })
          : Promise.resolve([]);
        return byArtist.then(function (more) { return { hints: hints, songs: res[1], more: more }; });
      }).then(function (r) {
        if (my !== token || seq !== state.view) return;
        out.textContent = '';
        var seen = {}, songs = [];
        r.songs.concat(r.more).forEach(function (tr) {
          var k = nid(tr.Id);
          if (!seen[k]) { seen[k] = true; songs.push(tr); }
        });
        songs = songs.slice(0, 300);
        var albums = r.hints.filter(function (h) { return h.Type === 'MusicAlbum'; });
        var artists = r.hints.filter(function (h) { return h.Type === 'MusicArtist'; });
        var lists = r.hints.filter(function (h) { return h.Type === 'Playlist' && (!h.MediaType || h.MediaType === 'Audio'); });
        if (songs.length) {
          out.appendChild(el('h2', 'ml-shelf-title', t('songsOfSearch') + ' (' + songs.length + ')'));
          var ctx = songListCtx();
          ctx.tracks = songs;
          ctx.listEl = el('div', 'ml-tracks');
          out.appendChild(ctx.listEl);
          ctx.renderTracks();
        }
        group(t('albums'), albums.map(function (h) { return row({ title: h.Name, sub: t('album') + (h.AlbumArtist ? ' • ' + h.AlbumArtist : ''), img: hintImg(h, 96), onClick: function () { go(link(h)); } }); }));
        group(t('artists'), artists.map(function (h) { return row({ title: h.Name, sub: t('artist'), img: hintImg(h, 96), round: true, onClick: function () { go(link(h)); } }); }));
        group(t('playlists'), lists.map(function (h) { return row({ title: h.Name, sub: t('playlist'), img: hintImg(h, 96), onClick: function () { go(link(h)); } }); }));
        if (!songs.length && !albums.length && !artists.length && !lists.length) out.appendChild(el('p', 'ml-muted ml-pad', t('noResults', q)));
      }, function () {
        if (my !== token) return;
        out.textContent = '';
        failNote(out, run);
      });
    }
    input.addEventListener('input', debounce(run, 300));
    run();
  }

  /* ---------- Bibliothek ---------- */
  function libRow(opts) {
    var b = btn('ml-list-row' + (opts.cls ? ' ' + opts.cls : ''));
    if (opts.id) b.dataset.id = nid(opts.id);
    b.appendChild(opts.coverEl || cover(opts.img, 'ml-row-cover' + (opts.round ? ' ml-round' : '')));
    var txt = el('div', 'ml-row-text');
    txt.appendChild(el('div', 'ml-row-title', opts.title));
    if (opts.sub) txt.appendChild(el('div', 'ml-row-sub', opts.sub));
    b.appendChild(txt);
    b.addEventListener('click', opts.onClick);
    return b;
  }

  // Liste der Bibliothek (Playlists, Alben, Kuenstler) - fuer den Reiter "Bibliothek" und die Seitenleiste am Computer.
  // alive(): false, sobald die Liste nicht mehr gebraucht wird.
  function buildLibList(list, alive, retry) {
    list.textContent = '';
    var seg = state.libSeg;
    if (seg === 'playlists') {
      var pre = peekLists(), psig = null;
      function paintPls(pls) {
        list.textContent = '';
        list.appendChild(libRow({ id: 'liked', coverEl: likedCoverEl('ml-row-cover'), title: t('liked'), sub: t('playlist'), onClick: function () { ensureLibrary().then(function () { go(likedHash()); }); } }));
        pls.forEach(function (p) {
          var sub = t('playlist') + ' • ' + (p.info.isOwner ? (p.info.isPublic ? t('publicBadge') : t('privateBadge')) : (p.info.ownerName || t('sharedBadge')));
          list.appendChild(libRow({ id: p.id, coverEl: playlistCover(p, 'ml-row-cover', 120), title: p.item.Name, sub: sub, onClick: function () { go(hrefFor(p.item)); } }));
        });
        if (!pls.length) list.appendChild(el('p', 'ml-muted ml-pad', t('noPlaylistsYet')));
        markSide();
      }
      if (pre) { psig = plSig(pre.pls); paintPls(pre.pls); }
      else list.appendChild(el('div', 'ml-muted ml-pad', t('loading')));
      loadPlaylists(true).then(function (pls) {
        if (!alive() || state.libSeg !== 'playlists') return;
        if (psig !== null && psig === plSig(pls)) return;
        var keep = list.scrollTop;
        paintPls(pls);
        if (keep) list.scrollTop = keep;
      }, function () { if (alive() && psig === null) { list.textContent = ''; failNote(list, retry); } });
      return;
    }
    var start = 0, total = null;
    function page() {
      var more = list.querySelector('.ml-more');
      if (more) more.remove();
      var params = seg === 'albums'
        ? { IncludeItemTypes: 'MusicAlbum', Recursive: true, SortBy: 'SortName', Fields: 'ChildCount' }
        : {};
      params.StartIndex = start; params.Limit = 60;
      if (state.libraryId) params.ParentId = state.libraryId;
      var req = seg === 'albums'
        ? getItems(params)
        : call('GET', 'Artists/AlbumArtists', Object.assign({ UserId: uid(), SortBy: 'SortName' }, params)).then(function (r) { return { items: (r && r.Items) || [], total: (r && r.TotalRecordCount) || 0 }; });
      req.then(function (r) {
        if (!alive() || state.libSeg !== seg) return;
        total = r.total;
        r.items.forEach(function (it) {
          list.appendChild(libRow({
            id: it.Id, img: itemImg(it, 120), round: seg === 'artists', title: it.Name,
            sub: seg === 'albums' ? t('album') + ' • ' + albumArtistLine(it) : t('artist'),
            onClick: function () { go(hrefFor(it)); }
          }));
        });
        start += r.items.length;
        if (!r.items.length && start === 0) list.appendChild(el('p', 'ml-muted ml-pad', t('nothingYet')));
        if (r.items.length && start < total) {
          var m = btn('ml-pill ml-more', t('loadMore'));
          m.addEventListener('click', function () { m.disabled = true; page(); });
          list.appendChild(m);
        }
        markSide();
      }, function () { if (alive()) failNote(list, retry); });
    }
    page();
  }

  function renderLibrary(host, seq) {
    host.textContent = '';
    var head = el('div', 'ml-topbar');
    head.appendChild(profileButton());
    head.appendChild(el('h1', 'ml-page-title ml-inline', t('yourLibraryTitle')));
    var plus = iconBtn('add', t('mNewPlaylist'), 'ml-top-add', openCreatePlaylist);
    head.appendChild(plus);
    host.appendChild(head);
    var list = el('div', 'ml-lib-list');
    function fill() { buildLibList(list, function () { return seq === state.view; }, fill); }
    host.appendChild(chipRow([
      { key: 'playlists', label: t('libPlaylists') }, { key: 'albums', label: t('libAlbums') }, { key: 'artists', label: t('libArtists') }
    ], state.libSeg, function (k) { state.libSeg = k; fill(); }, 'ml-lib-chips'));
    host.appendChild(list);
    fill();
  }

  /* ---------- Detailseite (Playlist, Album, Lieblingssongs) ---------- */
  function sumTicks(tracks) { return tracks.reduce(function (s, x) { return s + (x.RunTimeTicks || 0); }, 0); }

  // Farbe der Seite (Verlauf nach Schwarz) aus dem Cover; veraltete Ergebnisse einer verlassenen Seite werden verworfen.
  function pageColor(img) {
    var seq = state.view;
    function run() { if (seq !== state.view || !root) return; var pal = coverPalette(img); if (pal) setPalette(root, pal); }
    if (img.complete && img.naturalWidth) run(); else img.addEventListener('load', run, { once: true });
  }

  function buildDetail(host, ctx) {
    host.textContent = '';
    var edit = !!ctx.edit;
    var hero = el('div', 'ml-hero' + (edit ? ' ml-hero-edit' : ''));
    var bar = el('div', 'ml-hero-bar');
    bar.appendChild(iconBtn('back', t('back'), 'ml-hero-back', function () { if (edit) { ctx.edit = false; ctx.renderAll(); } else leaveDetail(); }));
    if (edit) {
      bar.appendChild(el('div', 'ml-hero-bar-title', t('editTitle')));
      var fin = btn('ml-pill ml-flat ml-hero-done', t('done'));
      fin.addEventListener('click', function () { ctx.edit = false; ctx.renderAll(); });
      bar.appendChild(fin);
    }
    hero.appendChild(bar);

    var title = ctx.kind === 'liked' ? t('liked') : ctx.kind === 'album' ? ctx.album.Name : ctx.pl.item.Name;
    var coverEl = coverFor(ctx, 'ml-hero-cover');
    hero.appendChild(coverEl);
    var heroImg = coverEl.querySelector('img');
    if (heroImg) pageColor(heroImg);
    if (ctx.kind === 'liked') setPalette(root, { base: 'hsl(252,52%,38%)', deep: 'hsl(252,44%,13%)', card: 'hsl(252,52%,48%)' });

    if (!edit) {
      var info = el('div', 'ml-hero-info');
      info.appendChild(el('h1', 'ml-hero-title', title));
      var desc = ctx.kind === 'playlist' ? (ctx.pl.item.Overview || '').trim() : '';
      if (desc) info.appendChild(el('p', 'ml-hero-desc', desc));

      var who = el('div', 'ml-hero-owner');
      if (ctx.kind === 'playlist') {
        who.appendChild(avatar(ctx.pl.info.ownerId, ctx.pl.info.ownerName));
        who.appendChild(el('span', 'ml-owner-name', ctx.pl.info.ownerName || ''));
        if (ctx.pl.info.isOwner) who.appendChild(iconBtn('add', t('invitePeople'), 'ml-owner-add', function () { ML.openShareSheet(ctx.pl.id); }));
      } else if (ctx.kind === 'album' && ctx.book) {
        var au = albumArtistLine(ctx.album);
        who.appendChild(el('span', 'ml-owner-name', [t('bookLabel'), au].filter(Boolean).join(' • ')));
      } else if (ctx.kind === 'album') {
        var art = albumArtistLine(ctx.album);
        var a = btn('ml-owner-link', art || t('unknownArtist'));
        a.addEventListener('click', function () { openArtist(albumArtistItems(ctx.album)); });
        who.appendChild(a);
        if (ctx.album.ProductionYear) who.appendChild(el('span', 'ml-muted', ' • ' + ctx.album.ProductionYear));
      } else {
        loadMe().then(function (me) {
          who.appendChild(avatar(me.id, me.name));
          who.appendChild(el('span', 'ml-owner-name', me.name));
        });
      }
      info.appendChild(who);

      var cnt = function (n) { return ctx.book ? (n === 1 ? t('chapter1') : t('chaptersN', n)) : countText(n); };
      var stats = ctx.tracks.length ? [fmtLong(sumTicks(ctx.tracks)), cnt(ctx.tracks.length)] : [cnt(0)];
      if (ctx.kind === 'playlist') stats.push(ctx.pl.info.isPublic ? t('publicBadge') : t('privateBadge'));
      info.appendChild(el('div', 'ml-hero-stats', stats.join(' • ')));
      if (ctx.groups) info.appendChild(el('div', 'ml-mixed-note', t('mixedNote', ctx.groups.length)));
      hero.appendChild(info);

      var actions = el('div', 'ml-actions');
      var left = el('div', 'ml-actions-left');
      if (ctx.kind === 'playlist') left.appendChild(iconBtn('download', t('download'), '', function () { openDownload(ctx.pl); }));
      if (ctx.kind === 'liked') left.appendChild(iconBtn('add', t('addFirstSongs'), 'ml-liked-add', function () { openAddSongs({ liked: true }, ctx.reload); }));
      if (ctx.kind !== 'liked' && !(ctx.book && ctx.album.Type !== 'MusicAlbum')) left.appendChild(iconBtn('share', t('share'), '', function () {
        if (ctx.kind === 'playlist') shareList(ctx);
        else openShare({ url: linkFor(ctx.album.Id), title: ctx.album.Name, subtitle: albumArtistLine(ctx.album), cover: itemImg(ctx.album, 120), note: '' });
      }));
      left.appendChild(iconBtn('more_v', t('more'), '', function () { playlistMenu(ctx); }));
      var right = el('div', 'ml-actions-right');
      var sh = iconBtn('shuffle', t('shuffle'), 'ml-shuffle-btn', function () { playCtx(ctx, true); });
      var pl = iconBtn('play', t('play'), 'ml-play-btn', function () { playCtx(ctx, false); });
      right.appendChild(sh); right.appendChild(pl);
      actions.appendChild(left); actions.appendChild(right);
      hero.appendChild(actions);
    }
    host.appendChild(hero);

    if (ctx.subs && ctx.subs.length && !edit) {
      shelf(host, t('books'), ctx.subs.map(function (sub) {
        var n = sub.ChildCount;
        return tile({
          title: sub.Name, sub: n ? (n === 1 ? t('chapter1') : t('chaptersN', n)) : t('bookLabel'), coverEl: folderCover(sub, 'ml-tile-cover', 300),
          onClick: function () { go(folderHash(ctx.libId || state.libraryId || '', sub.Id)); }
        });
      }));
    }
    var list = el('div', 'ml-tracks');
    host.appendChild(list);
    ctx.listEl = list;
    ctx.renderTracks();
  }

  // Alles abspielen (bei Ordnern mit Unterordnern werden zuerst alle Titel darunter eingesammelt).
  function playCtx(ctx, shuf) {
    if (ctx.playAll && ctx.subs && ctx.subs.length) {
      ctx.playAll().then(function (ids) { if (ids.length) playIds(shuf ? shuffled(ids) : ids, 0); }, function () { toast(t('playFailed')); });
      return;
    }
    if (!ctx.tracks.length) return;
    var ids = idsOf(ctx.tracks);
    playIds(shuf ? shuffled(ids) : ids, 0);
  }

  var TRACK_PAGE = 150;
  function makeDetailCtx(host, base) {
    var ctx = base;
    ctx.edit = false;
    ctx.shown = TRACK_PAGE;
    ctx.renderTracks = function () {
      var list = ctx.listEl;
      if (!list) return;
      list.textContent = '';
      var edit = ctx.edit;
      var head1 = ctx.tracks.length ? tableHead(ctx) : null;
      if (head1) list.appendChild(head1);
      if (edit && ctx.canEdit) {
        var addRow = btn('ml-list-row ml-add-songs');
        addRow.appendChild(icon('add', 'ml-add-songs-ic'));
        addRow.appendChild(el('span', 'ml-row-title', t('addFirstSongs')));
        addRow.addEventListener('click', function () { openAddSongs(ctx.pl, ctx.reload); });
        list.appendChild(addRow);
      }
      var upto = Math.min(ctx.tracks.length, edit ? ctx.tracks.length : ctx.shown);
      var gi = 0;
      for (var i = 0; i < upto; i++) {
        if (ctx.groups && ctx.groups[gi] && ctx.groups[gi].start === i) {
          var g = ctx.groups[gi++];
          var gh = el('div', 'ml-group-head');
          gh.appendChild(el('div', 'ml-group-title', g.name || t('album')));
          gh.appendChild(el('div', 'ml-group-sub', [g.artist, countText(g.count)].filter(Boolean).join(' • ')));
          list.appendChild(gh);
        }
        list.appendChild(trackRow(ctx.tracks[i], i, ctx));
      }
      if (upto < ctx.tracks.length) {
        var more = btn('ml-pill ml-more', t('moreTracks'));
        more.addEventListener('click', function () { ctx.shown += TRACK_PAGE; ctx.renderTracks(); });
        list.appendChild(more);
      }
      if (!ctx.tracks.length) {
        var e = el('div', 'ml-empty');
        e.appendChild(el('p', null, ctx.kind === 'liked' ? t('emptyLiked') : ctx.book ? t('folderEmpty') : t('emptyPlaylist')));
        if (ctx.kind === 'liked' || (ctx.canEdit && ctx.kind === 'playlist')) {
          var addB = btn('ml-pill ml-primary', t('addFirstSongs'));
          addB.addEventListener('click', function () { openAddSongs(ctx.kind === 'liked' ? { liked: true } : ctx.pl, ctx.reload); });
          e.appendChild(addB);
        }
        list.appendChild(e);
      }
      markPlaying();
    };
    ctx.renderAll = function () {
      var top = scroller ? scroller.scrollTop : 0;
      buildDetail(host, ctx);
      if (scroller) scroller.scrollTop = top;
    };
    ctx.host = host;
    ctx.root = host;
    return ctx;
  }

  function markPlaying() {
    var cur = Player.currentId();
    ML.qsa('.ml-track', content).forEach(function (r) {
      r.classList.toggle('ml-playing', !!cur && nid(r.dataset.id) === nid(cur));
    });
  }

  function renderDetailLoading(host) {
    host.textContent = '';
    var bar = el('div', 'ml-hero-bar');
    bar.appendChild(iconBtn('back', t('back'), 'ml-hero-back', leaveDetail));
    host.appendChild(bar);
    host.appendChild(el('div', 'ml-muted ml-pad', t('loading')));
  }

  function renderDetailFailed(host, retry) {
    host.textContent = '';
    var bar = el('div', 'ml-hero-bar');
    bar.appendChild(iconBtn('back', t('back'), 'ml-hero-back', leaveDetail));
    host.appendChild(bar);
    failNote(host, retry);
  }

  function showPlaylistDetail(host, seq, id) {
    renderDetailLoading(host);
    function load() {
      return Promise.all([
        loadItem(id, 'Overview,ChildCount,DateCreated'),
        call('GET', 'MusicLook/Playlist/' + id),
        loadPlaylistTracks(id)
      ]).then(function (res) {
        if (seq !== state.view) return null;
        var item = res[0], info = res[1];
        if (!item || !info) throw new Error('missing');
        return { id: item.Id, item: item, info: info, tracks: res[2] };
      });
    }
    function start() {
      load().then(function (data) {
        if (!data) return;
        var ctx = makeDetailCtx(host, { kind: 'playlist', pl: { id: data.id, item: data.item, info: data.info }, tracks: data.tracks, canEdit: !!data.info.canEdit });
        ctx.reload = function () {
          invalidatePlaylists();
          load().then(function (d) {
            if (!d) return;
            ctx.pl = { id: d.id, item: d.item, info: d.info }; ctx.tracks = d.tracks; ctx.canEdit = !!d.info.canEdit;
            ctx.renderAll();
          }, function () { toast(t('loadFailed')); });
        };
        buildDetail(host, ctx);
      }, function () { if (seq === state.view) renderDetailFailed(host, function () { renderDetailLoading(host); start(); }); });
    }
    start();
  }

  // Enthalten die Titel eines "Albums" mehrere verschiedene Album-Tags (Sammelordner), werden sie nach Album-Tag gruppiert.
  function groupByAlbumTag(tracks) {
    var order = [], map = {};
    tracks.forEach(function (tr) {
      var key = String(tr.Album || '').trim().toLowerCase();
      if (!map[key]) { map[key] = { name: tr.Album || '', tracks: [] }; order.push(key); }
      map[key].tracks.push(tr);
    });
    var named = order.filter(function (k) { return k; });
    if (named.length < 2) return { tracks: tracks, groups: null };
    var flat = [], groups = [];
    order.forEach(function (k) {
      var g = map[k], names = [];
      g.tracks.forEach(function (tr) {
        var a = (tr.AlbumArtist || (tr.Artists && tr.Artists[0]) || '').trim();
        if (a && names.indexOf(a) < 0) names.push(a);
      });
      groups.push({ start: flat.length, name: g.name, count: g.tracks.length, artist: names.length > 2 ? t('variousArtists') : names.join(', ') });
      flat = flat.concat(g.tracks);
    });
    return { tracks: flat, groups: groups };
  }

  function showAlbumDetail(host, seq, id) {
    renderDetailLoading(host);
    function start() {
      Promise.all([loadItem(id, 'ChildCount,Genres'), loadAlbumTracks(id)]).then(function (res) {
        if (seq !== state.view) return;
        if (!res[0]) throw new Error('missing');
        var grouped = groupByAlbumTag(res[1]);
        var ctx = makeDetailCtx(host, { kind: 'album', album: res[0], tracks: grouped.tracks, groups: grouped.groups, canEdit: false });
        ctx.reload = function () { start(); };
        buildDetail(host, ctx);
      }, function () { if (seq === state.view) renderDetailFailed(host, function () { renderDetailLoading(host); start(); }); });
    }
    start();
  }

  // Hoerbuch-/Ordneransicht: Kapitel als Liste, Unterordner (z. B. einzelne Buecher einer Reihe) als Kacheln.
  function sortChapters(files) {
    var allIdx = files.length > 1 && files.every(function (f) { return f.IndexNumber != null; });
    if (!allIdx) return files;
    return files.slice().sort(function (a, b) { return ((a.ParentIndexNumber || 0) - (b.ParentIndexNumber || 0)) || (a.IndexNumber - b.IndexNumber); });
  }
  function collectFolderTracks(id, depth) {
    return itemsOf({ ParentId: id, SortBy: 'SortName', Limit: 1000, Fields: 'ChildCount' }).then(function (kids) {
      kids = kids.filter(function (k) { return !isBookFile(k); });
      var files = sortChapters(kids.filter(function (k) { return !isFolderish(k) && isAudioItem(k); }));
      var subs = kids.filter(isFolderish);
      if (!subs.length || depth >= 4) return files;
      return subs.reduce(function (p, sub) {
        return p.then(function (acc) { return collectFolderTracks(sub.Id, depth + 1).then(function (more) { return acc.concat(more); }); });
      }, Promise.resolve([])).then(function (all) { return all.concat(files); });
    });
  }
  function showFolderDetail(host, seq, id, libId) {
    renderDetailLoading(host);
    function start() {
      Promise.all([
        loadItem(id, 'Overview,ChildCount'),
        itemsOf({ ParentId: id, SortBy: 'SortName', Limit: 1000, Fields: 'ChildCount' })
      ]).then(function (res) {
        if (seq !== state.view) return;
        if (!res[0]) throw new Error('missing');
        var kids = res[1].filter(function (k) { return !isBookFile(k); });
        var subs = kids.filter(isFolderish);
        var files = sortChapters(kids.filter(function (k) { return !isFolderish(k) && isAudioItem(k); }));
        var ctx = makeDetailCtx(host, { kind: 'album', book: true, album: res[0], tracks: files, subs: subs, libId: libId, canEdit: false });
        ctx.playAll = function () { return collectFolderTracks(id, 0).then(idsOf); };
        ctx.reload = function () { start(); };
        buildDetail(host, ctx);
      }, function () { if (seq === state.view) renderDetailFailed(host, function () { renderDetailLoading(host); start(); }); });
    }
    start();
  }

  function showLikedDetail(host, seq) {
    renderDetailLoading(host);
    function start() {
      loadLikedTracks().then(function (tracks) {
        if (seq !== state.view) return;
        var ctx = makeDetailCtx(host, { kind: 'liked', tracks: tracks, canEdit: false });
        ctx.reload = function () { start(); };
        buildDetail(host, ctx);
      }, function () { if (seq === state.view) renderDetailFailed(host, function () { renderDetailLoading(host); start(); }); });
    }
    start();
  }


  /* ---------- Kuenstlerseite ---------- */
  function showArtistDetail(host, seq, id) {
    renderDetailLoading(host);
    function start() {
      Promise.all([
        loadItem(id, 'Overview,Genres'),
        itemsOf({ ArtistIds: id, IncludeItemTypes: 'Audio', Recursive: true, SortBy: 'PlayCount,SortName', SortOrder: 'Descending,Ascending', Limit: 500 }),
        itemsOf({ ArtistIds: id, IncludeItemTypes: 'MusicAlbum', Recursive: true, SortBy: 'ProductionYear,SortName', SortOrder: 'Descending,Ascending', Limit: 100 }).catch(function () { return []; })
      ]).then(function (res) {
        if (seq !== state.view) return;
        if (!res[0]) throw new Error('missing');
        buildArtist(host, { kind: 'artist', artist: res[0], tracks: res[1], albums: res[2], canEdit: false, expanded: false, bio: false });
      }, function () { if (seq === state.view) renderDetailFailed(host, function () { renderDetailLoading(host); start(); }); });
    }
    start();
  }

  function artistMenu(ctx) {
    var a = ctx.artist, ids = idsOf(ctx.tracks);
    openMenu({ title: a.Name, subtitle: t('artist'), cover: itemImg(a, 120), round: true }, [
      { icon: 'share', label: t('mShare'), run: function () { openShare({ url: linkFor(a.Id), title: a.Name, subtitle: t('artist'), cover: itemImg(a, 120), note: '' }); } },
      { hidden: !ids.length, icon: 'queue', label: t('mQueue'), run: function () { queueIds(ids); } },
      { hidden: !ids.length, icon: 'playlist_add', label: t('mAddToPlaylist'), run: function () { addToPlaylist(ids); } },
      { hidden: !ids.length || !ML.config().jamEnabled, icon: 'group', label: t('mJam'), run: function () { jamWith(ids); } }
    ]);
  }

  function buildArtist(host, ctx) {
    host.textContent = '';
    var a = ctx.artist;
    var hero = el('div', 'ml-hero ml-artist-hero');
    var bar = el('div', 'ml-hero-bar');
    bar.appendChild(iconBtn('back', t('back'), 'ml-hero-back', leaveDetail));
    hero.appendChild(bar);
    var pic = cover(itemImg(a, 600), 'ml-hero-cover ml-round');
    hero.appendChild(pic);
    var img = pic.querySelector('img');
    if (img) pageColor(img);

    var info = el('div', 'ml-hero-info');
    info.appendChild(el('h1', 'ml-hero-title', a.Name));
    var stats = [countText(ctx.tracks.length)];
    if (ctx.albums.length) stats.push(ctx.albums.length === 1 ? t('albumsCount1') : t('albumsCountN', ctx.albums.length));
    info.appendChild(el('div', 'ml-hero-stats', stats.join(' • ')));
    hero.appendChild(info);

    var actions = el('div', 'ml-actions');
    var left = el('div', 'ml-actions-left');
    left.appendChild(iconBtn('share', t('share'), '', function () { openShare({ url: linkFor(a.Id), title: a.Name, subtitle: t('artist'), cover: itemImg(a, 120), note: '' }); }));
    left.appendChild(iconBtn('more_v', t('more'), '', function () { artistMenu(ctx); }));
    var right = el('div', 'ml-actions-right');
    right.appendChild(iconBtn('shuffle', t('shuffle'), 'ml-shuffle-btn', function () { if (ctx.tracks.length) playIds(shuffled(idsOf(ctx.tracks)), 0); }));
    right.appendChild(iconBtn('play', t('play'), 'ml-play-btn', function () { if (ctx.tracks.length) playIds(idsOf(ctx.tracks), 0); }));
    actions.appendChild(left); actions.appendChild(right);
    hero.appendChild(actions);
    host.appendChild(hero);

    // Beliebte Titel
    var sec = el('section', 'ml-artist-section');
    sec.appendChild(el('h2', 'ml-shelf-title', t('popularSongs')));
    ctx.listEl = el('div', 'ml-tracks');
    sec.appendChild(ctx.listEl);
    var toggle = btn('ml-pill ml-flat ml-more');
    sec.appendChild(toggle);
    ctx.renderTracks = function () {
      ctx.listEl.textContent = '';
      var head2 = ctx.tracks.length ? tableHead(ctx) : null;
      if (head2) ctx.listEl.appendChild(head2);
      var upto = Math.min(ctx.tracks.length, ctx.expanded ? 50 : 5);
      for (var i = 0; i < upto; i++) ctx.listEl.appendChild(trackRow(ctx.tracks[i], i, ctx));
      toggle.hidden = ctx.tracks.length <= 5;
      toggle.textContent = ctx.expanded ? t('showLess') : t('showMore');
      markPlaying();
    };
    toggle.addEventListener('click', function () { ctx.expanded = !ctx.expanded; ctx.renderTracks(); });
    if (ctx.tracks.length) host.appendChild(sec);
    ctx.renderTracks();

    shelf(host, t('artistAlbums'), ctx.albums.map(itemTile));

    var bio = (a.Overview || '').trim();
    if (bio) {
      var about = el('section', 'ml-artist-section');
      about.appendChild(el('h2', 'ml-shelf-title', t('aboutArtist')));
      var para = el('p', 'ml-artist-bio', bio);
      about.appendChild(para);
      if (bio.length > 280) {
        para.classList.add('ml-clamp');
        var more = btn('ml-pill ml-flat ml-more', t('showMore'));
        more.addEventListener('click', function () {
          var open = para.classList.toggle('ml-clamp');
          more.textContent = open ? t('showMore') : t('showLess');
        });
        about.appendChild(more);
      }
      host.appendChild(about);
    }
    if (!ctx.tracks.length && !ctx.albums.length && !bio) host.appendChild(el('p', 'ml-muted ml-pad', t('nothingYet')));
  }

  /* ---------- Player ---------- */
  var Player = (function () {
    var P = {
      session: null, item: null, full: null, paused: true, pos: 0, dur: 0, repeat: 'RepeatNone', shuffle: false, volume: 100,
      queue: [], at: 0, fav: false, lyrics: undefined, targetId: null, targetName: '', misses: 0, pal: null
    };
    var pollTimer = null, tickTimer = null, fastUntil = 0, polling = false, running = false;
    var mini = null, full = null, ui = {}, fullOpen = false, seeking = false, lastItemId = '', heroCoverId = '';
    var panels = [], queuePanel = null, lyPanel = null, lyPanelIdx = -2, lyricIdx = -2, extrasFor = '', compact = false, scrollQueued = false;
    var queueNames = {}, lyricCache = {}, artistCache = {};
    var bar = null, np = null, barCoverId = '', npCoverId = '', npFor = '', seekingBar = false, npHidden = false;
    try { npHidden = window.localStorage.getItem('ml.np') === '0'; } catch (e) { npHidden = false; }

    // Gewaehltes Wiedergabegeraet (nur fuer diesen Tab gemerkt)
    try {
      var saved = JSON.parse(window.sessionStorage.getItem('ml.target') || 'null');
      if (saved && typeof saved.id === 'string' && saved.id) { P.targetId = saved.id; P.targetName = String(saved.name || ''); }
    } catch (e) { /* kein Speicher */ }

    function audioEl() {
      if (P.targetId) return null;   // laeuft auf einem anderen Geraet
      var a = document.querySelector('audio.mediaPlayerAudio');
      return a && P.item && nid(a.currentSrc || a.src || '').indexOf(nid(P.item.Id)) >= 0 ? a : null;
    }
    function currentId() { return P.item ? P.item.Id : null; }

    function position() {
      var a = audioEl();
      if (a && isFinite(a.currentTime)) return a.currentTime;
      if (P.paused) return P.pos;
      return P.pos + (Date.now() - P.at) / 1000;
    }
    function duration() {
      var a = audioEl();
      if (a && isFinite(a.duration) && a.duration > 0) return a.duration;
      return P.dur;
    }
    function isPaused() {
      var a = audioEl();
      return a ? a.paused : P.paused;
    }

    /* ---------- Geraete ---------- */
    function deviceLabel(s) { return (s && (s.DeviceName || s.Client)) || '?'; }
    function deviceIcon(s) {
      var n = ((s.DeviceName || '') + ' ' + (s.Client || '')).toLowerCase();
      if (/\b(tv|roku|fire|chromecast|webos|tizen|kodi|apple tv|shield)\b/.test(n)) return 'tv';
      if (/(phone|pixel|iphone|android|galaxy|ios|ipad|tablet|mobile|\bsm-)/.test(n)) return 'phone';
      return 'computer';
    }
    function thisDeviceId() { var c = ML.client(); return c && c.deviceId ? c.deviceId() : ''; }

    function setTarget(id, name) {
      P.targetId = id || null; P.targetName = id ? (name || '') : ''; P.misses = 0;
      try {
        if (id) window.sessionStorage.setItem('ml.target', JSON.stringify({ id: id, name: P.targetName }));
        else window.sessionStorage.removeItem('ml.target');
      } catch (e) { /* kein Speicher */ }
      sessCache.at = 0;
      paint();
    }

    // Aktueller Zustand der gesteuerten Sitzung (dieses Geraet oder das gewaehlte Zielgeraet).
    function fetchState() {
      if (!P.targetId) return ML.mySession();
      return call('GET', 'Sessions', { ControllableByUserId: uid() }).then(function (r) {
        var s = (r || []).filter(function (x) { return x.Id === P.targetId; })[0] || null;
        if (s) { P.misses = 0; P.targetName = deviceLabel(s); return s; }
        if (++P.misses >= 3) { setTarget(null); return ML.mySession(); }   // Zielgeraet nicht mehr erreichbar
        return P.session;
      });
    }

    function listDevices() {
      return call('GET', 'Sessions', { ControllableByUserId: uid(), activeWithinSeconds: 960 }).then(function (r) {
        var me = nid(uid()), here = thisDeviceId();
        var list = (r || []).filter(function (s) { return nid(s.UserId) === me && s.SupportsRemoteControl !== false && (s.DeviceName || s.Client); });
        // je Geraet nur eine Sitzung (die zuletzt aktive)
        var byDev = {};
        list.forEach(function (s) {
          var k = s.DeviceId || s.Id;
          if (!byDev[k] || String(s.LastActivityDate || '') > String(byDev[k].LastActivityDate || '')) byDev[k] = s;
        });
        list = Object.keys(byDev).map(function (k) { return byDev[k]; });
        list.sort(function (a, b) {
          if ((a.DeviceId === here) !== (b.DeviceId === here)) return a.DeviceId === here ? -1 : 1;
          return String(b.LastActivityDate || '') < String(a.LastActivityDate || '') ? -1 : 1;
        });
        return list;
      });
    }

    // Uebertraegt die Wiedergabe (Warteschlange, Titel, Position) auf ein anderes Geraet und stoppt sie auf dem bisherigen.
    function transferTo(target) {
      var toThis = target.DeviceId === thisDeviceId();
      return fetchState().then(function (cur) {
        var srcId = cur && cur.Id;
        if (srcId && srcId === target.Id) return true;
        var oldId = P.targetId, oldName = P.targetName;
        var np = cur && cur.NowPlayingItem;
        var ps = (cur && cur.PlayState) || {};
        var q = cur ? (cur.NowPlayingQueue || []).map(function (x) { return x.Id; }) : [];
        var idx = np ? q.map(nid).indexOf(nid(np.Id)) : -1;
        if (np && idx < 0) { q = [np.Id]; idx = 0; }
        setTarget(toThis ? null : target.Id, toThis ? '' : deviceLabel(target));
        if (!np) { kick(); return true; }   // nichts zu uebertragen: nur das Ziel wechseln
        return playIds(q, idx, { positionTicks: ps.PositionTicks || 0 }).then(function (ok) {
          if (!ok) { setTarget(oldId, oldName); return false; }
          if (srcId) call('POST', 'Sessions/' + srcId + '/Playing/Stop').catch(function () { /* Quelle war schon still */ });
          if (ps.IsPaused) setTimeout(function () { command('Playing/Pause').catch(function () { /* ignorieren */ }); }, 1500);
          if (ps.RepeatMode && ps.RepeatMode !== 'RepeatNone') {
            setTimeout(function () { command('Command', null, { Name: 'SetRepeatMode', Arguments: { RepeatMode: ps.RepeatMode } }).catch(function () { /* ignorieren */ }); }, 1800);
          }
          kick();
          return true;
        });
      });
    }

    function openDevices() {
      var timer = null;
      var ui2 = makeSheet({ cls: 'ml-menu ml-devices', title: t('devices'), onClose: function () { clearInterval(timer); } });
      var head = el('div', 'ml-menu-head');
      head.appendChild(icon('devices'));
      var txt = el('div', 'ml-menu-text');
      txt.appendChild(el('div', 'ml-menu-title', t('devicePick')));
      head.appendChild(txt);
      ui2.sheet.appendChild(head);
      var box = el('div', 'ml-dev-list');
      ui2.sheet.appendChild(box);
      box.appendChild(el('div', 'ml-sheet-note ml-pad', t('devicesLoading')));

      var vol = el('input', 'ml-range ml-vol-range');
      vol.type = 'range'; vol.min = '0'; vol.max = '100'; vol.step = '1'; vol.value = String(Math.round(P.volume));
      vol.setAttribute('aria-label', t('volume'));
      paintRange(vol);
      vol.addEventListener('input', function () { paintRange(vol); });
      vol.addEventListener('change', function () { setVolume(parseInt(vol.value, 10)); });
      var volRow = el('div', 'ml-dev-volume');
      add(volRow, icon('volume'), vol);
      ui2.sheet.appendChild(volRow);
      ui2.sheet.appendChild(el('div', 'ml-sheet-note ml-dev-note', t('deviceNote')));

      var busy = false;
      function fill(list) {
        box.textContent = '';
        var here = thisDeviceId();
        if (!list.length) box.appendChild(el('div', 'ml-sheet-note ml-pad', t('devicesNone')));
        list.forEach(function (s) {
          var isThis = s.DeviceId === here;
          var active = P.targetId ? s.Id === P.targetId : isThis;
          var row = btn('ml-menu-item ml-dev-row' + (active ? ' ml-on' : ''));
          row.appendChild(icon(active ? 'volume' : deviceIcon(s)));
          var tx = el('div', 'ml-dev-text');
          tx.appendChild(el('div', 'ml-dev-name', deviceLabel(s)));
          var sub = [isThis ? t('thisDevice') : (s.Client || ''), s.NowPlayingItem ? t('devicePlaying', s.NowPlayingItem.Name) : (active ? t('deviceActive') : t('deviceIdle'))];
          tx.appendChild(el('div', 'ml-dev-sub', sub.filter(Boolean).join(' • ')));
          row.appendChild(tx);
          row.addEventListener('click', function () {
            if (busy || active) { if (active) ui2.close(); return; }
            busy = true;
            row.disabled = true;
            transferTo(s).then(function (ok) {
              busy = false;
              if (ok) { toast(t('deviceSwitched', isThis ? t('thisDevice') : deviceLabel(s))); ui2.close(); }
              else { row.disabled = false; toast(t('deviceFailed')); }
            }, function () { busy = false; row.disabled = false; toast(t('deviceFailed')); });
          });
          box.appendChild(row);
        });
      }
      function refresh() {
        if (busy) return;
        listDevices().then(fill, function () { box.textContent = ''; box.appendChild(el('div', 'ml-sheet-note ml-pad', t('loadFailed'))); });
      }
      refresh();
      timer = setInterval(refresh, 4000);
    }

    /* ---------- Mini-Player ---------- */
    function ensureMini() {
      if (mini) return mini;
      mini = el('div', 'ml-mini');
      mini.hidden = true;
      var open = btn('ml-mini-main');
      open.setAttribute('aria-label', t('openPlayer'));
      ui.miniCover = el('div', 'ml-mini-cover');
      var txt = el('div', 'ml-mini-text');
      ui.miniTitle = el('div', 'ml-mini-title');
      ui.miniSub = el('div', 'ml-mini-sub');
      ui.miniDev = el('div', 'ml-mini-dev');
      add(txt, ui.miniTitle, ui.miniSub, ui.miniDev);
      add(open, ui.miniCover, txt);
      open.addEventListener('click', openFull);
      ui.miniDevBtn = iconBtn('devices', t('devices'), 'ml-mini-devbtn', openDevices);
      ui.miniToggle = iconBtn('play', t('play'), 'ml-mini-play', toggle);
      ui.miniBar = el('div', 'ml-mini-progress');
      ui.miniFill = el('div', 'ml-mini-fill');
      ui.miniBar.appendChild(ui.miniFill);
      add(mini, open, ui.miniDevBtn, ui.miniToggle, ui.miniBar);
      return mini;
    }

    /* ---------- Computer-Ansicht: Player-Leiste unten und Wiedergabe-Ansicht rechts ---------- */
    function albumHash(it) { return '#/details?id=' + it.AlbumId + (serverId() ? '&serverId=' + serverId() : ''); }
    function openArtistOfCurrent() {
      var it = P.full || P.item;
      if (it && it.ArtistItems && it.ArtistItems.length) openArtist(it.ArtistItems);
    }
    function openAlbumOfCurrent() {
      var it = P.full || P.item;
      if (it && it.AlbumId) go(albumHash(it));
    }
    function setNpHidden(on) {
      npHidden = on;
      try { window.localStorage.setItem('ml.np', on ? '0' : '1'); } catch (e) { /* ignorieren */ }
      paint();
    }

    function ensureBar() {
      if (bar) return bar;
      bar = el('div', 'ml-bar');
      bar.hidden = true;
      var left = el('div', 'ml-bar-left');
      ui.barCover = el('div', 'ml-bar-cover');
      var tx = el('div', 'ml-bar-text');
      ui.barTitle = btn('ml-bar-title'); ui.barTitle.addEventListener('click', openAlbumOfCurrent);
      ui.barArtist = btn('ml-bar-artist'); ui.barArtist.addEventListener('click', openArtistOfCurrent);
      ui.barDev = el('div', 'ml-bar-dev');
      add(tx, ui.barTitle, ui.barArtist, ui.barDev);
      ui.barFav = iconBtn('heart_o', t('mLike'), 'ml-bar-fav', toggleFav);
      add(left, ui.barCover, tx, ui.barFav);

      var mid = el('div', 'ml-bar-mid');
      var ctl = el('div', 'ml-bar-ctl');
      ui.bShuffle = iconBtn('shuffle', t('shuffle'), 'ml-bar-toggle', function () { setShuffle(!P.shuffle); });
      ui.bPrev = iconBtn('prev', t('prev'), 'ml-bar-skip', function () { skip('PreviousTrack'); });
      ui.bPlay = iconBtn('play', t('play'), 'ml-bar-play', toggle);
      ui.bNext = iconBtn('next', t('next'), 'ml-bar-skip', function () { skip('NextTrack'); });
      ui.bRepeat = iconBtn('repeat', t('repeat'), 'ml-bar-toggle', cycleRepeat);
      add(ctl, ui.bShuffle, ui.bPrev, ui.bPlay, ui.bNext, ui.bRepeat);
      var sk = el('div', 'ml-bar-seek');
      ui.bPos = el('span', 'ml-bar-time', '0:00');
      ui.bSeek = el('input', 'ml-range ml-bar-range');
      ui.bSeek.type = 'range'; ui.bSeek.min = '0'; ui.bSeek.max = '1000'; ui.bSeek.value = '0'; ui.bSeek.step = '1';
      ui.bSeek.setAttribute('aria-label', t('seekLabel'));
      ui.bDur = el('span', 'ml-bar-time', '0:00');
      ui.bSeek.addEventListener('input', function () {
        seekingBar = true;
        ui.bPos.textContent = fmtClock(duration() * ui.bSeek.value / 1000);
        paintRange(ui.bSeek);
      });
      ui.bSeek.addEventListener('change', function () {
        seekTo(duration() * ui.bSeek.value / 1000).then(function () { seekingBar = false; }, function () { seekingBar = false; });
      });
      add(sk, ui.bPos, ui.bSeek, ui.bDur);
      add(mid, ctl, sk);

      var right = el('div', 'ml-bar-right');
      ui.bLyrics = iconBtn('mic', t('lyrics'), 'ml-bar-icon', function () {
        openFull();
        loadLyrics(P.item.Id).then(function (ly) { if (ly) { P.lyrics = ly; openLyricsPanel(); } });
      });
      ui.bQueue = iconBtn('queue', t('queueTitle'), 'ml-bar-icon', function () { openFull(); openQueuePanel(); });
      ui.bDevBtn = iconBtn('devices', t('devices'), 'ml-bar-icon', openDevices);
      ui.bSpeed = btn('ml-bar-speed'); ui.bSpeed.addEventListener('click', openSpeed);
      ui.bVolIc = iconBtn('volume', t('mute'), 'ml-bar-icon', function () {
        if (P.volume > 0) { lastVol = P.volume; setVolume(0); } else setVolume(lastVol || 60);
      });
      ui.bVol = el('input', 'ml-range ml-bar-vol');
      ui.bVol.type = 'range'; ui.bVol.min = '0'; ui.bVol.max = '100'; ui.bVol.step = '1'; ui.bVol.value = String(Math.round(P.volume));
      ui.bVol.setAttribute('aria-label', t('volume'));
      paintRange(ui.bVol);
      ui.bVol.addEventListener('input', function () { paintRange(ui.bVol); });
      ui.bVol.addEventListener('change', function () { setVolume(parseInt(ui.bVol.value, 10)); });
      ui.bNpBtn = iconBtn('album', t('showRight'), 'ml-bar-icon', function () { setNpHidden(!npHidden); });
      ui.bFull = iconBtn('expand', t('openFullView'), 'ml-bar-icon', openFull);
      add(right, ui.bSpeed, ui.bLyrics, ui.bQueue, ui.bDevBtn, ui.bVolIc, ui.bVol, ui.bNpBtn, ui.bFull);
      add(bar, left, mid, right);
      return bar;
    }
    var lastVol = 60;

    function ensureNp() {
      if (np) return np;
      np = el('aside', 'ml-np');
      np.hidden = true;
      var head = el('div', 'ml-np-head');
      ui.npKicker = btn('ml-np-kicker');
      ui.npKicker.addEventListener('click', openAlbumOfCurrent);
      head.appendChild(ui.npKicker);
      head.appendChild(iconBtn('close', t('hideRight'), 'ml-np-close', function () { setNpHidden(true); }));
      np.appendChild(head);
      var scroll = el('div', 'ml-np-scroll');
      ui.npCover = el('div', 'ml-np-cover');
      var meta = el('div', 'ml-np-meta');
      var tx = el('div', 'ml-np-text');
      ui.npTitle = btn('ml-np-title'); ui.npTitle.addEventListener('click', openAlbumOfCurrent);
      ui.npArtist = btn('ml-np-artist'); ui.npArtist.addEventListener('click', openArtistOfCurrent);
      add(tx, ui.npTitle, ui.npArtist);
      ui.npFav = iconBtn('heart_o', t('mLike'), 'ml-np-fav', toggleFav);
      ui.npPlus = iconBtn('add', t('addPlus'), 'ml-np-plus', function () { if (P.item) addToPlaylist([P.item.Id]); });
      add(meta, tx, ui.npFav, ui.npPlus);
      ui.npArtistCard = el('section', 'ml-card ml-artist-card ml-np-card');
      ui.npCredits = el('section', 'ml-card ml-np-card');
      ui.npNext = el('section', 'ml-card ml-np-card');
      add(scroll, ui.npCover, meta, ui.npArtistCard, ui.npCredits, ui.npNext);
      np.appendChild(scroll);
      return np;
    }

    function paintBar(it, sub, paused, remote) {
      if (!bar) return;
      bar.hidden = false;
      ui.barTitle.textContent = P.item.Name;
      ui.barArtist.textContent = sub;
      ui.barDev.textContent = remote ? t('connectedTo', P.targetName || '…') : '';
      ui.barDev.hidden = !remote;
      if (barCoverId !== P.item.Id) { setCover(ui.barCover, P.item, 120); barCoverId = P.item.Id; }
      swapIcon(ui.bPlay, paused ? 'play' : 'pause', paused ? t('play') : t('pause'));
      swapIcon(ui.barFav, P.fav ? 'heart' : 'heart_o', P.fav ? t('mUnlike') : t('mLike'));
      ui.barFav.classList.toggle('ml-on', P.fav);
      ui.bShuffle.classList.toggle('ml-on', P.shuffle);
      ui.bShuffle.setAttribute('aria-pressed', P.shuffle ? 'true' : 'false');
      swapIcon(ui.bRepeat, P.repeat === 'RepeatOne' ? 'repeat_one' : 'repeat', P.repeat === 'RepeatNone' ? t('repeatOff') : P.repeat === 'RepeatOne' ? t('repeatOne') : t('repeat'));
      ui.bRepeat.classList.toggle('ml-on', P.repeat !== 'RepeatNone');
      ui.bDevBtn.classList.toggle('ml-on', remote);
      ui.bSpeed.textContent = speed === 1 ? '' : t('speedBadge', speed);
      ui.bSpeed.hidden = speed === 1;
      ui.bNpBtn.classList.toggle('ml-on', !npHidden);
      swapIcon(ui.bVolIc, P.volume > 0 ? 'volume' : 'volume_off', t('mute'));
      if (document.activeElement !== ui.bVol) { ui.bVol.value = String(Math.round(P.volume)); paintRange(ui.bVol); }
    }

    function paintNp(it, sub) {
      if (!np) return;
      var show = isWide() && !npHidden;
      np.hidden = !show;
      if (root) root.classList.toggle('ml-has-np', show);
      if (!show) return;
      ui.npKicker.textContent = it.Album || t('nowPlaying');
      ui.npTitle.textContent = P.item.Name;
      ui.npArtist.textContent = sub || t('unknownArtist');
      if (npCoverId !== P.item.Id) { setCover(ui.npCover, P.item, 800); npCoverId = P.item.Id; }
      swapIcon(ui.npFav, P.fav ? 'heart' : 'heart_o', P.fav ? t('mUnlike') : t('mLike'));
      ui.npFav.classList.toggle('ml-on', P.fav);
      if (npFor !== P.item.Id) { npFor = P.item.Id; ui.npNext.__sig = ''; }
      renderNpCards();
    }
    function renderNpCards() {
      if (!np || np.hidden || !P.item) return;
      renderNextCard(ui.npNext, 1);
      if (ui.npArtistCard.__for !== P.item.Id) { ui.npArtistCard.__for = P.item.Id; renderArtistCard(ui.npArtistCard); }
      if (ui.npCredits.__for !== P.item.Id + '|' + !!P.full) { ui.npCredits.__for = P.item.Id + '|' + !!P.full; renderCreditsCard(ui.npCredits); }
    }

    /* ---------- Vollbild-Seite (wie bei Spotify: Player oben, darunter Songtext, Warteschlange, Kuenstler, Credits) ---------- */
    function moreMenu() {
      if (!P.item) return;
      trackMenu(P.full || P.item, { kind: 'player', tracks: [], renderTracks: function () { /* nichts */ } }, 0);
    }
    function shareTrack() {
      var tr = P.full || P.item;
      if (!tr) return;
      openShare({ url: linkFor(tr.AlbumId || tr.Id), title: tr.Name, subtitle: firstArtist(tr), cover: itemImg(tr, 120), note: t('shareLinkTrack') });
    }

    function ensureFull() {
      if (full) return full;
      full = el('div', 'ml-full');
      full.hidden = true;
      full.setAttribute('role', 'dialog');
      full.setAttribute('aria-label', t('nowPlaying'));
      if (P.pal) setPalette(full, P.pal);

      // Obere Leiste: gross mit Albumname, beim Scrollen klein mit Titel und Pause
      var top = el('div', 'ml-full-top');
      var exp = el('div', 'ml-top-exp');
      exp.appendChild(iconBtn('down', t('collapse'), 'ml-full-close', closeFull));
      var lab = el('div', 'ml-top-label');
      ui.topKicker = el('div', 'ml-top-kicker', t('fromAlbum'));
      ui.topName = el('div', 'ml-top-name');
      add(lab, ui.topKicker, ui.topName);
      exp.appendChild(lab);
      exp.appendChild(iconBtn('more_v', t('more'), 'ml-full-more', moreMenu));
      var cmp = el('div', 'ml-top-cmp');
      cmp.appendChild(iconBtn('down', t('collapse'), 'ml-full-close', closeFull));
      var ctext = el('div', 'ml-cmp-text');
      ui.cmpTitle = el('div', 'ml-cmp-title');
      ui.cmpArtist = el('div', 'ml-cmp-artist');
      add(ctext, ui.cmpTitle, ui.cmpArtist);
      cmp.appendChild(ctext);
      ui.cmpPlay = iconBtn('play', t('play'), 'ml-cmp-play', toggle);
      cmp.appendChild(ui.cmpPlay);
      add(top, exp, cmp);
      full.appendChild(top);

      var scroll = el('div', 'ml-full-scroll');
      ui.scroll = scroll;
      var block = el('div', 'ml-player-block');

      var stage = el('div', 'ml-full-stage');
      ui.fullCover = el('div', 'ml-full-cover');
      stage.appendChild(ui.fullCover);
      block.appendChild(stage);

      ui.meta = el('div', 'ml-full-meta');
      var txt = el('div', 'ml-full-text');
      ui.fullTitle = el('div', 'ml-full-title');
      ui.fullArtist = btn('ml-full-artist');
      ui.fullArtist.addEventListener('click', function () {
        var it = P.full || P.item;
        if (it && it.ArtistItems && it.ArtistItems.length) { closeFull(); openArtist(it.ArtistItems); }
      });
      add(txt, ui.fullTitle, ui.fullArtist);
      ui.fullFav = iconBtn('heart_o', t('mLike'), 'ml-full-fav', toggleFav);
      ui.fullPlus = iconBtn('add', t('addPlus'), 'ml-full-plus', function () { if (P.item) addToPlaylist([P.item.Id]); });
      add(ui.meta, txt, ui.fullFav, ui.fullPlus);
      block.appendChild(ui.meta);

      var seekBox = el('div', 'ml-seek');
      ui.seek = el('input', 'ml-range ml-seek-range');
      ui.seek.type = 'range'; ui.seek.min = '0'; ui.seek.max = '1000'; ui.seek.value = '0'; ui.seek.step = '1';
      ui.seek.setAttribute('aria-label', t('seekLabel'));
      ui.seek.addEventListener('input', function () {
        seeking = true;
        var d = duration();
        ui.tPos.textContent = fmtClock(d * ui.seek.value / 1000);
        paintRange(ui.seek);
      });
      ui.seek.addEventListener('change', function () {
        var d = duration();
        seekTo(d * ui.seek.value / 1000).then(function () { seeking = false; }, function () { seeking = false; });
      });
      var times = el('div', 'ml-seek-times');
      ui.tPos = el('span', null, '0:00');
      ui.tDur = el('span', null, '0:00');
      add(times, ui.tPos, ui.tDur);
      add(seekBox, ui.seek, times);
      block.appendChild(seekBox);

      var ctl = el('div', 'ml-controls');
      ui.shuffle = iconBtn('shuffle', t('shuffle'), 'ml-ctl ml-ctl-toggle', function () { setShuffle(!P.shuffle); });
      ui.prev = iconBtn('prev', t('prev'), 'ml-ctl ml-ctl-skip', function () { skip('PreviousTrack'); });
      ui.play = iconBtn('play', t('play'), 'ml-ctl ml-ctl-play', toggle);
      ui.next = iconBtn('next', t('next'), 'ml-ctl ml-ctl-skip', function () { skip('NextTrack'); });
      ui.repeat = iconBtn('repeat', t('repeat'), 'ml-ctl ml-ctl-toggle', cycleRepeat);
      add(ctl, ui.shuffle, ui.prev, ui.play, ui.next, ui.repeat);
      block.appendChild(ctl);

      var foot = el('div', 'ml-full-foot');
      ui.devBtn = btn('ml-dev-btn');
      ui.devBtn.setAttribute('aria-label', t('devices'));
      ui.devBtn.addEventListener('click', openDevices);
      var footRight = el('div', 'ml-foot-right');
      ui.speedBtn = btn('ml-foot-btn');
      ui.speedBtn.addEventListener('click', openSpeed);
      ui.shareBtn = iconBtn('share', t('shareTrack'), 'ml-foot-icon', shareTrack);
      ui.queueBtn = iconBtn('queue', t('queueTitle'), 'ml-foot-icon', openQueuePanel);
      add(footRight, ui.speedBtn, ui.shareBtn, ui.queueBtn);
      add(foot, ui.devBtn, footRight);
      block.appendChild(foot);
      scroll.appendChild(block);

      // Karten unter dem Player
      var cards = el('div', 'ml-cards');
      ui.lyricsCard = el('section', 'ml-card ml-lyrics-card');
      ui.nextCard = el('section', 'ml-card');
      ui.artistCard = el('section', 'ml-card ml-artist-card');
      ui.creditsCard = el('section', 'ml-card');
      ui.albumCard = el('section', 'ml-card');
      add(cards, ui.lyricsCard, ui.nextCard, ui.artistCard, ui.creditsCard, ui.albumCard);
      scroll.appendChild(cards);
      scroll.addEventListener('scroll', function () {
        if (scrollQueued) return;
        scrollQueued = true;
        window.requestAnimationFrame(function () { scrollQueued = false; updateCompact(); });
      }, { passive: true });
      full.appendChild(scroll);
      document.body.appendChild(full);
      return full;
    }

    function updateCompact() {
      if (!full || !ui.scroll) return;
      var limit = Math.max(120, (ui.meta.offsetTop || 0) - 8);
      var on = ui.scroll.scrollTop > limit;
      if (on !== compact) { compact = on; full.classList.toggle('ml-compact', on); }
    }

    function paintRange(r) {
      var max = parseFloat(r.max) || 100;
      r.style.setProperty('--ml-fill', (parseFloat(r.value) / max * 100) + '%');
    }

    /* Befehle an die gesteuerte Sitzung (der jeweilige Web-Client fuehrt sie selbst aus). */
    function command(path, params, body) {
      return withSession(function (s) { return call('POST', 'Sessions/' + s.Id + '/' + path, params || null, body); });
    }
    function seekTo(sec) {
      return command('Playing/Seek', { seekPositionTicks: Math.round(Math.max(0, sec) * 1e7) }).then(function () { P.pos = sec; P.at = Date.now(); kick(); });
    }
    function skip(cmd) { command('Playing/' + cmd).then(function () { kick(); }, function () { toast(t('playFailed')); }); }
    function toggle() {
      var wasPaused = isPaused();
      P.paused = !wasPaused; P.pos = position(); P.at = Date.now();
      paint();
      command('Playing/' + (wasPaused ? 'Unpause' : 'Pause')).then(function () { kick(); }, function () { toast(t('playFailed')); });
    }
    function cycleRepeat() {
      var next = P.repeat === 'RepeatNone' ? 'RepeatAll' : P.repeat === 'RepeatAll' ? 'RepeatOne' : 'RepeatNone';
      P.repeat = next; paint();
      command('Command', null, { Name: 'SetRepeatMode', Arguments: { RepeatMode: next } }).then(function () { kick(); });
    }
    function setShuffle(on) {
      P.shuffle = on; paint();
      command('Command', null, { Name: 'SetShuffleQueue', Arguments: { ShuffleMode: on ? 'Shuffle' : 'Sorted' } }).then(function () { kick(); });
    }
    function setVolume(v) {
      P.volume = v;
      command('Command', null, { Name: 'SetVolume', Arguments: { Volume: String(v) } }).then(function () { kick(); });
    }
    function toggleFav() {
      if (!P.item) return;
      var id = P.item.Id, on = !P.fav;
      P.fav = on; paint();
      setFavorite(id, on).then(function () { if (P.full) { P.full.UserData = P.full.UserData || {}; P.full.UserData.IsFavorite = on; } }, function () { P.fav = !on; paint(); toast(t('editFailed')); });
    }
    function refreshFavorite(id, on) {
      if (P.item && nid(P.item.Id) === nid(id)) { P.fav = on; paint(); }
    }

    /* ---------- Ebenen (Warteschlange, Songtext) ---------- */
    function openPanel(title, sub) {
      ensureFull();
      var p = el('div', 'ml-panel');
      var head = el('div', 'ml-panel-head');
      var handle = {
        el: p, body: null, onClose: null, entry: null,
        close: function (fromHistory) {
          if (!p.parentNode) return;
          p.parentNode.removeChild(p);
          panels = panels.filter(function (x) { return x !== handle; });
          if (fromHistory !== true) OV.release(handle.entry);
          if (handle.onClose) handle.onClose();
        }
      };
      head.appendChild(iconBtn('down', t('close'), '', function () { handle.close(); }));
      var txt = el('div', 'ml-panel-text');
      txt.appendChild(el('div', 'ml-panel-title', title));
      if (sub) txt.appendChild(el('div', 'ml-panel-sub', sub));
      head.appendChild(txt);
      p.appendChild(head);
      handle.body = el('div', 'ml-panel-body');
      p.appendChild(handle.body);
      full.appendChild(p);
      panels.push(handle);
      handle.entry = OV.push(handle.close);
      return handle;
    }
    function closePanels(fromHistory) { panels.slice().reverse().forEach(function (p) { p.close(fromHistory); }); }

    function ensureNames(ids) {
      var missing = ids.filter(function (id) { return !queueNames[nid(id)]; }).slice(0, 100);
      if (!missing.length) return Promise.resolve();
      return itemsOf({ Ids: missing.join(','), Fields: '' }).then(function (items) {
        items.forEach(function (it) { queueNames[nid(it.Id)] = it; });
      }, function () { /* Namen fehlen */ });
    }
    function queueIndex() {
      var cur = -1;
      (P.queue || []).forEach(function (x, i) { if (P.item && nid(x.Id) === nid(P.item.Id) && cur < 0) cur = i; });
      return cur;
    }

    function openQueuePanel() {
      if (!P.item) return;
      if (queuePanel) return;
      queuePanel = openPanel(t('queueTitle'), '');
      queuePanel.onClose = function () { queuePanel = null; };
      renderQueue(true);
    }
    function renderQueue(jump) {
      if (!queuePanel) return;
      var panel = queuePanel, box = panel.body;
      var q = P.queue || [];
      if (!q.length) { box.textContent = ''; box.appendChild(el('p', 'ml-muted ml-pad', t('queueEmpty'))); return; }
      ensureNames(q.map(function (x) { return x.Id; })).then(function () {
        if (queuePanel !== panel) return;
        var keep = box.scrollTop;
        box.textContent = '';
        var curIdx = queueIndex();
        var ids = q.map(function (x) { return x.Id; });
        q.forEach(function (x, i) {
          var it = queueNames[nid(x.Id)] || (P.item && nid(P.item.Id) === nid(x.Id) ? P.item : null);
          var row = btn('ml-list-row ml-queue-row' + (i === curIdx ? ' ml-playing' : ''));
          row.appendChild(cover(it ? itemImg(it, 96) : null, 'ml-row-cover'));
          var txt = el('div', 'ml-row-text');
          txt.appendChild(el('div', 'ml-row-title', it ? it.Name : '…'));
          txt.appendChild(el('div', 'ml-row-sub', i === curIdx ? t('queueNow') : (it ? firstArtist(it) : '')));
          row.appendChild(txt);
          row.addEventListener('click', function () { playIds(ids, i); });
          box.appendChild(row);
        });
        var cur = box.querySelector('.ml-playing');
        if (jump && cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'center' });
        else box.scrollTop = keep;
      });
    }

    /* ---------- Songtext ---------- */
    function loadLyrics(id) {
      var k = nid(id);
      if (lyricCache[k] !== undefined) return Promise.resolve(lyricCache[k]);
      return call('GET', 'Audio/' + id + '/Lyrics').then(function (r) {
        var lines = ((r && r.Lyrics) || []).map(function (l) { return { t: l.Start != null ? l.Start / 1e7 : null, text: String(l.Text == null ? '' : l.Text) }; });
        var has = lines.some(function (l) { return l.text.trim(); });
        var synced = !!(r && r.Metadata && r.Metadata.IsSynced) && lines.some(function (l) { return l.t != null; });
        lyricCache[k] = has ? { lines: lines, synced: synced } : null;
        return lyricCache[k];
      }, function (err) {
        if (err && err.status === 404) lyricCache[k] = null;   // kein Songtext; andere Fehler spaeter erneut versuchen
        return null;
      });
    }
    function lineIndex(L, sec) {
      for (var i = L.lines.length - 1; i >= 0; i--) {
        if (L.lines[i].t != null && L.lines[i].t <= sec + 0.15) return i;
      }
      return -1;
    }
    function renderLyricsCard() {
      if (!ui.lyricsCard) return;
      var c = ui.lyricsCard, L = P.lyrics;
      c.textContent = '';
      c.appendChild(el('h3', 'ml-card-title', t('lyrics')));
      c.classList.toggle('ml-card-plain', !L);
      ui.lyBody = null;
      if (L === undefined) { c.appendChild(el('p', 'ml-card-muted', t('lyricsLoading'))); return; }
      if (!L) { c.appendChild(el('p', 'ml-card-muted', t('lyricsNone'))); return; }
      ui.lyBody = el('div', 'ml-ly-preview');
      c.appendChild(ui.lyBody);
      fillLyricsPreview();
      var more = btn('ml-pill ml-ly-more', t('lyricsMore'));
      more.addEventListener('click', openLyricsPanel);
      c.appendChild(more);
    }
    function fillLyricsPreview() {
      var L = P.lyrics;
      if (!L || !ui.lyBody) return;
      var cur = L.synced ? lineIndex(L, position()) : -1;
      lyricIdx = cur;
      var shown = [], i = L.synced ? Math.max(0, cur - 1) : 0;
      while (i < L.lines.length && shown.length < 6) {
        if (L.lines[i].text.trim()) shown.push(i);
        i++;
      }
      ui.lyBody.textContent = '';
      shown.forEach(function (n) {
        ui.lyBody.appendChild(el('div', 'ml-ly-line' + (L.synced ? (n === cur ? ' ml-now' : n < cur ? ' ml-past' : '') : ''), L.lines[n].text));
      });
    }
    function openLyricsPanel() {
      var L = P.lyrics;
      if (!L || !P.item || lyPanel) return;
      lyPanel = openPanel(t('lyrics'), P.item.Name);
      lyPanel.el.classList.add('ml-panel-lyrics');
      if (!L.synced) lyPanel.el.classList.add('ml-ly-plain');
      lyPanel.onClose = function () { lyPanel = null; lyPanelIdx = -2; };
      L.lines.forEach(function (ln, i) {
        var d = el('div', 'ml-ly-big' + (ln.text.trim() ? '' : ' ml-ly-gap'), ln.text);
        if (L.synced && ln.t != null) {
          d.classList.add('ml-seekable');
          d.addEventListener('click', function () { seekTo(ln.t).catch(function () { /* ignorieren */ }); });
        }
        d.dataset.i = String(i);
        lyPanel.body.appendChild(d);
      });
      paintLyricsPanel(true);
    }
    function paintLyricsPanel(jump) {
      var L = P.lyrics;
      if (!lyPanel || !L) return;
      var cur = L.synced ? lineIndex(L, position()) : -1;
      if (cur === lyPanelIdx && !jump) return;
      lyPanelIdx = cur;
      var kids = lyPanel.body.children;
      for (var i = 0; i < kids.length; i++) {
        kids[i].classList.toggle('ml-now', i === cur);
        kids[i].classList.toggle('ml-past', cur >= 0 && i < cur);
      }
      var d = cur >= 0 ? kids[cur] : null;
      if (d && d.scrollIntoView) { try { d.scrollIntoView({ block: 'center', behavior: jump ? 'auto' : 'smooth' }); } catch (e) { d.scrollIntoView(); } }
    }

    /* ---------- Karten ---------- */
    function renderNextCard(card, count) {
      var c = card || ui.nextCard;
      if (!c) return;
      var q = P.queue || [], cur = queueIndex();
      var next = cur >= 0 ? q.slice(cur + 1, cur + 1 + (count || 3)) : [];
      var sig = cur + '|' + next.map(function (x) { return x.Id; }).join(',');
      if (sig === c.__sig) return;
      c.__sig = sig;
      c.textContent = '';
      c.hidden = !next.length;
      if (!next.length) return;
      var head = el('div', 'ml-card-head');
      head.appendChild(el('h3', 'ml-card-title', c === ui.npNext ? t('nextTrack') : t('nextFrom')));
      var open = btn('ml-card-link', t('openQueue'));
      open.addEventListener('click', openQueuePanel);
      head.appendChild(open);
      c.appendChild(head);
      var ids = q.map(function (x) { return x.Id; });
      ensureNames(next.map(function (x) { return x.Id; })).then(function () {
        if (c.__sig !== sig) return;
        next.forEach(function (x, k) {
          var it = queueNames[nid(x.Id)];
          var row = btn('ml-list-row ml-card-row');
          row.appendChild(cover(it ? itemImg(it, 96) : null, 'ml-row-cover'));
          var txt = el('div', 'ml-row-text');
          txt.appendChild(el('div', 'ml-row-title', it ? it.Name : '…'));
          txt.appendChild(el('div', 'ml-row-sub', it ? firstArtist(it) : ''));
          row.appendChild(txt);
          row.addEventListener('click', function () { playIds(ids, cur + 1 + k); });
          c.appendChild(row);
        });
      });
    }

    function renderArtistCard(card) {
      var c = card || ui.artistCard;
      if (!c || !P.item) return;
      var it = P.full || P.item;
      var ai = it.ArtistItems && it.ArtistItems[0];
      c.textContent = '';
      if (!ai) { c.hidden = true; return; }
      c.hidden = false;
      var myId = P.item.Id;
      function build(a) {
        if (!P.item || P.item.Id !== myId) return;
        c.textContent = '';
        var banner = el('button', 'ml-artist-banner');
        banner.type = 'button';
        banner.setAttribute('aria-label', t('artistPage'));
        banner.appendChild(cover(a ? itemImg(a, 600) : null, 'ml-artist-banner-img'));
        banner.appendChild(el('span', 'ml-artist-banner-label', t('aboutArtist')));
        banner.addEventListener('click', function () { closeFull(); openArtist(it.ArtistItems); });
        c.appendChild(banner);
        var body = el('div', 'ml-card-body');
        var name = btn('ml-card-name', ai.Name);
        name.addEventListener('click', function () { closeFull(); openArtist(it.ArtistItems); });
        body.appendChild(name);
        var bio = a && (a.Overview || '').trim();
        if (bio) {
          var para = el('p', 'ml-artist-bio ml-clamp', bio);
          body.appendChild(para);
          if (bio.length > 180) {
            var tog = btn('ml-card-link', t('showMore'));
            tog.addEventListener('click', function () {
              var closed = para.classList.toggle('ml-clamp');
              tog.textContent = closed ? t('showMore') : t('showLess');
            });
            body.appendChild(tog);
          }
        }
        c.appendChild(body);
      }
      var k = nid(ai.Id);
      if (artistCache[k]) { build(artistCache[k]); return; }
      build(null);
      loadItem(ai.Id, 'Overview').then(function (a) { if (a) { artistCache[k] = a; build(a); } }, function () { /* Name genuegt */ });
    }

    var ROLE_KEYS = { composer: 'roleComposer', lyricist: 'roleLyricist', producer: 'roleProducer', arranger: 'roleArranger', conductor: 'roleConductor' };
    function renderCreditsCard(card) {
      var c = card || ui.creditsCard;
      if (!c || !P.item) return;
      var it = P.full || P.item;
      c.textContent = '';
      c.appendChild(el('h3', 'ml-card-title', t('credits')));
      function line(label, value) {
        if (!value) return;
        var r = el('div', 'ml-credit');
        r.appendChild(el('div', 'ml-credit-k', label));
        r.appendChild(el('div', 'ml-credit-v', value));
        c.appendChild(r);
      }
      line(t('roleArtist'), (it.Artists || []).join(', '));
      var aa = (it.AlbumArtist || '').trim();
      if (aa && (it.Artists || []).join('|') !== aa) line(t('roleAlbumArtist'), aa);
      var roles = {}, order = [];
      (it.People || []).forEach(function (p) {
        var type = String(p.Type || '').trim();
        if (!type || !p.Name) return;
        var key = type.toLowerCase();
        if (key === 'artist' || key === 'albumartist') return;
        if (!roles[key]) { roles[key] = { label: ROLE_KEYS[key] ? t(ROLE_KEYS[key]) : type, names: [] }; order.push(key); }
        if (roles[key].names.indexOf(p.Name) < 0) roles[key].names.push(p.Name);
      });
      order.forEach(function (key) { line(roles[key].label, roles[key].names.join(', ')); });
      line(t('roleAlbum'), it.Album);
      line(t('roleYear'), it.ProductionYear ? String(it.ProductionYear) : '');
      line(t('roleGenre'), (it.Genres || []).join(', '));
      var info = btn('ml-card-link', t('fullInfo'));
      info.addEventListener('click', function () { openSongInfo(it); });
      c.appendChild(info);
    }

    function renderAlbumCard() {
      var c = ui.albumCard;
      if (!c || !P.item) return;
      var it = P.full || P.item;
      c.textContent = '';
      c.hidden = !it.AlbumId;
      if (!it.AlbumId) return;
      c.appendChild(el('h3', 'ml-card-title', t('fromAlbum')));
      var row = btn('ml-list-row ml-card-row');
      row.appendChild(cover(itemImg(it, 120), 'ml-row-cover'));
      var txt = el('div', 'ml-row-text');
      txt.appendChild(el('div', 'ml-row-title', it.Album || t('album')));
      txt.appendChild(el('div', 'ml-row-sub', [it.AlbumArtist, it.ProductionYear].filter(Boolean).join(' • ')));
      row.appendChild(txt);
      row.addEventListener('click', function () { closeFull(); go('#/details?id=' + it.AlbumId + (serverId() ? '&serverId=' + serverId() : '')); });
      c.appendChild(row);
    }

    // Karten fuer den aktuellen Titel aufbauen (nur wenn die Seite offen ist).
    function updateExtras() {
      if (!full || full.hidden || !P.item) return;
      var id = P.item.Id;
      if (extrasFor === id) return;
      extrasFor = id; ui.nextCard.__sig = '';
      renderLyricsCard(); renderNextCard(); renderArtistCard(); renderCreditsCard(); renderAlbumCard();
      loadLyrics(id).then(function (ly) {
        if (!P.item || P.item.Id !== id) return;
        P.lyrics = ly;
        renderLyricsCard();
      });
    }

    /* ---------- Anzeige ---------- */
    function setCover(host, item, w) {
      host.textContent = '';
      host.appendChild(cover(itemImg(item, w), 'ml-fill-cover'));
    }

    function applyPalette(pal) {
      P.pal = pal;
      if (mini) setPalette(mini, pal);
      if (full) setPalette(full, pal);
      if (np) setPalette(np, pal);
    }

    function paint() {
      var has = !!P.item;
      var m = ensureMini();
      m.hidden = !has;
      bodyCls('ml-mini-on', has && running);
      if (!has) {
        if (fullOpen) closeFull();
        if (bar) bar.hidden = true;
        if (np) np.hidden = true;
        if (root) root.classList.remove('ml-has-np');
        return;
      }
      var it = P.full || P.item;
      var id = P.item.Id;
      var sub = firstArtist(it) || firstArtist(P.item);
      var paused = isPaused();
      var remote = !!P.targetId;

      ui.miniTitle.textContent = P.item.Name;
      ui.miniSub.textContent = sub;
      ui.miniDev.hidden = !remote;
      ui.miniDev.textContent = remote ? t('connectedTo', P.targetName || '…') : '';
      mini.classList.toggle('ml-remote', remote);
      swapIcon(ui.miniToggle, paused ? 'play' : 'pause', paused ? t('play') : t('pause'));
      if (lastItemId !== id) {
        setCover(ui.miniCover, P.item, 96);
        var mImg = ui.miniCover.querySelector('img');
        if (mImg) {
          (function (img, forId) {
            function run() { if (P.item && P.item.Id === forId) applyPalette(coverPalette(img)); }
            if (img.complete && img.naturalWidth) run(); else img.addEventListener('load', run, { once: true });
          })(mImg, id);
        } else applyPalette(null);
      }

      paintBar(it, sub, paused, remote);
      paintNp(it, sub);
      if (full) {
        ui.topName.textContent = it.Album || '';
        ui.topKicker.textContent = it.Album ? t('fromAlbum') : t('nowPlaying');
        ui.fullTitle.textContent = P.item.Name;
        ui.fullArtist.textContent = sub || t('unknownArtist');
        ui.cmpTitle.textContent = P.item.Name;
        ui.cmpArtist.textContent = sub;
        if (heroCoverId !== id) {
          setCover(ui.fullCover, P.item, 800);
          heroCoverId = id;
          if (queuePanel) renderQueue(true);
        }
        swapIcon(ui.play, paused ? 'play' : 'pause', paused ? t('play') : t('pause'));
        swapIcon(ui.cmpPlay, paused ? 'play' : 'pause', paused ? t('play') : t('pause'));
        swapIcon(ui.fullFav, P.fav ? 'heart' : 'heart_o', P.fav ? t('mUnlike') : t('mLike'));
        ui.fullFav.classList.toggle('ml-on', P.fav);
        ui.shuffle.classList.toggle('ml-on', P.shuffle);
        ui.shuffle.setAttribute('aria-pressed', P.shuffle ? 'true' : 'false');
        swapIcon(ui.repeat, P.repeat === 'RepeatOne' ? 'repeat_one' : 'repeat', P.repeat === 'RepeatNone' ? t('repeatOff') : P.repeat === 'RepeatOne' ? t('repeatOne') : t('repeat'));
        ui.repeat.classList.toggle('ml-on', P.repeat !== 'RepeatNone');
        ui.speedBtn.textContent = speed === 1 ? t('speedTitle') : t('speedBadge', speed);
        ui.speedBtn.classList.toggle('ml-on', speed !== 1);
        ui.devBtn.textContent = '';
        ui.devBtn.appendChild(icon('devices'));
        if (remote) ui.devBtn.appendChild(el('span', 'ml-dev-btn-text', t('connectedTo', P.targetName || '…')));
        ui.devBtn.classList.toggle('ml-on', remote);
        updateExtras();
      }
      if (lastItemId !== id) { lastItemId = id; markPlaying(); applySpeed(); }
      progress();
    }

    function swapIcon(button, name, label) {
      if (button.dataset.ic === name) { button.setAttribute('aria-label', label); button.title = label; return; }
      button.dataset.ic = name;
      button.textContent = '';
      button.appendChild(icon(name));
      button.setAttribute('aria-label', label); button.title = label;
    }

    function progress() {
      if (!P.item) return;
      var d = duration(), p = Math.min(position(), d || position());
      if (ui.miniFill) ui.miniFill.style.width = d ? (p / d * 100) + '%' : '0%';
      if (bar && !bar.hidden && !seekingBar) {
        ui.bSeek.value = String(d ? Math.round(p / d * 1000) : 0);
        paintRange(ui.bSeek);
        ui.bPos.textContent = fmtClock(p);
        ui.bDur.textContent = fmtClock(d);
      }
      if (full && !full.hidden) {
        if (!seeking) {
          ui.seek.value = String(d ? Math.round(p / d * 1000) : 0);
          paintRange(ui.seek);
          ui.tPos.textContent = fmtClock(p);
          ui.tDur.textContent = fmtClock(d);
        }
        var L = P.lyrics;
        if (L && L.synced) {
          if (ui.lyBody && lineIndex(L, p) !== lyricIdx) fillLyricsPreview();
          if (lyPanel) paintLyricsPanel(false);
        }
      }
    }

    /* ---------- Abfrage der Sitzung ---------- */
    function applySession(s) {
      var np = s && s.NowPlayingItem;
      if (!np) {
        if (P.item) { P.item = null; P.full = null; P.lyrics = undefined; lastItemId = ''; heroCoverId = ''; extrasFor = ''; markPlaying(); }
        P.queue = [];
        paint();
        return;
      }
      var changed = !P.item || nid(P.item.Id) !== nid(np.Id);
      var ps = s.PlayState || {};
      P.session = s; P.item = np;
      P.paused = !!ps.IsPaused;
      P.pos = (ps.PositionTicks || 0) / 1e7; P.at = Date.now();
      P.dur = (np.RunTimeTicks || 0) / 1e7;
      P.repeat = ps.RepeatMode || 'RepeatNone';
      P.shuffle = ps.PlaybackOrder === 'Shuffle';
      if (ps.VolumeLevel != null) P.volume = ps.VolumeLevel;
      P.queue = (s.NowPlayingQueue || []).map(function (x) { return { Id: x.Id, PlaylistItemId: x.PlaylistItemId }; });
      if (changed) {
        P.full = null; P.lyrics = undefined; extrasFor = ''; lyricIdx = -2;
        var id = np.Id;
        P.fav = !!(np.UserData && np.UserData.IsFavorite);
        loadItem(id, 'Genres,People').then(function (it) {
          if (it && P.item && nid(P.item.Id) === nid(id)) {
            P.full = it;
            P.fav = !!(it.UserData && it.UserData.IsFavorite);
            paint();
            if (full && !full.hidden) { renderCreditsCard(); renderArtistCard(); renderAlbumCard(); }
            renderNpCards();
          }
        }, function () { /* Basisdaten genuegen */ });
      }
      paint();
      if (full && !full.hidden) { renderNextCard(); if (queuePanel) renderQueue(changed); }
      renderNpCards();
    }

    function poll() {
      if (polling || !running) return Promise.resolve();
      polling = true;
      return fetchState().then(applySession, function () { /* naechster Versuch */ }).then(function () { polling = false; schedule(); }, function () { polling = false; schedule(); });
    }
    function schedule() {
      clearTimeout(pollTimer);
      if (!running) return;
      var fast = Date.now() < fastUntil;
      var wait = document.hidden ? 15000 : fast ? 800 : (fullOpen ? 2500 : 4000);
      pollTimer = setTimeout(poll, wait);
    }
    function kick() { fastUntil = Date.now() + 8000; if (running) { clearTimeout(pollTimer); setTimeout(poll, 250); } }

    function start() {
      if (running) return;
      running = true;
      ensureMini();
      if (bottomBar && mini.parentNode !== bottomBar) bottomBar.insertBefore(mini, bottomBar.firstChild);
      poll();
      tickTimer = setInterval(function () { if (!document.hidden) progress(); }, 500);
      bodyCls('ml-mini-on', !!P.item);
    }
    function stop() {
      running = false;
      clearTimeout(pollTimer); clearInterval(tickTimer);
      if (fullOpen) closeFull();
      bodyCls('ml-mini-on', false);
      if (bar) bar.hidden = true;
      if (np) np.hidden = true;
      if (root) root.classList.remove('ml-has-np');
    }

    var fullEntry = null;
    function openFull() {
      if (!P.item) return;
      ensureFull();
      var again = fullOpen;
      fullOpen = true;
      full.hidden = false;
      bodyCls('ml-full-on', true);
      if (!again) fullEntry = OV.push(closeFull);
      heroCoverId = ''; extrasFor = ''; if (ui.nextCard) ui.nextCard.__sig = '';
      ui.scroll.scrollTop = 0;
      compact = false; full.classList.remove('ml-compact');
      paint();
      kick();
    }
    function closeFull(fromHistory) {
      var was = fullOpen;
      fullOpen = false;
      closePanels(fromHistory);
      if (full) full.hidden = true;
      bodyCls('ml-full-on', false);
      if (was && fromHistory !== true) OV.release(fullEntry);
      fullEntry = null;
    }

    // Titelwechsel/Pause im Audio-Element schneller anzeigen als mit der Abfrage.
    ['play', 'pause', 'ended', 'loadedmetadata'].forEach(function (ev) {
      document.addEventListener(ev, function (e) {
        var a = e.target;
        if (!a || !a.classList || !a.classList.contains('mediaPlayerAudio')) return;
        if (ev === 'loadedmetadata' && speed !== 1) applySpeed();
        if (!running) return;
        if (ev === 'ended') kick(); else paint();
      }, true);
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden && running) kick(); });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !fullOpen || document.querySelector('.ml-backdrop')) return;
      if (panels.length) panels[panels.length - 1].close(); else closeFull();
    });

    return {
      start: start, stop: stop, kick: kick, currentId: currentId, refreshFavorite: refreshFavorite,
      open: openFull, close: closeFull, isOpen: function () { return fullOpen; },
      targetId: function () { return P.targetId; }, sessionNow: fetchState, openDevices: openDevices,
      mount: function () {
        ensureMini();
        if (bottomBar && mini.parentNode !== bottomBar) bottomBar.insertBefore(mini, bottomBar.firstChild);
        if (root && isWide()) {
          ensureNp(); ensureBar();
          if (np.parentNode !== root) root.appendChild(np);
          if (bar.parentNode !== root) root.appendChild(bar);
        }
      },
      repaint: paint
    };
  })();
  /* ---------- Rahmen: Overlay, Navigation, Layout ---------- */
  function ensureRoot() {
    if (root) return;
    root = el('div', 'ml-app');
    root.id = 'ml-app';
    root.hidden = true;
    scroller = el('div', 'ml-app-scroll');
    content = el('div', 'ml-app-content');
    scroller.appendChild(content);
    root.appendChild(scroller);

    bottomBar = el('div', 'ml-bottom');
    nav = el('nav', 'ml-nav');
    nav.setAttribute('aria-label', 'Music Look');
    [['home', 'home', 'tabHome'], ['search', 'search', 'tabSearch'], ['library', 'library', 'tabLibrary']].forEach(function (d) {
      var b = btn('ml-nav-btn');
      b.dataset.tab = d[0];
      b.appendChild(icon(d[1]));
      b.appendChild(el('span', 'ml-nav-label', t(d[2])));
      b.addEventListener('click', function () { selectTab(d[0]); });
      nav.appendChild(b);
    });
    bottomBar.appendChild(nav);
    root.appendChild(bottomBar);
    document.body.appendChild(root);
    if (isWide()) { ensureSide(); root.insertBefore(side, scroller); }
    Player.mount();
    window.addEventListener('resize', layout);
    window.addEventListener('orientationchange', function () { setTimeout(layout, 250); });
    if (wideMq) {
      if (wideMq.addEventListener) wideMq.addEventListener('change', modeChanged);
      else if (wideMq.addListener) wideMq.addListener(modeChanged);
    }
  }

  /* ---------- Computer-Ansicht: Seitenleiste mit Bibliothek ---------- */
  var side = null, sideList = null, sideTok = 0;
  function ensureSide() {
    if (side) return side;
    side = el('aside', 'ml-side');
    side.setAttribute('aria-label', 'Music Look');
    var navBox = el('div', 'ml-side-nav');
    [['home', 'home', 'tabHome'], ['search', 'search', 'tabSearch']].forEach(function (d) {
      var b = btn('ml-side-navbtn');
      b.dataset.tab = d[0];
      b.appendChild(icon(d[1]));
      b.appendChild(el('span', null, t(d[2])));
      b.addEventListener('click', function () { selectTab(d[0]); });
      navBox.appendChild(b);
    });
    var libBox = el('div', 'ml-side-lib');
    var head = el('div', 'ml-side-libhead');
    head.appendChild(icon('library'));
    head.appendChild(el('span', 'ml-side-libtitle', t('yourLib')));
    head.appendChild(iconBtn('add', t('mNewPlaylist'), 'ml-side-add', openCreatePlaylist));
    libBox.appendChild(head);
    libBox.appendChild(chipRow([
      { key: 'playlists', label: t('libPlaylists') }, { key: 'albums', label: t('libAlbums') }, { key: 'artists', label: t('libArtists') }
    ], state.libSeg, function (k) { state.libSeg = k; fillSide(); }, 'ml-side-chips'));
    sideList = el('div', 'ml-side-list');
    libBox.appendChild(sideList);
    var foot = el('div', 'ml-side-foot');
    foot.appendChild(profileButton());
    var more = btn('ml-side-more', t('appMenu'));
    more.addEventListener('click', openAppMenu);
    foot.appendChild(more);
    add(side, navBox, libBox, foot);
    return side;
  }
  var sideTimer = null;
  // Nach Aenderungen (Playlist angelegt, Titel hinzugefuegt ...) die Seitenleiste kurz darauf auffrischen.
  function scheduleSide() {
    clearTimeout(sideTimer);
    sideTimer = setTimeout(function () { if (side && isWide() && root && !root.hidden) fillSide(); }, 700);
  }
  function fillSide() {
    if (!side) return;
    var tok = ++sideTok;
    sideDirty = false;
    buildLibList(sideList, function () { return tok === sideTok && root && !root.hidden; }, fillSide);
  }
  // Markiert in der Seitenleiste, was gerade geoeffnet ist.
  function markSide() {
    if (!side) return;
    var r = latestRoute || {}, cur = '';
    if (r.kind === 'details') cur = nid(r.id);
    else if (r.kind === 'library' && r.params && r.params.mlview === 'liked') cur = 'liked';
    ML.qsa('.ml-list-row', sideList).forEach(function (row) { row.classList.toggle('ml-active', !!cur && row.dataset.id === cur); });
    ML.qsa('.ml-side-navbtn', side).forEach(function (b) {
      var on = r.kind === 'library' && !(r.params && r.params.mlview) && b.dataset.tab === state.tab;
      b.classList.toggle('ml-on', on);
    });
  }
  // Wechsel zwischen Handy- und Computer-Ansicht (Fenstergroesse).
  function modeChanged() {
    if (!root) return;
    if (isWide()) { ensureSide(); if (side.parentNode !== root) root.insertBefore(side, scroller); sideDirty = true; if (state.tab === 'library') state.tab = 'home'; }
    layout();
    Player.mount();
    Player.repaint();
    if (!root.hidden) {
      if (isWide() && !side.parentNode) root.insertBefore(side, scroller);
      if (isWide()) fillSide();
      state.key = '';
      try { onRoute(ML.route()); } catch (e) { /* naechster Seitenwechsel */ }
    }
  }

  // Die Kopfzeile von Jellyfin aendert ihre Hoehe (z. B. wenn die Bibliotheksleiste erscheint oder verschwindet);
  // das Overlay folgt ihr, damit nichts ueberlappt.
  var headerWatch = { node: null, ro: null };
  function watchHeader(node) {
    if (headerWatch.node === node) return;
    if (headerWatch.ro) { headerWatch.ro.disconnect(); headerWatch.ro = null; }
    headerWatch.node = node;
    if (node && window.ResizeObserver) {
      headerWatch.ro = new ResizeObserver(function () { layout(); });
      headerWatch.ro.observe(node);
    }
  }

  function updateNav() {
    if (!nav) return;
    var r = latestRoute || {};
    var onTab = r.kind === 'library' && !(r.params && r.params.mlview);
    ML.qsa('.ml-nav-btn', nav).forEach(function (b) {
      var on = onTab && b.dataset.tab === state.tab;
      b.classList.toggle('ml-on', on);
      if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    markSide();
  }

  function selectTab(tab) {
    if (tab === 'library' && isWide()) tab = 'home';
    state.tab = tab;
    var r = latestRoute || {};
    var plain = r.kind === 'library' && !(r.params && r.params.mlview);
    if (plain) { renderTab(); updateNav(); restoreScroll(state.key); }
    else ensureLibrary().then(function () { go(homeHash()); });
  }

  function renderTab() {
    rememberScroll();
    state.key = 'tab|' + state.tab;
    state.view++;
    renderTabInto(state.view);
  }

  function rememberScroll() { if (state.key && scroller) scrollMem[state.key] = scroller.scrollTop; }
  function restoreScroll(key) {
    var y = scrollMem[key] || 0;
    if (!y) { scroller.scrollTop = 0; return; }
    [0, 150, 500, 1200].forEach(function (ms) {
      setTimeout(function () { if (state.key === key && scroller.scrollTop !== y) scroller.scrollTop = y; }, ms);
    });
  }

  function showApp() {
    ensureRoot();
    root.hidden = false;
    ML.uncloak();
    bodyCls('ml-app-on', true);
    layout();
    if (isWide()) { ensureSide(); if (side.parentNode !== root) root.insertBefore(side, scroller); Player.mount(); if (sideDirty) fillSide(); Player.repaint(); }
    Player.start();
    toggleClassicFab(false);
  }
  function hideApp() {
    ML.uncloak();
    if (!root) return;
    rememberScroll();
    root.hidden = true;
    state.key = '';
    state.trail = [];
    state.view++;
    bodyCls('ml-app-on', false);
    Player.stop();
  }

  function layout() {
    if (!root || root.hidden) return;
    var top = 0, left = 0, tallest = null;
    var headers = document.querySelectorAll('.skinHeader, header.MuiAppBar-root, .MuiAppBar-root');
    for (var i = 0; i < headers.length; i++) {
      var r = headers[i].getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.top <= 1 && r.bottom > top && r.bottom < 200) { top = r.bottom; tallest = headers[i]; }
    }
    if (tallest) watchHeader(tallest);
    var drawer = document.querySelector('.MuiDrawer-docked, .mainDrawer-docked');
    if (drawer) {
      var d = drawer.getBoundingClientRect();
      if (d.width > 0 && d.left <= 1 && d.right < window.innerWidth * 0.6) left = d.right;
    }
    // Am Computer ersetzt die Ansicht die ganze Seite (Seitenleiste, Inhalt, Player-Leiste); die Jellyfin-Kopfzeile bleibt darunter.
    var wide = isWide();
    root.classList.toggle('ml-wide', wide);
    bodyCls('ml-app-wide', wide);
    if (wide) { top = 0; left = 0; }
    root.style.setProperty('--ml-top', Math.round(top) + 'px');
    root.style.setProperty('--ml-left', Math.round(left) + 'px');
  }

  function toggleClassicFab(show) {
    if (!classicFab) {
      classicFab = btn('ml-classic-fab', t('backToSpotify'));
      classicFab.hidden = true;
      classicFab.addEventListener('click', function () { setClassic(false); });
      document.body.appendChild(classicFab);
    }
    classicFab.hidden = !show;
  }

  function setClassic(on) {
    state.classic = on;
    try { if (on) window.sessionStorage.setItem('ml.classic', '1'); else window.sessionStorage.removeItem('ml.classic'); } catch (e) { /* nur fuer diese Sitzung merken */ }
    state.key = '';
    onRoute(ML.route());
  }

  // Merkt die besuchten Ansichten, damit der Zurueck-Pfeil nur dann den Verlauf nutzt, wenn davor wirklich eine Ansicht der App lag.
  // Hoerbuch-/Podcast-Bibliotheken (laut Namen) sind keine "Musik"-Bibliothek fuer Start, Suche und Bibliothek.
  function isMediaLib(id) {
    var all = (libCache && libCache.all) || [];
    for (var i = 0; i < all.length; i++) if (nid(all[i].id) === nid(id)) return all[i].cat === 'audiobooks' || all[i].cat === 'podcasts';
    return false;
  }
  function noteTrail(key) {
    var tr = state.trail;
    if (tr.length >= 2 && tr[tr.length - 2] === key) tr.pop();
    else if (tr[tr.length - 1] !== key) tr.push(key);
    if (tr.length > 40) tr.shift();
  }

  function onRoute(route) {
    latestRoute = route;
    ML.whenConfig(function (cfg) {
      if (latestRoute !== route) return;   // inzwischen weitergewechselt
      // Fuer Bibliotheksseiten zuerst die Bibliotheken kennen, damit Hoerbuch-/Podcast-Bibliotheken richtig erkannt werden.
      if (route.kind === 'library' && route.id && !libCache.list) {
        var again = function () { if (latestRoute === route) applyRoute(cfg, route); };
        loadLibraries().then(again, again);
        return;
      }
      applyRoute(cfg, route);
    });
  }

  function mediaCategoryOf(id) {
    var all = (libCache && libCache.all) || [];
    for (var i = 0; i < all.length; i++) if (nid(all[i].id) === nid(id)) return all[i].cat === 'audiobooks' || all[i].cat === 'podcasts' ? all[i].cat : '';
    return '';
  }

  function applyRoute(cfg, route) {
    {
      var spotify = cfg.spotifyHome !== false;
      var isLib = route.kind === 'library';
      var isDetail = route.kind === 'details' && route.item && (route.item.Type === 'Playlist' || route.item.Type === 'MusicAlbum' || route.item.Type === 'MusicArtist');
      if (!spotify || (!isLib && !isDetail)) { hideApp(); toggleClassicFab(false); return; }
      if (state.classic) { hideApp(); toggleClassicFab(true); return; }

      var folderId = isLib && route.params && route.params.mlview === 'folder' && ID_RE.test(route.params.mlid || '') ? route.params.mlid : null;
      if (isLib && route.id && !isMediaLib(route.id)) state.libraryId = route.id;
      var key;
      if (isLib) key = folderId ? 'folder|' + folderId : route.params && route.params.mlview === 'liked' ? 'liked' : 'tab|' + state.tab;
      else key = 'detail|' + route.id;
      if (isWide() && state.tab === 'library') state.tab = 'home';
      var mcat = isLib && route.id && !folderId && !(route.params && route.params.mlview) ? mediaCategoryOf(route.id) : '';
      if (mcat && state.autoChip !== route.id) { state.autoChip = route.id; state.chip = mcat; state.tab = 'home'; key = 'tab|home'; }
      var wasShown = root && !root.hidden;
      showApp();
      if (wasShown && state.key === key) { updateNav(); return; }
      rememberScroll();
      setPalette(root, null);
      noteTrail(key);
      state.key = key;
      state.view++;
      var seq = state.view;
      if (folderId) showFolderDetail(content, seq, folderId, route.id);
      else if (key === 'liked') showLikedDetail(content, seq);
      else if (isDetail) {
        if (!state.libraryId) ensureLibrary();
        if (route.item.Type === 'Playlist') showPlaylistDetail(content, seq, route.id);
        else if (route.item.Type === 'MusicArtist') showArtistDetail(content, seq, route.id);
        else showAlbumDetail(content, seq, route.id);
      } else {
        if (isLib && !state.libraryId) ensureLibrary();
        renderTabInto(seq);
      }
      restoreScroll(key);
      updateNav();
    }
  }

  function renderTabInto(seq) {
    if (state.tab === 'home') renderHome(content, seq);
    else if (state.tab === 'search') renderSearch(content, seq);
    else renderLibrary(content, seq);
  }

  ML.app = {
    route: onRoute,
    layout: layout,
    addToPlaylist: function (ids) { addToPlaylist(ids); }
  };

  // Der Kern hat die Seite evtl. schon gemeldet, bevor dieses Script geladen war.
  try {
    var first = ML.route();
    if (first && first.kind && first.kind !== 'none') onRoute(first);
  } catch (e) { if (window.console) console.error('Music Look app start', e); }
})();

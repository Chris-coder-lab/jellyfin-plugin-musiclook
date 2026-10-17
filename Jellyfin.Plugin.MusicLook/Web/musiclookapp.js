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
    chevron: 'M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z'
  };

  function icon(name, cls) {
    var s = el('span', 'ml-ic' + (cls ? ' ' + cls : ''));
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
  function go(href) { location.hash = href.charAt(0) === '#' ? href : '#' + href; }
  function linkFor(id) { return location.href.split('#')[0] + '#/details?id=' + id + (serverId() ? '&serverId=' + serverId() : ''); }

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

  // Mittlere Farbe eines geladenen Covers, abgedunkelt fuer den Seitenverlauf. Liefert null, wenn das Bild nicht lesbar ist.
  function dominantColor(img) {
    try {
      var c = document.createElement('canvas');
      c.width = 12; c.height = 12;
      var g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, 12, 12);
      var d = g.getImageData(0, 0, 12, 12).data;
      var r = 0, gr = 0, b = 0, w = 0;
      for (var i = 0; i < d.length; i += 4) {
        var mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
        var weight = 1 + (mx - mn) / 64;   // kraeftige Farben zaehlen mehr als Grau
        r += d[i] * weight; gr += d[i + 1] * weight; b += d[i + 2] * weight; w += weight;
      }
      if (!w) return null;
      var f = 0.55;
      return 'rgb(' + Math.round(r / w * f) + ',' + Math.round(gr / w * f) + ',' + Math.round(b / w * f) + ')';
    } catch (e) { return null; }
  }
  function applyHeroColor(host, img) {
    function run() { var col = dominantColor(img); if (col) host.style.setProperty('--ml-hero', col); }
    if (img.complete && img.naturalWidth) run(); else img.addEventListener('load', run, { once: true });
  }

  /* ---------- Daten ---------- */
  var libCache = { at: 0, list: null };
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
      var out = [];
      ((r && r.Items) || []).forEach(function (lib) {
        var cat = categoryOf(lib);
        if (cat) out.push({ id: lib.Id, name: lib.Name, type: lib.CollectionType || '', cat: cat });
      });
      libCache = { at: Date.now(), list: out };
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
      return list;
    });
  }
  function invalidatePlaylists() { plCache.at = 0; }

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
    return itemsOf({ Filters: 'IsFavorite', IncludeItemTypes: 'Audio', Recursive: true, SortBy: 'SortName', Limit: 2000 });
  }
  function loadItem(id, fields) {
    return itemsOf({ Ids: id, Fields: fields || 'Overview,ChildCount,Genres' }).then(function (a) { return a[0] || null; });
  }
  function idsOf(tracks) { return tracks.map(function (x) { return x.Id; }); }

  /* ---------- Wiedergabe (ueber die Sitzung des Web-Clients) ---------- */
  var sessCache = { at: 0, s: null };
  function getSession(force) {
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
    return ML.mySession().then(function (s) {
      var np = s && s.NowPlayingItem;
      if (np && nid(np.Id) === nid(id)) return true;
      if (tries <= 0) return false;
      return new Promise(function (r) { setTimeout(r, 500); }).then(function () { return waitForPlaying(id, tries - 1); });
    }, function () { return false; });
  }

  // Spielt die Titel ab dem Index start; sehr lange Listen werden ab start nachgeladen.
  function playIds(ids, start) {
    ids = (ids || []).filter(function (id) { return ID_RE.test(id); });
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
      return sessionCall(s, 'Playing', { playCommand: 'PlayNow', itemIds: head.join(','), startIndex: startIndex }).then(function () {
        if (!rest.length) return null;
        return waitForPlaying(head[startIndex], 16).then(function () {
          return rest.reduce(function (p, part) {
            return p.then(function () { return sessionCall(s, 'Playing', { playCommand: 'PlayLast', itemIds: part.join(',') }); });
          }, Promise.resolve());
        });
      });
    }).then(function () { Player.kick(); }, function () { toast(t('playFailed')); });
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

  function setFavorite(id, on) {
    return call(on ? 'POST' : 'DELETE', 'Users/' + uid() + '/FavoriteItems/' + id);
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
    var backdrop = el('div', 'ml-backdrop');
    var sheet = el('div', 'ml-sheet' + (opts.cls ? ' ' + opts.cls : ''));
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    if (opts.title) sheet.setAttribute('aria-label', opts.title);
    backdrop.appendChild(sheet);
    var closed = false;
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
    function close() {
      if (closed) return;
      closed = true;
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      document.removeEventListener('keydown', onKey, true);
      if (opts.onClose) opts.onClose();
    }
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(backdrop);
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
    row('link', t('copyLink'), function () {
      copyText(opts.url).then(function () { toast(t('linkCopied')); ui.close(); }, function () { window.prompt(t('copyLink'), opts.url); });
    });
    if (navigator.share) {
      row('share', t('shareNative'), function () {
        navigator.share({ title: opts.title, text: opts.subtitle || opts.title, url: opts.url }).then(function () { ui.close(); }, function () { /* abgebrochen */ });
      });
    }
    if (opts.invite) row('person_add', t('mInvite'), function () { ui.close(); ML.openShareSheet(opts.invite); });
    ui.sheet.appendChild(el('div', 'ml-sheet-note', opts.note || t('shareHint')));
  }

  /* ---------- Zu Playlist hinzufuegen ---------- */
  function createPlaylistWith(name, ids) {
    var parts = ML.chunk(ids, 80);
    // IsPublic muss ausdruecklich false sein: Jellyfin legt Playlists sonst oeffentlich an.
    return call('POST', 'Playlists', null, { Name: name, Ids: parts[0] || [], UserId: uid(), MediaType: 'Audio', IsPublic: false }).then(function (r) {
      var pid = r && (r.Id || r.id);
      if (!pid) throw new Error('no id');
      return parts.slice(1).reduce(function (p, part) { return p.then(function () { return addToPlaylistIds(pid, part); }); }, Promise.resolve()).then(function () {
        invalidatePlaylists();
        return pid;
      });
    });
  }
  function addToPlaylistIds(pid, ids) {
    return ML.chunk(ids, 80).reduce(function (p, part) {
      return p.then(function () { return call('POST', 'Playlists/' + pid + '/Items', { Ids: part.join(','), UserId: uid() }); });
    }, Promise.resolve());
  }

  function playlistRow(label, sub, img, onClick) {
    var b = btn('ml-list-row');
    b.appendChild(cover(img, 'ml-row-cover'));
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
    ui.sheet.appendChild(create);
    var form = el('div', 'ml-newplaylist');
    form.hidden = true;
    var input = el('input', 'ml-field');
    input.type = 'text'; input.maxLength = 100; input.placeholder = t('newPlaylistPh');
    var go = btn('ml-pill ml-primary', t('createPlaylist'));
    add(form, input, go);
    ui.sheet.appendChild(form);
    create.addEventListener('click', function () { form.hidden = false; create.hidden = true; input.focus(); });
    function submit() {
      var name = input.value.trim();
      if (!name) { input.focus(); return; }
      go.disabled = true;
      createPlaylistWith(name, ids).then(function () {
        toast(t('playlistCreated', name)); ui.close(); if (opts.onDone) opts.onDone();
      }, function () { go.disabled = false; toast(t('createFailed')); });
    }
    go.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });

    var list = el('div', 'ml-sheet-list');
    ui.sheet.appendChild(list);
    list.appendChild(el('div', 'ml-sheet-note', t('loading')));
    loadPlaylists(true).then(function (all) {
      list.textContent = '';
      all.filter(function (p) { return p.info.canEdit && (!opts.excludeId || nid(p.id) !== nid(opts.excludeId)); }).forEach(function (p) {
        var sub = p.item.ChildCount != null ? countText(p.item.ChildCount) : '';
        list.appendChild(playlistRow(p.item.Name, sub, playlistCoverUrl(p, 120), function () {
          addToPlaylistIds(p.id, ids).then(function () {
            invalidatePlaylists(); toast(t('addedTo', p.item.Name)); ui.close(); if (opts.onDone) opts.onDone();
          }, function () { toast(t('addFailed')); });
        }));
      });
    }, function () { list.textContent = ''; list.appendChild(el('div', 'ml-sheet-note', t('loadFailed'))); });
  }

  /* ---------- Titel zu einer Playlist hinzufuegen (Suche) ---------- */
  function openAddSongs(pl, onChanged) {
    var changed = false;
    var ui = makeSheet({ cls: 'ml-tall', title: t('addSongsTitle'), onClose: function () { if (changed && onChanged) onChanged(); } });
    sheetTitle(ui, t('addSongsTitle'), pl.item.Name);
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
        var b = iconBtn('add', t('mAddToPlaylist'), 'ml-add-btn');
        b.addEventListener('click', function () {
          b.disabled = true;
          addToPlaylistIds(pl.id, [it.Id]).then(function () {
            b.textContent = ''; b.appendChild(icon('check')); b.classList.add('ml-on'); changed = true; invalidatePlaylists();
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

  function trackMenu(track, ctx, index) {
    var liked = !!(track.UserData && track.UserData.IsFavorite);
    var inPlaylist = ctx.kind === 'playlist' && ctx.canEdit && track.PlaylistItemId;
    openMenu({ title: track.Name, subtitle: firstArtist(track), cover: itemImg(track, 120) }, [
      { icon: 'share', label: t('mShare'), run: function () {
        openShare({ url: linkFor(track.AlbumId || track.Id), title: track.Name, subtitle: firstArtist(track), cover: itemImg(track, 120), note: t('shareLinkTrack') });
      } },
      { icon: 'playlist_add', label: t('mAddToPlaylist'), run: function () { addToPlaylist([track.Id]); } },
      { icon: liked ? 'heart' : 'heart_o', label: liked ? t('mUnlike') : t('mLike'), run: function () {
        setFavorite(track.Id, !liked).then(function () {
          track.UserData = track.UserData || {};
          track.UserData.IsFavorite = !liked;
          if (ctx.kind === 'liked' && liked) { ctx.tracks.splice(index, 1); ctx.renderTracks(); }
          Player.refreshFavorite(track.Id, !liked);
        }, function () { toast(t('editFailed')); });
      } },
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

  function trackRow(track, i, ctx) {
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
    if (ctx.kind === 'album') row.appendChild(el('div', 'ml-track-no', String(track.IndexNumber != null ? track.IndexNumber : i + 1)));
    else row.appendChild(cover(itemImg(track, 96), 'ml-track-cover'));
    row.appendChild(main);
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
    if (ctx.kind === 'album') return cover(itemImg(ctx.album, 600), cls);
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
    if (!meCache) meCache = call('GET', 'Users/' + uid()).then(function (u) { return { id: u.Id, name: u.Name }; }, function () { meCache = null; return { id: uid(), name: '' }; });
    return meCache;
  }

  /* ---------- Playlist-Menue ---------- */
  function playlistMenu(ctx) {
    var pl = ctx.pl, info = pl ? pl.info : null;
    var ids = idsOf(ctx.tracks);
    var title = ctx.kind === 'liked' ? t('liked') : ctx.kind === 'album' ? ctx.album.Name : pl.item.Name;
    var sub = ctx.kind === 'playlist' ? t('ownerLine', info.ownerName || '') : ctx.kind === 'album' ? t('albumLine', firstArtist(ctx.album)) : t('playlist');
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
        { icon: 'share', label: t('mShare'), run: function () {
          openShare({ url: linkFor(ctx.album.Id), title: ctx.album.Name, subtitle: firstArtist(ctx.album), cover: itemImg(ctx.album, 120), note: '' });
        } },
        { icon: 'playlist_add', label: t('mAddToPlaylist'), run: function () { addToPlaylist(ids); } },
        { icon: 'queue', label: t('mQueue'), run: function () { queueIds(ids); } },
        { hidden: !jamOk, icon: 'group', label: t('mJam'), run: function () { jamWith(ids); } },
        { hidden: !(ctx.album.ArtistItems && ctx.album.ArtistItems.length), icon: 'person', label: t('mArtist'), run: function () { openArtist(ctx.album.ArtistItems); } }
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

  // Zurueck zur Bibliothek (Browser-Verlauf, sonst Musik-Startseite).
  function leaveDetail() {
    var lib = state.libraryId;
    if (window.history.length > 1) window.history.back();
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
        yourLibraryTitle: 'Deine Bibliothek', createdBy: 'von {0}', mute: 'Stumm', invitePeople: 'Personen hinzufügen'
      },
      en: {
        jellyfinHome: 'Jellyfin home', appMenu: 'Menu', emptyPlaylist: 'This playlist is empty.', addFirstSongs: 'Add tracks',
        upNext: 'Up next', openPlayer: 'Open player', collapse: 'Collapse', seekLabel: 'Position', queueNow: 'Playing now',
        backToSpotify: 'Spotify view', likedSub: 'Playlist • {0}', moreTracks: 'More tracks', noPlaylistsShared: 'Nothing shared with you yet.',
        playingFrom: 'Playing', shuffleOn: 'Shuffle on', shuffleOff: 'Shuffle off', speedBadge: '{0}×', unknownArtist: 'Unknown artist',
        yourLibraryTitle: 'Your library', createdBy: 'by {0}', mute: 'Mute', invitePeople: 'Add people'
      }
    };
    Object.keys(extra).forEach(function (l) { Object.keys(extra[l]).forEach(function (k) { STR[l][k] = extra[l][k]; }); });
  })();

  /* ---------- Zustand ---------- */
  var state = { libraryId: null, tab: 'home', chip: 'all', libSeg: 'playlists', classic: false, key: '', view: 0 };
  if (ML.safeStore('ml.classic') === '1') state.classic = true;
  var scrollMem = {};
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
    while (lazyActive < 3 && lazyQueue.length) {
      lazyActive++;
      lazyQueue.shift()().then(done, done);
    }
    function done() { lazyActive--; runLazy(); }
  }
  var mosaicCache = {};

  // Cover einer Playlist: eigenes Bild, sonst Mosaik aus den ersten Titeln (wird nachgeladen).
  function playlistCover(pl, cls, w) {
    var custom = playlistCoverUrl(pl, w || 300);
    if (custom) return cover(custom, cls);
    var holder = cover(null, cls);
    function fill(tracks) {
      var m = mosaic(tracks, '');
      if (m.classList.contains('ml-mosaic')) { holder.textContent = ''; holder.appendChild(m); return; }
      var im = m.querySelector('img');
      if (im) holder.appendChild(im);
    }
    var key = nid(pl.id);
    if (mosaicCache[key]) { fill(mosaicCache[key]); return holder; }
    lazyQueue.push(function () {
      return call('GET', 'Playlists/' + pl.id + '/Items', { UserId: uid(), Limit: 40 }).then(function (r) {
        var tracks = (r && r.Items) || [];
        mosaicCache[key] = tracks;
        if (holder.isConnected !== false) fill(tracks);
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
    var sub = item.Type === 'MusicAlbum' ? firstArtist(item) : item.Type === 'MusicArtist' ? t('artist') : item.Type === 'Audio' ? firstArtist(item) : '';
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
    var ui = makeSheet({ title: t('mNewPlaylist') });
    sheetTitle(ui, t('mNewPlaylist'));
    var input = el('input', 'ml-field ml-field-box');
    input.type = 'text'; input.maxLength = 100; input.placeholder = t('newPlaylistPh');
    ui.sheet.appendChild(input);
    var make = btn('ml-pill ml-primary', t('createPlaylist'));
    ui.sheet.appendChild(make);
    function submit() {
      var name = input.value.trim();
      if (!name) { input.focus(); return; }
      make.disabled = true;
      createPlaylistWith(name, []).then(function (pid) {
        ui.close(); toast(t('playlistCreated', name)); go('#/details?id=' + pid + (serverId() ? '&serverId=' + serverId() : ''));
      }, function () { make.disabled = false; toast(t('createFailed')); });
    }
    make.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    setTimeout(function () { input.focus(); }, 50);
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
        { icon: 'home', label: t('jellyfinHome'), run: function () { go('#/home'); } }
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
    body.textContent = '';
    body.appendChild(el('div', 'ml-muted ml-pad', t('loading')));
    var chip = state.chip;
    Promise.all([loadLibraries(), loadPlaylists(true)]).then(function (res) {
      if (seq !== state.view) return;
      var libs = res[0], pls = res[1];
      body.textContent = '';
      if (chip === 'podcasts') return fillMedia(body, seq, libs.filter(function (l) { return l.cat === 'podcasts'; }), 'podcasts');
      if (chip === 'audiobooks') return fillMedia(body, seq, libs.filter(function (l) { return l.cat === 'audiobooks'; }), 'audiobooks');
      return fillMusic(body, seq, libs, pls, chip === 'all');
    }, function () {
      if (seq !== state.view) return;
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

  // Reihen fuer Podcast- bzw. Hoerbuch-Bibliotheken.
  function loadMediaShelves(libs) {
    return Promise.all(libs.map(function (lib) {
      if (lib.type === 'music') {
        return Promise.all([
          itemsOf({ ParentId: lib.id, IncludeItemTypes: 'MusicAlbum', Recursive: true, SortBy: 'SortName', Limit: 60 }).catch(function () { return []; }),
          itemsOf({ ParentId: lib.id, IncludeItemTypes: 'Audio', Recursive: true, SortBy: 'DateCreated', SortOrder: 'Descending', Limit: 20 }).catch(function () { return []; })
        ]).then(function (r) {
          var out = [];
          var showsTitle = lib.cat === 'podcasts' ? t('shows') : t('audiobooksShelf');
          out.push({ title: libs.length > 1 ? lib.name : showsTitle, tiles: r[0].map(itemTile) });
          if (lib.cat === 'podcasts') {
            out.push({
              title: t('latestEpisodes') + (libs.length > 1 ? ' • ' + lib.name : ''),
              tiles: r[1].map(function (ep) {
                return tile({ title: ep.Name, sub: ep.Album || firstArtist(ep), img: itemImg(ep, 300), onClick: function () { playIds([ep.Id], 0); } });
              })
            });
          }
          return out;
        });
      }
      return itemsOf({ ParentId: lib.id, Limit: 60, SortBy: 'SortName' }).then(function (items) {
        return [{ title: lib.name, tiles: items.map(itemTile) }];
      }, function () { return []; });
    })).then(function (parts) { return [].concat.apply([], parts); });
  }

  function fillMedia(body, seq, libs, cat) {
    if (!libs.length) {
      var kw = (cat === 'podcasts' ? ML.config().podcastKeywords : ML.config().audiobookKeywords) || [];
      emptyNote(body, t(cat === 'podcasts' ? 'noPodcastLib' : 'noAudiobookLib', kw.join(', ')));
      return;
    }
    body.appendChild(el('div', 'ml-muted ml-pad', t('loading')));
    loadMediaShelves(libs).then(function (groups) {
      if (seq !== state.view) return;
      body.textContent = '';
      var any = false;
      groups.forEach(function (g) { if (shelf(body, g.title, g.tiles)) any = true; });
      if (!any) emptyNote(body, t('nothingYet'));
    }, function () {
      if (seq !== state.view) return;
      body.textContent = '';
      failNote(body, function () { body.textContent = ''; fillMedia(body, seq, libs, cat); });
    });
  }

  /* ---------- Suche ---------- */
  var searchTerm = '';
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
    function run() {
      var q = input.value.trim();
      searchTerm = input.value;
      var my = ++token;
      out.textContent = '';
      if (!q) { out.appendChild(el('p', 'ml-muted ml-pad', t('searchHint'))); return; }
      out.appendChild(el('div', 'ml-muted ml-pad', t('loading')));
      call('GET', 'Search/Hints', { searchTerm: q, UserId: uid(), Limit: 40, IncludeItemTypes: 'Audio,MusicAlbum,MusicArtist,Playlist', IncludeMedia: true }).then(function (r) {
        if (my !== token || seq !== state.view) return;
        out.textContent = '';
        var hints = (r && r.SearchHints) || [];
        var songs = hints.filter(function (h) { return h.Type === 'Audio'; });
        var albums = hints.filter(function (h) { return h.Type === 'MusicAlbum'; });
        var artists = hints.filter(function (h) { return h.Type === 'MusicArtist'; });
        var lists = hints.filter(function (h) { return h.Type === 'Playlist' && (!h.MediaType || h.MediaType === 'Audio'); });
        function link(h) { return '#/details?id=' + (h.ItemId || h.Id) + (serverId() ? '&serverId=' + serverId() : ''); }
        group(t('songs'), songs.map(function (h, i) {
          return row({ title: h.Name, sub: (h.Artists && h.Artists.length ? h.Artists.join(', ') : h.AlbumArtist || '') + (h.Album ? ' • ' + h.Album : ''), img: hintImg(h, 96),
            onClick: function () { playIds(songs.map(function (x) { return x.ItemId || x.Id; }), i); } });
        }));
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
  function renderLibrary(host, seq) {
    host.textContent = '';
    var head = el('div', 'ml-topbar');
    head.appendChild(profileButton());
    head.appendChild(el('h1', 'ml-page-title ml-inline', t('yourLibraryTitle')));
    var plus = iconBtn('add', t('mNewPlaylist'), 'ml-top-add', openCreatePlaylist);
    head.appendChild(plus);
    host.appendChild(head);
    host.appendChild(chipRow([
      { key: 'playlists', label: t('libPlaylists') }, { key: 'albums', label: t('libAlbums') }, { key: 'artists', label: t('libArtists') }
    ], state.libSeg, function (k) { state.libSeg = k; fill(); }, 'ml-lib-chips'));
    var list = el('div', 'ml-lib-list');
    host.appendChild(list);

    function libRow(opts) {
      var b = btn('ml-list-row');
      b.appendChild(opts.coverEl || cover(opts.img, 'ml-row-cover' + (opts.round ? ' ml-round' : '')));
      var txt = el('div', 'ml-row-text');
      txt.appendChild(el('div', 'ml-row-title', opts.title));
      if (opts.sub) txt.appendChild(el('div', 'ml-row-sub', opts.sub));
      b.appendChild(txt);
      b.addEventListener('click', opts.onClick);
      return b;
    }

    function fill() {
      list.textContent = '';
      var seg = state.libSeg;
      if (seg === 'playlists') {
        list.appendChild(el('div', 'ml-muted ml-pad', t('loading')));
        loadPlaylists(true).then(function (pls) {
          if (seq !== state.view || state.libSeg !== 'playlists') return;
          list.textContent = '';
          list.appendChild(libRow({ coverEl: likedCoverEl('ml-row-cover'), title: t('liked'), sub: t('playlist'), onClick: function () { ensureLibrary().then(function () { go(likedHash()); }); } }));
          pls.forEach(function (p) {
            var sub = t('playlist') + ' • ' + (p.info.isOwner ? (p.info.isPublic ? t('publicBadge') : t('privateBadge')) : (p.info.ownerName || t('sharedBadge')));
            list.appendChild(libRow({ coverEl: playlistCover(p, 'ml-row-cover', 120), title: p.item.Name, sub: sub, onClick: function () { go(hrefFor(p.item)); } }));
          });
          if (!pls.length) list.appendChild(el('p', 'ml-muted ml-pad', t('noPlaylistsYet')));
        }, function () { if (seq === state.view) { list.textContent = ''; failNote(list, fill); } });
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
          if (seq !== state.view || state.libSeg !== seg) return;
          total = r.total;
          r.items.forEach(function (it) {
            list.appendChild(libRow({
              img: itemImg(it, 120), round: seg === 'artists', title: it.Name,
              sub: seg === 'albums' ? t('album') + ' • ' + firstArtist(it) : t('artist'),
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
        }, function () { if (seq === state.view) failNote(list, function () { fill(); }); });
      }
      page();
    }
    fill();
  }

  /* ---------- Detailseite (Playlist, Album, Lieblingssongs) ---------- */
  function sumTicks(tracks) { return tracks.reduce(function (s, x) { return s + (x.RunTimeTicks || 0); }, 0); }

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
    if (heroImg) applyHeroColor(hero, heroImg);

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
      } else if (ctx.kind === 'album') {
        var art = firstArtist(ctx.album);
        var a = btn('ml-owner-link', art || t('unknownArtist'));
        a.addEventListener('click', function () { openArtist(ctx.album.ArtistItems); });
        who.appendChild(a);
        if (ctx.album.ProductionYear) who.appendChild(el('span', 'ml-muted', ' • ' + ctx.album.ProductionYear));
      } else {
        loadMe().then(function (me) {
          who.appendChild(avatar(me.id, me.name));
          who.appendChild(el('span', 'ml-owner-name', me.name));
        });
      }
      info.appendChild(who);

      var stats = ctx.tracks.length ? [fmtLong(sumTicks(ctx.tracks)), countText(ctx.tracks.length)] : [countText(0)];
      if (ctx.kind === 'playlist') stats.push(ctx.pl.info.isPublic ? t('publicBadge') : t('privateBadge'));
      info.appendChild(el('div', 'ml-hero-stats', stats.join(' • ')));
      hero.appendChild(info);

      var actions = el('div', 'ml-actions');
      var left = el('div', 'ml-actions-left');
      if (ctx.kind === 'playlist') left.appendChild(iconBtn('download', t('download'), '', function () { openDownload(ctx.pl); }));
      if (ctx.kind !== 'liked') left.appendChild(iconBtn('share', t('share'), '', function () {
        if (ctx.kind === 'playlist') shareList(ctx);
        else openShare({ url: linkFor(ctx.album.Id), title: ctx.album.Name, subtitle: firstArtist(ctx.album), cover: itemImg(ctx.album, 120), note: '' });
      }));
      left.appendChild(iconBtn('more_v', t('more'), '', function () { playlistMenu(ctx); }));
      var right = el('div', 'ml-actions-right');
      var sh = iconBtn('shuffle', t('shuffle'), 'ml-shuffle-btn', function () { if (ctx.tracks.length) playIds(shuffled(idsOf(ctx.tracks)), 0); });
      var pl = iconBtn('play', t('play'), 'ml-play-btn', function () { if (ctx.tracks.length) playIds(idsOf(ctx.tracks), 0); });
      right.appendChild(sh); right.appendChild(pl);
      actions.appendChild(left); actions.appendChild(right);
      hero.appendChild(actions);
    }
    host.appendChild(hero);

    var list = el('div', 'ml-tracks');
    host.appendChild(list);
    ctx.listEl = list;
    ctx.renderTracks();
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
      if (edit && ctx.canEdit) {
        var addRow = btn('ml-list-row ml-add-songs');
        addRow.appendChild(icon('add', 'ml-add-songs-ic'));
        addRow.appendChild(el('span', 'ml-row-title', t('addFirstSongs')));
        addRow.addEventListener('click', function () { openAddSongs(ctx.pl, ctx.reload); });
        list.appendChild(addRow);
      }
      var upto = Math.min(ctx.tracks.length, edit ? ctx.tracks.length : ctx.shown);
      for (var i = 0; i < upto; i++) list.appendChild(trackRow(ctx.tracks[i], i, ctx));
      if (upto < ctx.tracks.length) {
        var more = btn('ml-pill ml-more', t('moreTracks'));
        more.addEventListener('click', function () { ctx.shown += TRACK_PAGE; ctx.renderTracks(); });
        list.appendChild(more);
      }
      if (!ctx.tracks.length) {
        var e = el('div', 'ml-empty');
        e.appendChild(el('p', null, t('emptyPlaylist')));
        if (ctx.canEdit && ctx.kind === 'playlist') {
          var addB = btn('ml-pill ml-primary', t('addFirstSongs'));
          addB.addEventListener('click', function () { openAddSongs(ctx.pl, ctx.reload); });
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

  function showAlbumDetail(host, seq, id) {
    renderDetailLoading(host);
    function start() {
      Promise.all([loadItem(id, 'ChildCount,Genres'), loadAlbumTracks(id)]).then(function (res) {
        if (seq !== state.view) return;
        if (!res[0]) throw new Error('missing');
        var ctx = makeDetailCtx(host, { kind: 'album', album: res[0], tracks: res[1], canEdit: false });
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

  /* ---------- Player ---------- */
  var Player = (function () {
    var P = { session: null, item: null, full: null, paused: true, pos: 0, dur: 0, repeat: 'RepeatNone', shuffle: false, volume: 100, queue: [], at: 0, fav: false };
    var pollTimer = null, tickTimer = null, fastUntil = 0, polling = false, running = false;
    var mini = null, full = null, ui = {}, fullOpen = false, queueOpen = false, seeking = false, lastItemId = '', heroCoverId = '';

    function audioEl() {
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
      add(txt, ui.miniTitle, ui.miniSub);
      add(open, ui.miniCover, txt);
      open.addEventListener('click', openFull);
      ui.miniToggle = iconBtn('play', t('play'), 'ml-mini-play', toggle);
      ui.miniBar = el('div', 'ml-mini-progress');
      ui.miniFill = el('div', 'ml-mini-fill');
      ui.miniBar.appendChild(ui.miniFill);
      add(mini, open, ui.miniToggle, ui.miniBar);
      return mini;
    }

    function ensureFull() {
      if (full) return full;
      full = el('div', 'ml-full');
      full.hidden = true;
      full.setAttribute('role', 'dialog');
      full.setAttribute('aria-label', t('nowPlaying'));
      var head = el('div', 'ml-full-head');
      head.appendChild(iconBtn('down', t('collapse'), 'ml-full-close', closeFull));
      ui.fullHeadTitle = el('div', 'ml-full-headtitle', t('nowPlaying'));
      head.appendChild(ui.fullHeadTitle);
      head.appendChild(iconBtn('more_v', t('more'), 'ml-full-more', function () {
        if (!P.item) return;
        trackMenu(P.full || P.item, { kind: 'player', tracks: [], renderTracks: function () { /* nichts */ } }, 0);
      }));
      full.appendChild(head);

      var stage = el('div', 'ml-full-stage');
      ui.fullCover = el('div', 'ml-full-cover');
      stage.appendChild(ui.fullCover);
      ui.queueBox = el('div', 'ml-full-queue');
      ui.queueBox.hidden = true;
      stage.appendChild(ui.queueBox);
      full.appendChild(stage);

      var meta = el('div', 'ml-full-meta');
      var txt = el('div', 'ml-full-text');
      ui.fullTitle = el('div', 'ml-full-title');
      ui.fullArtist = btn('ml-full-artist');
      ui.fullArtist.addEventListener('click', function () {
        var it = P.full || P.item;
        if (it && it.ArtistItems && it.ArtistItems.length) { closeFull(); openArtist(it.ArtistItems); }
      });
      add(txt, ui.fullTitle, ui.fullArtist);
      ui.fullFav = iconBtn('heart_o', t('mLike'), 'ml-full-fav', toggleFav);
      add(meta, txt, ui.fullFav);
      full.appendChild(meta);

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
        var target = d * ui.seek.value / 1000;
        command('Playing/Seek', { seekPositionTicks: Math.round(target * 1e7) }).then(function () { seeking = false; P.pos = target; P.at = Date.now(); kick(); });
      });
      var times = el('div', 'ml-seek-times');
      ui.tPos = el('span', null, '0:00');
      ui.tDur = el('span', null, '0:00');
      add(times, ui.tPos, ui.tDur);
      add(seekBox, ui.seek, times);
      full.appendChild(seekBox);

      var ctl = el('div', 'ml-controls');
      ui.shuffle = iconBtn('shuffle', t('shuffle'), 'ml-ctl', function () { setShuffle(!P.shuffle); });
      ui.prev = iconBtn('prev', t('prev'), 'ml-ctl ml-ctl-skip', function () { skip('PreviousTrack'); });
      ui.play = iconBtn('play', t('play'), 'ml-ctl ml-ctl-play', toggle);
      ui.next = iconBtn('next', t('next'), 'ml-ctl ml-ctl-skip', function () { skip('NextTrack'); });
      ui.repeat = iconBtn('repeat', t('repeat'), 'ml-ctl', cycleRepeat);
      add(ctl, ui.shuffle, ui.prev, ui.play, ui.next, ui.repeat);
      full.appendChild(ctl);

      var vol = el('div', 'ml-volume');
      var vIc = iconBtn('volume', t('volume'), 'ml-vol-ic', function () { command('Command/ToggleMute'); });
      ui.vol = el('input', 'ml-range ml-vol-range');
      ui.vol.type = 'range'; ui.vol.min = '0'; ui.vol.max = '100'; ui.vol.step = '1'; ui.vol.value = '100';
      ui.vol.setAttribute('aria-label', t('volume'));
      ui.vol.addEventListener('input', function () { paintRange(ui.vol); });
      ui.vol.addEventListener('change', function () { setVolume(parseInt(ui.vol.value, 10)); });
      add(vol, vIc, ui.vol);
      full.appendChild(vol);

      var foot = el('div', 'ml-full-foot');
      ui.speedBtn = btn('ml-foot-btn');
      ui.speedBtn.addEventListener('click', openSpeed);
      ui.queueBtn = iconBtn('queue', t('queue'), 'ml-foot-icon', toggleQueue);
      add(foot, ui.speedBtn, ui.queueBtn);
      full.appendChild(foot);
      document.body.appendChild(full);
      return full;
    }

    function paintRange(r) {
      var max = parseFloat(r.max) || 100;
      r.style.setProperty('--ml-fill', (parseFloat(r.value) / max * 100) + '%');
    }

    /* Befehle an die eigene Sitzung (der Web-Client fuehrt sie selbst aus). */
    function command(path, params, body) {
      return withSession(function (s) { return call('POST', 'Sessions/' + s.Id + '/' + path, params || null, body); });
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

    /* Warteschlange */
    function toggleQueue() {
      queueOpen = !queueOpen;
      ui.queueBox.hidden = !queueOpen;
      ui.fullCover.hidden = queueOpen;
      ui.queueBtn.classList.toggle('ml-on', queueOpen);
      if (queueOpen) renderQueue();
    }
    var queueNames = {};
    function renderQueue() {
      var box = ui.queueBox;
      box.textContent = '';
      var q = P.queue || [];
      if (!q.length) { box.appendChild(el('p', 'ml-muted ml-pad', t('queueEmpty'))); return; }
      var missing = q.map(function (x) { return x.Id; }).filter(function (id) { return !queueNames[nid(id)]; }).slice(0, 100);
      var need = missing.length ? itemsOf({ Ids: missing.join(','), Fields: '' }).then(function (items) {
        items.forEach(function (it) { queueNames[nid(it.Id)] = it; });
      }, function () { /* Namen fehlen */ }) : Promise.resolve();
      need.then(function () {
        if (!queueOpen) return;
        box.textContent = '';
        var curIdx = -1;
        q.forEach(function (x, i) { if (P.item && nid(x.Id) === nid(P.item.Id) && curIdx < 0) curIdx = i; });
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
        if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'center' });
      });
    }

    /* Anzeige */
    function setCover(host, item, w) {
      host.textContent = '';
      host.appendChild(cover(itemImg(item, w), 'ml-fill-cover'));
    }

    function paint() {
      var has = !!P.item;
      var m = ensureMini();
      m.hidden = !has;
      bodyCls('ml-mini-on', has && running);
      if (!has) { if (fullOpen) closeFull(); return; }
      var it = P.full || P.item;
      var id = P.item.Id;
      var sub = firstArtist(it) || firstArtist(P.item);
      var paused = isPaused();

      ui.miniTitle.textContent = P.item.Name;
      ui.miniSub.textContent = sub;
      if (lastItemId !== id) setCover(ui.miniCover, P.item, 96);
      swapIcon(ui.miniToggle, paused ? 'play' : 'pause', paused ? t('play') : t('pause'));

      if (full) {
        ui.fullTitle.textContent = P.item.Name;
        ui.fullArtist.textContent = sub || t('unknownArtist');
        if (heroCoverId !== id) {
          setCover(ui.fullCover, P.item, 800);
          heroCoverId = id;
          var img = ui.fullCover.querySelector('img');
          if (img) applyHeroColor(full, img); else full.style.removeProperty('--ml-hero');
          if (queueOpen) renderQueue();
        }
        swapIcon(ui.play, paused ? 'play' : 'pause', paused ? t('play') : t('pause'));
        swapIcon(ui.fullFav, P.fav ? 'heart' : 'heart_o', P.fav ? t('mUnlike') : t('mLike'));
        ui.fullFav.classList.toggle('ml-on', P.fav);
        ui.shuffle.classList.toggle('ml-on', P.shuffle);
        ui.shuffle.setAttribute('aria-pressed', P.shuffle ? 'true' : 'false');
        swapIcon(ui.repeat, P.repeat === 'RepeatOne' ? 'repeat_one' : 'repeat', P.repeat === 'RepeatNone' ? t('repeatOff') : P.repeat === 'RepeatOne' ? t('repeatOne') : t('repeat'));
        ui.repeat.classList.toggle('ml-on', P.repeat !== 'RepeatNone');
        if (document.activeElement !== ui.vol) { ui.vol.value = String(Math.round(P.volume)); paintRange(ui.vol); }
        ui.speedBtn.textContent = speed === 1 ? t('speedTitle') : t('speedBadge', speed);
        ui.speedBtn.classList.toggle('ml-on', speed !== 1);
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
      if (full && !full.hidden && !seeking) {
        ui.seek.value = String(d ? Math.round(p / d * 1000) : 0);
        paintRange(ui.seek);
        ui.tPos.textContent = fmtClock(p);
        ui.tDur.textContent = fmtClock(d);
      }
    }

    /* Abfrage der Sitzung */
    function applySession(s) {
      var np = s && s.NowPlayingItem;
      if (!np) {
        if (P.item) { P.item = null; P.full = null; lastItemId = ''; heroCoverId = ''; markPlaying(); }
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
        P.full = null;
        var id = np.Id;
        P.fav = !!(np.UserData && np.UserData.IsFavorite);
        loadItem(id, '').then(function (it) {
          if (it && P.item && nid(P.item.Id) === nid(id)) {
            P.full = it;
            P.fav = !!(it.UserData && it.UserData.IsFavorite);
            paint();
          }
        }, function () { /* Basisdaten genuegen */ });
      }
      paint();
      if (changed && queueOpen) renderQueue();
      else if (queueOpen && full && !full.hidden) renderQueue();
    }

    function poll() {
      if (polling || !running) return Promise.resolve();
      polling = true;
      return ML.mySession().then(applySession, function () { /* naechster Versuch */ }).then(function () { polling = false; schedule(); }, function () { polling = false; schedule(); });
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
    }

    function openFull() {
      if (!P.item) return;
      ensureFull();
      fullOpen = true;
      full.hidden = false;
      bodyCls('ml-full-on', true);
      heroCoverId = '';
      paint();
      kick();
    }
    function closeFull() {
      fullOpen = false;
      if (full) full.hidden = true;
      queueOpen = false;
      if (ui.queueBox) { ui.queueBox.hidden = true; ui.fullCover.hidden = false; ui.queueBtn.classList.remove('ml-on'); }
      bodyCls('ml-full-on', false);
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
      if (e.key === 'Escape' && fullOpen && !document.querySelector('.ml-backdrop')) closeFull();
    });

    return {
      start: start, stop: stop, kick: kick, currentId: currentId, refreshFavorite: refreshFavorite,
      open: openFull, close: closeFull, isOpen: function () { return fullOpen; }, mount: function () {
        ensureMini();
        if (bottomBar && mini.parentNode !== bottomBar) bottomBar.insertBefore(mini, bottomBar.firstChild);
      }
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
    Player.mount();
    window.addEventListener('resize', layout);
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
  }

  function selectTab(tab) {
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
    bodyCls('ml-app-on', true);
    layout();
    Player.start();
    toggleClassicFab(false);
  }
  function hideApp() {
    if (!root) return;
    rememberScroll();
    root.hidden = true;
    state.key = '';
    state.view++;
    bodyCls('ml-app-on', false);
    Player.stop();
  }

  function layout() {
    if (!root || root.hidden) return;
    var top = 0, left = 0;
    var headers = document.querySelectorAll('.skinHeader, header.MuiAppBar-root, .MuiAppBar-root');
    for (var i = 0; i < headers.length; i++) {
      var r = headers[i].getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.top <= 1 && r.bottom > top && r.bottom < 200) top = r.bottom;
    }
    var drawer = document.querySelector('.MuiDrawer-docked, .mainDrawer-docked');
    if (drawer) {
      var d = drawer.getBoundingClientRect();
      if (d.width > 0 && d.left <= 1 && d.right < window.innerWidth * 0.6) left = d.right;
    }
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
    ML.safeStore('ml.classic', on ? '1' : null);
    state.key = '';
    onRoute(ML.route());
  }

  function onRoute(route) {
    latestRoute = route;
    ML.whenConfig(function (cfg) {
      if (latestRoute !== route) return;   // inzwischen weitergewechselt
      var spotify = cfg.spotifyHome !== false;
      var isLib = route.kind === 'library';
      var isDetail = route.kind === 'details' && route.item && (route.item.Type === 'Playlist' || route.item.Type === 'MusicAlbum');
      if (!spotify || (!isLib && !isDetail)) { hideApp(); toggleClassicFab(false); return; }
      if (state.classic) { hideApp(); toggleClassicFab(true); return; }

      if (isLib && route.id) state.libraryId = route.id;
      var key;
      if (isLib) key = route.params && route.params.mlview === 'liked' ? 'liked' : 'tab|' + state.tab;
      else key = 'detail|' + route.id;
      var wasShown = root && !root.hidden;
      showApp();
      if (wasShown && state.key === key) { updateNav(); return; }
      rememberScroll();
      state.key = key;
      state.view++;
      var seq = state.view;
      if (key === 'liked') showLikedDetail(content, seq);
      else if (isDetail) {
        if (!state.libraryId) ensureLibrary();
        if (route.item.Type === 'Playlist') showPlaylistDetail(content, seq, route.id);
        else showAlbumDetail(content, seq, route.id);
      } else {
        if (isLib && !state.libraryId) ensureLibrary();
        renderTabInto(seq);
      }
      restoreScroll(key);
      updateNav();
    });
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

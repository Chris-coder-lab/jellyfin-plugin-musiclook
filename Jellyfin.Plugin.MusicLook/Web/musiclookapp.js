/* Music Look - App-Ansicht (Spotify-Stil) fuer Musikbibliotheken.
   Baut auf musiclook.js (window.MusicLook) auf. Nutzt nur die Jellyfin-REST-API und die Plugin-Endpunkte unter
   /MusicLook; es werden keine Token oder Daten nach aussen gesendet. Icons: Material Design Icons (Apache-2.0). */
(function () {
  'use strict';
  var ML = window.MusicLook;
  if (!ML || ML.app || (ML.version || 0) < 2) return;

  var rawCall = ML.call, el = ML.el, btn = ML.button, toast = ML.toast, uid = ML.uid, nid = ML.nid, ID_RE = ML.ID_RE;

  // Songtext aus der Jellyfin-Antwort (Audio/{id}/Lyrics): { lines: [{ t (Sekunden oder null), text }], synced } oder null.
  // "Zeitgenau" richtet sich nach den Zeitmarken der Zeilen. Das Feld Metadata.IsSynced ist bei Jellyfin optional und fehlt je nach Version
  // auch bei einer .lrc-Datei; nur ein ausdrückliches "false" gilt als reiner Text. Reiner Text hat keine Zeitmarken (oder lauter gleiche).
  function lyricsFrom(r) {
    var lines = ((r && r.Lyrics) || []).map(function (l) { return { t: l && l.Start != null ? l.Start / 1e7 : null, text: String(l && l.Text != null ? l.Text : '') }; });
    if (!lines.some(function (l) { return l.text.trim(); })) return null;
    return lyricsFix({ lines: lines, synced: false }, r && r.Metadata ? r.Metadata.IsSynced : undefined);
  }
  function lyricsFix(ly, flag) {
    if (!ly || !ly.lines) return ly;
    var seen = {}, distinct = 0, timed = 0, allTimed = true, sorted = true, last = -1;
    ly.lines.forEach(function (l) {
      if (l.t == null) { allTimed = false; return; }
      timed++;
      if (!seen[l.t]) { seen[l.t] = 1; distinct++; }
      if (l.t < last) sorted = false;
      last = l.t;
    });
    ly.synced = flag !== false && timed >= 2 && distinct >= 2;
    // Mehrere Zeitmarken pro Zeile in einer .lrc koennen die Reihenfolge durcheinanderbringen: nach Zeit ordnen
    if (ly.synced && allTimed && !sorted) {
      ly.lines = ly.lines.map(function (l, i) { return { l: l, i: i }; }).sort(function (a, b) { return a.l.t - b.l.t || a.i - b.i; }).map(function (x) { return x.l; });
    }
    return ly;
  }

  /* ---------- Verbindung zum Server ----------
     navigator.onLine reicht nicht: Ist ein VPN aktiv, aber ohne Internet, meldet der Browser "online", und Anfragen haengen.
     Darum wird der Server selbst geprueft (kleine Anfrage, kurz zwischengespeichert). Ausserdem gibt es einen Schalter "Offline-Modus". */
  var Net = (function () {
    var forced = false, down = false, fails = 0, probing = false, timer = 0, started = false, listeners = [];
    try { forced = window.localStorage.getItem('ml.offmode') === '1'; } catch (e) { forced = false; }
    function offline() { return forced || down || navigator.onLine === false; }
    function emit() {
      try { document.body.classList.toggle('ml-offline', offline()); } catch (e) { /* Seite noch nicht bereit */ }
      listeners.slice().forEach(function (f) { try { f(offline()); } catch (e) { /* Zuhoerer darf nichts blockieren */ } });
    }
    function probeUrl() {
      var c = ML.client();
      return c ? c.getUrl('System/Info/Public') : '';
    }
    function schedule(ms) { clearTimeout(timer); timer = setTimeout(probe, ms); }
    function result(ok) {
      probing = false;
      var was = offline();
      if (ok) { fails = 0; down = false; } else { fails++; if (fails >= 2) down = true; }
      if (was !== offline()) emit();
      schedule(ok ? 20000 : (down ? 6000 : 2500));
    }
    function probe() {
      if (probing) return;
      if (document.hidden) { schedule(8000); return; }
      var url = probeUrl();
      if (!url || typeof fetch !== 'function') { schedule(url ? 20000 : 3000); return; }
      probing = true;
      var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
      var to = setTimeout(function () { if (ctrl) ctrl.abort(); result(false); }, 4500);
      var done = false;
      function fin(ok) { if (done) return; done = true; clearTimeout(to); result(ok); }
      fetch(url + (url.indexOf('?') >= 0 ? '&' : '?') + '_=' + Date.now(), { cache: 'no-store', credentials: 'omit', signal: ctrl ? ctrl.signal : undefined })
        .then(function (r) { fin(!!r); }, function () { fin(false); });
    }
    function start() {
      if (started) return;
      started = true;
      window.addEventListener('online', function () { fails = 0; probe(); emit(); });
      window.addEventListener('offline', function () { emit(); probe(); });
      document.addEventListener('visibilitychange', function () { if (!document.hidden) probe(); });
      emit();
      probe();
    }
    return {
      start: start, offline: offline, probeNow: function () { fails = Math.max(fails, 1); probe(); },
      // Eine fehlgeschlagene Anfrage ohne HTTP-Antwort: Server vermutlich nicht erreichbar -> bald pruefen.
      suspect: function () { if (!down && !probing) schedule(300); },
      forced: function () { return forced; },
      setForced: function (on) {
        forced = !!on;
        try { window.localStorage.setItem('ml.offmode', forced ? '1' : '0'); } catch (e) { /* nur fuer diese Sitzung */ }
        emit();
        if (!forced) { fails = 0; probe(); }
      },
      onChange: function (fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }
    };
  })();
  function offlineError() { var e = new Error('offline'); e.offline = true; return e; }
  function mySession() { return Net.offline() ? Promise.reject(offlineError()) : ML.mySession(); }
  // Anfragen an den Server: ohne Verbindung sofort abgelehnt (statt minutenlang zu haengen); ein Netzfehler loest eine Pruefung aus.
  function call() {
    if (Net.offline()) return Promise.reject(offlineError());
    return rawCall.apply(null, arguments).then(null, function (err) {
      if (err && typeof err.status !== 'number' && !(err.response && err.response.status)) Net.suspect();
      throw err;
    });
  }
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
    apps: 'M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z',
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
    open_in_full: 'M21 11V3h-8l3.29 3.29-10 10L3 13v8h8l-3.29-3.29 10-10z',
    close_fullscreen: 'M22 3.41 16.71 8.7 20 12h-8V4l3.29 3.29L20.59 2 22 3.41zM3.41 22l5.29-5.29L12 20v-8H4l3.29 3.29L2 20.59 3.41 22z',
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
  ICONS.equalizer = 'M10 20h4V4h-4v16zm-6 0h4v-8H4v8zM16 9v11h4V9h-4z';
  ICONS.plus_circle = 'M13 7h-2v4H7v2h4v4h2v-4h4v-2h-4V7zm-1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z';
  ICONS.check_circle = 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z';
  ICONS.book = 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z';
  ICONS.folder = 'M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z';

  /* Kontur-Symbole im Stil von Spotify (Zufallswiedergabe, Wiederholen). */
  var STROKE_ICONS = {
    shuffle: 'M3 7h2.6c1.6 0 3.1.8 4 2.1l4.1 5.8c.9 1.3 2.4 2.1 4 2.1H21M3 17h2.6c1.4 0 2.7-.6 3.6-1.7M13.6 8.8C14.5 7.7 15.8 7 17.3 7H21M18.4 4.3L21 7l-2.6 2.7M18.4 14.3L21 17l-2.6 2.7',
    repeat: 'M3.5 12v-1.5A4.5 4.5 0 0 1 8 6h12.5M17.6 3.1L20.5 6l-2.9 2.9M20.5 12v1.5A4.5 4.5 0 0 1 16 18H3.5M6.4 15.1L3.5 18l2.9 2.9',
    repeat_one: 'M3.5 12v-1.5A4.5 4.5 0 0 1 8 6h12.5M17.6 3.1L20.5 6l-2.9 2.9M20.5 12v1.5A4.5 4.5 0 0 1 16 18H3.5M6.4 15.1L3.5 18l2.9 2.9M10.4 10.4l1.9-1.4V15'
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
    if (item.__cover) return item.__cover;   // Titel vom Geraet: Cover liegt als lokale Datei vor
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

  // Verlaesst die Spotify-Ansicht Richtung Jellyfin (Startseite / alle Bibliotheken) und prueft das Ergebnis nach, weil ein Browser
  // (Firefox) den Seitenwechsel nach dem Schliessen der Ebenen verschlucken kann. Reihenfolge: Adresse erneut setzen,
  // Ansicht zwangsweise ausblenden, zuletzt die Seite einmalig neu laden (das, was man sonst von Hand mit F5 tun muesste).
  var leaveSeq = 0;
  function goJellyfin(href) {
    var target = href.charAt(0) === '#' ? href : '#' + href;
    var from = location.hash, seq = ++leaveSeq;
    function same() { return String(location.hash || '').toLowerCase() === target.toLowerCase(); }
    function appShown() {
      var r = document.getElementById('ml-app');
      return document.body.classList.contains('ml-app-on') || !!(r && !r.hidden);
    }
    function blank() {
      var n = 0, kids = document.body.children;
      for (var i = 0; i < kids.length; i++) {
        var k = kids[i];
        if (k.id === 'ml-app' || /^(SCRIPT|STYLE|LINK)$/.test(k.tagName) || (k.classList && (k.classList.contains('ml-toast') || k.classList.contains('ml-full')))) continue;
        n += String(k.innerText || '').replace(/\s+/g, '').length;
      }
      return n < 8;
    }
    function reloadOnce() {
      var au = document.querySelectorAll('audio');
      for (var i = 0; i < au.length; i++) if (!au[i].paused && !au[i].ended) return;   // laufende Wiedergabe hier nie unterbrechen
      if (typeof OFFPLAY !== 'undefined' && OFFPLAY.active()) return;   // auch die lokale Wiedergabe vom Gerät nicht unterbrechen
      var now = Date.now(), last = 0;
      try { last = +window.sessionStorage.getItem('ml.leaveReload') || 0; window.sessionStorage.setItem('ml.leaveReload', String(now)); } catch (e) { /* ohne Speicher */ }
      if (now - last < 60000) return;
      try { location.reload(); } catch (e) { /* ignorieren */ }
    }
    var moved = false;   // hat sich die Adresse seit dem Klick geaendert? (dann ist der Nutzer selbst weitergegangen)
    function onNav() { if (location.hash !== from) moved = true; }
    window.addEventListener('hashchange', onNav);
    window.addEventListener('popstate', onNav);
    function done() { window.removeEventListener('hashchange', onNav); window.removeEventListener('popstate', onNav); }
    function check(step) {
      if (seq !== leaveSeq) { done(); return; }
      if (step >= 3) done();
      if (!same()) {
        // Nur kurz nach dem Klick und nur, wenn die Adresse unveraendert blieb: der Seitenwechsel ist verloren gegangen, also erneut.
        if (step <= 1 && !moved && location.hash === from) {
          try { location.assign(location.href.split('#')[0] + target); } catch (e) { location.hash = target; }
        }
        return;
      }
      if (appShown()) {
        if (step >= 1 && ML.app && typeof ML.app.forceLeave === 'function') { try { ML.app.forceLeave(); } catch (e) { /* naechster Versuch */ } }
        else { try { ML.refresh(); } catch (e) { /* naechster Versuch */ } }
        return;
      }
      if (step >= 2 && blank()) reloadOnce();
    }
    go(target);
    [350, 1100, 2600, 4200].forEach(function (ms, i) { setTimeout(function () { check(i); }, ms); });
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
      // Erst nach dem Ereignis des Verlaufs ausfuehren: Firefox verschluckt sonst den Seitenwechsel, der mitten im popstate-Ereignis ausgeloest wird.
      if (then) queue.push(function () { setTimeout(function () { try { then(); } finally { next(); } }, 40); });
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
  /* ---------- Offline-Speicher (IndexedDB im Browser des Geräts; gemeinsam für die Spotify-Ansicht und die Offline-App) ---------- */
  // Speichern: tracks (Metadaten), blobs (Audiodatei), covers (Bild), colls (Alben/Playlists/Mixe, die geladen wurden).
  // Ein Titel gehört zu null oder mehr Sammlungen (colls) und ist ggf. einzeln geladen (explicit). Er wird erst gelöscht,
  // wenn weder das eine noch das andere zutrifft.
  var MLOff = (function () {
    var DB_NAME = 'musiclook-offline', dbp = null;
    function open() {
      if (dbp) return dbp;
      dbp = new Promise(function (resolve, reject) {
        if (!window.indexedDB) { reject(new Error('no indexedDB')); return; }
        var r = window.indexedDB.open(DB_NAME, 1);
        r.onupgradeneeded = function () {
          var d = r.result;
          if (!d.objectStoreNames.contains('tracks')) d.createObjectStore('tracks', { keyPath: 'id' });
          if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs');
          if (!d.objectStoreNames.contains('covers')) d.createObjectStore('covers');
          if (!d.objectStoreNames.contains('colls')) d.createObjectStore('colls', { keyPath: 'key' });
        };
        r.onsuccess = function () {
          var d = r.result;
          d.onversionchange = function () { d.close(); dbp = null; };
          resolve(d);
        };
        r.onerror = function () { reject(r.error || new Error('open failed')); };
        r.onblocked = function () { reject(new Error('blocked')); };
      });
      dbp.then(null, function () { dbp = null; });
      return dbp;
    }
    // fn(tx, set): set(v) legt das Ergebnis fest; aufgelöst wird erst, wenn die Transaktion abgeschlossen ist.
    function run(stores, mode, fn) {
      return open().then(function (db) {
        return new Promise(function (resolve, reject) {
          var out, t = db.transaction(stores, mode);
          t.oncomplete = function () { resolve(out); };
          t.onerror = function () { reject(t.error || new Error('transaction failed')); };
          t.onabort = function () { reject(t.error || new Error('transaction aborted')); };
          try { fn(t, function (v) { out = v; }); } catch (e) { try { t.abort(); } catch (e2) { /* schon beendet */ } reject(e); }
        });
      });
    }
    function nk(id) { return String(id || '').replace(/-/g, '').toLowerCase(); }

    function allTracks() { return run(['tracks'], 'readonly', function (t, set) { var r = t.objectStore('tracks').getAll(); r.onsuccess = function () { set(r.result || []); }; }); }
    function allColls() { return run(['colls'], 'readonly', function (t, set) { var r = t.objectStore('colls').getAll(); r.onsuccess = function () { set(r.result || []); }; }); }
    function getTrack(id) { return run(['tracks'], 'readonly', function (t, set) { var r = t.objectStore('tracks').get(nk(id)); r.onsuccess = function () { set(r.result || null); }; }); }
    function getBlob(id) { return run(['blobs'], 'readonly', function (t, set) { var r = t.objectStore('blobs').get(nk(id)); r.onsuccess = function () { set(r.result || null); }; }); }
    function getCover(key) { return run(['covers'], 'readonly', function (t, set) { var r = t.objectStore('covers').get(String(key)); r.onsuccess = function () { set(r.result || null); }; }); }

    // Speichert (oder ergänzt) einen Titel. meta.colls / meta.explicit werden mit dem Vorhandenen zusammengeführt.
    function saveTrack(meta, blob, coverKey, coverBlob) {
      meta.id = nk(meta.id);
      return run(['tracks', 'blobs', 'covers'], 'readwrite', function (t) {
        var ts = t.objectStore('tracks');
        var g = ts.get(meta.id);
        g.onsuccess = function () {
          var old = g.result;
          var rec = {};
          Object.keys(meta).forEach(function (k) { rec[k] = meta[k]; });
          var colls = (old && old.colls ? old.colls.slice() : []);
          (meta.colls || []).forEach(function (c) { if (colls.indexOf(c) < 0) colls.push(c); });
          rec.colls = colls;
          rec.explicit = !!((old && old.explicit) || meta.explicit);
          rec.added = old && old.added ? old.added : (meta.added || Date.now());
          if (blob) { rec.size = blob.size; t.objectStore('blobs').put(blob, meta.id); }
          else if (old) { rec.size = old.size; }
          if (coverKey && coverBlob) { rec.coverKey = String(coverKey); rec.coverSize = coverBlob.size; t.objectStore('covers').put(coverBlob, String(coverKey)); }
          ts.put(rec);
        };
      });
    }
    // Hängt vorhandene Titel an eine Sammlung / markiert sie als einzeln geladen.
    function linkTracks(ids, collKey, explicit) {
      return run(['tracks'], 'readwrite', function (t) {
        var ts = t.objectStore('tracks');
        ids.forEach(function (id) {
          var g = ts.get(nk(id));
          g.onsuccess = function () {
            var rec = g.result;
            if (!rec) return;
            if (collKey && rec.colls.indexOf(collKey) < 0) rec.colls.push(collKey);
            if (explicit) rec.explicit = true;
            ts.put(rec);
          };
        });
      });
    }
    // Ergaenzt Felder eines vorhandenen Titels (z. B. Songtext), ohne die Audiodatei anzufassen.
    function updateTrack(id, patch) {
      return run(['tracks'], 'readwrite', function (t) {
        var ts = t.objectStore('tracks');
        var g = ts.get(nk(id));
        g.onsuccess = function () {
          var rec = g.result;
          if (!rec) return;
          Object.keys(patch).forEach(function (k) { rec[k] = patch[k]; });
          ts.put(rec);
        };
      });
    }
    function saveColl(c) { return run(['colls'], 'readwrite', function (t) { t.objectStore('colls').put(c); }); }

    // Löst einen Titel aus einer Sammlung (collKey) bzw. aus "einzeln geladen" (collKey = null) und löscht ihn, wenn er nirgends mehr gebraucht wird.
    function unlink(t, id, collKey) {
      var ts = t.objectStore('tracks');
      var g = ts.get(nk(id));
      g.onsuccess = function () {
        var rec = g.result;
        if (!rec) return;
        if (collKey) rec.colls = (rec.colls || []).filter(function (c) { return c !== collKey; }); else rec.explicit = false;
        if (!rec.colls.length && !rec.explicit) {
          ts.delete(rec.id); t.objectStore('blobs').delete(rec.id);
          if (rec.coverKey) dropCoverIfUnused(t, rec.coverKey, rec.id);
        } else ts.put(rec);
      };
    }
    function dropCoverIfUnused(t, coverKey, exceptId) {
      var r = t.objectStore('tracks').getAll();
      r.onsuccess = function () {
        var used = (r.result || []).some(function (x) { return x.id !== exceptId && x.coverKey === coverKey; });
        if (!used) t.objectStore('covers').delete(coverKey);
      };
    }
    // Bei mehreren Titeln einer Sammlung wird erst am Ende (nach allen unlink-Läufen) aufgeräumt: Titel zählen einzeln.
    function removeColl(key) {
      return run(['tracks', 'blobs', 'covers', 'colls'], 'readwrite', function (t) {
        var cs = t.objectStore('colls');
        var g = cs.get(key);
        g.onsuccess = function () {
          var c = g.result;
          if (!c) return;
          // Titel, die nur in dieser Sammlung liegen, samt Bildern löschen; die übrigen nur aus der Sammlung lösen.
          var ts = t.objectStore('tracks');
          var all = ts.getAll();
          all.onsuccess = function () {
            var recs = all.result || [], gone = {};
            recs.forEach(function (rec) {
              if ((rec.colls || []).indexOf(key) < 0) return;
              rec.colls = rec.colls.filter(function (x) { return x !== key; });
              if (!rec.colls.length && !rec.explicit) { gone[rec.id] = true; ts.delete(rec.id); t.objectStore('blobs').delete(rec.id); }
              else ts.put(rec);
            });
            var keep = {};
            recs.forEach(function (rec) { if (!gone[rec.id] && rec.coverKey) keep[rec.coverKey] = true; });
            recs.forEach(function (rec) { if (gone[rec.id] && rec.coverKey && !keep[rec.coverKey]) { t.objectStore('covers').delete(rec.coverKey); keep[rec.coverKey] = true; } });
            cs.delete(key);
          };
        };
      });
    }
    function removeTrack(id) {
      return run(['tracks', 'blobs', 'covers'], 'readwrite', function (t) { unlink(t, id, null); });
    }
    // Entfernt Titel aus einer Sammlung (z. B. wenn sie in der Playlist nicht mehr vorkommen).
    function dropFromColl(ids, key) {
      return run(['tracks', 'blobs', 'covers'], 'readwrite', function (t) { ids.forEach(function (id) { unlink(t, id, key); }); });
    }
    function clearAll() {
      return run(['tracks', 'blobs', 'covers', 'colls'], 'readwrite', function (t) {
        ['tracks', 'blobs', 'covers', 'colls'].forEach(function (s) { t.objectStore(s).clear(); });
      });
    }
    // Belegter Platz der Downloads (Audio + Bilder) und Anzahlen.
    function usage() {
      return Promise.all([allTracks(), allColls()]).then(function (res) {
        var tracks = res[0], colls = res[1], audio = 0, covers = 0, seen = {};
        tracks.forEach(function (x) {
          audio += x.size || 0;
          if (x.coverKey && !seen[x.coverKey]) { seen[x.coverKey] = true; covers += x.coverSize || 0; }
        });
        return { audio: audio, covers: covers, bytes: audio + covers, tracks: tracks.length, colls: colls.length };
      });
    }
    // Schätzung des Browsers: gesamter belegter Platz dieser Website und der verfügbare Rahmen.
    function estimate() {
      var s = navigator.storage;
      if (!s || !s.estimate) return Promise.resolve(null);
      return s.estimate().then(function (e) { return { usage: e.usage || 0, quota: e.quota || 0 }; }, function () { return null; });
    }
    function persisted() { var s = navigator.storage; return s && s.persisted ? s.persisted().then(function (v) { return !!v; }, function () { return false; }) : Promise.resolve(false); }
    function persist() { var s = navigator.storage; return s && s.persist ? s.persist().then(function (v) { return !!v; }, function () { return false; }) : Promise.resolve(false); }

    return {
      open: open, nk: nk, allTracks: allTracks, allColls: allColls, getTrack: getTrack, getBlob: getBlob, getCover: getCover,
      saveTrack: saveTrack, updateTrack: updateTrack, linkTracks: linkTracks, saveColl: saveColl, removeColl: removeColl, removeTrack: removeTrack,
      dropFromColl: dropFromColl, clearAll: clearAll, usage: usage, estimate: estimate, persisted: persisted, persist: persist
    };
  })();
  if (typeof module !== 'undefined' && module.exports) module.exports = MLOff;
  /* ---------- Audio-DSP: Rauschunterdrückung und De-Esser (läuft im Browser des Hörers, nicht auf dem Server) ---------- */
  // mode 'denoise': spektrale Rauschunterdrückung (STFT, adaptive Rauschschätzung, Gewinn nach "decision-directed" Wiener-Regel)
  // mode 'deess'  : Split-Band-De-Esser (Linkwitz-Riley 4. Ordnung bei 5,5 kHz; nur das Höhenband wird abgesenkt, wenn es überwiegt)
  // process(inputs, outputs, n): inputs/outputs sind Listen von Float32Array-Kanälen (wie bei einem AudioWorklet).
  function MLDspCreate(sr, mode) {
    var PI2 = 2 * Math.PI;

    function biquadCoef(type, fc, q) {
      var w0 = PI2 * fc / sr, c = Math.cos(w0), s = Math.sin(w0), al = s / (2 * q), a0 = 1 + al, b0, b1, b2;
      if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; } else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
      return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: (-2 * c) / a0, a2: (1 - al) / a0 };
    }

    /* ---- De-Esser ---- */
    function makeDeess() {
      var q = 0.70710678, lp = biquadCoef('lp', 5500, q), hp = biquadCoef('hp', 5500, q);
      var THR = 0.28;          // Anteil der Höhen-Leistung an der Gesamtleistung, ab dem abgesenkt wird
      var EXP = 0.375;         // entspricht Verhältnis 4:1
      var GMIN = 0.35;         // höchstens etwa -9 dB
      var aTot = 1 - Math.exp(-1 / (0.15 * sr)), aAtk = 1 - Math.exp(-1 / (0.001 * sr)), aRel = 1 - Math.exp(-1 / (0.03 * sr));
      var gAtk = 1 - Math.exp(-1 / (0.0007 * sr)), gRel = 1 - Math.exp(-1 / (0.04 * sr));
      var st = [new Float64Array(8), new Float64Array(8)];   // je Kanal: lp1, lp2, hp1, hp2 (z1, z2)
      var pTot = 0, pHF = 0, g = 1, lo = [0, 0], hi = [0, 0];
      return function (inp, out, n) {
        var nch = Math.min(inp.length, out.length, 2);
        if (!nch) return;
        for (var i = 0; i < n; i++) {
          var xx = 0, hh = 0;
          for (var c = 0; c < nch; c++) {
            var z = st[c], x = inp[c][i], y;
            y = lp.b0 * x + z[0]; z[0] = lp.b1 * x - lp.a1 * y + z[1]; z[1] = lp.b2 * x - lp.a2 * y;
            var l = y;
            y = lp.b0 * l + z[2]; z[2] = lp.b1 * l - lp.a1 * y + z[3]; z[3] = lp.b2 * l - lp.a2 * y;
            lo[c] = y;
            y = hp.b0 * x + z[4]; z[4] = hp.b1 * x - hp.a1 * y + z[5]; z[5] = hp.b2 * x - hp.a2 * y;
            var h = y;
            y = hp.b0 * h + z[6]; z[6] = hp.b1 * h - hp.a1 * y + z[7]; z[7] = hp.b2 * h - hp.a2 * y;
            hi[c] = y;
            xx += x * x; hh += y * y;
          }
          xx /= nch; hh /= nch;
          pTot += aTot * (xx - pTot);
          pHF += (hh > pHF ? aAtk : aRel) * (hh - pHF);
          var tgt = 1;
          if (pTot > 1e-7) {
            var frac = pHF / pTot;
            if (frac > THR) { tgt = Math.pow(THR / frac, EXP); if (tgt < GMIN) tgt = GMIN; }
          }
          g += (tgt < g ? gAtk : gRel) * (tgt - g);
          for (var c2 = 0; c2 < nch; c2++) out[c2][i] = lo[c2] + g * hi[c2];
        }
        for (var c3 = nch; c3 < out.length; c3++) out[c3].set(out[0].subarray(0, n));
      };
    }

    /* ---- Rauschunterdrückung ---- */
    function makeDenoise() {
      var N = 1024, H = 512, K = N / 2 + 1;
      var win = new Float64Array(N), cosT = new Float64Array(N / 2), sinT = new Float64Array(N / 2), rev = new Uint16Array(N);
      var i, bits = 10;
      for (i = 0; i < N; i++) win[i] = Math.sqrt(0.5 - 0.5 * Math.cos(PI2 * i / N));
      for (i = 0; i < N / 2; i++) { cosT[i] = Math.cos(PI2 * i / N); sinT[i] = Math.sin(PI2 * i / N); }
      for (i = 0; i < N; i++) { var r = 0, v = i; for (var b = 0; b < bits; b++) { r = (r << 1) | (v & 1); v >>= 1; } rev[i] = r; }
      var re = new Float64Array(N), im = new Float64Array(N);
      function fft() {
        var a, j, k, size, half, step, tr, ti, wr, wi;
        for (a = 0; a < N; a++) { j = rev[a]; if (j > a) { tr = re[a]; re[a] = re[j]; re[j] = tr; tr = im[a]; im[a] = im[j]; im[j] = tr; } }
        for (size = 2; size <= N; size <<= 1) {
          half = size >> 1; step = N / size;
          for (a = 0; a < N; a += size) {
            for (j = 0, k = 0; j < half; j++, k += step) {
              wr = cosT[k]; wi = -sinT[k];
              var p = a + j, q2 = p + half;
              tr = re[q2] * wr - im[q2] * wi; ti = re[q2] * wi + im[q2] * wr;
              re[q2] = re[p] - tr; im[q2] = im[p] - ti; re[p] += tr; im[p] += ti;
            }
          }
        }
      }
      var A_PS = 0.6;                                  // Glättung der Leistung
      var RISE = Math.pow(10, 3 / 10 / (sr / H));      // Rauschschätzung darf mit ca. 3 dB/s ansteigen
      var BIAS = 1.5;                                  // Ausgleich: das Minimum unterschätzt das mittlere Rauschen
      var DD = 0.92, GMIN = 0.25;                      // Entscheidungsgesteuerte Glättung, höchstens ca. -12 dB
      var chans = [];
      function mk() {
        return {
          x: new Float32Array(N), acc: new Float32Array(N), wp: 0, hop: 0, first: true,
          ps: new Float64Array(K), nz: new Float64Array(K), a2: new Float64Array(K), g: new Float64Array(K), gs: new Float64Array(K)
        };
      }
      function frame(s) {
        var k, p, idx = s.wp;
        for (var a = 0; a < N; a++) { re[a] = s.x[idx] * win[a]; im[a] = 0; if (++idx === N) idx = 0; }
        fft();
        for (k = 0; k < K; k++) {
          p = re[k] * re[k] + im[k] * im[k];
          if (s.first) { s.ps[k] = p; s.nz[k] = Math.max(p, 1e-9); s.a2[k] = 0; }
          else {
            s.ps[k] = A_PS * s.ps[k] + (1 - A_PS) * p;
            var nz = s.nz[k], ps = s.ps[k];
            if (ps < nz) nz += 0.2 * (ps - nz); else nz = Math.min(ps, nz * RISE);
            s.nz[k] = nz = Math.max(nz, 1e-9);
          }
          var nT = s.nz[k] * BIAS, gam = p / nT, xi = DD * s.a2[k] / nT + (1 - DD) * Math.max(gam - 1, 0);
          var gk = xi / (1 + xi);
          if (gk < GMIN) gk = GMIN;
          s.g[k] = gk;
          s.a2[k] = gk * gk * p;
        }
        s.first = false;
        // Gewinn glätten: über die Frequenz (3 Punkte) und in der Zeit (schnell hoch, langsamer runter)
        for (k = 0; k < K; k++) {
          var l = k > 0 ? s.g[k - 1] : s.g[k], rr = k < K - 1 ? s.g[k + 1] : s.g[k];
          var sm = 0.25 * l + 0.5 * s.g[k] + 0.25 * rr;
          s.gs[k] += (sm > s.gs[k] ? 0.7 : 0.35) * (sm - s.gs[k]);
        }
        for (k = 0; k < K; k++) { re[k] *= s.gs[k]; im[k] *= s.gs[k]; }
        for (k = 1; k < N / 2; k++) { re[N - k] = re[k]; im[N - k] = -im[k]; }
        // Rücktransformation (Konjugations-Trick)
        for (k = 0; k < N; k++) im[k] = -im[k];
        fft();
        idx = s.wp;
        for (var b2 = 0; b2 < N; b2++) { s.acc[idx] += re[b2] / N * win[b2]; if (++idx === N) idx = 0; }
      }
      return function (inp, out, n) {
        var nch = Math.min(inp.length, out.length, 2);
        if (!nch) return;
        while (chans.length < nch) chans.push(mk());
        for (var c = 0; c < nch; c++) {
          var s = chans[c], xin = inp[c], xout = out[c];
          for (var i2 = 0; i2 < n; i2++) {
            xout[i2] = s.acc[s.wp];
            s.acc[s.wp] = 0;
            s.x[s.wp] = xin[i2];
            if (++s.wp === N) s.wp = 0;
            if (++s.hop === H) { s.hop = 0; frame(s); }
          }
        }
        for (var c3 = nch; c3 < out.length; c3++) out[c3].set(out[0].subarray(0, n));
      };
    }

    return { process: mode === 'deess' ? makeDeess() : makeDenoise() };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = MLDspCreate;

  /* ---------- Equalizer (laeuft im Browser per Web Audio, nicht auf dem Server) ---------- */
  var EQ = (function () {
    var BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    var BAND_LABEL = ['31', '62', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];
    var MAXDB = 12;
    var PRESETS = [
      { id: 'flat', bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], deess: false, denoise: false },
      { id: 'music', bands: [3, 2.5, 1.5, 0, -0.5, -0.5, 0, 1.5, 2.5, 2], deess: false, denoise: false },
      { id: 'sermon', bands: [-12, -8, -3, 0, 1, 2.5, 3, 2, -1, -4], deess: true, denoise: true },
      { id: 'audiobook', bands: [-5, -3, 0, 1, 1.5, 2, 2, 1, -1, -3], deess: true, denoise: false },
      { id: 'bass', bands: [6, 5, 3, 1, 0, 0, 0, 0, 0, 0], deess: false, denoise: false },
      { id: 'treble', bands: [0, 0, 0, 0, 0, 0, 1, 3, 5, 6], deess: false, denoise: false }
    ];
    var KEY = 'ml.eq';
    var AC = window.AudioContext || window.webkitAudioContext;

    function isIOS() {
      var ua = String(navigator.userAgent || '');
      return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1);
    }
    function supported() { return !!AC && !isIOS() && typeof WeakMap === 'function'; }

    function clampBand(v) {
      v = Number(v);
      if (!isFinite(v)) v = 0;
      v = Math.round(v * 2) / 2;
      return Math.max(-MAXDB, Math.min(MAXDB, v));
    }
    function sane(s) {
      var out = { bands: [], deess: !!(s && s.deess), denoise: !!(s && s.denoise) };
      for (var i = 0; i < BANDS.length; i++) out.bands.push(clampBand(s && s.bands ? s.bands[i] : 0));
      return out;
    }
    function copy(s) { return sane(s); }
    function same(a, b) {
      if (!!a.deess !== !!b.deess || !!a.denoise !== !!b.denoise) return false;
      for (var i = 0; i < BANDS.length; i++) if (clampBand(a.bands[i]) !== clampBand(b.bands[i])) return false;
      return true;
    }
    function flat() { return sane(PRESETS[0]); }
    function bandsActive(s) { for (var i = 0; i < s.bands.length; i++) if (s.bands[i] !== 0) return true; return false; }
    function isActive(s) { return bandsActive(s) || !!s.deess || !!s.denoise; }
    function presetOf(s) {
      for (var i = 0; i < PRESETS.length; i++) if (same(s, PRESETS[i])) return PRESETS[i].id;
      return 'custom';
    }

    function load() {
      try {
        var r = JSON.parse(window.localStorage.getItem(KEY) || 'null');
        if (r && r.b) return sane({ bands: r.b, deess: !!r.d, denoise: !!r.n });
      } catch (e) { /* kein Speicher */ }
      return flat();
    }
    function save(s) {
      try {
        if (!isActive(s)) window.localStorage.removeItem(KEY);
        else window.localStorage.setItem(KEY, JSON.stringify({ b: s.bands, d: s.deess ? 1 : 0, n: s.denoise ? 1 : 0 }));
      } catch (e) { /* kein Speicher */ }
    }

    var applied = load(), live = copy(applied);
    var rigs = [], byEl = supported() ? new WeakMap() : null, building = null, retryArmed = false, listeners = [], dspFailed = false;

    function workletUrl() {
      var s = document.querySelector('script[src*="MusicLook/app.js"]');
      var v = '';
      if (s) { var m = /[?&]v=([^&]+)/.exec(s.getAttribute('src') || ''); if (m) v = '?v=' + m[1]; }
      var base = s ? s.src.replace(/app\.js(\?.*)?$/, '') : new URL('../MusicLook/', document.baseURI).href;
      return base + 'eqdsp.js' + v;
    }

    /* ---- Graph je Audio-Element ---- */
    function disc(n) { try { n.disconnect(); } catch (e) { /* war nicht verbunden */ } }

    function ensureEqNodes(rig) {
      if (rig.eq) return;
      var ctx = rig.ctx;
      rig.eq = BANDS.map(function (f, i) {
        var n = ctx.createBiquadFilter();
        n.type = i === 0 ? 'lowshelf' : i === BANDS.length - 1 ? 'highshelf' : 'peaking';
        n.frequency.value = i === 0 ? 45 : i === BANDS.length - 1 ? 11000 : f;
        if (n.type === 'peaking') n.Q.value = 1.4;
        n.gain.value = 0;
        return n;
      });
      rig.trim = ctx.createGain();
      rig.trim.gain.value = 1;
      for (var i = 0; i < rig.eq.length - 1; i++) rig.eq[i].connect(rig.eq[i + 1]);
      rig.eq[rig.eq.length - 1].connect(rig.trim);
    }

    // Betrag (dB) eines Filters der Kette bei der Frequenz f (RBJ-Formeln wie in der Web-Audio-Spezifikation)
    function filterDb(type, f0, q, gainDb, f, sr) {
      var A = Math.pow(10, gainDb / 40), w0 = 2 * Math.PI * f0 / sr, cs = Math.cos(w0), sn = Math.sin(w0), b0, b1, b2, a0, a1, a2, al, sa;
      if (type === 'peaking') {
        al = sn / (2 * q);
        b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A;
      } else {
        al = sn / Math.SQRT2; sa = 2 * Math.sqrt(A) * al;
        if (type === 'lowshelf') {
          b0 = A * ((A + 1) - (A - 1) * cs + sa); b1 = 2 * A * ((A - 1) - (A + 1) * cs); b2 = A * ((A + 1) - (A - 1) * cs - sa);
          a0 = (A + 1) + (A - 1) * cs + sa; a1 = -2 * ((A - 1) + (A + 1) * cs); a2 = (A + 1) + (A - 1) * cs - sa;
        } else {
          b0 = A * ((A + 1) + (A - 1) * cs + sa); b1 = -2 * A * ((A - 1) + (A + 1) * cs); b2 = A * ((A + 1) + (A - 1) * cs - sa);
          a0 = (A + 1) - (A - 1) * cs + sa; a1 = 2 * ((A - 1) - (A + 1) * cs); a2 = (A + 1) - (A - 1) * cs - sa;
        }
      }
      var w = 2 * Math.PI * f / sr, c1 = Math.cos(w), s1 = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
      var nr = b0 + b1 * c1 + b2 * c2, ni = -(b1 * s1 + b2 * s2), dr = a0 + a1 * c1 + a2 * c2, di = -(a1 * s1 + a2 * s2);
      return 10 * Math.log((nr * nr + ni * ni) / (dr * dr + di * di)) / Math.LN10;
    }

    // Vorverstaerkung: gleicht die groesste Anhebung der Kurve aus, damit nichts uebersteuert (aus den Sollwerten berechnet)
    function trimFor(rig, s) {
      var peak = 0, N = 64, sr = rig.ctx.sampleRate || 44100;
      for (var i = 0; i < N; i++) {
        var f = 20 * Math.pow(1000, i / (N - 1)), sum = 0;
        for (var k = 0; k < BANDS.length; k++) {
          if (!s.bands[k]) continue;
          var last = k === BANDS.length - 1;
          sum += filterDb(k === 0 ? 'lowshelf' : last ? 'highshelf' : 'peaking', k === 0 ? 45 : last ? 11000 : BANDS[k], 1.4, s.bands[k], f, sr);
        }
        if (sum > peak) peak = sum;
      }
      return Math.pow(10, -0.8 * Math.min(peak, 24) / 20);
    }

    function setParam(p, v, ctx) {
      try { p.setTargetAtTime(v, ctx.currentTime, 0.02); } catch (e) { p.value = v; }
    }

    function configure(rig) {
      var s = live, ctx = rig.ctx;
      if (bandsActive(s)) {
        var fresh = !rig.eq;
        ensureEqNodes(rig);
        for (var i = 0; i < rig.eq.length; i++) {
          if (fresh) rig.eq[i].gain.value = s.bands[i]; else setParam(rig.eq[i].gain, s.bands[i], ctx);
        }
        var tr = trimFor(rig, s);
        if (fresh) rig.trim.gain.value = tr; else setParam(rig.trim.gain, tr, ctx);
      }
      if (s.denoise && !rig.A) startDsp(rig, 'denoise');
      if (s.deess && !rig.B) startDsp(rig, 'deess');
      wire(rig);
    }

    function wire(rig) {
      var s = live, k, head;
      disc(rig.in); disc(rig.out);
      if (rig.trim) disc(rig.trim);   // die Filterkette selbst bleibt verbunden; nur Anfang und Ende werden neu gesetzt
      if (rig.A) disc(rig.A);
      if (rig.B) disc(rig.B);
      var useA = s.denoise && rig.A, useEq = bandsActive(s) && rig.eq, useB = s.deess && rig.B;
      if (!useA && !useEq && !useB) rig.in.connect(rig.out);
      else {
        head = rig.in;
        if (useA) { head.connect(rig.A); head = rig.A; }
        if (useEq) { head.connect(rig.eq[0]); head = rig.trim; }
        if (useB) { head.connect(rig.B); head = rig.B; }
        head.connect(rig.out);
      }
      for (k = 0; k < rig.dests.length; k++) { try { rig.out.connect(rig.dests[k]); } catch (e) { /* anderer Kontext */ } }
    }

    function startDsp(rig, mode) {
      var ctx = rig.ctx, slot = mode === 'denoise' ? 'A' : 'B', flag = '_' + slot;
      if (rig[flag]) return;
      rig[flag] = true;
      function fallback() {
        if (typeof ctx.createScriptProcessor !== 'function') throw new Error('kein ScriptProcessor');
        var sp = ctx.createScriptProcessor(2048, 2, 2), dsp = MLDspCreate(ctx.sampleRate, mode);
        sp.onaudioprocess = function (e) {
          var ib = e.inputBuffer, ob = e.outputBuffer;
          var ins = [ib.getChannelData(0), ib.getChannelData(ib.numberOfChannels > 1 ? 1 : 0)];
          var outs = [ob.getChannelData(0), ob.getChannelData(ob.numberOfChannels > 1 ? 1 : 0)];
          dsp.process(ins, outs, ib.length);
        };
        rig.dspKind = 'script';
        return sp;
      }
      var p;
      if (ctx.audioWorklet && typeof AudioWorkletNode === 'function') {
        if (!rig.wlp) rig.wlp = ctx.audioWorklet.addModule(workletUrl());
        p = rig.wlp.then(function () {
          var n = new AudioWorkletNode(ctx, 'ml-dsp', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2, channelCountMode: 'explicit', processorOptions: { mode: mode } });
          rig.dspKind = 'worklet';
          return n;
        }).then(null, function () { return fallback(); });
      } else {
        p = new Promise(function (resolve) { resolve(fallback()); });
      }
      p.then(function (node) {
        rig[slot] = node;
        wire(rig);
      }, function () {
        rig[flag] = false;
        dspFailed = true;
        rig.dspKind = 'none';
        listeners.forEach(function (fn) { try { fn('dsp-failed'); } catch (e) { /* ignorieren */ } });
      });
    }

    function adopt(mediaEl, ctx, node, own) {
      var rig = { el: mediaEl, ctx: ctx, src: node, dests: [], own: !!own, in: ctx.createGain(), out: ctx.createGain(), eq: null, trim: null, A: null, B: null, dspKind: '' };
      var origConnect = node.connect, origDisconnect = node.disconnect;
      origConnect.call(node, rig.in);
      node.connect = function (dest) {
        if (dest && dest.context === ctx && typeof dest.connect === 'function') {
          if (rig.dests.indexOf(dest) < 0) rig.dests.push(dest);
          wire(rig);
          return dest;
        }
        return origConnect.apply(node, arguments);
      };
      node.disconnect = function (dest) {
        if (dest === undefined) rig.dests.length = 0;
        else {
          var i = rig.dests.indexOf(dest);
          if (i < 0) return origDisconnect.apply(node, arguments);
          rig.dests.splice(i, 1);
        }
        wire(rig);
      };
      byEl.set(mediaEl, rig);
      rigs.push(rig);
      wire(rig);
      configure(rig);
      return rig;
    }

    function patch() {
      if (!AC || !AC.prototype || typeof AC.prototype.createMediaElementSource !== 'function' || !byEl) return;
      if (AC.prototype.createMediaElementSource.__ml) return;
      var orig = AC.prototype.createMediaElementSource;
      var wrapped = function (mediaEl) {
        var known = mediaEl && byEl.get(mediaEl);
        if (known) return known.src;   // Element ist schon verbunden: denselben Knoten zurueckgeben statt eines Fehlers
        var node = orig.apply(this, arguments);
        try {
          if (mediaEl && mediaEl.classList && mediaEl.classList.contains('mediaPlayerAudio')) adopt(mediaEl, this, node, false);
        } catch (e) { if (window.console) console.error('Music Look Equalizer', e); }
        return node;
      };
      wrapped.__ml = true;
      AC.prototype.createMediaElementSource = wrapped;
    }

    function findEl() { return document.querySelector('audio.mediaPlayerAudio'); }

    // Verbindet das Audio-Element mit einem eigenen Kontext (falls Jellyfin das nicht schon getan hat).
    // Nur wenn der Kontext laeuft: ein Element, das einmal in einen stehenden Kontext geleitet wurde, bliebe stumm.
    function ensureRig() {
      if (!supported()) return Promise.resolve(null);
      var el = findEl();
      if (!el) return Promise.resolve(null);
      var known = byEl.get(el);
      if (known) return Promise.resolve(known);
      if (building) return building;
      building = new Promise(function (resolve) {
        var ctx, done = false;
        try { ctx = new AC({ latencyHint: 'playback' }); } catch (e) { try { ctx = new AC(); } catch (e2) { resolve(null); return; } }
        function go() {
          if (done) return;
          done = true;
          var have = byEl.get(el);
          if (have) { try { ctx.close(); } catch (e) { /* ignorieren */ } resolve(have); return; }
          if (ctx.state !== 'running') { try { ctx.close(); } catch (e) { /* ignorieren */ } armRetry(); resolve(null); return; }
          try {
            var node = ctx.createMediaElementSource(el);
            var rig = byEl.get(el);
            if (!rig) { rig = adopt(el, ctx, node, true); }
            rig.own = true;
            node.connect(ctx.destination);
            resolve(rig);
          } catch (e) {
            try { ctx.close(); } catch (e3) { /* ignorieren */ }
            resolve(null);
          }
        }
        if (ctx.state === 'running') { go(); return; }
        var p = ctx.resume && ctx.resume();
        if (p && p.then) p.then(go, go);
        setTimeout(go, 450);
      }).then(function (r) { building = null; return r; });
      return building;
    }

    function armRetry() {
      if (retryArmed) return;
      retryArmed = true;
      function again() {
        document.removeEventListener('pointerdown', again, true);
        document.removeEventListener('keydown', again, true);
        retryArmed = false;
        if (isActive(live)) ensureRig();
      }
      document.addEventListener('pointerdown', again, true);
      document.addEventListener('keydown', again, true);
    }

    function refresh() {
      rigs.forEach(function (rig) { configure(rig); });
      if (isActive(live)) {
        ensureRig().then(function (r) { if (r) configure(r); });
      }
    }

    function notify(what) { listeners.forEach(function (fn) { try { fn(what); } catch (e) { /* ignorieren */ } }); }

    function setLive(s) { live = sane(s); refresh(); }
    function commit(s) { applied = sane(s); save(applied); live = copy(applied); refresh(); notify('applied'); }
    function revert() { live = copy(applied); refresh(); }

    // Gespeicherte Einstellung wirkt, sobald das Audio-Element zu spielen beginnt (Jellyfin bekommt kurz Zeit, es selbst zu verbinden)
    function onPlay(e) {
      var t0 = e && e.target;
      if (!t0 || !t0.classList || !t0.classList.contains('mediaPlayerAudio') || !isActive(live)) return;
      setTimeout(function () { if (isActive(live)) ensureRig().then(function (r) { if (r) configure(r); }); }, 500);
    }

    if (supported()) {
      patch();
      document.addEventListener('play', onPlay, true);
    }

    return {
      supported: supported, isIOS: isIOS, PRESETS: PRESETS, BANDS: BANDS, BAND_LABEL: BAND_LABEL, MAXDB: MAXDB,
      load: function () { return copy(applied); }, live: function () { return copy(live); },
      setLive: setLive, commit: commit, revert: revert,
      same: same, isActive: isActive, presetOf: presetOf, flat: flat, copy: copy, clampBand: clampBand,
      onChange: function (fn) { listeners.push(fn); },
      status: function () {
        var kind = '';
        rigs.forEach(function (r) { if (r.dspKind) kind = r.dspKind; });
        return { supported: supported(), ios: isIOS(), rigs: rigs.length, dsp: kind, dspFailed: dspFailed, ctx: rigs.length ? rigs[rigs.length - 1].ctx.state : '' };
      },
      _rigs: rigs, _ensure: ensureRig
    };
  })();

  /* ---------- Equalizer: Bedienung ---------- */
  function openEqualizer() {
    var applied = EQ.load(), draft = EQ.load(), committed = false;
    var ui2 = makeSheet({
      cls: 'ml-menu ml-eq', title: t('eqTitle'),
      onClose: function () { if (!committed) EQ.revert(); }
    });
    var sheet = ui2.sheet;
    var head = el('div', 'ml-menu-head');
    head.appendChild(icon('equalizer'));
    var txt = el('div', 'ml-menu-text');
    txt.appendChild(el('div', 'ml-menu-title', t('eqTitle')));
    head.appendChild(txt);
    sheet.appendChild(head);

    var okEngine = EQ.supported();
    var note = el('div', 'ml-sheet-note ml-eq-note');
    function setNote() {
      var m = '';
      if (!okEngine) m = EQ.isIOS() ? t('eqIOS') : t('eqUnsupported');
      else if (typeof Player !== 'undefined' && Player.targetId && Player.targetId()) m = t('eqRemote');
      else if (EQ.status().dspFailed) m = t('eqNoDsp');
      else m = t('eqSub');
      note.textContent = m;
    }
    setNote();
    sheet.appendChild(note);

    var body = el('div', 'ml-eq-body' + (okEngine ? '' : ' ml-eq-off'));
    sheet.appendChild(body);

    // Voreinstellungen
    var chips = el('div', 'ml-eq-chips');
    chips.setAttribute('role', 'group');
    chips.setAttribute('aria-label', t('eqPresets'));
    var chipBtns = {};
    EQ.PRESETS.forEach(function (p) {
      var b = btn('ml-eq-chip');
      b.textContent = t('eq_' + p.id);
      b.addEventListener('click', function () {
        draft = EQ.copy(p);
        syncAll();
        changed();
      });
      chipBtns[p.id] = b;
      chips.appendChild(b);
    });
    var customChip = el('span', 'ml-eq-chip ml-eq-custom', t('eq_custom'));
    chips.appendChild(customChip);
    body.appendChild(chips);

    // Baender
    var bandsBox = el('div', 'ml-eq-bands');
    bandsBox.setAttribute('role', 'group');
    var sliders = [];
    function fmtDb(v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(Math.abs(v % 1) ? 1 : 0).replace('.', LANG === 'de' ? ',' : '.'); }
    EQ.BANDS.forEach(function (f, i) {
      var col = el('div', 'ml-eq-band');
      var val = el('div', 'ml-eq-val', '0');
      var sl = el('div', 'ml-eq-slider');
      sl.tabIndex = okEngine ? 0 : -1;
      sl.setAttribute('role', 'slider');
      sl.setAttribute('aria-orientation', 'vertical');
      sl.setAttribute('aria-valuemin', String(-EQ.MAXDB));
      sl.setAttribute('aria-valuemax', String(EQ.MAXDB));
      sl.setAttribute('aria-label', EQ.BAND_LABEL[i] + ' Hz');
      var rail = el('div', 'ml-eq-rail');
      var fill = el('div', 'ml-eq-fill');
      var knob = el('div', 'ml-eq-knob');
      add(rail, fill, knob);
      sl.appendChild(rail);
      var lab = el('div', 'ml-eq-freq', EQ.BAND_LABEL[i]);
      add(col, val, sl, lab);
      bandsBox.appendChild(col);
      var o = { sl: sl, val: val, fill: fill, knob: knob, i: i };
      sliders.push(o);

      function paintBand() {
        var v = draft.bands[i], pct = (EQ.MAXDB - v) / (2 * EQ.MAXDB) * 100;
        knob.style.top = pct + '%';
        if (v >= 0) { fill.style.top = pct + '%'; fill.style.bottom = '50%'; } else { fill.style.top = '50%'; fill.style.bottom = (100 - pct) + '%'; }
        val.textContent = fmtDb(v);
        sl.setAttribute('aria-valuenow', String(v));
        sl.setAttribute('aria-valuetext', fmtDb(v) + ' dB');
        val.classList.toggle('ml-zero', v === 0);
      }
      o.paint = paintBand;
      function fromPointer(e) {
        var r = rail.getBoundingClientRect();
        var y = Math.max(0, Math.min(r.height, e.clientY - r.top));
        draft.bands[i] = EQ.clampBand(EQ.MAXDB - y / r.height * 2 * EQ.MAXDB);
        paintBand();
      }
      var dragging = false;
      sl.addEventListener('pointerdown', function (e) {
        if (!okEngine || (e.button !== undefined && e.button > 0)) return;
        dragging = true;
        try { sl.setPointerCapture(e.pointerId); } catch (err) { /* ignorieren */ }
        sl.classList.add('ml-drag');
        fromPointer(e);
        e.preventDefault();
        sl.focus({ preventScroll: true });
      });
      sl.addEventListener('pointermove', function (e) { if (dragging) fromPointer(e); });
      function release() {
        if (!dragging) return;
        dragging = false;
        sl.classList.remove('ml-drag');
        syncChips();
        changed();   // erst nach dem Loslassen wird die Aenderung hoerbar
      }
      sl.addEventListener('pointerup', release);
      sl.addEventListener('pointercancel', release);
      sl.addEventListener('lostpointercapture', release);
      sl.addEventListener('dblclick', function () { if (!okEngine) return; draft.bands[i] = 0; paintBand(); syncChips(); changed(); });
      var keyTimer = null;
      sl.addEventListener('keydown', function (e) {
        if (!okEngine) return;
        var d = 0, step = e.shiftKey ? 3 : 0.5;
        if (e.key === 'ArrowUp' || e.key === 'ArrowRight') d = step;
        else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') d = -step;
        else if (e.key === 'PageUp') d = 3; else if (e.key === 'PageDown') d = -3;
        else if (e.key === 'Home') { draft.bands[i] = EQ.MAXDB; d = 0; paintBand(); }
        else if (e.key === 'End') { draft.bands[i] = -EQ.MAXDB; d = 0; paintBand(); }
        else return;
        e.preventDefault();
        if (d) draft.bands[i] = EQ.clampBand(draft.bands[i] + d);
        paintBand(); syncChips();
        clearTimeout(keyTimer);
        keyTimer = setTimeout(changed, 350);
      });
    });
    body.appendChild(bandsBox);

    // Schalter
    function makeSwitch(key, titleKey, subKey) {
      var row = btn('ml-eq-switch');
      row.setAttribute('role', 'switch');
      var tx = el('div', 'ml-eq-switch-text');
      tx.appendChild(el('div', 'ml-eq-switch-title', t(titleKey)));
      tx.appendChild(el('div', 'ml-eq-switch-sub', t(subKey)));
      var knobWrap = el('span', 'ml-eq-toggle');
      knobWrap.appendChild(el('span', 'ml-eq-toggle-dot'));
      add(row, tx, knobWrap);
      row.addEventListener('click', function () {
        if (!okEngine) return;
        draft[key] = !draft[key];
        paintSwitch();
        syncChips();
        changed();
      });
      function paintSwitch() {
        row.setAttribute('aria-checked', draft[key] ? 'true' : 'false');
        row.classList.toggle('ml-on', !!draft[key]);
      }
      row._paint = paintSwitch;
      body.appendChild(row);
      return row;
    }
    var swDeess = makeSwitch('deess', 'eqDeess', 'eqDeessSub');
    var swDenoise = makeSwitch('denoise', 'eqDenoise', 'eqDenoiseSub');

    // Aktionen
    var actions = el('div', 'ml-eq-actions');
    var bReset = btn('ml-eq-btn ml-eq-reset'); bReset.textContent = t('eqReset');
    var bCancel = btn('ml-eq-btn ml-eq-cancel'); bCancel.textContent = t('cancel');
    var bApply = btn('ml-eq-btn ml-eq-apply'); bApply.textContent = t('eqApply');
    add(actions, bReset, el('span', 'ml-eq-spacer'), bCancel, bApply);
    sheet.appendChild(actions);

    function syncChips() {
      var id = EQ.presetOf(draft);
      Object.keys(chipBtns).forEach(function (k) {
        chipBtns[k].classList.toggle('ml-on', k === id);
        chipBtns[k].setAttribute('aria-pressed', k === id ? 'true' : 'false');
      });
      customChip.hidden = id !== 'custom';
    }
    function syncAll() {
      sliders.forEach(function (o) { o.paint(); });
      swDeess._paint(); swDenoise._paint();
      syncChips();
    }
    function changed() {
      draft = EQ.copy(draft);
      if (okEngine) EQ.setLive(draft);
      var dirty = !EQ.same(draft, applied);
      bApply.disabled = !dirty;
      bApply.classList.toggle('ml-disabled', !dirty);
      setNote();
    }
    bReset.addEventListener('click', function () {
      if (!okEngine) return;
      draft = EQ.flat();
      syncAll();
      changed();
    });
    bCancel.addEventListener('click', function () { ui2.close(); });
    bApply.addEventListener('click', function () {
      if (!okEngine || EQ.same(draft, applied)) { ui2.close(); return; }
      EQ.commit(draft);
      committed = true;
      toast(t('eqApplied'));
      ui2.close();
    });
    if (!okEngine) { bReset.disabled = true; bApply.disabled = true; bApply.classList.add('ml-disabled'); }
    syncAll();
    changed();
    // changed() hat bei unveraenderten Werten nichts zu tun; sicherheitshalber Live-Zustand = gespeicherter Zustand
    if (okEngine) EQ.setLive(draft);
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

  // Ladeanzeige wie bei Spotify: duenner gruener Ring statt Jellyfins Kreisel (small: kleiner Ring ohne Abstand, z. B. in Menues)
  function loaderEl(small) {
    var box = el('div', 'ml-loader' + (small ? ' ml-loader-s' : ''));
    box.setAttribute('role', 'status');
    box.setAttribute('aria-label', t('loading'));
    box.appendChild(el('div', 'ml-spin'));
    return box;
  }

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
    return itemsOf({ IsFavorite: true, IncludeItemTypes: 'Audio,AudioBook', Recursive: true, SortBy: 'DateCreated,SortName', SortOrder: 'Descending,Ascending', Limit: 2000, Fields: 'ParentId' });
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
    return mySession().then(function (s) { sessCache = { at: Date.now(), s: s }; return s; });
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

  var playIntent = null;   // { key, ids }: zuletzt von hier gestartete Playlist
  var PLAY_CHUNK = 150;   // Die Titel stehen in der Adresse; so bleibt sie unter ca. 5 KB.

  // Wartet, bis der erste Titel laeuft, damit nachfolgende "PlayLast"-Befehle die Warteschlange erweitern statt neu zu starten.
  function waitForPlaying(id, tries) {
    var look = typeof Player !== 'undefined' && Player && Player.sessionNow ? Player.sessionNow : mySession;
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
    // Ohne Verbindung spielen die geladenen Titel vom Gerät; mit Verbindung ersetzt die Serverwiedergabe die lokale.
    if (typeof OFFPLAY !== 'undefined') {
      if (Net.offline()) {
        var loc = OFFPLAY.offlineIds(ids, start);
        if (!loc.ids.length) { toast(t('offNotAvail')); return Promise.resolve(false); }
        return OFFPLAY.startIds(loc.ids, loc.start, { name: opts.name || '', ctx: opts.ctx || '' }).then(function (ok) { clearPending(); return ok; });
      }
      OFFPLAY.stop();
    }
    // Merkt, aus welcher Playlist (oder Lieblingssongs) hier gestartet wird; so ist die gruene Markierung auf diesem Geraet eindeutig.
    playIntent = opts.ctx ? { key: String(opts.ctx), ids: (ids.length <= PLAY_CHUNK ? ids : ids.slice(start)).slice() } : null;
    if (typeof Player !== 'undefined' && Player && Player.releaseAuto) Player.releaseAuto();
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
    }).then(function () { Player.kick(); return true; }, function () { if (!opts.quiet) toast(t('playFailed')); return false; });
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
      likedDirty = true; likedVer++;
      return r;
    });
  }
  var likedDirty = false, likedVer = 0;
  function setFavorites(ids, on) {
    return ids.reduce(function (p, id) { return p.then(function () { return setFavorite(id, on); }); }, Promise.resolve());
  }

  function jamWith(ids) {
    return ML.jamAddIds(ids).then(function () { toast(t('jamAdded')); }, function () { toast(t('jamFailed')); });
  }

  // Empfehlungen: aehnliche Titel zu einem oder mehreren Ausgangstiteln. Zuerst die eigene Stilbewertung (Taste), nur wenn sie nichts
  // Brauchbares liefert (zu kleine Bibliothek, Fehler, Zeitueberschreitung) Jellyfins Sofortmix.
  function instantMix(id, limit) {
    return call('GET', 'Songs/' + id + '/InstantMix', { UserId: uid(), Limit: limit || 30 }).then(function (r) {
      return ((r && r.Items) || []).filter(function (i) { return i && ID_RE.test(String(i.Id || '')) && (i.Type === 'Audio' || i.MediaType === 'Audio' || !i.Type); });
    });
  }
  function loadSongMix(ids, limit, opts) {
    var seeds = Array.isArray(ids) ? ids : [ids];
    var o = { n: limit || 30 };
    Object.keys(opts || {}).forEach(function (k) { o[k] = opts[k]; });
    return Taste.similar(seeds, o).then(function (list) {
      if (list && list.length >= 8) return list;
      return instantMix(seeds[0], limit);
    });
  }
  // Autoplay: nach dem letzten Titel geht es mit passenden Titeln weiter (Standard: an).
  function autoplayOn() { try { return window.localStorage.getItem('ml.autoplay') !== '0'; } catch (e) { return true; } }
  function setAutoplay(on) { try { window.localStorage.setItem('ml.autoplay', on ? '1' : '0'); } catch (e) { /* nur fuer diese Sitzung */ } }

  function songRadio(track) {
    return loadSongMix(track.Id, 100, { own: 6 }).then(function (items) {
      var ids = items.map(function (i) { return i.Id; }).filter(function (id) { return nid(id) !== nid(track.Id); });
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
    list.appendChild(loaderEl(true));
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
    var list = [document.querySelector('audio.mediaPlayerAudio'), typeof OFFPLAY !== 'undefined' ? OFFPLAY.audio() : null];
    list.forEach(function (a) {
      if (!a) return;
      try { a.defaultPlaybackRate = speed; a.playbackRate = speed; a.preservesPitch = true; if ('mozPreservesPitch' in a) a.mozPreservesPitch = true; } catch (e) { /* ignorieren */ }
    });
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

  /* ---------- Geschmack: Mixe, Sender und Mixtapes, die bei einer Stilrichtung bleiben ----------
     Jellyfins "Sofortmix" nimmt zufaellige Titel mit IRGENDEINEM der Genres des Ausgangstitels. Ist ein Genre grob (z. B. "Christlich"),
     steht im Mix alles durcheinander. Hier wird stattdessen die Aehnlichkeit pro Titel bewertet: seltene Genres zaehlen mehr als haeufige,
     dazu kommen gleiche Kuenstler/Alben, Kuenstler, die in deinen Playlists zusammen vorkommen, die Playlists selbst und das Erscheinungsjahr.
     Titel unter einer Mindestaehnlichkeit kommen gar nicht erst in den Mix. */
  var TasteCore = (function () {
    var STOP = { musik: 1, music: 1, unknown: 1, other: 1, sonstige: 1, sonstiges: 1, '': 1 };
    function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9äöüß]+/g, ' ').trim(); }
    function uniq(a) { var seen = {}, out = []; a.forEach(function (x) { if (x && !seen[x]) { seen[x] = 1; out.push(x); } }); return out; }

    // songs: Titel im Format der Server-Antwort; lists: [{ key, ids }] (Playlists, Lieblingssongs)
    function build(songs, lists) {
      var recs = [], byId = {}, df = {};
      songs.forEach(function (it) {
        var id = nid(it.Id);
        if (!id || byId[id]) return;
        var g = uniq((it.Genres || []).map(norm).filter(function (x) { return !STOP[x]; }));
        var arts = uniq(((it.Artists && it.Artists.length) ? it.Artists : (it.AlbumArtist ? [it.AlbumArtist] : [])).map(norm));
        var r = { it: it, id: id, g: g, a: arts, alb: it.AlbumId ? nid(it.AlbumId) : (it.Album ? 'n:' + norm(it.Album) + '|' + (arts[0] || '') : ''), y: +it.ProductionYear || 0, pls: [] };
        byId[id] = r; recs.push(r);
        g.forEach(function (x) { df[x] = (df[x] || 0) + 1; });
      });
      // Gemeinsam gehoerte Titel: aufeinanderfolgend gespielt (Pause < 45 min) zaehlt wie eine Playlist
      var played = recs.filter(function (r) { return r.it.UserData && r.it.UserData.LastPlayedDate; }).sort(function (a, b) {
        return a.it.UserData.LastPlayedDate < b.it.UserData.LastPlayedDate ? -1 : 1;
      });
      var sessions = [], curS = [], lastT = 0;
      played.forEach(function (r) {
        var tm = Date.parse(r.it.UserData.LastPlayedDate) || 0;
        if (curS.length && tm - lastT > 45 * 60000) { sessions.push(curS); curS = []; }
        curS.push(r.id); lastT = tm;
      });
      if (curS.length) sessions.push(curS);
      lists = (lists || []).concat(sessions.filter(function (x) { return x.length >= 3 && x.length <= 120; }).map(function (x, i) { return { key: 's' + i, ids: x }; }));
      var N = recs.length, idf = {};
      Object.keys(df).forEach(function (g) { idf[g] = Math.max(0.02, Math.log((N + 1) / (df[g] + 0.5))); });
      var plSize = [], plArt = [];
      (lists || []).forEach(function (l) {
        var members = [], seen = {};
        (l.ids || []).forEach(function (id) { var r = byId[nid(id)]; if (r && !seen[r.id]) { seen[r.id] = 1; members.push(r); } });
        if (members.length < 3 || members.length > Math.max(60, N * 0.5)) return;   // zu klein oder "alles"-Liste: kein Signal
        var j = plSize.length, arts = {};
        plSize.push(members.length);
        members.forEach(function (r) { r.pls.push(j); r.a.forEach(function (a) { arts[a] = (arts[a] || 0) + 1; }); });
        plArt.push(arts);
      });
      return { recs: recs, byId: byId, idf: idf, N: N, plSize: plSize, plArt: plArt, at: Date.now() };
    }
    // Wie "spezifisch" ein Genre ist: sehr haeufige Tags (z. B. "Pop" bei jedem sechsten Titel) sagen wenig, seltene viel.
    function spec(ix, g) { var v = (ix.idf[g] - 1.0) / 1.5; return v < 0 ? 0 : v > 1 ? 1 : v; }
    function plW(ix, j) { return 1 / Math.log(2.5 + ix.plSize[j]); }

    // Profil der Ausgangstitel (ein Titel oder mehrere, z. B. alle eines Kuenstlers)
    function profile(ix, seeds) {
      var k = seeds.length, gw = {}, aw = {}, albs = {}, pw = {}, ys = [], nb = {};
      seeds.forEach(function (s) {
        s.g.forEach(function (g) { gw[g] = (gw[g] || 0) + 1 / k; });
        s.a.forEach(function (a) { aw[a] = (aw[a] || 0) + 1 / k; });
        if (s.alb) albs[s.alb] = (albs[s.alb] || 0) + 1 / k;
        s.pls.forEach(function (j) { pw[j] = (pw[j] || 0) + 1 / k; });
        if (s.y) ys.push(s.y);
      });
      var pnorm = 0, maxNb = 0;
      Object.keys(pw).forEach(function (j) {
        var w = pw[j] * plW(ix, +j);
        pnorm += w;
        var arts = ix.plArt[+j], tot = ix.plSize[+j];
        Object.keys(arts).forEach(function (a) { var v = w * arts[a] / tot; nb[a] = (nb[a] || 0) + v; if (nb[a] > maxNb) maxNb = nb[a]; });
      });
      if (maxNb > 0) Object.keys(nb).forEach(function (a) { nb[a] = nb[a] / maxNb; });
      var gn = 0, topSpec = 0;
      Object.keys(gw).forEach(function (g) { var sp = spec(ix, g); gn += sp * gw[g]; if (sp > topSpec) topSpec = sp; });
      ys.sort(function (a, b) { return a - b; });
      return { gw: gw, aw: aw, albs: albs, pw: pw, nb: nb, pnorm: pnorm, gmass: gn, topSpec: topSpec, y: ys.length ? ys[Math.floor(ys.length / 2)] : 0, seedIds: seeds.map(function (s) { return s.id; }) };
    }
    function score(ix, pr, c) {
      var g = 0;
      if (pr.gmass > 0 && c.g.length) {
        var shared = 0;
        c.g.forEach(function (x) { if (pr.gw[x]) shared += spec(ix, x) * pr.gw[x]; });
        g = shared / (pr.gmass + 0.5);
      }
      var a = 0;
      if (c.alb && pr.albs[c.alb]) a = 1;
      c.a.forEach(function (x) {
        if (pr.aw[x]) a = Math.max(a, 0.85 * Math.min(1, pr.aw[x] * 2));
        else if (pr.nb[x]) a = Math.max(a, 0.6 * pr.nb[x]);
      });
      var p = 0;
      if (pr.pnorm > 0 && c.pls.length) {
        c.pls.forEach(function (j) { if (pr.pw[j]) p += pr.pw[j] * plW(ix, j); });
        p = Math.min(1, p / pr.pnorm);
      }
      var y = pr.y && c.y ? Math.exp(-Math.abs(c.y - pr.y) / 8) : 0.5;
      var wg = pr.topSpec > 0.2 ? 0.40 : 0.10, wa = 0.30, wp = pr.pnorm > 0 ? 0.25 : 0, wy = 0.10;
      return (wg * g + wa * a + wp * p + wy * y) / (wg + wa + wp + wy);
    }

    // seedIds: Titel-IDs; opts: { n, own (max. Titel der Ausgangskuenstler), per (max. je anderem Kuenstler), min, rnd, skip (IDs ausschliessen), keepSeeds }
    // Es wird zuerst streng ausgewaehlt (nur wirklich aehnliche Titel); reicht das nicht fuer einen brauchbaren Mix, wird stufenweise gelockert.
    function similar(ix, seedIds, opts) {
      opts = opts || {};
      var n = opts.n || 40, per = opts.per || Math.max(3, Math.ceil(n / 8)), min = opts.min != null ? opts.min : 0.30, rnd = opts.rnd != null ? opts.rnd : 0.35;
      var want = opts.want || Math.min(n, 24);
      var seeds = seedIds.map(function (id) { return ix.byId[nid(id)]; }).filter(Boolean);
      if (!seeds.length) return [];
      var pr = profile(ix, seeds), skip = {}, own = {};
      (opts.skip || []).forEach(function (id) { skip[nid(id)] = 1; });
      if (!opts.keepSeeds) pr.seedIds.forEach(function (id) { skip[id] = 1; });
      seeds.forEach(function (s) { s.a.forEach(function (a) { own[a] = 1; }); });
      var ownMax = opts.own != null ? opts.own : per;
      var cand = [];
      ix.recs.forEach(function (c) {
        if (skip[c.id]) return;
        cand.push({ r: c, s: score(ix, pr, c) });
      });
      cand.sort(function (a, b) { return b.s - a.s; });
      var tiers = [[min, 0.5], [min * 0.8, 0.4], [min * 0.65, 0.35]], out = [];
      for (var ti = 0; ti < tiers.length; ti++) {
        var abs = tiers[ti][0], rel = cand.length ? cand[0].s * tiers[ti][1] : 0;
        var ok = cand.filter(function (x) { return x.s >= abs && x.s >= rel; });
        // Etwas Abwechslung: die besten 2n werden mit leichtem Zufall neu geordnet, danach gilt die Obergrenze je Kuenstler.
        var pool = ok.slice(0, n * 2).map(function (x) { return { r: x.r, s: x.s, k: x.s * (1 - rnd / 2 + rnd * Math.random()) }; });
        pool.sort(function (a, b) { return b.k - a.k; });
        var cnt = {};
        out = [];
        pool.forEach(function (x) {
          if (out.length >= n) return;
          var key = x.r.a[0] || x.r.id, isOwn = x.r.a.some(function (a) { return own[a]; });
          var cap = isOwn ? ownMax : per;
          if ((cnt[key] || 0) >= cap) return;
          cnt[key] = (cnt[key] || 0) + 1;
          out.push(x);
        });
        if (out.length >= want) break;
      }
      return out.map(function (x) { return { it: x.r.it, s: x.s }; });
    }
    // Name der Stilrichtung: das seltenste Genre, das in den meisten Titeln des Mixes vorkommt
    function label(ix, recs) {
      var cnt = {}, n = recs.length;
      if (!n) return '';
      recs.forEach(function (r) { var s = ix.byId[nid(r.Id)]; if (s) s.g.forEach(function (g) { cnt[g] = (cnt[g] || 0) + 1; }); });
      var best = '', bestV = 0;
      Object.keys(cnt).forEach(function (g) {
        var cov = cnt[g] / n;
        if (cov < 0.5 || ix.idf[g] < 0.7) return;
        var v = cov * ix.idf[g];
        if (v > bestV) { bestV = v; best = g; }
      });
      if (!best) return '';
      // Anzeigename wie im Original (Gross-/Kleinschreibung) aus dem ersten Titel mit diesem Genre
      for (var i = 0; i < recs.length; i++) {
        var found = (recs[i].Genres || []).filter(function (x) { return norm(x) === best; })[0];
        if (found) return found;
      }
      return best;
    }
    return { build: build, profile: profile, score: score, similar: similar, label: label, norm: norm };
  })();

  var Taste = (function () {
    var ix = null, loadP = null, TTL = 30 * 60000, MAX = 6000, PAGE = 1500, genreName = {};
    function songPages(libIds) {
      var ids = libIds && libIds.length ? libIds : [null];
      return Promise.all(ids.map(function (lib) {
        function params(start, limit) {
          var p = { IncludeItemTypes: 'Audio', Recursive: true, Fields: 'Genres,ParentId', StartIndex: start, Limit: limit, SortBy: 'SortName' };
          if (lib) p.ParentId = lib;
          return p;
        }
        return getItems(params(0, PAGE)).then(function (first) {
          var out = first.items.slice(), total = Math.min(first.total, MAX);
          var starts = [];
          for (var s = PAGE; s < total; s += PAGE) starts.push(s);
          return starts.reduce(function (p, s) {
            return p.then(function () { return getItems(params(s, Math.min(PAGE, total - s))).then(function (r) { out = out.concat(r.items); }); });
          }, Promise.resolve()).then(function () { return out; });
        });
      })).then(function (lists) { return [].concat.apply([], lists); });
    }
    function plItems(id) {
      return call('GET', 'Playlists/' + id + '/Items', { UserId: uid(), Limit: 1500, Fields: '', EnableImages: false, EnableUserData: false }).then(function (r) {
        return ((r && r.Items) || []).map(function (x) { return x.Id; });
      }, function () { return []; });
    }
    function load(force) {
      if (!force && ix && Date.now() - ix.at < TTL && ix.uid === uid()) return Promise.resolve(ix);
      if (loadP) return loadP;
      loadP = Promise.all([loadLibraries().then(function (libs) { return musicLibIds(libs); }, function () { return []; }), loadPlaylists(false).then(null, function () { return []; })]).then(function (r) {
        return songPages(r[0]).then(function (songs) {
          var pls = (r[1] || []).filter(function (p) { var n = p.item.ChildCount; return n == null || n >= 3; }).slice(0, 30);
          var lists = [], i = 0;
          function worker() {
            if (i >= pls.length) return Promise.resolve();
            var p = pls[i++];
            return plItems(p.id).then(function (ids) { lists.push({ key: nid(p.id), ids: ids }); }).then(worker);
          }
          return Promise.all([worker(), worker(), worker(), worker()]).then(function () {
            var liked = songs.filter(function (s) { return s.UserData && s.UserData.IsFavorite; }).map(function (s) { return s.Id; });
            if (liked.length >= 3) lists.push({ key: 'liked', ids: liked });
            ix = TasteCore.build(songs, lists);
            ix.uid = uid();
            return ix;
          });
        });
      }).then(function (v) { loadP = null; return v; }, function (e) { loadP = null; throw e; });
      return loadP;
    }
    // Aehnliche Titel zu den gegebenen Ausgangstitel-IDs; Fehler/leer: null (Aufrufer nimmt dann Jellyfins Sofortmix)
    function similar(seedIds, opts) {
      var timeout = new Promise(function (res) { setTimeout(function () { res(null); }, opts && opts.wait || 12000); });
      return Promise.race([load().then(function (index) {
        if (index.N < 25) return null;
        var list = TasteCore.similar(index, seedIds, opts);
        return list.map(function (x) { return x.it; });
      }, function () { return null; }), timeout]);
    }
    function labelOf(tracks) { return ix ? TasteCore.label(ix, tracks) : ''; }
    // Ausgangstitel eines Kuenstlers: seine meistgehoerten bzw. ersten Titel
    function artistSeeds(artistId, max) {
      return load().then(function (index) {
        var out = [];
        index.recs.forEach(function (r) { if ((r.it.ArtistItems || []).some(function (a) { return nid(a.Id) === nid(artistId); })) out.push(r); });
        out.sort(function (a, b) { return ((b.it.UserData && b.it.UserData.PlayCount) || 0) - ((a.it.UserData && a.it.UserData.PlayCount) || 0); });
        return out.slice(0, max || 10).map(function (r) { return r.it.Id; });
      }, function () { return []; });
    }
    return { load: load, similar: similar, label: labelOf, artistSeeds: artistSeeds, core: TasteCore, ready: function () { return !!ix; } };
  })();

  /* ---------- Downloads: Titel auf das Gerät laden (Verwaltung in der Spotify-Ansicht) ---------- */
  var OFF = (function () {
    var D = MLOff;
    var have = {};          // Titel-ID -> Größe in Byte (geladene Titel)
    var single = {};        // Titel-ID -> true, wenn einzeln geladen
    var colls = {};         // Schlüssel -> Sammlung
    var jobs = {};          // Schlüssel -> laufender Auftrag
    var listeners = [];
    var loadP = null, persistAsked = false;
    var CONC = 2;

    function emit() { listeners.slice().forEach(function (f) { try { f(); } catch (e) { /* Zuhörer darf nichts blockieren */ } }); }
    function available() { return !!(window.indexedDB && window.fetch); }
    function load(force) {
      if (loadP && !force) return loadP;
      loadP = Promise.all([D.allTracks(), D.allColls()]).then(function (r) {
        have = {}; single = {}; r[0].forEach(function (x) { have[x.id] = x.size || 0; if (x.explicit) single[x.id] = true; });
        colls = {}; r[1].forEach(function (c) { colls[c.key] = c; });
        emit();
        setTimeout(backfillLyrics, 4000);
      }, function () { loadP = null; });
      return loadP;
    }
    function quality() { try { return window.localStorage.getItem('ml.offq') === 'mp3' ? 'mp3' : 'orig'; } catch (e) { return 'orig'; } }
    function setQuality(q) { try { window.localStorage.setItem('ml.offq', q === 'mp3' ? 'mp3' : 'orig'); } catch (e) { /* nur für diese Sitzung */ } emit(); }

    function audioUrl(id, q) {
      var c = ML.client();
      if (q === 'mp3') return c.getUrl('Audio/' + id + '/stream.mp3', { audioCodec: 'mp3', audioBitRate: 192000, api_key: c.accessToken() });
      return c.getUrl('Audio/' + id + '/stream', { static: true, api_key: c.accessToken() });
    }
    function canPlayMime(mime) {
      if (!mime || /octet-stream|^text\//i.test(mime)) return true;
      try { return document.createElement('audio').canPlayType(mime) !== ''; } catch (e) { return true; }
    }
    // Lädt eine Audiodatei als Blob. Kann das Gerät das Original-Format nicht abspielen (z. B. FLAC/Opus auf älteren Geräten), wird MP3 geladen.
    function fetchAudio(id, q, signal, onBytes) {
      return fetch(audioUrl(id, q), { signal: signal, credentials: 'omit' }).then(function (res) {
        if (!res.ok) throw new Error('http ' + res.status);
        var mime = String(res.headers.get('content-type') || '').split(';')[0].trim();
        if (q === 'orig' && !canPlayMime(mime)) {
          try { res.body && res.body.cancel(); } catch (e) { /* egal */ }
          return fetchAudio(id, 'mp3', signal, onBytes);
        }
        var total = +res.headers.get('content-length') || 0;
        if (!res.body || !res.body.getReader) return res.blob().then(function (b) { return { blob: b, mime: mime, q: q }; });
        var reader = res.body.getReader(), chunks = [], got = 0;
        function pump() {
          return reader.read().then(function (r) {
            if (r.done) return { blob: new Blob(chunks, { type: mime || 'audio/mpeg' }), mime: mime, q: q };
            chunks.push(r.value); got += r.value.length;
            if (onBytes) onBytes(got, total);
            return pump();
          });
        }
        return pump();
      });
    }
    function metaOf(tr) {
      return {
        id: nid(tr.Id), name: tr.Name || '', artist: firstArtist(tr) || '', album: tr.Album || '', albumId: tr.AlbumId ? nid(tr.AlbumId) : '',
        ticks: tr.RunTimeTicks || 0, year: tr.ProductionYear || 0, index: tr.IndexNumber || 0,
        artists: (tr.Artists || []).slice(0, 8), albumArtist: tr.AlbumArtist || '', genres: (tr.Genres || []).slice(0, 8), disc: tr.ParentIndexNumber || 0
      };
    }
    function fetchCover(tr, signal) {
      var pr = pairOf(tr);
      if (!pr) return Promise.resolve(null);
      var c = ML.client();
      var url = c.getUrl('Items/' + pr[0] + '/Images/Primary', { maxWidth: 400, quality: 85, tag: pr[1], api_key: c.accessToken() });
      return fetch(url, { signal: signal, credentials: 'omit' }).then(function (r) { return r.ok ? r.blob() : null; }).then(function (b) { return b && b.size ? { key: nid(pr[0]), blob: b } : null; }, function () { return null; });
    }
    // Songtext wie ihn die Player-Ansicht braucht: { lines: [{ t, text }], synced } oder null (keiner vorhanden); undefined = nicht ermittelbar.
    function fetchLyrics(id) {
      return call('GET', 'Audio/' + id + '/Lyrics').then(function (r) {
        return lyricsFrom(r);
      }, function (err) { return err && err.status === 404 ? null : undefined; });
    }
    function lyricsOf(id) { return D.getTrack(id).then(function (r) { return r && r.lyrics ? lyricsFix(r.lyrics) : null; }, function () { return null; }); }
    // Bereits geladene Titel ohne gespeicherten Songtext: bei Verbindung im Hintergrund nachladen (einmal je Titel).
    var backfilled = false;
    function backfillLyrics() {
      if (backfilled || Net.offline() || !available()) return;
      backfilled = true;
      D.allTracks().then(function (all) {
        var todo = all.filter(function (x) { return !x.lyr; }).map(function (x) { return x.id; });
        function next() {
          if (!todo.length || Net.offline()) return Promise.resolve();
          var id = todo.shift();
          return fetchLyrics(id).then(function (ly) {
            if (ly === undefined) return;
            return D.updateTrack(id, { lyrics: ly, lyr: 1 });
          }).then(next, next);
        }
        return Promise.all([next(), next()]);
      }).then(null, function () { backfilled = false; });
    }
    function isQuota(e) { return !!e && (e.name === 'QuotaExceededError' || /quota/i.test(String(e.message || e))); }

    // Lädt die Titel; collMeta = { key, type, name, sub } (Sammlung) oder null (einzelne Titel). Gibt ein Versprechen auf { ok, failed, cancelled } zurück.
    function start(tracks, collMeta, jobName) {
      if (!available()) { toast(t('offUnsupported')); return Promise.resolve({ ok: 0, failed: 0, cancelled: false }); }
      var list = [], seen = {};
      (tracks || []).forEach(function (tr) { if (tr && ID_RE.test(String(tr.Id || '')) && !seen[nid(tr.Id)]) { seen[nid(tr.Id)] = 1; list.push(tr); } });
      if (!list.length) return Promise.resolve({ ok: 0, failed: 0, cancelled: false });
      var key = collMeta ? collMeta.key : 'tracks:' + Date.now();
      if (jobs[key]) return jobs[key].promise;
      if (!persistAsked) { persistAsked = true; D.persist(); }
      var ctrl = typeof AbortController === 'function' ? new AbortController() : { signal: undefined, abort: function () { } };
      var job = { key: key, name: jobName || (collMeta && collMeta.name) || '', total: list.length, done: 0, failed: 0, part: 0, cancelled: false, ctrl: ctrl, noSpace: false };
      jobs[key] = job;
      var q = quality(), coverMemo = {}, existing = [], next = 0, idsAll = list.map(function (x) { return nid(x.Id); });
      var firstCover = '';
      var coll = null;
      if (collMeta) {
        var prev = colls[collMeta.key];
        coll = { key: collMeta.key, type: collMeta.type, name: collMeta.name, sub: collMeta.sub || '', ids: idsAll, coverKey: '', href: collMeta.href || (prev && prev.href) || '', added: prev ? prev.added : Date.now() };
        var pr0 = pairOf(list[0]);
        if (pr0) coll.coverKey = nid(pr0[0]);
        colls[collMeta.key] = coll;
        D.saveColl(coll).then(null, function () { /* wird am Ende erneut versucht */ });
      }
      emit();
      function oneTrack(tr) {
        var id = nid(tr.Id);
        if (have[id] != null) { existing.push(id); job.done++; emit(); return Promise.resolve(); }
        return fetchAudio(tr.Id, q, ctrl.signal, function (got, total) { job.part = total ? got / total : 0; }).then(function (a) {
          var pr = pairOf(tr), cp = Promise.resolve(null);
          if (pr) { var ck = nid(pr[0]); cp = coverMemo[ck] || (coverMemo[ck] = fetchCover(tr, ctrl.signal)); }
          return Promise.all([cp, fetchLyrics(tr.Id)]).then(function (both) {
            var cv = both[0], ly = both[1];
            var meta = metaOf(tr);
            if (ly !== undefined) { meta.lyrics = ly; meta.lyr = 1; }
            meta.mime = a.mime; meta.q = a.q; meta.added = Date.now();
            if (collMeta) meta.colls = [collMeta.key]; else meta.explicit = true;
            return D.saveTrack(meta, a.blob, cv ? cv.key : '', cv ? cv.blob : null).then(function () {
              have[id] = a.blob.size; job.done++; job.part = 0; emit();
            });
          });
        }).then(null, function (e) {
          if (job.cancelled || (e && e.name === 'AbortError')) return;
          if (isQuota(e)) { job.noSpace = true; job.cancelled = true; try { ctrl.abort(); } catch (e2) { /* egal */ } return; }
          job.failed++; job.done++; emit();
        });
      }
      function worker() {
        if (job.cancelled || next >= list.length) return Promise.resolve();
        var tr = list[next++];
        return oneTrack(tr).then(worker);
      }
      var workers = [];
      for (var w = 0; w < CONC; w++) workers.push(worker());
      job.promise = Promise.all(workers).then(function () {
        var fin = existing.length ? D.linkTracks(existing, collMeta ? collMeta.key : null, !collMeta) : Promise.resolve();
        return fin.then(null, function () { /* wird beim nächsten Laden ergänzt */ });
      }).then(function () {
        delete jobs[key];
        return load(true);
      }).then(function () {
        if (job.noSpace) toast(t('offNoSpace'));
        else if (!job.cancelled) toast(job.failed ? t('offDoneSome', job.total - job.failed, job.failed) : t('offDone', job.total));
        emit();
        return { ok: job.total - job.failed, failed: job.failed, cancelled: job.cancelled };
      });
      return job.promise;
    }

    function cancel(key) { var j = jobs[key]; if (!j) return; j.cancelled = true; try { j.ctrl.abort(); } catch (e) { /* egal */ } emit(); }
    function cancelAll() { Object.keys(jobs).forEach(cancel); }
    function removeColl(key) { cancel(key); return D.removeColl(key).then(function () { return load(true); }); }
    function removeTrack(id) { return D.removeTrack(id).then(function () { return load(true); }); }
    function clearAll() { cancelAll(); return D.clearAll().then(function () { return load(true); }); }

    // Zustand einer Sammlung: none | busy | partial | done
    function collState(key) {
      if (jobs[key]) return 'busy';
      var c = colls[key];
      if (!c) return 'none';
      return c.ids.every(function (id) { return have[id] != null; }) ? 'done' : 'partial';
    }
    function progressOf(key) {
      var j = jobs[key];
      return j ? { done: j.done, total: j.total, fraction: Math.min(1, (j.done + (j.part || 0)) / Math.max(1, j.total)) } : null;
    }
    // Wurde eine geladene Playlist geändert (Titel dazu/weg), zieht der Download nach.
    function syncIfDownloaded(meta, tracks) {
      var c = colls[meta.key];
      if (!c || jobs[meta.key] || !available() || Net.offline()) return;
      var ids = tracks.map(function (x) { return nid(x.Id); });
      var same = ids.length === c.ids.length && ids.every(function (id, i) { return c.ids[i] === id; });
      if (same) return;
      var inNew = {}; ids.forEach(function (id) { inNew[id] = 1; });
      var removed = c.ids.filter(function (id) { return !inNew[id]; });
      var wasDone = c.ids.every(function (id) { return have[id] != null; });
      var drop = removed.length ? D.dropFromColl(removed, meta.key) : Promise.resolve();
      drop.then(null, function () { /* nächstes Mal */ }).then(function () {
        if (!wasDone) { c.ids = ids; return D.saveColl(c).then(function () { return load(true); }); }
        return start(tracks, meta);   // lädt nur, was fehlt, und schreibt die Sammlung neu
      });
    }
    function listen(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }

    return {
      available: available, load: load, listen: listen, quality: quality, setQuality: setQuality,
      has: function (id) { return have[nid(id)] != null; },
      isSingle: function (id) { return !!single[nid(id)]; },
      collState: collState, coll: function (key) { return colls[key] || null; }, allColls: function () { return Object.keys(colls).map(function (k) { return colls[k]; }); },
      progress: progressOf, jobList: function () { return Object.keys(jobs).map(function (k) { return jobs[k]; }); },
      sizeOf: function (id) { return have[nid(id)] || 0; },
      downloadColl: function (meta, tracks) { return start(tracks, meta); },
      downloadTrack: function (tr) { return start([tr], null, tr.Name); },
      removeColl: removeColl, removeTrack: removeTrack, clearAll: clearAll, cancel: cancel,
      syncIfDownloaded: syncIfDownloaded, lyricsOf: lyricsOf, backfillLyrics: backfillLyrics,
      usage: D.usage, estimate: D.estimate, persisted: D.persisted, persist: D.persist, tracks: D.allTracks
    };
  })();
  OFF.load();

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
    if (Net.offline() || track.__local) {   // ohne Server: nur, was auf dem Geraet geht
      openMenu({ title: track.Name, subtitle: firstArtist(track), cover: itemImg(track, 120) }, [
        offTrackEntry(track),
        { icon: 'speed', label: t('mSpeed'), run: openSpeed }
      ]);
      return;
    }
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
      offTrackEntry(track),
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
    var subEl = el('div', 'ml-track-sub');
    var bd = offBadge(); bd.hidden = !OFF.has(track.Id); subEl.appendChild(bd);
    if (sub) subEl.appendChild(document.createTextNode(sub));
    tx.appendChild(subEl);
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
    function play() { playIds(idsOf(ctx.tracks), i, { ctx: ctxKeyOf(ctx) }); }
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
    var subEl = el('div', 'ml-track-sub');
    var bd = offBadge(); bd.hidden = !OFF.has(track.Id); subEl.appendChild(bd);
    if (sub) subEl.appendChild(document.createTextNode(sub));
    main.appendChild(subEl);

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
    function play() { playIds(idsOf(ctx.tracks), i, { ctx: ctxKeyOf(ctx) }); }
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
      var key = tracks[i].AlbumId || tracks[i].__cover || tracks[i].Id;
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
    if (ctx.kind === 'mix') return mosaic(ctx.tracks, cls);
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
    var title = ctx.kind === 'liked' ? t('liked') : ctx.kind === 'album' ? ctx.album.Name : ctx.kind === 'mix' ? ctx.mix.title : pl.item.Name;
    var sub = ctx.kind === 'playlist' ? t('ownerLine', info.ownerName || '') : ctx.kind === 'album' ? t('albumLine', albumArtistLine(ctx.album)) : ctx.kind === 'mix' ? ctx.mix.label : t('playlist');
    var entries = [];
    var jamOk = ML.config().jamEnabled;

    if (ctx.offline) {   // ohne Server: nur Abspielen und Entfernen des Downloads
      var mk = offMetaOf(ctx);
      entries = [{ hidden: !mk, icon: 'del', label: t('offRemove'), danger: true, run: function () {
        confirmSheet(t('offRemoveTitle'), t('offRemoveText', mk.name), t('offRemove'), true).then(function (yes) {
          if (yes) OFF.removeColl(mk.key).then(function () { toast(t('offRemoved')); leaveDetail(); });
        });
      } }];
    } else if (ctx.kind === 'playlist') {
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
    if (!ctx.offline) entries.unshift(offLocalEntry(ctx));
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
        forYouToday: 'Für heute empfohlen', forYouSub: 'Passend zu dem, was du zuletzt gehört hast', forUser: 'Für {0}', forUserSub: 'Deine Mixe – passend zu deinem Geschmack', stations: 'Empfohlene Sender', stationsSub: 'Radio zu Künstlern, die du magst',
        topMixes: 'Deine Top-Mixtapes', topMixesSub: 'Zu deinen meistgehörten Künstlern', likedAlbums: 'Alben mit Songs, die dir gefallen', likedAlbumsSub: 'Mit deinen Lieblingssongs', mixN: 'Mix {0}', mixLbl: 'Mix', mixtapeLbl: 'Mixtape', radioLbl: 'Radio', mixtapeOf: '{0} Mixtape', mixtapeSub: 'Ausgehend von „{0}“', andMore: ' und mehr', autoplayIsOn: 'Autoplay ist an', autoplayIsOff: 'Autoplay ist aus', autoQueue: 'Empfohlen – Autoplay', eqTitle: 'Equalizer', eqSub: 'Wirkt auf Musik, die in diesem Browser abgespielt wird. Die Bearbeitung läuft auf deinem Gerät, nicht auf dem Server. Änderungen sind nach dem Loslassen sofort zu hören.', eqPresets: 'Voreinstellungen', eq_flat: 'Flach', eq_music: 'Musik', eq_sermon: 'Predigt', eq_audiobook: 'Hörbuch', eq_bass: 'Bass', eq_treble: 'Höhen', eq_custom: 'Eigene', eqDeess: 'De-Esser', eqDeessSub: 'Dämpft scharfe S-Laute bei Sprache.', eqDenoise: 'Rauschunterdrückung', eqDenoiseSub: 'Automatisch, für Sprache und alte Aufnahmen. Bei Musik besser aus.', eqReset: 'Zurücksetzen', eqApply: 'Übernehmen', eqApplied: 'Equalizer übernommen', eqIOS: 'Auf iPhone und iPad ist der Equalizer im Browser nicht verfügbar: Jellyfin selbst vermeidet dort Web Audio, weil es Tempo und Tonhöhe der Wiedergabe stört.', eqUnsupported: 'Dieser Browser unterstützt Web Audio nicht.', eqRemote: 'Gerade läuft die Musik auf einem anderen Gerät. Der Equalizer wirkt erst, wenn du hier abspielst.', eqNoDsp: 'Rauschunterdrückung und De-Esser konnten in diesem Browser nicht gestartet werden.',
        jellyfinHome: 'Jellyfin-Startseite', allLibs: 'Alle Bibliotheken', allLibsHint: 'Zurück zu Jellyfin: Filme, Serien und mehr', appMenu: 'Menü', emptyPlaylist: 'Diese Playlist ist leer.', addFirstSongs: 'Titel hinzufügen',
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
        deviceSwitched: 'Wiedergabe auf „{0}“', deviceFailed: 'Wechsel fehlgeschlagen', deviceSwitching: 'Wird übertragen …', remoteIdle: 'Nichts wird abgespielt', remoteIdleHint: 'Verbunden mit „{0}“ – zum Wechseln Geräte antippen', devicesLoading: 'Suche Geräte …',
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
        forYouToday: 'Recommended for today', forYouSub: 'Based on what you listened to lately', forUser: 'Made for {0}', forUserSub: 'Your mixes – picked for your taste', stations: 'Recommended stations', stationsSub: 'Radio for artists you like',
        topMixes: 'Your top mixtapes', topMixesSub: 'For your most played artists', likedAlbums: 'Albums with songs you like', likedAlbumsSub: 'With your liked songs', mixN: 'Mix {0}', mixLbl: 'Mix', mixtapeLbl: 'Mixtape', radioLbl: 'Radio', mixtapeOf: '{0} mixtape', mixtapeSub: 'Starting from "{0}"', andMore: ' and more', autoplayIsOn: 'Autoplay is on', autoplayIsOff: 'Autoplay is off', autoQueue: 'Recommended – Autoplay', eqTitle: 'Equalizer', eqSub: 'Applies to music played in this browser. Processing runs on your device, not on the server. Changes are audible as soon as you let go.', eqPresets: 'Presets', eq_flat: 'Flat', eq_music: 'Music', eq_sermon: 'Sermon', eq_audiobook: 'Audiobook', eq_bass: 'Bass', eq_treble: 'Treble', eq_custom: 'Custom', eqDeess: 'De-esser', eqDeessSub: 'Tames harsh S sounds in speech.', eqDenoise: 'Noise reduction', eqDenoiseSub: 'Automatic, for speech and old recordings. Better off for music.', eqReset: 'Reset', eqApply: 'Apply', eqApplied: 'Equalizer applied', eqIOS: 'The equalizer is not available in the browser on iPhone and iPad: Jellyfin itself avoids Web Audio there because it disturbs playback speed and pitch.', eqUnsupported: 'This browser does not support Web Audio.', eqRemote: 'Music is playing on another device. The equalizer only takes effect when you play here.', eqNoDsp: 'Noise reduction and de-esser could not be started in this browser.',
        jellyfinHome: 'Jellyfin home', allLibs: 'All libraries', allLibsHint: 'Back to Jellyfin: movies, shows and more', appMenu: 'Menu', emptyPlaylist: 'This playlist is empty.', addFirstSongs: 'Add tracks',
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
        deviceSwitched: 'Playing on "{0}"', deviceFailed: 'Could not switch', deviceSwitching: 'Switching …', remoteIdle: 'Nothing is playing', remoteIdleHint: 'Connected to "{0}" - tap devices to switch', devicesLoading: 'Looking for devices …',
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

  // Direkt aus einer Kachel abspielen (Computer-Ansicht: gruener Knopf beim Daruberfahren, wie bei Spotify).
  function playItemQuick(item) {
    var p;
    if (item.Type === 'Playlist') p = loadPlaylistTracks(item.Id);
    else if (item.Type === 'MusicAlbum') p = loadAlbumTracks(item.Id);
    else if (item.Type === 'MusicArtist') p = itemsOf({ ArtistIds: item.Id, IncludeItemTypes: 'Audio', Recursive: true, SortBy: 'PlayCount,SortName', SortOrder: 'Descending,Ascending', Limit: 100 });
    else if (item.Type === 'Audio') p = Promise.resolve([item]);
    else p = Promise.resolve([]);
    var key = item.Type === 'Playlist' ? nid(item.Id) : item.Type === 'MusicAlbum' ? 'album:' + nid(item.Id) : '';
    return p.then(function (tracks) {
      var ids = idsOf(tracks);
      if (ids.length) return playIds(ids, 0, { ctx: key });
      toast(t('nothingYet')); return false;
    }, function () { toast(t('playFailed')); return false; });
  }

  function tile(opts) {
    var b = btn('ml-tile' + (opts.round ? ' ml-round-tile' : ''));
    if (opts.ctx) b.dataset.ctx = nid(opts.ctx);
    var coverNode = opts.coverEl || cover(opts.img, 'ml-tile-cover' + (opts.round ? ' ml-round' : ''));
    if (opts.play) {
      var art = el('div', 'ml-tile-art');
      art.appendChild(coverNode);
      var pb = el('span', 'ml-tile-play');
      pb.setAttribute('role', 'button');
      pb.setAttribute('aria-label', t('play'));
      pb.appendChild(icon('play'));
      pb.addEventListener('click', function (e) { e.stopPropagation(); e.preventDefault(); opts.play(); });
      art.appendChild(pb);
      b.appendChild(art);
    } else b.appendChild(coverNode);
    b.appendChild(el('div', 'ml-tile-title', opts.title));
    if (opts.sub) b.appendChild(el('div', 'ml-tile-sub', opts.sub));
    b.addEventListener('click', opts.onClick);
    return b;
  }

  function itemTile(item) {
    var round = item.Type === 'MusicArtist';
    var sub = item.Type === 'MusicAlbum' ? albumArtistLine(item) : item.Type === 'MusicArtist' ? t('artist') : item.Type === 'Audio' ? firstArtist(item) : '';
    var key = item.Type === 'MusicAlbum' ? 'album:' + nid(item.Id) : '';
    return tile({
      ctx: key, title: item.Name, sub: sub, round: round, img: itemImg(item, 300),
      onClick: function () { go(hrefFor(item)); },
      play: function () { pressCtx(key, function () { return playItemQuick(item); }); }
    });
  }

  function playlistTile(pl) {
    var c = playlistCover(pl, 'ml-tile-cover', 300);
    var sub = pl.info.sharedWithMe && !pl.info.isOwner ? t('byOwner', pl.info.ownerName || '') : (pl.item.ChildCount != null ? countText(pl.item.ChildCount) : t('playlist'));
    return tile({ ctx: pl.id, title: pl.item.Name, sub: sub, coverEl: c, onClick: function () { go(hrefFor(pl.item)); }, play: function () { pressCtx(nid(pl.id), function () { return playItemQuick(pl.item); }); } });
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
        { hidden: !OFF.available(), icon: 'download_circle', label: t('offMenu'), run: openDownloads },
        { icon: 'wifi_off', label: Net.forced() ? t('offModeOff') : t('offModeOn'), run: function () { OFFV.toggleForced(); } },
        { icon: 'equalizer', label: t('eqTitle'), run: openEqualizer },
        { icon: 'radio', label: t(autoplayOn() ? 'autoplayIsOn' : 'autoplayIsOff'), run: function () { setAutoplay(!autoplayOn()); toast(t(autoplayOn() ? 'autoplayIsOn' : 'autoplayIsOff')); } },
        { icon: 'album', label: t('mClassic'), run: function () { setClassic(true); } },
        { icon: 'home', label: t('jellyfinHome'), run: function () { goJellyfin('#/home'); } },
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
    if (Net.offline()) { OFFV.renderHome(host, seq); return; }
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

  function quickTile(titleText, coverEl, onClick, ctxId) {
    var b = btn('ml-quick');
    if (ctxId) b.dataset.ctx = nid(ctxId);
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
      var r = fillMusic(body, seq, libs, pls, chip === 'all');
      markContext();
      return r;
    }
    var sig = null;
    if (pre) { sig = libSig(pre.libs) + '#' + plSig(pre.pls); body.textContent = ''; paint(pre.libs, pre.pls); }
    else { body.textContent = ''; body.appendChild(loaderEl()); }
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

  /* ---------- Startseite wie bei Spotify: Empfehlungen, Mixe, Sender ---------- */
  // Grundlage der Empfehlungen: Sofortmixe (Jellyfin) zu zufaellig gewaehlten, zuletzt gehoerten Titeln und Lieblingssongs.
  // Kurz zwischengespeichert, damit die Reihen beim Zurueckkehren nicht staendig wechseln.
  var recCache = { at: 0, uid: '', data: null };
  function loadRecs(playedP, likedP) {
    if (recCache.uid === uid() && recCache.data && Date.now() - recCache.at < 20 * 60000) return Promise.resolve(recCache.data);
    return Promise.all([playedP, likedP]).then(function (res) {
      var played = res[0] || [], liked = res[1] || [];
      var seeds = [], used = {};
      function pick(list, n) {
        var pool = list.filter(function (x) { return x && ID_RE.test(String(x.Id || '')) && !used[nid(x.Id)]; });
        for (var k = 0; k < n && pool.length; k++) {
          var i = Math.floor(Math.random() * pool.length), x = pool.splice(i, 1)[0];
          used[nid(x.Id)] = 1; seeds.push(x);
        }
      }
      pick(played.slice(0, 12), 2);
      pick(liked, seeds.length ? 1 : 3);
      if (seeds.length < 3) pick(played.slice(12), 3 - seeds.length);
      if (!seeds.length) return null;
      return Promise.all(seeds.map(function (sd) { return loadSongMix(sd.Id, 30).catch(function () { return []; }); })).then(function (lists) {
        var recent = {};
        played.slice(0, 10).forEach(function (x) { recent[nid(x.Id)] = 1; });
        function gather(skipRecent) {
          var out = [], seen = {};
          seeds.forEach(function (sd) { seen[nid(sd.Id)] = 1; });
          for (var n = 0; n < 30 && out.length < 20; n++) {
            lists.forEach(function (l) {
              var x = l[n];
              if (!x || seen[nid(x.Id)] || (skipRecent && recent[nid(x.Id)]) || out.length >= 20) return;
              seen[nid(x.Id)] = 1; out.push(x);
            });
          }
          return out;
        }
        var today = gather(true);
        if (today.length < 6) today = gather(false);
        var data = { seeds: seeds, lists: lists, today: today };
        if (today.length) recCache = { at: Date.now(), uid: uid(), data: data };
        return data;
      });
    });
  }

  function artistsLine(tracks) {
    var seen = {}, names = [];
    tracks.forEach(function (x) { var a = firstArtist(x); if (a && !seen[a] && names.length < 3) { seen[a] = 1; names.push(a); } });
    return names.length ? names.join(', ') + t('andMore') : '';
  }
  // Titel eines Mixes / Senders / Mixtapes. Alle Stellen (Kachel, Seite, Abspielen) benutzen dieselbe Liste (mixStore).
  function mixTracksOf(kind, id) {
    var key = mixKey(kind, id), c = mixStore[key];
    if (c && c.tracks && c.tracks.length) return Promise.resolve(c.tracks);
    var p;
    if (kind === 'mix') {
      p = Promise.all([loadItem(id, ''), loadSongMix(id, 41)]).then(function (res) {
        var seed = res[0];
        return (seed ? [seed] : []).concat(res[1].filter(function (x) { return nid(x.Id) !== nid(id); }).slice(0, 40));
      });
    } else if (kind === 'radio') {
      p = Taste.artistSeeds(id, 10).then(function (seeds) {
        if (!seeds.length) return null;
        return Taste.similar(seeds, { n: 60, own: 14, keepSeeds: true });
      }).then(function (list) {
        if (list && list.length >= 8) return list;
        return call('GET', 'Artists/' + id + '/InstantMix', { UserId: uid(), Limit: 60 }).then(function (r) { return (r && r.Items) || []; });
      });
    } else {
      p = loadItem(id, '').then(function (seed) {
        return loadSongMix(id, 60, { own: 10 }).then(function (list) {
          return (seed ? [seed] : []).concat(list.filter(function (x) { return nid(x.Id) !== nid(id); }));
        });
      });
    }
    return p.then(function (items) {
      var tracks = (items || []).filter(function (i) { return i && ID_RE.test(String(i.Id || '')); });
      if (tracks.length) mixStore[key] = { tracks: tracks, n: (c && c.n) || 0 };
      return tracks;
    });
  }
  function playMix(kind, id, failKey) {
    var key = mixKey(kind, id);
    return mixTracksOf(kind, id).then(function (tracks) {
      if (!tracks.length) { toast(t(failKey || 'radioFailed')); return false; }
      return playIds(tracks.map(function (x) { return x.Id; }), 0, { ctx: key });
    }, function () { toast(t(failKey || 'radioFailed')); return false; });
  }
  // Untertitel eines Mixes: Stilrichtung und Kuenstler
  function mixSub(tracks) {
    var lbl = Taste.label(tracks), line = artistsLine(tracks);
    return lbl ? (line ? lbl + ' · ' + line : lbl) : line;
  }
  function trackShelfTile(tr, ids, i) {
    function go1() { playIds(ids, i); }
    return tile({ title: tr.Name, sub: firstArtist(tr), img: itemImg(tr, 300), onClick: go1, play: go1 });
  }

  // Mixe, Sender und Mixtapes: Antippen oeffnet erst die Titelliste (eigene Seite), der gruene Knopf auf der Kachel spielt direkt.
  var mixStore = {};   // 'art|id' -> { tracks, n }: dieselben Titel wie auf der Kachel
  var mixTitles = {};  // Schluessel -> Anzeigename (fuer "Wiedergabe aus Mix")
  function mixKey(kind, id) { return kind + ':' + nid(id); }
  function mixHash(kind, id, n, name) {
    return homeHash() + (state.libraryId ? '&' : '?') + 'mlview=mix&mlkind=' + kind + '&mlid=' + id + '&mln=' + (n || 0) + (name ? '&mlt=' + encodeURIComponent(name) : '');
  }
  function openMix(kind, id, n, name) { ensureLibrary().then(function () { go(mixHash(kind, id, n, name)); }); }

  function mixTile(n, tracks) {
    var ids = tracks.map(function (x) { return x.Id; });
    var seed = tracks[0], key = mixKey('mix', seed.Id);
    mixStore[key] = { tracks: tracks, n: n };
    mixTitles[key] = t('mixN', n);
    var holder = cover(null, 'ml-tile-cover');
    var pairs = pairsOf(tracks);
    if (pairs.length) fillCover(holder, pairs);
    return tile({
      ctx: key, title: t('mixN', n), sub: mixSub(tracks), coverEl: holder,
      onClick: function () { openMix('mix', seed.Id, n); },
      play: function () { pressCtx(key, function () { return playIds(ids, 0, { ctx: key }); }); }
    });
  }
  function radioTile(artist, track) {
    var key = mixKey('radio', artist.Id);
    mixTitles[key] = artist.Name;
    return tile({
      ctx: key, title: artist.Name, sub: t('radioLbl'), round: true, img: itemImg(track, 300),
      onClick: function () { openMix('radio', artist.Id, 0, artist.Name); },
      play: function () { pressCtx(key, function () { return playMix('radio', artist.Id); }); }
    });
  }
  function mixtapeTile(artistName, track) {
    var key = mixKey('mixtape', track.Id);
    mixTitles[key] = t('mixtapeOf', artistName);
    return tile({
      ctx: key, title: t('mixtapeOf', artistName), sub: t('mixtapeSub', track.Name), img: itemImg(track, 300),
      onClick: function () { openMix('mixtape', track.Id, 0, artistName); },
      play: function () { pressCtx(key, function () { return playMix('mixtape', track.Id); }); }
    });
  }

  // Seite eines Mixes / Senders / Mixtapes: Hero mit Play, darunter die Titel.
  function showMixDetail(host, seq, kind, id, n, name) {
    var key = mixKey(kind, id);
    if (Net.offline()) {
      OFFV.showDetail(host, seq, 'mix', id, { kind: kind, id: id, key: key, name: name || '', label: kind === 'mix' ? t('mixLbl') : kind === 'radio' ? t('radioLbl') : t('mixtapeLbl') });
      return;
    }
    renderDetailLoading(host);
    function loadTracks() {
      var c = mixStore[key];
      if (c && c.tracks && c.tracks.length) return Promise.resolve({ tracks: c.tracks, n: c.n || n });
      return mixTracksOf(kind, id).then(function (tracks) { return { tracks: tracks, n: n }; });
    }
    function start() {
      loadTracks().then(function (res) {
        if (seq !== state.view) return;
        if (!res.tracks.length) throw new Error('empty');
        mixStore[key] = { tracks: res.tracks, n: res.n };
        var title = kind === 'mix' ? t('mixN', res.n || 1) : kind === 'radio' ? (name || t('radioLbl')) : t('mixtapeOf', name || '');
        mixTitles[key] = title;
        var label = kind === 'mix' ? t('mixLbl') : kind === 'radio' ? t('radioLbl') : t('mixtapeLbl');
        var ctx = makeDetailCtx(host, { kind: 'mix', mix: { kind: kind, id: id, key: key, title: title, label: label, name: name || '', sub: mixSub(res.tracks) }, tracks: res.tracks, canEdit: false });
        ctx.reload = function () { delete mixStore[key]; start(); };
        buildDetail(host, ctx);
      }, function () { if (seq === state.view) renderDetailFailed(host, function () { renderDetailLoading(host); start(); }); });
    }
    start();
  }

  function subShelf(host, title, sub, tiles, cls) {
    var box = shelf(host, title, tiles, cls);
    if (box && sub) box.insertBefore(el('div', 'ml-shelf-sub', sub), box.querySelector('.ml-shelf-row'));
    return box;
  }

  // Fuellt die Reihen "Fuer heute empfohlen", "Fuer <Name>", "Empfohlene Sender", "Deine Top-Mixtapes" und "Alben mit Songs, die dir gefallen".
  function fillForYou(slots, seq, data) {
    var live = function () { return seq === state.view; };
    loadRecs(data.playedP, data.likedP).then(function (recs) {
      if (!live() || !recs) return;
      if (recs.today.length) {
        var ids = recs.today.map(function (x) { return x.Id; });
        slots.today.textContent = '';
        subShelf(slots.today, t('forYouToday'), t('forYouSub'), recs.today.map(function (tr, i) { return trackShelfTile(tr, ids, i); }), 'ml-rec-shelf');
      }
      var mixes = [];
      recs.seeds.forEach(function (sd, i) {
        var l = (recs.lists[i] || []).filter(function (x) { return nid(x.Id) !== nid(sd.Id); }).slice(0, 40);
        if (l.length >= (Taste.ready() ? 8 : 3)) mixes.push(mixTile(mixes.length + 1, [sd].concat(l)));
      });
      if (mixes.length) {
        loadMe().then(function (me) {
          if (!live()) return;
          slots.user.textContent = '';
          subShelf(slots.user, t('forUser', (me && me.name) || ''), t('forUserSub'), mixes, 'ml-mix-shelf');
        }, function () { if (live()) { slots.user.textContent = ''; subShelf(slots.user, t('forYouToday'), '', mixes, 'ml-mix-shelf'); } });
      }
    }, function () { /* Reihen entfallen */ });

    // Sender: Radio zu Kuenstlern aus zuletzt Gehoertem und Lieblingssongs
    Promise.all([data.playedP, data.likedP]).then(function (res) {
      if (!live()) return;
      var seen = {}, list = [];
      (res[0] || []).slice(0, 30).concat(res[1] || []).forEach(function (tr) {
        var a = (tr.ArtistItems || [])[0];
        if (!a || !ID_RE.test(String(a.Id || '')) || seen[nid(a.Id)]) return;
        seen[nid(a.Id)] = 1; list.push({ a: a, tr: tr });
      });
      var picks = shuffled(list.slice()).slice(0, 10);
      slots.stations.textContent = '';
      subShelf(slots.stations, t('stations'), t('stationsSub'), picks.map(function (x) { return radioTile(x.a, x.tr); }), 'ml-station-shelf');
    }, function () { /* Reihe entfaellt */ });

    // Top-Mixtapes: Lieblingskuenstler nach Wiedergaben, Mix zu ihrem meistgespielten Titel
    data.topP.then(function (top) {
      if (!live()) return;
      var seen = {}, tiles = [];
      (top || []).forEach(function (tr) {
        var name = firstArtist(tr);
        if (!name || seen[name] || tiles.length >= 8 || !ID_RE.test(String(tr.Id || ''))) return;
        seen[name] = 1; tiles.push(mixtapeTile(name, tr));
      });
      slots.top.textContent = '';
      subShelf(slots.top, t('topMixes'), t('topMixesSub'), tiles, 'ml-mixtape-shelf');
    }, function () { /* Reihe entfaellt */ });

    // Alben mit Songs, die dir gefallen
    data.likedP.then(function (liked) {
      if (!live()) return;
      var count = {}, order = [];
      (liked || []).forEach(function (tr) {
        var id = tr.AlbumId;
        if (!id || !ID_RE.test(String(id))) return;
        var k = nid(id);
        if (!count[k]) { count[k] = 0; order.push(id); }
        count[k]++;
      });
      order.sort(function (x, y) { return count[nid(y)] - count[nid(x)]; });
      var ids = order.slice(0, 12);
      if (!ids.length) return;
      return itemsOf({ Ids: ids.join(','), Fields: 'ChildCount' }).then(function (albums) {
        if (!live()) return;
        var rank = {};
        ids.forEach(function (id, i) { rank[nid(id)] = i; });
        albums = albums.filter(function (a) { return a.Type === 'MusicAlbum'; }).sort(function (x, y) { return rank[nid(x.Id)] - rank[nid(y.Id)]; });
        slots.likedAlbums.textContent = '';
        subShelf(slots.likedAlbums, t('likedAlbums'), t('likedAlbumsSub'), albums.map(itemTile), 'ml-likedalbums-shelf');
      });
    }).then(null, function () { /* Reihe entfaellt */ });
  }

  function fillMusic(body, seq, libs, pls, withMedia) {
    var mine = pls.filter(function (p) { return p.info.isOwner; });
    var shared = pls.filter(function (p) { return !p.info.isOwner; });
    var musicIds = musicLibIds(libs);

    // Schnellzugriff: Lieblingssongs und die ersten Playlists, zweispaltig wie bei Spotify.
    var grid = el('div', 'ml-quick-grid');
    grid.appendChild(quickTile(t('liked'), likedCoverEl('ml-quick-cover'), function () { ensureLibrary().then(function () { go(likedHash()); }); }, 'liked'));
    mine.concat(shared).slice(0, 7).forEach(function (p) {
      grid.appendChild(quickTile(p.item.Name, playlistCover(p, 'ml-quick-cover', 120), function () { go(hrefFor(p.item)); }, p.id));
    });
    body.appendChild(grid);

    // Reihenfolge wie bei Spotify: Wieder reinhoeren, Empfehlungen, Mixe, Sender, Mixtapes, Alben, dann die eigenen Playlists.
    var slotPlayed = el('div'), slotToday = el('div'), slotUser = el('div'), slotStations = el('div'), slotTop = el('div'), slotLikedAlbums = el('div');
    [slotPlayed, slotToday, slotUser, slotStations, slotTop, slotLikedAlbums].forEach(function (n) { body.appendChild(n); });

    // Deine Playlists (mit Kachel zum Anlegen)
    var newTile = tile({
      title: t('newPlaylist'), coverEl: (function () {
        var c = el('div', 'ml-cover ml-tile-cover ml-new-cover'); c.appendChild(icon('add')); return c;
      })(), onClick: openCreatePlaylist
    });
    var mineBox = shelf(body, t('yourPlaylists'), [newTile].concat(mine.map(playlistTile)));
    if (!mine.length && mineBox) mineBox.appendChild(el('p', 'ml-muted ml-pad', t('noPlaylistsYet')));
    shelf(body, t('sharedPlaylists'), shared.map(playlistTile));

    var slotAdded = el('div');
    body.appendChild(slotAdded);
    var slotMedia = el('div');
    body.appendChild(slotMedia);

    var playedP = perLibrary(musicIds, { IncludeItemTypes: 'Audio', Recursive: true, Filters: 'IsPlayed', SortBy: 'DatePlayed', SortOrder: 'Descending', Limit: 40 },
      function (a, b) {
        var x = (a.UserData && a.UserData.LastPlayedDate) || '', y = (b.UserData && b.UserData.LastPlayedDate) || '';
        return x < y ? 1 : x > y ? -1 : 0;
      }, 60);
    var likedP = itemsOf({ IsFavorite: true, IncludeItemTypes: 'Audio', Recursive: true, Limit: 300, Fields: 'ParentId' }).catch(function () { return []; });
    var topP = perLibrary(musicIds, { IncludeItemTypes: 'Audio', Recursive: true, Filters: 'IsPlayed', SortBy: 'PlayCount', SortOrder: 'Descending', Limit: 60 }, null, 60);
    fillForYou({ today: slotToday, user: slotUser, stations: slotStations, top: slotTop, likedAlbums: slotLikedAlbums }, seq,
      { playedP: playedP.catch(function () { return []; }), likedP: likedP, topP: topP });
    playedP.then(function (tracks) {
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
    body.appendChild(loaderEl());
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
    if (Net.offline()) { OFFV.renderSearch(host, seq); return; }
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
      out.appendChild(loaderEl());
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
    if (opts.id && opts.coverEl) b.dataset.ctx = nid(opts.id);   // nur Playlists (mit eigenem Cover) und Lieblingssongs
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
    if (Net.offline()) { OFFV.libList(list, alive); return; }
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
      else list.appendChild(loaderEl());
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

    var title = ctx.kind === 'liked' ? t('liked') : ctx.kind === 'album' ? ctx.album.Name : ctx.kind === 'mix' ? ctx.mix.title : ctx.pl.item.Name;
    var coverEl = coverFor(ctx, 'ml-hero-cover');
    hero.appendChild(coverEl);
    var heroImg = coverEl.querySelector('img');
    if (heroImg) pageColor(heroImg);
    if (ctx.kind === 'liked') setPalette(root, { base: 'hsl(252,52%,38%)', deep: 'hsl(252,44%,13%)', card: 'hsl(252,52%,48%)' });

    if (!edit) {
      var info = el('div', 'ml-hero-info');
      info.appendChild(el('div', 'ml-hero-kind', ctx.kind === 'album' ? (ctx.book ? t('bookLabel') : t('album')) : ctx.kind === 'mix' ? ctx.mix.label : t('playlist')));
      info.appendChild(el('h1', 'ml-hero-title', title));
      var desc = ctx.kind === 'playlist' ? (ctx.pl.item.Overview || '').trim() : '';
      if (desc) info.appendChild(el('p', 'ml-hero-desc', desc));

      var who = el('div', 'ml-hero-owner');
      if (ctx.kind === 'playlist') {
        who.appendChild(avatar(ctx.pl.info.ownerId, ctx.pl.info.ownerName));
        who.appendChild(el('span', 'ml-owner-name', ctx.pl.info.ownerName || ''));
        if (ctx.pl.info.isOwner) who.appendChild(iconBtn('add', t('invitePeople'), 'ml-owner-add', function () { ML.openShareSheet(ctx.pl.id); }));
      } else if (ctx.kind === 'mix') {
        if (ctx.mix.sub) who.appendChild(el('span', 'ml-owner-name', ctx.mix.sub));
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
      if (ctx.kind === 'playlist' && !ctx.offline) stats.push(ctx.pl.info.isPublic ? t('publicBadge') : t('privateBadge'));
      info.appendChild(el('div', 'ml-hero-stats', stats.join(' • ')));
      if (ctx.groups) info.appendChild(el('div', 'ml-mixed-note', t('mixedNote', ctx.groups.length)));
      hero.appendChild(info);

      var actions = el('div', 'ml-actions');
      var left = el('div', 'ml-actions-left');
      var dlBtn = offHeroButton(ctx);
      if (dlBtn) left.appendChild(dlBtn);
      else if (ctx.kind === 'playlist') left.appendChild(iconBtn('download', t('download'), '', function () { openDownload(ctx.pl); }));
      if (ctx.kind === 'liked') left.appendChild(iconBtn('add', t('addFirstSongs'), 'ml-liked-add', function () { openAddSongs({ liked: true }, ctx.reload); }));
      if (ctx.kind !== 'liked' && ctx.kind !== 'mix' && !ctx.offline && !(ctx.book && ctx.album.Type !== 'MusicAlbum')) left.appendChild(iconBtn('share', t('share'), '', function () {
        if (ctx.kind === 'playlist') shareList(ctx);
        else openShare({ url: linkFor(ctx.album.Id), title: ctx.album.Name, subtitle: albumArtistLine(ctx.album), cover: itemImg(ctx.album, 120), note: '' });
      }));
      left.appendChild(iconBtn('more_v', t('more'), '', function () { playlistMenu(ctx); }));
      var right = el('div', 'ml-actions-right');
      var sh = iconBtn('shuffle', t('shuffle'), 'ml-shuffle-btn', function () { playCtx(ctx, true); });
      var ctxKey = ctxKeyOf(ctx);
      var pl = iconBtn('play', t('play'), 'ml-play-btn', function () {
        pressCtx(ctxKey, function () { return playCtx(ctx, false); });
      });
      if (ctxKey) { pl.dataset.ctx = nid(ctxKey); setTimeout(syncPlayButtons, 0); }
      right.appendChild(sh); right.appendChild(pl);
      actions.appendChild(left); actions.appendChild(right);
      hero.appendChild(actions);
    }
    host.appendChild(hero);
    if (!edit) offSync(ctx);

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
  // Schluessel der Playlist, die diese Ansicht abspielt ('liked' = Lieblingssongs); Alben, Ordner usw. haben keinen.
  function ctxKeyOf(ctx) {
    if (!ctx) return '';
    if (ctx.kind === 'liked') return 'liked';
    if (ctx.kind === 'playlist' && ctx.pl && ctx.pl.id) return nid(ctx.pl.id);
    if (ctx.kind === 'mix' && ctx.mix) return ctx.mix.key;
    if (ctx.kind === 'album' && ctx.album && ctx.album.Id) return 'album:' + nid(ctx.album.Id);
    return '';
  }
  function playCtx(ctx, shuf) {
    var key = ctxKeyOf(ctx);
    if (key) markPending(key);
    if (ctx.playAll && ctx.subs && ctx.subs.length) {
      return ctx.playAll().then(function (ids) {
        if (ids.length) return playIds(shuf ? shuffled(ids) : ids, 0, { ctx: key }).then(function (ok) { if (ok === false) clearPending(key); return ok; });
        clearPending(key); return false;
      }, function () { clearPending(key); toast(t('playFailed')); return false; });
    }
    if (!ctx.tracks.length) { clearPending(key); return Promise.resolve(false); }
    var ids = idsOf(ctx.tracks);
    return playIds(shuf ? shuffled(ids) : ids, 0, { ctx: key }).then(function (ok) { if (ok === false) clearPending(key); return ok; });
  }

  // Abspielknopf (Detailseite, Kachel): laeuft diese Liste schon, pausiert/setzt er fort; sonst startet er sie.
  // Bis der Server den Start bestaetigt hat, zeigt der Knopf schon Pause (kein Warten auf das Dreieck).
  var pendingCtx = null, pendingTimer = 0;
  function markPending(key) {
    pendingCtx = { key: key, until: Date.now() + 9000 };
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(function () { pendingCtx = null; syncPlayButtons(); }, 9100);
    syncPlayButtons();
  }
  function clearPending(key) {
    if (!pendingCtx || (key && pendingCtx.key !== key)) return;
    pendingCtx = null; clearTimeout(pendingTimer);
    syncPlayButtons();
  }
  function pressCtx(key, start) {
    if (key && Player.contextId() === key && (OFFPLAY.active() || !Net.offline())) { Player.toggle(); setTimeout(syncPlayButtons, 300); return; }
    if (key) markPending(key);
    var p = start();
    if (key && p && typeof p.then === 'function') p.then(function (ok) { if (ok === false) clearPending(key); }, function () { clearPending(key); });
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

  // Die laufende Playlist (auch wenn sie auf einem anderen Geraet laeuft) wird wie bei Spotify gruen markiert.
  function markContext() {
    var cur = Player.contextId();
    var playing = Player.isPlayingNow();
    ML.qsa('[data-ctx]', root || document).forEach(function (n) {
      var on = !!cur && n.dataset.ctx === cur;
      n.classList.toggle('ml-ctx-on', on);
      n.classList.toggle('ml-ctx-live', on && playing);
    });
    syncPlayButtons();
  }
  // Grosser Abspielknopf der Detailseite: zeigt Pause, solange genau diese Playlist laeuft.
  function syncPlayButtons() {
    var cur = Player.contextId(), playing = Player.isPlayingNow();
    var pend = pendingCtx && Date.now() < pendingCtx.until ? pendingCtx.key : '';
    if (pend && cur === pend && playing) { pendingCtx = null; pend = ''; }
    ML.qsa('.ml-play-btn[data-ctx], .ml-tile[data-ctx] .ml-tile-play', root || document).forEach(function (b) {
      var key = b.dataset.ctx || (b.closest && b.closest('[data-ctx]') ? b.closest('[data-ctx]').dataset.ctx : '');
      var on = pend ? key === nid(pend) : (!!cur && key === cur && playing);
      if (b.__on === on) return;
      b.__on = on;
      var ic = b.querySelector('.ml-ic');
      var fresh = icon(on ? 'pause' : 'play');
      if (ic) b.replaceChild(fresh, ic); else b.appendChild(fresh);
      b.setAttribute('aria-label', on ? t('pause') : t('play'));
    });
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
    host.appendChild(loaderEl());
  }

  function renderDetailFailed(host, retry) {
    host.textContent = '';
    var bar = el('div', 'ml-hero-bar');
    bar.appendChild(iconBtn('back', t('back'), 'ml-hero-back', leaveDetail));
    host.appendChild(bar);
    failNote(host, retry);
  }

  function showPlaylistDetail(host, seq, id) {
    if (Net.offline()) { OFFV.showDetail(host, seq, 'playlist', id); return; }
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
    if (Net.offline()) { OFFV.showDetail(host, seq, 'album', id); return; }
    renderDetailLoading(host);
    function start() {
      Promise.all([loadItem(id, 'ChildCount,Genres'), loadAlbumTracks(id)]).then(function (res) {
        if (seq !== state.view) return;
        if (!res[0]) throw new Error('missing');
        var grouped = groupByAlbumTag(res[1]);
        var ctx = makeDetailCtx(host, { kind: 'album', album: res[0], tracks: grouped.tracks, groups: grouped.groups, canEdit: false });
        ctx.reload = function () { start(); };
        buildDetail(host, ctx);
        focusTrack(host);
      }, function () { if (seq === state.view) renderDetailFailed(host, function () { renderDetailLoading(host); start(); }); });
    }
    start();
  }

  // Kam man ueber einen Titel (z. B. aus der Jellyfin-Suche) auf das Album, wird dieser Titel markiert und ins Bild gescrollt.
  function focusTrack(host) {
    var id = state.focusTrack;
    state.focusTrack = '';
    if (!id) return;
    var row = ML.qsa('.ml-track', host).filter(function (r) { return nid(r.dataset.id) === nid(id); })[0];
    if (!row) return;
    row.classList.add('ml-focus');
    try { row.scrollIntoView({ block: 'center' }); } catch (e) { /* aeltere Browser */ }
    setTimeout(function () { row.classList.remove('ml-focus'); }, 3500);
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
    if (Net.offline()) { OFFV.unavailable(host); return; }
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
    if (Net.offline()) { OFFV.showDetail(host, seq, 'liked', 'liked'); return; }
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
    if (Net.offline()) { OFFV.unavailable(host); return; }
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
    info.appendChild(el('div', 'ml-hero-kind', t('artist')));
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

  /* ---------- Downloads: Oberfläche (Knöpfe, Seite "Downloads" mit Speicheranzeige) ---------- */
  (function () {
    var extra = {
      de: {
        offTitle: 'Downloads', offDownload: 'Herunterladen', offDownloading: 'Lädt … {0}/{1}', offCancel: 'Download abbrechen',
        offStarted: '{0} Titel werden geladen', offDone: '{0} Titel geladen', offDoneSome: '{0} geladen, {1} fehlgeschlagen',
        offNoSpace: 'Nicht genug Speicherplatz auf dem Gerät. Gib Speicher frei oder lösche Downloads.',
        offUnsupported: 'Dieser Browser kann keine Downloads speichern.',
        offRemove: 'Download entfernen', offRemoveTitle: 'Download entfernen?', offRemoveText: '„{0}“ wird von diesem Gerät gelöscht. Auf dem Server bleibt alles erhalten.',
        offDownloadTrack: 'Herunterladen', offRemoveTrack: 'Download entfernen', offRemoved: 'Download entfernt', offDownloaded: 'Heruntergeladen',
        offStorage: 'Speicher', offUsed: '{0} belegt', offCounts: '{0} • {1}', offColl1: '1 Liste', offCollN: '{0} Listen',
        offBarDl: 'Downloads', offBarOther: 'Sonstiges', offBarFree: 'Frei', offQuotaNote: 'Schätzung des Browsers. Der verfügbare Rahmen hängt vom Gerät und vom freien Speicher ab.',
        offPersistOk: 'Der Browser löscht diese Downloads nicht von selbst.', offPersistNo: 'Der Browser darf diese Downloads bei Platzmangel löschen.',
        offPersistBtn: 'Dauerhaft speichern', offPersistDenied: 'Der Browser hat die dauerhafte Speicherung nicht erlaubt.',
        offQuality: 'Qualität', offQOrig: 'Original', offQOrigSub: 'Unverändert, größte Dateien', offQMp3: 'Platzsparend', offQMp3Sub: 'MP3 mit 192 kbit/s (der Server rechnet um)',
        offActive: 'Läuft gerade',
        offColls: 'Geladene Listen', offSingles: 'Einzelne Titel', offNone: 'Noch nichts geladen. Tippe bei einer Playlist, einem Album oder einem Titel auf den Download-Knopf.',
        offClearAll: 'Alle Downloads löschen', offClearTitle: 'Alle Downloads löschen?', offClearText: 'Alle geladenen Titel werden von diesem Gerät gelöscht. Auf dem Server bleibt alles erhalten.',
        offPartial: '{0} von {1} geladen', offMenu: 'Downloads und Speicher', offResume: 'Download fortsetzen', offViaList: 'Heruntergeladen (über eine Liste)', offViaListHint: 'Dieser Titel gehört zu einer geladenen Liste. Entferne die Liste, um ihn zu löschen.'
      },
      en: {
        offTitle: 'Downloads', offDownload: 'Download', offDownloading: 'Downloading … {0}/{1}', offCancel: 'Cancel download',
        offStarted: 'Downloading {0} tracks', offDone: '{0} tracks downloaded', offDoneSome: '{0} downloaded, {1} failed',
        offNoSpace: 'Not enough storage on this device. Free up space or delete downloads.',
        offUnsupported: 'This browser cannot store downloads.',
        offRemove: 'Remove download', offRemoveTitle: 'Remove download?', offRemoveText: '"{0}" will be deleted from this device. Everything stays on the server.',
        offDownloadTrack: 'Download', offRemoveTrack: 'Remove download', offRemoved: 'Download removed', offDownloaded: 'Downloaded',
        offStorage: 'Storage', offUsed: '{0} used', offCounts: '{0} • {1}', offColl1: '1 list', offCollN: '{0} lists',
        offBarDl: 'Downloads', offBarOther: 'Other', offBarFree: 'Free', offQuotaNote: 'Estimate from the browser. The available space depends on the device and its free storage.',
        offPersistOk: 'The browser will not delete these downloads on its own.', offPersistNo: 'The browser may delete these downloads when storage runs low.',
        offPersistBtn: 'Keep permanently', offPersistDenied: 'The browser did not allow permanent storage.',
        offQuality: 'Quality', offQOrig: 'Original', offQOrigSub: 'Unchanged, largest files', offQMp3: 'Space saving', offQMp3Sub: 'MP3 at 192 kbit/s (the server converts)',
        offActive: 'In progress',
        offColls: 'Downloaded lists', offSingles: 'Single tracks', offNone: 'Nothing downloaded yet. Tap the download button on a playlist, an album or a track.',
        offClearAll: 'Delete all downloads', offClearTitle: 'Delete all downloads?', offClearText: 'All downloaded tracks will be deleted from this device. Everything stays on the server.',
        offPartial: '{0} of {1} downloaded', offMenu: 'Downloads and storage', offResume: 'Resume download', offViaList: 'Downloaded (via a list)', offViaListHint: 'This track belongs to a downloaded list. Remove the list to delete it.'
      }
    };
    Object.keys(extra).forEach(function (l) { Object.keys(extra[l]).forEach(function (k) { STR[l][k] = extra[l][k]; }); });
  })();

  // Kreis mit Pfeil (Kontur) für "herunterladen", gefüllter grüner Kreis mit Pfeil für "geladen" (wie bei Spotify)
  STROKE_ICONS.download_circle = 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.6v6.6M8.9 11.6L12 14.7l3.1-3.1';
  ICONS.download_done = 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM11 6.5h2v6.2l2.3-2.3 1.4 1.4L12 16.6 7.3 11.8l1.4-1.4 2.3 2.3z';

  function fmtBytes(n) {
    n = Math.max(0, n || 0);
    var u = ['B', 'KB', 'MB', 'GB', 'TB'], i = 0;
    while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
    var d = i <= 1 ? 0 : 1;
    try { return n.toLocaleString(navigator.language || 'de', { maximumFractionDigits: d, minimumFractionDigits: d }) + ' ' + u[i]; } catch (e) { return n.toFixed(d) + ' ' + u[i]; }
  }

  // Schlüssel und Beschreibung der Sammlung, die eine Detailseite darstellt (null = nicht ladbar)
  function offMetaOf(ctx) {
    if (!ctx || ctx.subs && ctx.subs.length) return null;
    if (ctx.kind === 'liked') return { key: 'liked', type: 'liked', name: t('liked'), sub: '', href: likedHash() };
    if (ctx.kind === 'playlist') return { key: 'pl:' + nid(ctx.pl.id), type: 'playlist', name: ctx.pl.item.Name, sub: ctx.pl.info.ownerName || '', href: hrefFor(ctx.pl.item) };
    if (ctx.kind === 'album') return { key: 'al:' + nid(ctx.album.Id), type: 'album', name: ctx.album.Name, sub: albumArtistLine(ctx.album), href: hrefFor(ctx.album) };
    if (ctx.kind === 'mix') return { key: ctx.mix.key, type: 'mix', name: ctx.mix.title, sub: ctx.mix.sub || '', href: mixHash(ctx.mix.kind, ctx.mix.id, (mixStore[ctx.mix.key] || {}).n || 0, ctx.mix.name || '') };
    return null;
  }

  // Download-Knopf der Detailseite (Kreis mit Pfeil; grün gefüllt, wenn alles geladen ist; während des Ladens mit Zähler)
  function offHeroButton(ctx) {
    var meta = offMetaOf(ctx);
    if (!meta || !OFF.available() || !ctx.tracks.length) return null;
    var b = btn('ml-icon-btn ml-dl-btn');
    var ic = icon('download_circle'), cnt = el('span', 'ml-dl-count');
    b.appendChild(ic); b.appendChild(cnt);
    function paint() {
      var st = OFF.collState(meta.key), pr = OFF.progress(meta.key);
      var n = st === 'done' ? 'download_done' : 'download_circle';
      var fresh = icon(n);
      b.replaceChild(fresh, b.querySelector('.ml-ic'));
      b.classList.toggle('ml-on', st === 'done');
      b.classList.toggle('ml-busy', st === 'busy');
      cnt.textContent = pr ? pr.done + '/' + pr.total : '';
      var label = st === 'done' ? t('offRemove') : st === 'busy' ? t('offCancel') : st === 'partial' ? t('offResume') : t('offDownload');
      b.setAttribute('aria-label', label); b.title = label;
      b.style.setProperty('--ml-dl', pr ? Math.round(pr.fraction * 100) + '%' : '0%');
    }
    var off = OFF.listen(function () { if (!document.body.contains(b)) { off(); return; } paint(); });
    paint();
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var st = OFF.collState(meta.key);
      if (st === 'busy') { OFF.cancel(meta.key); return; }
      if (st === 'done') {
        confirmSheet(t('offRemoveTitle'), t('offRemoveText', meta.name), t('offRemove'), true).then(function (yes) {
          if (yes) OFF.removeColl(meta.key).then(function () { toast(t('offRemoved')); });
        });
        return;
      }
      toast(t('offStarted', ctx.tracks.length));
      OFF.downloadColl(meta, ctx.tracks);
    });
    return b;
  }
  // Ist die Sammlung schon geladen, zieht sie Änderungen der Liste nach (Titel dazu / entfernt).
  function offSync(ctx) {
    var meta = offMetaOf(ctx);
    if (!meta || ctx.kind === 'mix' || !OFF.available()) return;
    OFF.load().then(function () { OFF.syncIfDownloaded(meta, ctx.tracks); });
  }

  // Eintrag im Titelmenü
  function offTrackEntry(track) {
    var has = OFF.has(track.Id), single = OFF.isSingle(track.Id);
    var viaList = has && !single;   // nur als Teil einer geladenen Liste auf dem Gerät
    return {
      hidden: !OFF.available(), icon: has ? 'download_done' : 'download_circle',
      label: viaList ? t('offViaList') : has ? t('offRemoveTrack') : t('offDownloadTrack'),
      run: function () {
        if (viaList) { toast(t('offViaListHint')); return; }
        if (has) OFF.removeTrack(track.Id).then(function () { toast(t('offRemoved')); });
        else { toast(t('offStarted', 1)); OFF.downloadTrack(track); }
      }
    };
  }
  // Menüeintrag: komplett geladene Liste direkt vom Gerät abspielen
  function offLocalEntry(ctx) {
    var meta = OFF.available() ? offMetaOf(ctx) : null;
    var ok = !!meta && ctx.kind !== 'mix' && OFF.collState(meta.key) === 'done';
    return { hidden: !ok, icon: 'download_done', label: t('offPlayLocal'), run: function () {
      OFFPLAY.startIds(ctx.tracks.map(function (x) { return x.Id; }), 0, { name: ctx.kind === 'liked' ? t('liked') : ctx.kind === 'album' ? ctx.album.Name : ctx.pl.item.Name });
    } };
  }
  // Kleines grünes Häkchen-Symbol an geladenen Titeln
  function offBadge() {
    var s = el('span', 'ml-dl-ind');
    s.appendChild(icon('download_done'));
    s.hidden = true;
    s.setAttribute('title', t('offDownloaded'));
    return s;
  }
  function offRefreshBadges() {
    ML.qsa('.ml-track', content).forEach(function (r) {
      var b = r.querySelector('.ml-dl-ind');
      if (b) b.hidden = !OFF.has(r.dataset.id);
    });
  }
  OFF.listen(function () { try { offRefreshBadges(); } catch (e) { /* Seite weg */ } });

  /* ---------- Seite "Downloads" ---------- */
  function downloadsHash() { return homeHash() + (state.libraryId ? '&' : '?') + 'mlview=downloads'; }
  function openDownloads() { ensureLibrary().then(function () { go(downloadsHash()); }); }

  function showDownloadsPage(host, seq) {
    host.textContent = '';
    var urls = [];
    var bar = el('div', 'ml-hero-bar');
    bar.appendChild(iconBtn('back', t('back'), 'ml-hero-back', leaveDetail));
    bar.appendChild(el('div', 'ml-hero-bar-title', t('offTitle')));
    host.appendChild(bar);
    var body = el('div', 'ml-dl-page');
    host.appendChild(body);
    var tok = 0, timer = 0;
    function byAdded(x, y) { return (y.added || 0) - (x.added || 0); }

    function section(title) {
      var s = el('section', 'ml-dl-sec');
      if (title) s.appendChild(el('h2', 'ml-dl-h', title));
      body.appendChild(s);
      return s;
    }
    function coverHolder(key, cls) {
      var holder = cover(null, cls);
      if (key) {
        MLOff.getCover(key).then(function (blob) {
          if (!blob) return;
          var u = URL.createObjectURL(blob); urls.push(u);
          var im = el('img'); im.alt = ''; im.src = u;
          holder.appendChild(im);
        }, function () { /* Platzhalter bleibt */ });
      }
      return holder;
    }
    function row(opts) {
      var r = el('div', 'ml-dl-row');
      var main = btn('ml-dl-main');
      main.appendChild(opts.coverEl);
      var tx = el('div', 'ml-dl-text');
      tx.appendChild(el('div', 'ml-dl-title', opts.title));
      if (opts.sub) tx.appendChild(el('div', 'ml-dl-sub', opts.sub));
      main.appendChild(tx);
      if (opts.onOpen) main.addEventListener('click', opts.onOpen); else main.disabled = true;
      r.appendChild(main);
      if (opts.play) r.appendChild(iconBtn('play', t('offPlayLocal'), 'ml-dl-act ml-dl-play', opts.play));
      if (opts.action) r.appendChild(iconBtn(opts.action.icon, opts.action.label, 'ml-dl-act', opts.action.run));
      return r;
    }

    function render() {
      var my = ++tok;
      Promise.all([OFF.load(), OFF.usage(), OFF.estimate(), OFF.persisted(), OFF.tracks()]).then(function (res) {
        if (my !== tok || seq !== state.view || !host.isConnected) return;
        var us = res[1], est = res[2], pers = res[3], tracks = res[4];
        urls.forEach(function (u) { URL.revokeObjectURL(u); }); urls = [];
        body.textContent = '';

        // Offline-Modus (von Hand): pausiert alle Serveranfragen, z. B. wenn ein VPN verbunden, aber kein Internet da ist
        var ms = section(t('offModeLbl'));
        var mb = btn('ml-dl-q ml-dl-mode' + (Net.forced() ? ' ml-on' : ''));
        mb.appendChild(el('span', 'ml-dl-q-t', Net.forced() ? t('offModeOff') : t('offModeOn')));
        mb.appendChild(el('span', 'ml-dl-q-s', t('offModeNote')));
        mb.setAttribute('aria-pressed', Net.forced() ? 'true' : 'false');
        mb.addEventListener('click', function () { OFFV.toggleForced(); setTimeout(render, 50); });
        ms.appendChild(mb);

        // Speicher
        var sec = section(t('offStorage'));
        var card = el('div', 'ml-dl-card');
        card.appendChild(el('div', 'ml-dl-big', t('offUsed', fmtBytes(us.bytes))));
        card.appendChild(el('div', 'ml-dl-muted', t('offCounts', countText(us.tracks), us.colls === 1 ? t('offColl1') : t('offCollN', us.colls))));
        if (est && est.quota) {
          var other = Math.max(0, est.usage - us.bytes), free = Math.max(0, est.quota - est.usage);
          var meter = el('div', 'ml-dl-meter');
          var a = el('i', 'ml-dl-m-dl'), o = el('i', 'ml-dl-m-other');
          a.style.width = Math.max(us.bytes ? 1 : 0, us.bytes / est.quota * 100) + '%';
          o.style.width = (other / est.quota * 100) + '%';
          meter.appendChild(a); meter.appendChild(o);
          card.appendChild(meter);
          var leg = el('div', 'ml-dl-legend');
          [['ml-dl-m-dl', t('offBarDl'), us.bytes], ['ml-dl-m-other', t('offBarOther'), other], ['ml-dl-m-free', t('offBarFree'), free]].forEach(function (x) {
            var l = el('span', 'ml-dl-leg');
            l.appendChild(el('i', x[0])); l.appendChild(document.createTextNode(' ' + x[1] + ' ' + fmtBytes(x[2])));
            leg.appendChild(l);
          });
          card.appendChild(leg);
          card.appendChild(el('div', 'ml-dl-note', t('offQuotaNote')));
        }
        card.appendChild(el('div', 'ml-dl-note', pers ? t('offPersistOk') : t('offPersistNo')));
        if (!pers && navigator.storage && navigator.storage.persist) {
          var pb = btn('ml-pill', t('offPersistBtn'));
          pb.addEventListener('click', function () { OFF.persist().then(function (ok) { if (!ok) toast(t('offPersistDenied')); render(); }); });
          card.appendChild(pb);
        }
        sec.appendChild(card);

        // Qualität
        var qs = section(t('offQuality'));
        var qrow = el('div', 'ml-dl-quality');
        [['orig', t('offQOrig'), t('offQOrigSub')], ['mp3', t('offQMp3'), t('offQMp3Sub')]].forEach(function (x) {
          var qb = btn('ml-dl-q' + (OFF.quality() === x[0] ? ' ml-on' : ''));
          qb.appendChild(el('span', 'ml-dl-q-t', x[1])); qb.appendChild(el('span', 'ml-dl-q-s', x[2]));
          qb.setAttribute('aria-pressed', OFF.quality() === x[0] ? 'true' : 'false');
          qb.addEventListener('click', function () { OFF.setQuality(x[0]); });
          qrow.appendChild(qb);
        });
        qs.appendChild(qrow);

        // Läuft gerade
        var jl = OFF.jobList();
        if (jl.length) {
          var js = section(t('offActive'));
          jl.forEach(function (j) {
            var r = el('div', 'ml-dl-job');
            var tx = el('div', 'ml-dl-text');
            tx.appendChild(el('div', 'ml-dl-title', j.name || t('offDownload')));
            tx.appendChild(el('div', 'ml-dl-sub', t('offDownloading', j.done, j.total)));
            var pbar = el('div', 'ml-dl-pbar'), fill = el('i');
            fill.style.width = Math.round(Math.min(1, (j.done + (j.part || 0)) / Math.max(1, j.total)) * 100) + '%';
            pbar.appendChild(fill); tx.appendChild(pbar);
            r.appendChild(tx);
            r.appendChild(iconBtn('close', t('offCancel'), 'ml-dl-act', function () { OFF.cancel(j.key); }));
            js.appendChild(r);
          });
        }

        // Vom Gerät abspielen
        if (tracks.length) {
          var ap = section(t('offFromDevice'));
          var ac = el('div', 'ml-dl-card');
          ac.appendChild(el('div', 'ml-dl-note ml-first', t('offLocalNote')));
          var pr = el('div', 'ml-dl-playrow');
          var pa = btn('ml-pill ml-primary', t('offPlayAll'));
          pa.addEventListener('click', function () { OFFPLAY.startIds(tracks.slice().sort(byAdded).map(function (x) { return x.id; }), 0, { name: t('offTitle') }); });
          var ps = btn('ml-pill', t('offShuffleAll'));
          ps.addEventListener('click', function () { OFFPLAY.startIds(tracks.map(function (x) { return x.id; }), -1, { shuffle: true, name: t('offTitle') }); });
          pr.appendChild(pa); pr.appendChild(ps); ac.appendChild(pr);
          ap.appendChild(ac);
        }

        // Geladene Listen
        var colls = OFF.allColls().sort(function (x, y) { return (y.added || 0) - (x.added || 0); });
        var size = {};
        tracks.forEach(function (x) { size[x.id] = x.size || 0; });
        if (colls.length) {
          var cs = section(t('offColls'));
          colls.forEach(function (c) {
            var have = c.ids.filter(function (id) { return OFF.has(id); }).length;
            var bytes = c.ids.reduce(function (s, id) { return s + (size[id] || 0); }, 0);
            var sub = [have < c.ids.length ? t('offPartial', have, c.ids.length) : countText(c.ids.length), fmtBytes(bytes)].join(' • ');
            cs.appendChild(row({
              play: have ? function () { OFFPLAY.startIds(c.ids, 0, { name: c.name }); } : null,
              coverEl: coverHolder(c.coverKey, 'ml-dl-cover'), title: c.name, sub: sub,
              onOpen: c.href ? function () { go(c.href); } : null,
              action: { icon: 'del', label: t('offRemove'), run: function () {
                confirmSheet(t('offRemoveTitle'), t('offRemoveText', c.name), t('offRemove'), true).then(function (yes) { if (yes) OFF.removeColl(c.key).then(function () { toast(t('offRemoved')); }); });
              } }
            }));
          });
        }
        // Einzelne Titel
        var singles = tracks.filter(function (x) { return x.explicit; }).sort(function (x, y) { return (y.added || 0) - (x.added || 0); });
        if (singles.length) {
          var ss = section(t('offSingles'));
          singles.forEach(function (x) {
            ss.appendChild(row({
              play: function () { OFFPLAY.startIds([x.id], 0, { name: x.name }); },
              coverEl: coverHolder(x.coverKey, 'ml-dl-cover'), title: x.name, sub: [x.artist, fmtBytes(x.size)].filter(Boolean).join(' • '),
              action: { icon: 'del', label: t('offRemove'), run: function () { OFF.removeTrack(x.id).then(function () { toast(t('offRemoved')); }); } }
            }));
          });
        }
        if (!colls.length && !singles.length) body.appendChild(el('p', 'ml-dl-empty', t('offNone')));
        if (colls.length || singles.length) {
          var clr = btn('ml-pill ml-dl-clear', t('offClearAll'));
          clr.addEventListener('click', function () {
            confirmSheet(t('offClearTitle'), t('offClearText'), t('offClearAll'), true).then(function (yes) { if (yes) OFF.clearAll().then(function () { toast(t('offRemoved')); }); });
          });
          body.appendChild(clr);
        }
      }, function () { if (my === tok && seq === state.view) { body.textContent = ''; body.appendChild(el('p', 'ml-dl-empty', t('offUnsupported'))); } });
    }
    var off = OFF.listen(function () {
      if (seq !== state.view || !host.isConnected) { off(); return; }
      clearTimeout(timer); timer = setTimeout(render, 350);
    });
    render();
  }

  /* ---------- Offline-Ansichten: Start, Bibliothek, Suche und Listen aus den heruntergeladenen Daten ---------- */
  (function () {
    var extra = {
      de: {
        offPill: 'Offline', offPillForced: 'Offline-Modus', offModeLbl: 'Offline-Modus', offModeOn: 'Offline-Modus einschalten', offModeOff: 'Offline-Modus beenden',
        offModeNote: 'Pausiert alle Anfragen an den Server und zeigt nur Heruntergeladenes. Hilft, wenn das VPN verbunden ist, aber kein Internet da ist. Ohne den Schalter erkennt die App fehlende Verbindung selbst.',
        offModeOnToast: 'Offline-Modus an', offModeOffToast: 'Offline-Modus beendet', offChecking: 'Verbindung wird geprüft …', offPillTip: 'Server nicht erreichbar. Tippen, um die Verbindung zu prüfen.',
        offPillTipForced: 'Offline-Modus ist an. Tippen zum Beenden.',
        offHomeText: 'Du hörst, was auf diesem Gerät gespeichert ist.', offHomeEmpty: 'Noch nichts heruntergeladen. Lade Playlists oder Alben herunter, solange du online bist.',
        offUnavail: 'Das ist offline nicht verfügbar, weil es nicht heruntergeladen wurde.', offSearchPh: 'In heruntergeladenen Titeln suchen', offSearchHint: 'Suche in dem, was auf diesem Gerät gespeichert ist.',
        offPlaylistsShelf: 'Playlists', offAlbumsShelf: 'Alben', offMixesShelf: 'Mixe', offOpenDownloads: 'Downloads verwalten', offFromDeviceBadge: 'Vom Gerät'
      },
      en: {
        offPill: 'Offline', offPillForced: 'Offline mode', offModeLbl: 'Offline mode', offModeOn: 'Turn on offline mode', offModeOff: 'End offline mode',
        offModeNote: 'Pauses all requests to the server and shows downloads only. Helps when a VPN is connected but there is no internet. Without the switch the app detects a missing connection by itself.',
        offModeOnToast: 'Offline mode on', offModeOffToast: 'Offline mode ended', offChecking: 'Checking connection …', offPillTip: 'Server not reachable. Tap to check the connection.',
        offPillTipForced: 'Offline mode is on. Tap to end it.',
        offHomeText: 'You are listening to what is stored on this device.', offHomeEmpty: 'Nothing downloaded yet. Download playlists or albums while you are online.',
        offUnavail: 'This is not available offline because it was not downloaded.', offSearchPh: 'Search downloaded tracks', offSearchHint: 'Searches what is stored on this device.',
        offPlaylistsShelf: 'Playlists', offAlbumsShelf: 'Albums', offMixesShelf: 'Mixes', offOpenDownloads: 'Manage downloads', offFromDeviceBadge: 'From device'
      }
    };
    Object.keys(extra).forEach(function (l) { Object.keys(extra[l]).forEach(function (k) { STR[l][k] = extra[l][k]; }); });
  })();

  ICONS.wifi_off = 'M23.64 7c-.45-.34-4.93-4-11.64-4-1.5 0-2.89.19-4.15.48L18.18 13.8 23.64 7zm-6.6 8.22L3.27 1.44 2 2.72l2.05 2.06C1.91 5.76.59 6.82.36 7l11.63 14.49.01.01.01-.01 3.9-4.86 3.32 3.32 1.27-1.27-3.46-3.46z';

  var OFFV = (function () {
    function collKey(kind, id) { return kind === 'playlist' ? 'pl:' + nid(id) : kind === 'album' ? 'al:' + nid(id) : kind === 'liked' ? 'liked' : id; }
    function hrefOfColl(c) {
      if (c.href) return c.href;
      if (c.key.indexOf('pl:') === 0) return '#/details?id=' + c.key.slice(3);
      if (c.key.indexOf('al:') === 0) return '#/details?id=' + c.key.slice(3);
      return '';
    }
    // Kleines Bild aus dem Gerätespeicher
    function coverOf(key, cls) {
      var holder = cover(null, cls);
      if (key) OFFPLAY.coverUrl(key).then(function (u) {
        if (!u) return;
        var im = el('img'); im.alt = ''; im.src = u; holder.appendChild(im);
      });
      return holder;
    }
    // Titel einer Sammlung im Format der Server-Antworten (Cover vorgeladen)
    function collTracks(c) {
      return MLOff.allTracks().then(function (all) {
        var by = {}; all.forEach(function (x) { by[x.id] = x; });
        var metas = c.ids.map(function (id) { return by[id]; }).filter(Boolean);
        return metasToItems(metas);
      });
    }
    function metasToItems(metas) {
      return Promise.all(metas.map(function (m) { return OFFPLAY.coverUrl(m.coverKey); })).then(function () { return metas.map(function (m) { return OFFPLAY.itemOf(m); }); });
    }

    /* ---- Listen-Seiten ---- */
    function unavailable(host) {
      host.textContent = '';
      var bar = el('div', 'ml-hero-bar');
      bar.appendChild(iconBtn('back', t('back'), 'ml-hero-back', leaveDetail));
      host.appendChild(bar);
      emptyNote(host, t('offUnavail'));
    }
    function showDetail(host, seq, kind, id, mix) {
      renderDetailLoading(host);
      OFF.load().then(function () {
        var c = OFF.coll(collKey(kind, mix ? mix.key : id));
        if (!c) { if (seq === state.view) unavailable(host); return; }
        return collTracks(c).then(function (tracks) {
          if (seq !== state.view) return;
          var base;
          if (kind === 'playlist') {
            base = { kind: 'playlist', pl: { id: id, item: { Id: id, Name: c.name, Overview: '', ChildCount: tracks.length, ImageTags: {} }, info: { ownerName: c.sub || '', ownerId: '', isOwner: false, canEdit: false, isPublic: false, sharedWithMe: false, customCover: false } }, tracks: tracks, canEdit: false };
          } else if (kind === 'album') {
            var first = tracks[0] || {};
            base = { kind: 'album', album: { Id: id, Name: c.name, AlbumArtist: first.AlbumArtist || c.sub || '', Artists: first.Artists || [], ProductionYear: first.ProductionYear, Type: 'MusicAlbum' }, tracks: tracks, canEdit: false };
          } else if (kind === 'liked') {
            base = { kind: 'liked', tracks: tracks, canEdit: false };
          } else {
            base = { kind: 'mix', mix: { kind: mix.kind, id: mix.id, key: mix.key, title: c.name, label: mix.label, name: mix.name || '', sub: c.sub || '' }, tracks: tracks, canEdit: false };
          }
          var ctx = makeDetailCtx(host, base);
          ctx.offline = true;
          ctx.reload = function () { /* nichts nachzuladen */ };
          buildDetail(host, ctx);
        });
      }).then(null, function () { if (seq === state.view) unavailable(host); });
    }

    /* ---- Kacheln und Zeilen ---- */
    function ctxOf(c) { return OFFPLAY.ctxFromColl(c.key); }
    function playColl(c, shuffle) {
      return OFFPLAY.startIds(c.ids, shuffle ? -1 : 0, { name: c.name, coll: c.key, shuffle: shuffle ? true : undefined });
    }
    function haveCount(c) { return c.ids.filter(function (id) { return OFF.has(id); }).length; }
    function subOf(c) {
      var n = haveCount(c);
      if (c.type === 'album' || c.type === 'mix') return c.sub || countText(n);
      return countText(n);
    }
    function collCover(c, cls) { return c.type === 'liked' ? likedCoverEl(cls) : coverOf(c.coverKey, cls); }
    function collTile(c) {
      var key = ctxOf(c);
      return tile({
        ctx: key, title: c.name, sub: subOf(c), coverEl: collCover(c, 'ml-tile-cover'),
        onClick: function () { var h = hrefOfColl(c); if (h) go(h); },
        play: haveCount(c) ? function () { pressCtx(key, function () { return playColl(c, false); }); } : null
      });
    }
    function collRow(c) {
      return libRow({
        id: ctxOf(c), coverEl: collCover(c, 'ml-row-cover'), title: c.name,
        sub: [c.type === 'album' ? t('album') : c.type === 'mix' ? t('mixLbl') : t('playlist'), subOf(c)].filter(Boolean).join(' • '),
        onClick: function () { var h = hrefOfColl(c); if (h) go(h); }
      });
    }
    function sortedColls() { return OFF.allColls().filter(function (c) { return haveCount(c) > 0; }).sort(function (a, b) { return (b.added || 0) - (a.added || 0); }); }

    /* ---- Start ---- */
    function renderHome(host, seq) {
      host.textContent = '';
      var head = el('div', 'ml-topbar');
      head.appendChild(profileButton());
      head.appendChild(el('h1', 'ml-page-title ml-inline', t('offPill')));
      host.appendChild(head);
      var body = el('div', 'ml-home-body');
      host.appendChild(body);
      OFF.load().then(function () { return MLOff.allTracks(); }).then(function (tracks) {
        if (seq !== state.view) return;
        body.textContent = '';
        var colls = sortedColls();
        var singles = tracks.filter(function (x) { return x.explicit; }).sort(function (x, y) { return (y.added || 0) - (x.added || 0); });
        if (!tracks.length) { emptyNote(body, t('offHomeEmpty'), t('offOpenDownloads'), openDownloads); return; }
        var card = el('div', 'ml-off-card');
        card.appendChild(el('p', 'ml-off-text', t('offHomeText')));
        var pr = el('div', 'ml-dl-playrow');
        var pa = btn('ml-pill ml-primary', t('offPlayAll'));
        pa.addEventListener('click', function () { OFFPLAY.startIds(tracks.slice().sort(function (x, y) { return (y.added || 0) - (x.added || 0); }).map(function (x) { return x.id; }), 0, { name: t('offTitle') }); });
        var ps = btn('ml-pill', t('offShuffleAll'));
        ps.addEventListener('click', function () { OFFPLAY.startIds(tracks.map(function (x) { return x.id; }), -1, { shuffle: true, name: t('offTitle') }); });
        pr.appendChild(pa); pr.appendChild(ps); card.appendChild(pr);
        if (Net.forced()) {
          var end = btn('ml-pill', t('offModeOff'));
          end.addEventListener('click', function () { Net.setForced(false); toast(t('offModeOffToast')); });
          pr.appendChild(end);
        }
        body.appendChild(card);
        var pls = colls.filter(function (c) { return c.type === 'playlist' || c.type === 'liked'; });
        shelf(body, t('offPlaylistsShelf'), pls.map(collTile));
        shelf(body, t('offAlbumsShelf'), colls.filter(function (c) { return c.type === 'album'; }).map(collTile));
        shelf(body, t('offMixesShelf'), colls.filter(function (c) { return c.type === 'mix'; }).map(collTile));
        if (singles.length) {
          shelf(body, t('offSingles'), singles.slice(0, 30).map(function (x) {
            function go1() { OFFPLAY.startIds([x.id], 0, { name: x.name }); }
            return tile({ title: x.name, sub: x.artist, coverEl: coverOf(x.coverKey, 'ml-tile-cover'), onClick: go1, play: go1 });
          }));
        }
        var more = btn('ml-pill ml-dl-clear', t('offOpenDownloads'));
        more.addEventListener('click', openDownloads);
        body.appendChild(more);
        markContext();
      }, function () { if (seq === state.view) { body.textContent = ''; emptyNote(body, t('offUnavail')); } });
    }

    /* ---- Bibliothek ---- */
    function libList(list, alive) {
      list.textContent = '';
      var seg = state.libSeg;
      OFF.load().then(function () {
        if (!alive()) return;
        list.textContent = '';
        var colls = sortedColls();
        if (seg === 'playlists') colls = colls.filter(function (c) { return c.type === 'playlist' || c.type === 'liked' || c.type === 'mix'; });
        else if (seg === 'albums') colls = colls.filter(function (c) { return c.type === 'album'; });
        else colls = [];
        colls.forEach(function (c) { list.appendChild(collRow(c)); });
        if (!colls.length) list.appendChild(el('p', 'ml-muted ml-pad', seg === 'artists' ? t('offUnavail') : t('offHomeEmpty')));
        markSide(); markContext();
      });
    }

    /* ---- Suche in den geladenen Titeln ---- */
    function renderSearch(host, seq) {
      host.textContent = '';
      var head = el('div', 'ml-search-head');
      head.appendChild(el('h1', 'ml-page-title', t('tabSearch')));
      var input = el('input', 'ml-field ml-search-big');
      input.type = 'search'; input.placeholder = t('offSearchPh'); input.setAttribute('autocomplete', 'off'); input.value = searchTerm;
      head.appendChild(input);
      host.appendChild(head);
      var out = el('div', 'ml-search-out');
      host.appendChild(out);
      var token = 0;
      function run() {
        var q = input.value.trim().toLowerCase();
        searchTerm = input.value;
        var my = ++token;
        out.textContent = '';
        if (!q) { out.appendChild(el('p', 'ml-muted ml-pad', t('offSearchHint'))); return; }
        MLOff.allTracks().then(function (all) {
          var hit = all.filter(function (m) { return (m.name + ' ' + m.artist + ' ' + m.album).toLowerCase().indexOf(q) >= 0; }).sort(function (a, b) { return a.name < b.name ? -1 : 1; }).slice(0, 100);
          return metasToItems(hit);
        }).then(function (items) {
          if (my !== token || seq !== state.view) return;
          out.textContent = '';
          if (!items.length) { out.appendChild(el('p', 'ml-muted ml-pad', t('noResults', input.value.trim()))); return; }
          var ctx = songListCtx();
          ctx.tracks = items;
          ctx.listEl = el('div', 'ml-tracks');
          out.appendChild(ctx.listEl);
          ctx.renderTracks();
        });
      }
      var timer = 0;
      input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 180); });
      run();
    }

    /* ---- Kopf: Hinweis "Offline" und Schalter ---- */
    var pill = null;
    function ensurePill() {
      if (pill || !root) return pill;
      pill = btn('ml-offpill');
      pill.appendChild(icon('wifi_off'));
      pill.appendChild(el('span', 'ml-offpill-t'));
      pill.addEventListener('click', function () {
        if (Net.forced()) { Net.setForced(false); toast(t('offModeOffToast')); }
        else { toast(t('offChecking')); Net.probeNow(); }
      });
      root.appendChild(pill);
      return pill;
    }
    function paintPill() {
      var on = Net.offline();
      document.body.classList.toggle('ml-offline', on);
      if (!ensurePill()) return;
      pill.hidden = !on;
      pill.querySelector('.ml-offpill-t').textContent = Net.forced() ? t('offPillForced') : t('offPill');
      var tip = Net.forced() ? t('offPillTipForced') : t('offPillTip');
      pill.title = tip; pill.setAttribute('aria-label', tip);
    }
    function toggleForced() {
      var on = !Net.forced();
      Net.setForced(on);
      toast(t(on ? 'offModeOnToast' : 'offModeOffToast'));
    }
    // Beim Wechsel zwischen online und offline wird die offene Seite neu aufgebaut.
    var lastOff = null;
    Net.onChange(function (off) {
      paintPill();
      if (lastOff === off) return;
      lastOff = off;
      if (!root || root.hidden) return;
      try {
        state.key = '';
        if (!off) { try { ML.refresh(); } catch (e) { /* ignorieren */ } }
        onRoute(ML.route());
        if (side && isWide()) scheduleSide();
        Player.repaint();
      } catch (e) { if (window.console) console.error('Music Look offline', e); }
    });
    return {
      showDetail: showDetail, renderHome: renderHome, libList: libList, renderSearch: renderSearch, unavailable: unavailable,
      paintPill: paintPill, toggleForced: toggleForced
    };
  })();

  /* ---------- Vom Gerät abspielen: geladene Titel laufen in der normalen Player-Oberfläche (ohne Server) ----------
     Dieses Modul ist nur die Wiedergabe-Quelle (eigenes Audio-Element, Warteschlange, Zufall, Wiederholen). Es liefert dem
     Player eine nachgebildete Sitzung; Leiste, Vollansicht, Songtext und Warteschlange sind dieselben wie online. */
  (function () {
    var extra = {
      de: {
        offPlayLocal: 'Vom Gerät abspielen', offPlayAll: 'Alle abspielen', offShuffleAll: 'Zufall', offFromDevice: 'Vom Gerät', offLocalFail: 'Titel nicht abspielbar',
        offNotAvail: 'Du bist offline. Dieser Titel ist nicht heruntergeladen.',
        fromPlaylistCtx: 'Wiedergabe aus Playlist', fromAlbumCtx: 'Wiedergabe aus Album', fromLikedCtx: 'Wiedergabe aus', fromMixCtx: 'Wiedergabe aus Mix',
        fromRadioCtx: 'Wiedergabe aus Radio', fromMixtapeCtx: 'Wiedergabe aus Mixtape', lyricsBig: 'Songtext vergrößern', lyricsSmall: 'Songtext verkleinern'
      },
      en: {
        offPlayLocal: 'Play from device', offPlayAll: 'Play all', offShuffleAll: 'Shuffle', offFromDevice: 'From device', offLocalFail: 'Track cannot be played',
        offNotAvail: 'You are offline. This track is not downloaded.',
        fromPlaylistCtx: 'Playing from playlist', fromAlbumCtx: 'Playing from album', fromLikedCtx: 'Playing from', fromMixCtx: 'Playing from mix',
        fromRadioCtx: 'Playing from radio', fromMixtapeCtx: 'Playing from mixtape', lyricsBig: 'Enlarge lyrics', lyricsSmall: 'Shrink lyrics'
      }
    };
    Object.keys(extra).forEach(function (l) { Object.keys(extra[l]).forEach(function (k) { STR[l][k] = extra[l][k]; }); });
  })();

  var OFFPLAY = (function () {
    var D = MLOff;
    var aud = null;                       // eigenes Audio-Element (Jellyfins Element bleibt unberührt)
    var P = { queue: [], order: [], idx: -1, shuffle: false, repeat: 'RepeatNone', cur: null, url: '', ctxId: '', name: '', startedAt: 0 };
    var tok = 0, covers = {}, coverWait = {}, handlers = false, active = false, items = {};

    function coverUrl(key) {
      if (!key) return Promise.resolve('');
      if (covers[key] != null) return Promise.resolve(covers[key]);
      if (coverWait[key]) return coverWait[key];
      coverWait[key] = D.getCover(key).then(function (b) { covers[key] = b ? URL.createObjectURL(b) : ''; delete coverWait[key]; return covers[key]; }, function () { delete coverWait[key]; return ''; });
      return coverWait[key];
    }
    // Titel im Format der Server-Antworten, damit alle Teile des Players ihn unverändert verwenden (ohne Album- und Künstler-IDs: nichts davon ist offline erreichbar)
    function itemOf(m) {
      var it = items[m.id];
      if (it) return it;
      it = {
        Id: m.id, Name: m.name || '', Artists: m.artists && m.artists.length ? m.artists.slice() : (m.artist ? [m.artist] : []),
        AlbumArtist: m.albumArtist || '', Album: m.album || '', ProductionYear: m.year || undefined, Genres: (m.genres || []).slice(),
        RunTimeTicks: m.ticks || 0, IndexNumber: m.index || undefined, ParentIndexNumber: m.disc || undefined,
        Type: 'Audio', MediaType: 'Audio', People: [], UserData: { IsFavorite: false }, __local: true
      };
      Object.defineProperty(it, '__cover', { enumerable: false, get: function () { return m.coverKey ? (covers[m.coverKey] || '') : ''; } });
      items[m.id] = it;
      return it;
    }

    function ensureAudio() {
      if (aud) return;
      aud = new Audio(); aud.preload = 'auto';
      try { var ja = document.querySelector('audio.mediaPlayerAudio'); if (ja && isFinite(ja.volume)) aud.volume = ja.volume; } catch (e) { /* Standard */ }
      aud.addEventListener('ended', function () { if (P.repeat === 'RepeatOne') { aud.currentTime = 0; aud.play(); } else advance(1); });
      aud.addEventListener('error', function () { if (P.cur && active) { toast(t('offLocalFail')); advance(1); } });
      ['play', 'pause', 'volumechange', 'seeked'].forEach(function (ev) { aud.addEventListener(ev, function () { if (active) { position(); Player.repaint(); } }); });
      aud.addEventListener('loadedmetadata', function () { position(); try { applySpeed(); } catch (e) { /* kein Tempo */ } });
      // Startet Jellyfin selbst eine Wiedergabe (anderer Titel, anderes Gerät), übernimmt sie: die lokale endet.
      document.addEventListener('play', function (e) {
        var a = e.target;
        if (active && a && a.classList && a.classList.contains('mediaPlayerAudio') && Date.now() - P.startedAt > 1500) stop();
      }, true);
    }
    function pauseServer() {
      try { var ja = document.querySelector('audio.mediaPlayerAudio'); if (ja && !ja.paused) ja.pause(); } catch (e) { /* kein Element */ }
      try { if (Player.targetId()) Player.adoptLocal(); } catch (e) { /* kein Player */ }
    }

    /* ---- Steuerung ---- */
    function buildOrder(first) {
      var n = P.queue.length, a = [], i;
      if (P.shuffle) {
        for (i = 0; i < n; i++) if (i !== first) a.push(i);
        for (i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), x = a[i]; a[i] = a[j]; a[j] = x; }
        if (first != null && first >= 0) a.unshift(first);
      } else for (i = 0; i < n; i++) a.push(i);
      P.order = a;
    }
    // Schlüssel der Download-Sammlung -> Schlüssel, unter dem der Player die Liste kennt (Playlist = ID, Album = album:ID)
    function ctxFromColl(k) {
      k = String(k || '');
      if (k.indexOf('pl:') === 0) return k.slice(3);
      if (k.indexOf('al:') === 0) return 'album:' + k.slice(3);
      return k;
    }
    // ids: Titel-IDs in Wiedergabereihenfolge; start: Index (-1 = beliebig); opts: { name, shuffle, ctx (Player-Schlüssel), coll (Download-Schlüssel) }
    function startIds(ids, start, opts) {
      opts = opts || {};
      return D.allTracks().then(function (all) {
        var byId = {}; all.forEach(function (x) { byId[x.id] = x; });
        var list = [], seen = {}, startId = start >= 0 && ids[start] ? nid(ids[start]) : '';
        ids.forEach(function (id) { var k = nid(id), m = byId[k]; if (m && !seen[k]) { seen[k] = 1; list.push(m); } });
        if (!list.length) { toast(t('offNotAvail')); return false; }
        var first = 0;
        if (start < 0) first = Math.floor(Math.random() * list.length);
        else if (startId) { for (var i = 0; i < list.length; i++) if (list[i].id === startId) { first = i; break; } }
        return Promise.all(list.slice(Math.max(0, first - 1), first + 2).map(function (m) { return coverUrl(m.coverKey); })).then(function () {
          ensureAudio();
          pauseServer();
          P.queue = list; P.name = opts.name || '';
          P.ctxId = opts.ctx ? String(opts.ctx) : ctxFromColl(opts.coll);
          if (opts.shuffle != null) P.shuffle = !!opts.shuffle;
          buildOrder(first); P.idx = 0; P.startedAt = Date.now();
          active = true;
          bindKeys();
          playCurrent();
          return true;
        });
      });
    }
    function current() { return P.queue[P.order[P.idx]] || null; }
    function playCurrent() {
      var tr = current();
      if (!tr) return;
      var my = ++tok;
      Promise.all([D.getBlob(tr.id), coverUrl(tr.coverKey)]).then(function (r) {
        if (my !== tok) return;
        var blob = r[0];
        if (!blob) { toast(t('offLocalFail')); return advance(1); }
        if (P.url) URL.revokeObjectURL(P.url);
        P.url = URL.createObjectURL(blob); P.cur = tr;
        aud.src = P.url;
        try { applySpeed(); } catch (e) { /* kein Tempo */ }
        var p = aud.play(); if (p && p.catch) p.catch(function () { Player.repaint(); });
        meta(tr);
        Player.syncLocal();
        // Umgebende Titel vorladen: Cover für Warteschlange und "Als Nächstes"
        for (var k = 1; k <= 4; k++) { var nx = P.queue[P.order[P.idx + k]]; if (nx) coverUrl(nx.coverKey); }
      }, function () { toast(t('offLocalFail')); });
    }
    function advance(dir) {
      if (!P.queue.length || !aud) return;
      var n = P.order.length, ni = P.idx + dir;
      if (ni >= n) {
        if (P.repeat === 'RepeatAll') ni = 0; else { aud.pause(); aud.currentTime = 0; Player.repaint(); return; }
      }
      if (ni < 0) { if (P.repeat === 'RepeatAll') ni = n - 1; else { aud.currentTime = 0; return; } }
      P.idx = ni; playCurrent();
    }
    function jump(i) { if (!active || i < 0 || i >= P.order.length) return; P.idx = i; playCurrent(); }
    function stop() {
      if (!active) return;
      active = false; tok++;
      if (aud) { aud.pause(); aud.removeAttribute('src'); try { aud.load(); } catch (e) { /* egal */ } }
      if (P.url) { URL.revokeObjectURL(P.url); P.url = ''; }
      P.cur = null; P.queue = []; P.order = []; P.idx = -1; P.ctxId = ''; P.name = ''; items = {};
      try { if ('mediaSession' in navigator) navigator.mediaSession.metadata = null; } catch (e) { /* egal */ }
      Player.dropLocal();
    }
    function setShuffle(on) {
      P.shuffle = !!on;
      if (P.queue.length && P.cur) { var ci = P.order[P.idx]; buildOrder(P.shuffle ? ci : null); P.idx = P.shuffle ? 0 : ci; }
      Player.syncLocal();
    }
    function setRepeat(mode) { P.repeat = mode === 'RepeatAll' || mode === 'RepeatOne' ? mode : 'RepeatNone'; Player.syncLocal(); }

    // Nachgebildete Sitzung im Format des Servers
    function session() {
      if (!active || !P.cur || !aud) return null;
      var vol = Math.round(Math.pow(Math.max(0, Math.min(1, aud.volume)), 1 / 3) * 100);
      return {
        Id: 'local', DeviceName: '', Client: 'Music Look', SupportsRemoteControl: false, UserId: uid(),
        NowPlayingItem: itemOf(P.cur),
        PlayState: { IsPaused: aud.paused, PositionTicks: Math.round((aud.currentTime || 0) * 1e7), RepeatMode: P.repeat, PlaybackOrder: P.shuffle ? 'Shuffle' : 'Default', VolumeLevel: vol },
        NowPlayingQueue: P.order.map(function (i) { return { Id: P.queue[i].id, PlaylistItemId: 'l' + i }; })
      };
    }
    // Titel der Warteschlange (für die Listen) samt geladenen Covern
    function itemFor(id) {
      var k = nid(id);
      for (var i = 0; i < P.queue.length; i++) if (P.queue[i].id === k) return itemOf(P.queue[i]);
      return null;
    }
    function preload(ids) {
      var jobs = [];
      ids.forEach(function (id) { var k = nid(id); for (var i = 0; i < P.queue.length; i++) if (P.queue[i].id === k) { jobs.push(coverUrl(P.queue[i].coverKey)); break; } });
      return Promise.all(jobs);
    }

    /* ---- Sperrbildschirm (Media Session). Jellyfin bindet seine Tasten nur einmal; sie werden hier ersetzt und leiten bei
       Serverwiedergabe an dieselbe Sitzung weiter. ---- */
    function serverCmd(path) { return withSession(function (s) { return sessionCall(s, path); }).then(function () { Player.kick(); }, function () { /* egal */ }); }
    function bindKeys() {
      if (handlers || !('mediaSession' in navigator)) return;
      handlers = true;
      var set = function (a, f) { try { navigator.mediaSession.setActionHandler(a, f); } catch (e) { /* nicht unterstützt */ } };
      set('play', function () { if (active) aud.play(); else Player.toggle(); });
      set('pause', function () { if (active) aud.pause(); else Player.toggle(); });
      set('previoustrack', function () { if (active) { if (aud.currentTime > 3) aud.currentTime = 0; else advance(-1); } else serverCmd('Playing/PreviousTrack'); });
      set('nexttrack', function () { if (active) advance(1); else serverCmd('Playing/NextTrack'); });
      set('seekto', function (d) { if (active && d && d.seekTime != null) aud.currentTime = d.seekTime; });
    }
    function meta(tr) {
      if (!('mediaSession' in navigator)) return;
      coverUrl(tr.coverKey).then(function (u) {
        try { navigator.mediaSession.metadata = new MediaMetadata({ title: tr.name, artist: tr.artist, album: tr.album, artwork: u ? [{ src: u, sizes: '400x400', type: 'image/jpeg' }] : [] }); } catch (e) { /* ältere Browser */ }
      });
    }
    function position() {
      if (!aud || !('mediaSession' in navigator) || !navigator.mediaSession.setPositionState || !isFinite(aud.duration)) return;
      try { navigator.mediaSession.setPositionState({ duration: aud.duration, playbackRate: aud.playbackRate || 1, position: Math.min(aud.currentTime || 0, aud.duration) }); } catch (e) { /* egal */ }
    }

    // Offline: nur die geladenen Titel der Liste abspielen (Position des gewünschten Titels bleibt erhalten)
    function offlineIds(ids, start) {
      var keep = [], want = start >= 0 && ids[start] ? nid(ids[start]) : '', ns = -1;
      ids.forEach(function (id) { if (OFF.has(id)) { if (want && nid(id) === want && ns < 0) ns = keep.length; keep.push(id); } });
      return { ids: keep, start: want ? ns : start };
    }
    return {
      startIds: startIds, stop: stop, audio: function () { return aud; }, active: function () { return active; },
      recentlyStarted: function () { return Date.now() - P.startedAt < 4000; },
      offlineIds: offlineIds, session: session, itemFor: itemFor, itemOf: itemOf, preload: preload, coverUrl: coverUrl,
      next: function () { advance(1); }, prev: function () { advance(-1); }, jump: jump, setShuffle: setShuffle, setRepeat: setRepeat,
      ctxId: function () { return active ? P.ctxId : ''; }, name: function () { return P.name; }, ctxFromColl: ctxFromColl
    };
  })();

  /* ---------- Player ---------- */
  var Player = (function () {
    var P = {
      session: null, item: null, full: null, paused: true, pos: 0, dur: 0, repeat: 'RepeatNone', shuffle: false, volume: 100,
      queue: [], at: 0, fav: false, lyrics: undefined, targetId: null, targetName: '', misses: 0, pal: null, auto: false, ctxId: ''
    };
    var pollTimer = null, tickTimer = null, fastUntil = 0, polling = false, running = false;
    var lastPollAt = 0, pollStartedAt = 0, pollSeq = 0, transferBusy = false;
    var autoOff = false, autoMiss = 0, ctxSig = '', ctxTok = 0, plIdsCache = {}, likedCache = { at: 0, ver: -1, ids: null };
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
      if (OFFPLAY.active()) return OFFPLAY.audio();   // Wiedergabe vom Geraet (heruntergeladene Titel)
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
      if (/\b(tv|tvos|roku|fire|chromecast|webos|tizen|kodi|apple tv|shield)\b/.test(n)) return 'tv';
      if (/(phone|pixel|iphone|android|galaxy|ios|ipad|tablet|mobile|\bsm-)/.test(n)) return 'phone';
      return 'computer';
    }
    // Geraete, die Musik gar nicht abspielen koennen (z. B. Swiftfin: reiner Videoplayer), werden nicht als Ziel angeboten.
    // PlayableMediaTypes ist beim Server nie leer-nullable, aber leer, wenn der Client nichts meldet: dann wird es nicht ausgeschlossen.
    function canPlayAudio(s) {
      var m = s && s.PlayableMediaTypes;
      return !(m && m.length && m.indexOf('Audio') < 0);
    }
    function thisDeviceId() { var c = ML.client(); return c && c.deviceId ? c.deviceId() : ''; }

    // auto = true: Das Geraet wurde nicht gewaehlt, sondern automatisch uebernommen, weil dort Musik laeuft (wird nicht gemerkt).
    function setTarget(id, name, auto) {
      P.targetId = id || null; P.targetName = id ? (name || '') : ''; P.misses = 0; P.auto = !!(id && auto); autoMiss = 0;
      try {
        if (id && !auto) window.sessionStorage.setItem('ml.target', JSON.stringify({ id: id, name: P.targetName }));
        else window.sessionStorage.removeItem('ml.target');
      } catch (e) { /* kein Speicher */ }
      sessCache.at = 0;
      paint();
    }
    // Uebernimmt die Wiedergabe auf diesem Geraet (z. B. beim Abspielen im Browser, waehrend das Handy spielt): das beobachtete Geraet wird gestoppt.
    function releaseAuto() {
      if (!P.auto || !P.targetId) return;
      var old = P.targetId;
      setTarget(null, '');
      call('POST', 'Sessions/' + old + '/Playing/Stop').catch(function () { /* ignorieren */ });
    }

    function sessionsOfUser() {
      return call('GET', 'Sessions', { ControllableByUserId: uid() }).then(function (r) {
        var me = nid(uid());
        return (r || []).filter(function (x) { return nid(x.UserId) === me; });
      });
    }
    // Aktueller Zustand der gesteuerten Sitzung (dieses Geraet oder das gewaehlte Zielgeraet).
    // Spielt dieses Geraet nichts, wird ein anderes Geraet desselben Benutzers, auf dem Musik laeuft, automatisch angezeigt
    // (wie bei Spotify: auf dem Handy hoeren, im Browser sehen und steuern).
    function fetchState() {
      if (OFFPLAY.active()) { var ls = OFFPLAY.session(); if (ls) return Promise.resolve(ls); }
      if (Net.offline()) return Promise.reject(offlineError());
      if (P.targetId && !P.auto) {
        return call('GET', 'Sessions', { ControllableByUserId: uid() }).then(function (r) {
          var s = (r || []).filter(function (x) { return x.Id === P.targetId; })[0] || null;
          if (s) { P.misses = 0; P.targetName = deviceLabel(s); return s; }
          if (++P.misses >= 3) { setTarget(null); return mySession(); }   // Zielgeraet nicht mehr erreichbar
          return P.session;
        });
      }
      var here = thisDeviceId();
      if (!here) return mySession();
      return sessionsOfUser().then(function (list) {
        var mine = list.filter(function (x) { return x.DeviceId === here; });
        mine = mine.filter(function (x) { return x.SupportsRemoteControl !== false; })[0] || mine[0] || null;
        if (mine && mine.NowPlayingItem) { if (P.auto) setTarget(null); autoOff = false; return mine; }
        var cur = P.auto ? list.filter(function (x) { return x.Id === P.targetId; })[0] : null;
        if (cur && cur.NowPlayingItem) { autoMiss = 0; P.targetName = deviceLabel(cur); return cur; }
        if (P.auto) {
          if (++autoMiss < 2) return cur || P.session;   // kurze Luecke (Titelwechsel) ueberbruecken
          setTarget(null);
        }
        if (!autoOff && !transferBusy) {
          var other = list.filter(function (x) {
            return x.DeviceId !== here && x.SupportsRemoteControl !== false && canPlayAudio(x) && x.NowPlayingItem && x.NowPlayingItem.MediaType === 'Audio';
          }).sort(function (a, b) { return String(b.LastActivityDate || '') < String(a.LastActivityDate || '') ? -1 : 1; })[0];
          if (other) { setTarget(other.Id, deviceLabel(other), true); return other; }
        }
        return mine;
      });
    }

    function listDevices() {
      return call('GET', 'Sessions', { ControllableByUserId: uid(), activeWithinSeconds: 960 }).then(function (r) {
        var me = nid(uid()), here = thisDeviceId();
        var list = (r || []).filter(function (s) { return nid(s.UserId) === me && s.SupportsRemoteControl !== false && canPlayAudio(s) && (s.DeviceName || s.Client); });
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

    // Prueft, ob das Zielgeraet den Titel wirklich spielt (Sitzung meldet ihn oder das lokale Audio-Element laeuft damit).
    function startedOn(target, toThis, itemId, tries) {
      function look() {
        if (toThis) {
          var a = document.querySelector('audio.mediaPlayerAudio');
          if (a && !a.paused && nid(a.currentSrc || a.src || '').indexOf(nid(itemId)) >= 0) return Promise.resolve(true);
        }
        var req = toThis ? mySession() : call('GET', 'Sessions', { ControllableByUserId: uid() }).then(function (r) {
          return (r || []).filter(function (x) { return x.Id === target.Id; })[0] || null;
        });
        return req.then(function (sess) { return !!(sess && sess.NowPlayingItem && nid(sess.NowPlayingItem.Id) === nid(itemId)); }, function () { return false; });
      }
      return look().then(function (ok) {
        if (ok || tries <= 0) return ok;
        return new Promise(function (r) { setTimeout(r, 500); }).then(function () { return startedOn(target, toThis, itemId, tries - 1); });
      });
    }

    // Uebertraegt die Wiedergabe (Warteschlange, Titel, Position) auf ein anderes Geraet und stoppt sie auf dem bisherigen.
    // Das bisherige Geraet wird erst gestoppt, wenn das neue den Titel wirklich spielt; bei Ausbleiben wird einmal wiederholt,
    // danach bleibt alles beim Alten (kein Zustand, in dem nirgends Musik laeuft und die Anzeige fehlt).
    function transferTo(target) {
      if (transferBusy) return Promise.resolve(false);
      transferBusy = true;
      var toThis = target.DeviceId === thisDeviceId();
      function done(v) { transferBusy = false; return v; }
      return fetchState().then(function (cur) {
        var srcId = cur && cur.Id;
        if (srcId && srcId === target.Id) return true;
        var oldId = P.targetId, oldName = P.targetName, oldAuto = P.auto;
        var np = cur && cur.NowPlayingItem;
        var ps = (cur && cur.PlayState) || {};
        var q = cur ? (cur.NowPlayingQueue || []).map(function (x) { return x.Id; }) : [];
        var idx = np ? q.map(nid).indexOf(nid(np.Id)) : -1;
        if (np && idx < 0) { q = [np.Id]; idx = 0; }
        setTarget(toThis ? null : target.Id, toThis ? '' : deviceLabel(target));
        autoOff = toThis;   // bewusst "dieses Geraet" gewaehlt: nicht wieder automatisch ein anderes Geraet anzeigen
        if (!np) { kick(); return true; }   // nichts zu uebertragen: nur das Ziel wechseln
        var tries = 0;
        function attempt() {
          tries++;
          return playIds(q, idx, { positionTicks: ps.PositionTicks || 0, quiet: true }).then(function (ok) {
            if (!ok) return tries < 2 ? attempt() : false;
            return startedOn(target, toThis, np.Id, 16).then(function (seen) { return seen ? true : (tries < 2 ? attempt() : false); });
          });
        }
        return attempt().then(function (ok) {
          if (!ok) {
            // Ziel hat nicht reagiert: Ziel wieder entfernen, falls dort doch noch etwas startet, und beim bisherigen Geraet bleiben.
            if (!toThis) call('POST', 'Sessions/' + target.Id + '/Playing/Stop').catch(function () { /* ignorieren */ });
            setTarget(oldId, oldName, oldAuto);
            autoOff = false;
            kick();
            return false;
          }
          if (srcId) call('POST', 'Sessions/' + srcId + '/Playing/Stop').catch(function () { /* Quelle war schon still */ });
          if (ps.IsPaused) setTimeout(function () { command('Playing/Pause').catch(function () { /* ignorieren */ }); }, 1500);
          if (ps.RepeatMode && ps.RepeatMode !== 'RepeatNone') {
            setTimeout(function () { command('Command', null, { Name: 'SetRepeatMode', Arguments: { RepeatMode: ps.RepeatMode } }).catch(function () { /* ignorieren */ }); }, 1800);
          }
          kick();
          return true;
        });
      }).then(done, function () { return done(false); });
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
            if (busy || transferBusy || active) { if (active && !busy) ui2.close(); return; }
            busy = true;
            row.disabled = true;
            row.classList.add('ml-busy');
            var subEl = row.querySelector('.ml-dev-sub');
            if (subEl) subEl.textContent = t('deviceSwitching');
            function fin(ok) {
              busy = false;
              if (ok) { toast(t('deviceSwitched', isThis ? t('thisDevice') : deviceLabel(s))); ui2.close(); }
              else { row.disabled = false; row.classList.remove('ml-busy'); toast(t('deviceFailed')); refresh(); }
            }
            transferTo(s).then(fin, function () { fin(false); });
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
      ui.miniText = txt;
      add(open, ui.miniCover, txt);
      open.addEventListener('click', openFull);
      attachSwipe(open, function () { return [ui.miniCover, ui.miniText]; });
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
    var npMq = null;
    try { npMq = window.matchMedia('(min-width: 1180px)'); } catch (e) { npMq = null; }
    function npRoom() { return npMq ? npMq.matches : true; }
    if (npMq) {
      var onNpMq = function () { if (running) paint(); };
      if (npMq.addEventListener) npMq.addEventListener('change', onNpMq); else if (npMq.addListener) npMq.addListener(onNpMq);
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
        if (!P.item) return;
        if (lyPanel) { lyPanel.close(); return; }
        loadLyrics(P.item.Id).then(function (ly) { if (ly) { P.lyrics = ly; openLyricsPanel(); } else toast(t('lyricsNone')); });
      });
      ui.bQueue = iconBtn('queue', t('queueTitle'), 'ml-bar-icon', function () { if (queuePanel) queuePanel.close(); else openQueuePanel(); });
      ui.bDevBtn = iconBtn('devices', t('devices'), 'ml-bar-icon ml-bar-devbtn', openDevices);
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
      if (P.pal) setPalette(np, P.pal);
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
      ui.bNpBtn.hidden = !npRoom();
      swapIcon(ui.bVolIc, P.volume > 0 ? 'volume' : 'volume_off', t('mute'));
      if (document.activeElement !== ui.bVol) { ui.bVol.value = String(Math.round(P.volume)); paintRange(ui.bVol); }
    }

    function paintNp(it, sub) {
      if (!np) return;
      var show = isWide() && npRoom() && !npHidden;
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
      ui.fullStage = stage;
      attachSwipe(stage, function () { return [ui.fullCover, ui.fullText]; });

      ui.meta = el('div', 'ml-full-meta');
      var txt = el('div', 'ml-full-text');
      ui.fullTitle = el('div', 'ml-full-title');
      ui.fullArtist = btn('ml-full-artist');
      ui.fullArtist.addEventListener('click', function () {
        var it = P.full || P.item;
        if (it && it.ArtistItems && it.ArtistItems.length) { closeFull(); openArtist(it.ArtistItems); }
      });
      add(txt, ui.fullTitle, ui.fullArtist);
      ui.fullText = txt;
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
      var footMid = el('div', 'ml-foot-mid');
      ui.speedBtn = btn('ml-foot-btn');
      ui.speedBtn.addEventListener('click', openSpeed);
      ui.shareBtn = iconBtn('share', t('shareTrack'), 'ml-foot-icon', shareTrack);
      ui.queueBtn = iconBtn('queue', t('queueTitle'), 'ml-foot-icon', openQueuePanel);
      ui.eqBtn = iconBtn('equalizer', t('eqTitle'), 'ml-foot-icon ml-eq-btn-foot', openEqualizer);
      ui.eqBtn.classList.toggle('ml-on', EQ.isActive(EQ.load()));
      EQ.onChange(function () { if (ui.eqBtn) ui.eqBtn.classList.toggle('ml-on', EQ.isActive(EQ.load())); });
      add(footMid, ui.eqBtn, ui.speedBtn, ui.shareBtn);
      add(foot, ui.devBtn, footMid, ui.queueBtn);   // Geräte links, Equalizer / Geschwindigkeit / Teilen genau in der Mitte, Warteschlange rechts
      block.appendChild(foot);
      ui.devLine = el('div', 'ml-dev-line'); ui.devLine.hidden = true;
      block.appendChild(ui.devLine);
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
      if (OFFPLAY.active()) return Promise.reject(new Error('local'));
      return withSession(function (s) { return call('POST', 'Sessions/' + s.Id + '/' + path, params || null, body); });
    }
    // Laeuft die Musik auf diesem Geraet, steuern Pause, Spulen und Lautstaerke das Audio-Element des Web-Clients direkt.
    // Das ist dasselbe, was Jellyfin selbst tut (player.pause()/unpause()/currentTime()), nur ohne Umweg ueber den Server:
    // sofort, auch bei ausgelastetem Server, und es funktioniert auch ohne WebSocket-Verbindung.
    function canSeekLocal(a, sec) {
      if (!a) return false;
      if (/\.m3u8/i.test(a.currentSrc || a.src || '')) return true;
      try { return !!(a.seekable && a.seekable.length > 0 && a.seekable.end(a.seekable.length - 1) + 0.5 >= sec); } catch (e) { return false; }
    }
    function seekTo(sec) {
      sec = Math.max(0, sec);
      var a = audioEl();
      if (canSeekLocal(a, sec)) {
        try { a.currentTime = sec; P.pos = sec; P.at = Date.now(); progress(); return Promise.resolve(); } catch (e) { /* weiter mit Server-Befehl */ }
      }
      return command('Playing/Seek', { seekPositionTicks: Math.round(sec * 1e7) }).then(function () { P.pos = sec; P.at = Date.now(); kick(); });
    }
    function skip(cmd) {
      var a = audioEl();
      skipDir = cmd === 'PreviousTrack' ? -1 : 1; skipAt = Date.now();
      // Wie bei Spotify: "Zurueck" springt nach ein paar Sekunden zuerst an den Anfang des Titels.
      if (cmd === 'PreviousTrack' && a && a.currentTime > 3 && canSeekLocal(a, 0)) { seekTo(0); return; }
      if (OFFPLAY.active()) { if (cmd === 'NextTrack') OFFPLAY.next(); else OFFPLAY.prev(); return; }
      command('Playing/' + cmd).then(function () { kick(); }, function () { toast(t('playFailed')); });
    }

    /* ---------- Titelwechsel: neuer Titel gleitet von rechts herein, der alte nach links hinaus (Weiter/Zurueck und Wischen) ---------- */
    var skipDir = 1, skipAt = 0, swipePend = null, swipeBlockUntil = 0;
    var reduceMotion = false;
    try { reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { reduceMotion = false; }
    function canAnimate() { return !reduceMotion && !document.hidden && typeof Element !== 'undefined' && !!Element.prototype.animate; }
    // Welche Teile wechseln: ist die Vollansicht offen, deren Cover und Text; sonst die Mini-Leiste (Handy).
    function slideScope() {
      if (fullOpen && full && !full.hidden) return { host: full, els: [ui.fullCover, ui.fullText] };
      if (mini && !mini.hidden && !mini.classList.contains('ml-idle')) return { host: mini, els: [ui.miniCover, ui.miniText] };
      return null;
    }
    function travelOf(r) { return Math.round(Math.min(r.width * 0.9 + 30, 380)); }
    function dropLayer(layer) { if (layer && layer.parentNode) layer.parentNode.removeChild(layer); }
    function beginSwap() {
      var pend = swipePend;
      swipePend = null;
      if (pend) clearTimeout(pend.timer);
      var sc = canAnimate() ? slideScope() : null;
      if (!sc) { if (pend) clearHold(pend.els); return null; }
      var dir = pend ? pend.dir : (Date.now() - skipAt < 15000 ? skipDir : 1);
      var hr = sc.host.getBoundingClientRect();
      var items = [];
      var layer = null;
      sc.els.forEach(function (t) {
        if (!t) return;
        var held = pend && pend.els.indexOf(t) >= 0;
        var r = t.getBoundingClientRect();
        if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > window.innerHeight) { if (held) clearHold([t]); return; }
        var g = null;
        if (!held) {
          g = t.cloneNode(true);
          g.classList.add('ml-ghost');
          g.style.cssText = 'position:absolute;margin:0;left:' + Math.round(r.left - hr.left) + 'px;top:' + Math.round(r.top - hr.top) + 'px;width:' + Math.round(r.width) + 'px;height:' + Math.round(r.height) + 'px;';
          if (!layer) { layer = el('div', 'ml-ghost-layer'); sc.host.appendChild(layer); }
          layer.appendChild(g);
        }
        items.push({ t: t, g: g, d: travelOf(r), held: held });
      });
      return function run() {
        var dur = 340, ease = 'cubic-bezier(0.22, 0.8, 0.3, 1)';
        items.forEach(function (it) {
          try {
            if (it.g) it.g.animate([{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(' + (-dir * it.d) + 'px)', opacity: 0 }], { duration: dur, easing: ease, fill: 'forwards' });
            if (it.held) clearHold([it.t]);
            it.t.animate([{ transform: 'translateX(' + (dir * it.d) + 'px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], { duration: dur, easing: ease });
          } catch (e) { /* ohne Animation weiter */ }
        });
        if (layer) setTimeout(function () { dropLayer(layer); }, dur + 120);
      };
    }
    function clearHold(els) {
      els.forEach(function (t) { if (t) { t.style.transform = ''; t.style.opacity = ''; t.style.transition = ''; } });
    }
    // Wischen: waehrend des Ziehens folgen Cover und Text dem Finger; nach genug Weg wird weitergeschaltet.
    function attachSwipe(host, getEls) {
      host.classList.add('ml-swipe');
      var st = null;
      function hasNext() {
        if (!P.item) return false;
        if (P.repeat === 'RepeatAll') return true;
        var i = -1;
        for (var k = 0; k < P.queue.length; k++) if (nid(P.queue[k].Id) === nid(P.item.Id)) { i = k; break; }
        return i < 0 ? true : i < P.queue.length - 1;
      }
      function drag(dx) {
        getEls().forEach(function (t) {
          if (!t) return;
          t.style.transition = 'none';
          t.style.transform = 'translateX(' + Math.round(dx * 0.7) + 'px)';
          t.style.opacity = String(Math.max(0.25, 1 - Math.abs(dx) / 420));
        });
      }
      function snapBack() {
        getEls().forEach(function (t) {
          if (!t) return;
          t.style.transition = 'transform 0.22s ease, opacity 0.22s ease';
          t.style.transform = ''; t.style.opacity = '';
          setTimeout(function () { if (!swipePend) t.style.transition = ''; }, 260);
        });
      }
      function commit(dir) {
        var els = getEls().filter(Boolean);
        var d = Math.round(Math.min(window.innerWidth, 640) * 0.8);
        els.forEach(function (t) {
          t.style.transition = 'transform 0.18s ease-in, opacity 0.18s ease-in';
          t.style.transform = 'translateX(' + (-dir * d) + 'px)'; t.style.opacity = '0';
        });
        var pend = { els: els, dir: dir, timer: null };
        pend.timer = setTimeout(function () {   // Wechsel blieb aus: Ansicht wieder einblenden
          if (swipePend !== pend) return;
          swipePend = null;
          els.forEach(function (t) { t.style.transition = 'transform 0.25s ease, opacity 0.25s ease'; t.style.transform = ''; t.style.opacity = ''; });
          setTimeout(function () { clearHold(els); }, 300);
        }, 3500);
        swipePend = pend;
        skip(dir > 0 ? 'NextTrack' : 'PreviousTrack');
      }
      host.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' || e.isPrimary === false || !P.item || swipePend) { st = null; return; }
        st = { x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId, on: false, dx: 0 };
      });
      host.addEventListener('pointermove', function (e) {
        if (!st || e.pointerId !== st.id) return;
        var dx = e.clientX - st.x, dy = e.clientY - st.y;
        if (!st.on) {
          if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.3) { st.on = true; try { host.setPointerCapture(e.pointerId); } catch (x) { /* ohne Capture */ } }
          else { if (Math.abs(dy) > 14) st = null; return; }
        }
        st.dx = dx;
        drag(dx);
      });
      function end(e, cancelled) {
        if (!st || e.pointerId !== st.id) return;
        var s = st; st = null;
        if (!s.on) return;
        swipeBlockUntil = Date.now() + 350;
        var dx = s.dx, dt = Math.max(1, Date.now() - s.t), v = Math.abs(dx) / dt;
        var far = Math.abs(dx) > 70 || (Math.abs(dx) > 35 && v > 0.45);
        if (cancelled || !far) { snapBack(); return; }
        var dir = dx < 0 ? 1 : -1;
        var a = audioEl();
        if (dir > 0 && !hasNext()) { snapBack(); return; }
        if (dir < 0 && a && a.currentTime > 3) { snapBack(); skip('PreviousTrack'); return; }   // erst an den Anfang des Titels
        commit(dir);
      }
      host.addEventListener('pointerup', function (e) { end(e, false); });
      host.addEventListener('pointercancel', function (e) { end(e, true); });
      // Nach dem Wischen soll kein Klick (Player oeffnen, Cover tippen) ausgeloest werden.
      host.addEventListener('click', function (e) { if (Date.now() < swipeBlockUntil) { e.stopPropagation(); e.preventDefault(); } }, true);
    }

    // Pause/Wiedergabe fuer andere Geraete: der Befehl ist idempotent, daher wird er einmal wiederholt, falls der Zustand ausbleibt.
    var pendingPause = null;
    function remoteSetPaused(want) {
      P.paused = want; P.pos = position(); P.at = Date.now();
      var token = { want: want, until: Date.now() + 6000 };
      pendingPause = token;
      paint(); markContext();
      function send() { return command('Playing/' + (want ? 'Pause' : 'Unpause')); }
      send().then(function () { kick(); }, function () { /* Pruefung unten */ });
      setTimeout(function () {
        if (pendingPause !== token) return;
        send().then(function () { kick(); }, function () { /* Pruefung unten */ });
      }, 2500);
      setTimeout(function () {
        if (pendingPause !== token) return;
        pendingPause = null;
        toast(t('playFailed'));
        kick();
      }, 6000);
    }
    function toggle() {
      var a = audioEl();
      if (a) {
        var res = null;
        try { res = a.paused ? a.play() : a.pause(); } catch (e) { res = Promise.reject(e); }
        paint(); markContext();
        if (res && typeof res.catch === 'function') res.catch(function () { remoteSetPaused(!a.paused); });
        return;
      }
      remoteSetPaused(!isPaused());
    }
    function cycleRepeat() {
      var next = P.repeat === 'RepeatNone' ? 'RepeatAll' : P.repeat === 'RepeatAll' ? 'RepeatOne' : 'RepeatNone';
      P.repeat = next; paint();
      if (OFFPLAY.active()) { OFFPLAY.setRepeat(next); return; }
      command('Command', null, { Name: 'SetRepeatMode', Arguments: { RepeatMode: next } }).then(function () { kick(); });
    }
    function setShuffle(on) {
      P.shuffle = on; paint();
      if (OFFPLAY.active()) { OFFPLAY.setShuffle(on); return; }
      command('Command', null, { Name: 'SetShuffleQueue', Arguments: { ShuffleMode: on ? 'Shuffle' : 'Sorted' } }).then(function () { kick(); });
    }
    function setVolume(v) {
      v = Math.max(0, Math.min(100, Math.round(v)));
      P.volume = v;
      var a = audioEl();
      if (a) {
        try { a.volume = Math.pow(v / 100, 3); } catch (e) { /* weiter mit Server-Befehl */ }   // gleiche Kurve wie Jellyfins Audio-Player
        paint();
        return;
      }
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
      // Computer-Ansicht: Warteschlange und Songtext oeffnen sich in der rechten Spalte (wie bei Spotify), nicht im Vollbild.
      var inNp = isWide() && npRoom() && !fullOpen;
      if (inNp) { if (npHidden) setNpHidden(false); ensureNp(); } else { ensureFull(); if (!fullOpen) openFull(); }
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
      head.appendChild(iconBtn(inNp ? 'close' : 'down', t('close'), '', function () { handle.close(); }));
      var txt = el('div', 'ml-panel-text');
      txt.appendChild(el('div', 'ml-panel-title', title));
      if (sub) txt.appendChild(el('div', 'ml-panel-sub', sub));
      head.appendChild(txt);
      p.appendChild(head);
      handle.body = el('div', 'ml-panel-body');
      p.appendChild(handle.body);
      if (inNp) { p.classList.add('ml-panel-np'); np.appendChild(p); } else full.appendChild(p);
      panels.push(handle);
      handle.entry = OV.push(handle.close);
      return handle;
    }
    function closePanels(fromHistory) { panels.slice().reverse().forEach(function (p) { p.close(fromHistory); }); }

    function ensureNames(ids) {
      if (OFFPLAY.active()) {   // Titel vom Geraet: Namen und Cover kommen von dort, nicht vom Server
        return OFFPLAY.preload(ids).then(function () { ids.forEach(function (id) { var it = OFFPLAY.itemFor(id); if (it) queueNames[nid(id)] = it; }); });
      }
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
        var firstAuto = -1;
        q.forEach(function (x, i) { if (firstAuto < 0 && i > curIdx && autoAdded[nid(x.Id)]) firstAuto = i; });
        q.forEach(function (x, i) {
          if (i === firstAuto) box.appendChild(el('div', 'ml-queue-sep', t('autoQueue')));
          var it = queueNames[nid(x.Id)] || (P.item && nid(P.item.Id) === nid(x.Id) ? P.item : null);
          var row = btn('ml-list-row ml-queue-row' + (i === curIdx ? ' ml-playing' : ''));
          row.appendChild(cover(it ? itemImg(it, 96) : null, 'ml-row-cover'));
          var txt = el('div', 'ml-row-text');
          txt.appendChild(el('div', 'ml-row-title', it ? it.Name : '…'));
          txt.appendChild(el('div', 'ml-row-sub', i === curIdx ? t('queueNow') : (it ? firstArtist(it) : '')));
          row.appendChild(txt);
          row.addEventListener('click', function () { if (OFFPLAY.active()) OFFPLAY.jump(i); else playIds(ids, i); });
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
      // Ohne Server (offline oder Wiedergabe vom Geraet): der beim Herunterladen gespeicherte Songtext
      if (OFFPLAY.active() || Net.offline()) return OFF.lyricsOf(id);
      return call('GET', 'Audio/' + id + '/Lyrics').then(function (r) {
        lyricCache[k] = lyricsFrom(r);
        return lyricCache[k];
      }, function (err) {
        if (err && err.status === 404) lyricCache[k] = null;   // kein Songtext; andere Fehler spaeter erneut versuchen
        else if (err && typeof err.status !== 'number') return OFF.lyricsOf(id);   // Verbindung weg: gespeicherten Songtext zeigen
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
      var head = el('div', 'ml-card-head');
      head.appendChild(el('h3', 'ml-card-title', t('lyrics')));
      c.classList.toggle('ml-card-plain', !L);
      ui.lyBody = null;
      if (L) head.appendChild(iconBtn('open_in_full', t('lyricsBig'), 'ml-ly-expand', openLyricsFull));
      c.appendChild(head);
      if (L === undefined) { c.appendChild(el('p', 'ml-card-muted', t('lyricsLoading'))); return; }
      if (!L) { c.appendChild(el('p', 'ml-card-muted', t('lyricsNone'))); return; }
      ui.lyBody = el('div', 'ml-ly-preview');
      ui.lyBody.setAttribute('role', 'button'); ui.lyBody.tabIndex = 0;
      ui.lyBody.addEventListener('click', openLyricsFull);
      ui.lyBody.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLyricsFull(); } });
      c.appendChild(ui.lyBody);
      fillLyricsPreview();
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
      var phead = lyPanel.el.querySelector('.ml-panel-head');
      if (phead && lyPanel.el.classList.contains('ml-panel-np')) phead.appendChild(iconBtn('open_in_full', t('lyricsBig'), 'ml-ly-expand ml-panel-expand', openLyricsFull));
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

    /* ---------- Songtext gross (wie bei Spotify): ganze Seite in der Farbe des Covers, grosse Zeilen, aktuelle Zeile hell ---------- */
    var lyFull = null, lyFullIdx = -2, lyFullFor = '', lyUserScroll = 0, lyFullEntry = null;
    function openLyricsFull() {
      if (lyFull || !P.item) return;
      var L = P.lyrics;
      if (!L) return;
      var layer = el('div', 'ml-lyfull');
      layer.setAttribute('role', 'dialog'); layer.setAttribute('aria-label', t('lyrics'));
      if (P.pal) setPalette(layer, P.pal);
      var top = el('div', 'ml-lyf-top');
      var txt = el('div', 'ml-lyf-text');
      var lt = el('div', 'ml-lyf-title'), la = el('div', 'ml-lyf-artist');
      add(txt, lt, la);
      var shrink = iconBtn('close_fullscreen', t('lyricsSmall'), 'ml-lyf-close', function () { closeLyricsFull(); });
      add(top, txt, shrink);
      var body = el('div', 'ml-lyf-body');
      ['wheel', 'touchmove', 'pointerdown'].forEach(function (ev) { body.addEventListener(ev, function () { lyUserScroll = Date.now() + 4500; }, { passive: true }); });
      var foot = el('div', 'ml-lyf-foot');
      var seek = el('input', 'ml-range ml-lyf-seek');
      seek.type = 'range'; seek.min = '0'; seek.max = '1000'; seek.value = '0'; seek.step = '1'; seek.setAttribute('aria-label', t('seekLabel'));
      var times = el('div', 'ml-seek-times');
      var tp = el('span', null, '0:00'), td = el('span', null, '0:00');
      add(times, tp, td);
      var ctl = el('div', 'ml-lyf-ctl');
      var bPrev = iconBtn('prev', t('prev'), 'ml-ctl ml-ctl-skip', function () { skip('PreviousTrack'); });
      var bPlay = iconBtn('play', t('play'), 'ml-ctl ml-ctl-play ml-lyf-play', toggle);
      var bNext = iconBtn('next', t('next'), 'ml-ctl ml-ctl-skip', function () { skip('NextTrack'); });
      add(ctl, bPrev, bPlay, bNext);
      add(foot, seek, times, ctl);
      add(layer, top, body, foot);
      var sk = false;
      seek.addEventListener('input', function () { sk = true; tp.textContent = fmtClock(duration() * seek.value / 1000); paintRange(seek); });
      seek.addEventListener('change', function () { seekTo(duration() * seek.value / 1000).then(function () { sk = false; }, function () { sk = false; }); });
      lyFull = { el: layer, body: body, title: lt, artist: la, seek: seek, tp: tp, td: td, play: bPlay, seeking: function () { return sk; } };
      document.body.appendChild(layer);
      lyFullEntry = OV.push(closeLyricsFull);
      lyFullFor = ''; lyFullIdx = -2; lyUserScroll = 0;
      fillLyricsFull();
      paintLyricsFull(true);
    }
    function closeLyricsFull(fromHistory) {
      if (!lyFull) return;
      var l = lyFull; lyFull = null;
      if (l.el.parentNode) l.el.parentNode.removeChild(l.el);
      if (fromHistory !== true) OV.release(lyFullEntry);
      lyFullEntry = null; lyFullIdx = -2; lyFullFor = '';
    }
    // Zeilen fuer den aktuellen Titel aufbauen (bei Titelwechsel neu; ohne Songtext schliesst die Ansicht)
    function fillLyricsFull() {
      if (!lyFull || !P.item) return;
      var L = P.lyrics, key = nid(P.item.Id);
      lyFull.title.textContent = P.item.Name;
      lyFull.artist.textContent = firstArtist(P.full || P.item) || '';
      if (lyFullFor === key) return;
      lyFullFor = key;
      lyFull.body.textContent = '';
      lyFull.body.scrollTop = 0;
      lyFullIdx = -2;
      lyFull.el.classList.toggle('ml-lyf-plain', !(L && L.synced));
      if (!L) { lyFull.body.appendChild(el('p', 'ml-lyf-none', L === undefined ? t('lyricsLoading') : t('lyricsNone'))); return; }
      L.lines.forEach(function (ln, i) {
        var d = el('div', 'ml-lyf-line' + (ln.text.trim() ? '' : ' ml-lyf-gap'), ln.text);
        if (L.synced && ln.t != null) {
          d.classList.add('ml-seekable');
          d.addEventListener('click', function () { lyUserScroll = 0; seekTo(ln.t).catch(function () { /* ignorieren */ }); });
        }
        lyFull.body.appendChild(d);
      });
    }
    function paintLyricsFull(jump) {
      if (!lyFull || !P.item) return;
      var L = P.lyrics;
      if (lyFullFor !== nid(P.item.Id)) fillLyricsFull();
      if (L === undefined && lyFull.loading !== nid(P.item.Id)) {   // Titelwechsel (z. B. am Computer ohne offene Vollansicht): Songtext nachladen
        var want = P.item.Id; lyFull.loading = nid(want);
        loadLyrics(want).then(function (ly) {
          if (!lyFull || !P.item || nid(P.item.Id) !== nid(want)) return;
          P.lyrics = ly; lyFullFor = ''; fillLyricsFull(); paintLyricsFull(true);
        });
      }
      var paused = isPaused();
      swapIcon(lyFull.play, paused ? 'play' : 'pause', paused ? t('play') : t('pause'));
      var d = duration(), p = Math.min(position(), d || position());
      if (!lyFull.seeking()) {
        lyFull.seek.value = String(d ? Math.round(p / d * 1000) : 0);
        paintRange(lyFull.seek);
        lyFull.tp.textContent = fmtClock(p);
      }
      lyFull.td.textContent = fmtClock(d);
      if (!L || !L.synced) return;
      var cur = lineIndex(L, p);
      if (cur === lyFullIdx && !jump) return;
      lyFullIdx = cur;
      var kids = lyFull.body.children;
      for (var i = 0; i < kids.length; i++) {
        kids[i].classList.toggle('ml-now', i === cur);
        kids[i].classList.toggle('ml-past', cur >= 0 && i < cur);
      }
      var node = cur >= 0 ? kids[cur] : null;
      if (node && (jump || Date.now() > lyUserScroll)) {
        // aktuelle Zeile in das obere Drittel holen (wie bei Spotify), nicht ganz in die Mitte
        var br = lyFull.body.getBoundingClientRect(), nr = node.getBoundingClientRect();
        var target = lyFull.body.scrollTop + (nr.top - br.top) - br.height * 0.3;
        try { lyFull.body.scrollTo({ top: Math.max(0, target), behavior: jump ? 'auto' : 'smooth' }); } catch (e) { lyFull.body.scrollTop = Math.max(0, target); }
      }
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
          row.addEventListener('click', function () { if (OFFPLAY.active()) OFFPLAY.jump(cur + 1 + k); else playIds(ids, cur + 1 + k); });
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
        if (lyFull) { lyFullFor = ''; fillLyricsFull(); paintLyricsFull(true); }
      });
    }


    /* ---------- Welche Playlist laeuft? (geraeteuebergreifend aus der Warteschlange der Sitzung abgeleitet) ---------- */
    function sameIds(a, b) {
      if (a.length !== b.length) return false;
      var x = a.map(nid).sort(), y = b.map(nid).sort();
      for (var i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
      return true;
    }
    function sameOrder(a, b) {
      if (a.length !== b.length) return false;
      for (var i = 0; i < a.length; i++) if (nid(a[i]) !== nid(b[i])) return false;
      return true;
    }
    // Ein langer Text wird in Teilen geladen; die Warteschlange ist dann das Ende der Playlist (ab dem gewaehlten Titel).
    function suffixIds(q, full) {
      if (q.length < 2 || q.length >= full.length || full.length <= PLAY_CHUNK) return false;
      return sameOrder(q, full.slice(full.length - q.length));
    }
    // Wie sicher passt die Warteschlange zu einer Liste? 3 = gleiche Reihenfolge, 2 = gleiche Titel (gemischt) oder Ende einer langen Liste, 0 = passt nicht.
    function matchLevel(q, full) {
      if (!full || !full.length) return 0;
      if (sameOrder(q, full)) return 3;
      if (sameIds(q, full) || suffixIds(q, full)) return 2;
      return 0;
    }
    function playlistIds(pl) {
      var c = plIdsCache[nid(pl.id)];
      var n = pl.item.ChildCount;
      if (c && c.n === n && Date.now() - c.at < 120000) return Promise.resolve(c.ids);
      return loadPlaylistTracks(pl.id).then(function (items) {
        var ids = items.map(function (x) { return x.Id; });
        plIdsCache[nid(pl.id)] = { n: n, at: Date.now(), ids: ids };
        return ids;
      });
    }
    function likedIds() {
      if (likedCache.ids && Date.now() - likedCache.at < 60000 && likedCache.ver === likedVer) return Promise.resolve(likedCache.ids);
      return loadLikedTracks().then(function (items) {
        likedCache = { at: Date.now(), ver: likedVer, ids: items.map(function (x) { return x.Id; }) };
        return likedCache.ids;
      });
    }
    function setCtx(id) {
      if (P.ctxId === id) return;
      P.ctxId = id;
      try { markContext(); } catch (e) { /* ignorieren */ }
      paintTopLabel();
    }
    // Oben in der Vollansicht: "Wiedergabe aus Playlist" und darunter der Name der Liste (auch offline); sonst das Album
    function ctxDisplay(it) {
      var k = P.ctxId, name = '', label = '', rest;
      if (!k) return null;
      if (k === 'liked') { label = t('fromLikedCtx'); name = t('liked'); }
      else if (k.indexOf('album:') === 0) {
        rest = k.slice(6); label = t('fromAlbumCtx');
        if (it && it.AlbumId && nid(it.AlbumId) === rest) name = it.Album || '';
        if (!name) { var ac = OFF.coll('al:' + rest); name = ac ? ac.name : ''; }
      } else if (/^(mix|radio|mixtape):/.test(k)) {
        label = t(k.indexOf('radio:') === 0 ? 'fromRadioCtx' : k.indexOf('mixtape:') === 0 ? 'fromMixtapeCtx' : 'fromMixCtx');
        name = mixTitles[k] || '';
        if (!name) { var mc = OFF.coll(k); name = mc ? mc.name : ''; }
      } else {
        label = t('fromPlaylistCtx');
        var pl = ((plCache.list || (peekLists() || {}).pls || [])).filter(function (x) { return nid(x.id) === k; })[0];
        name = pl ? pl.item.Name : '';
        if (!name) { var pc = OFF.coll('pl:' + k); name = pc ? pc.name : ''; }
      }
      return name ? { label: label, name: name } : null;
    }
    function paintTopLabel() {
      if (!full || !P.item || !ui.topKicker) return;
      var it = P.full || P.item, cd = ctxDisplay(it);
      ui.topKicker.textContent = cd ? cd.label : (it.Album ? t('fromAlbum') : t('nowPlaying'));
      ui.topName.textContent = cd ? cd.name : (it.Album || '');
    }
    function hashIds(ids) {
      var h = 5381;
      for (var i = 0; i < ids.length; i++) {
        var s = nid(ids[i]);
        for (var j = 0; j < s.length; j++) h = ((h * 33) ^ s.charCodeAt(j)) | 0;
      }
      return (h >>> 0).toString(36);
    }
    // Die von diesem Geraet gestartete Playlist gilt, solange die Warteschlange noch ihre Titel hat (auch gemischt oder noch halb geladen).
    function intentMatches(ids) {
      var it = playIntent;
      if (!it || !it.key || !ids.length) return false;
      if (sameIds(ids, it.ids) || sameOrder(ids, it.ids.slice(0, ids.length))) return true;
      return ids.length > it.ids.length && sameOrder(ids.slice(0, it.ids.length), it.ids);   // hinten angehaengte Titel
    }
    // Welche Playlist (oder Lieblingssongs) laeuft? Auf dem eigenen Geraet steht das fest, auf anderen Geraeten wird es streng aus der
    // Warteschlange abgeleitet: nur eine eindeutige Liste mit genau diesen Titeln zaehlt; bei Unsicherheit wird nichts markiert.
    var ctxRetryAt = 0;
    function resolveContext() {
      if (P.session && P.session.Id === 'local') { ctxSig = ''; setCtx(OFFPLAY.ctxId()); return; }   // Wiedergabe vom Geraet: Liste ist bekannt
      var ids = (P.queue || []).map(function (x) { return x.Id; }).filter(function (id) { return !autoAdded[nid(id)]; });   // Autoplay-Titel gehoeren nicht zur Playlist
      if (!P.item || !ids.length) { ctxSig = ''; setCtx(''); return; }
      if (intentMatches(ids)) { ctxSig = ''; setCtx(nid(playIntent.key)); return; }
      playIntent = null;
      if (ids.length < 2) { ctxSig = ''; setCtx(''); return; }   // ein einzelner Titel sagt nichts ueber die Playlist
      var sig = ids.length + ':' + hashIds(ids) + ':' + likedVer;
      if (sig === ctxSig) return;
      if (Date.now() < ctxRetryAt) return;
      ctxSig = sig;
      var tok = ++ctxTok;
      var cur = P.ctxId;
      loadPlaylists(false).then(function (pls) {
        var cands = pls.filter(function (p) { var n = p.item.ChildCount; return n != null && (n === ids.length || (n > ids.length && n > PLAY_CHUNK)); }).slice(0, 24);
        var jobs = cands.map(function (p) {
          return playlistIds(p).then(function (pid) { return { key: nid(p.id), level: matchLevel(ids, pid) }; }, function () { return { key: nid(p.id), level: 0, failed: true }; });
        });
        jobs.push(likedIds().then(function (lid) { return { key: 'liked', level: matchLevel(ids, lid) }; }, function () { return { key: 'liked', level: 0, failed: true }; }));
        return Promise.all(jobs);
      }).then(function (res) {
        if (tok !== ctxTok) return;
        var best = 0, keys = [], failed = false;
        res.forEach(function (r) {
          if (r.failed) failed = true;
          if (r.level > best) { best = r.level; keys = [r.key]; }
          else if (r.level === best && r.level > 0) keys.push(r.key);
        });
        var found = best > 0 && keys.length === 1 ? keys[0] : '';
        setCtx(found);
        if (failed && !found) { ctxSig = ''; ctxRetryAt = Date.now() + 8000; } else ctxRetryAt = 0;   // unvollstaendig geladen: spaeter erneut pruefen
      }, function () {
        if (tok !== ctxTok) return;
        ctxSig = ''; ctxRetryAt = Date.now() + 8000;   // Netzwerkfehler: spaeter erneut versuchen, bis dahin bleibt es wie es war
        if (cur !== P.ctxId) setCtx(cur);
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
      if (lyFull) setPalette(lyFull.el, pal);
    }

    // Verbunden mit einem anderen Geraet, das gerade nichts spielt: Mini-Player und Leiste bleiben, damit man Geraete wechseln kann.
    function paintIdle(m) {
      if (fullOpen) closeFull();
      var name = P.targetName || '…';
      m.hidden = false;
      m.classList.add('ml-idle');
      m.classList.add('ml-remote');
      bodyCls('ml-mini-on', running);
      ui.miniTitle.textContent = t('remoteIdle');
      ui.miniSub.textContent = t('connectedTo', name);
      ui.miniDev.hidden = true;
      ui.miniCover.textContent = '';
      ui.miniCover.appendChild(icon('devices'));
      ui.miniToggle.disabled = true;
      ui.miniFill.style.width = '0%';
      lastItemId = ''; barCoverId = ''; npCoverId = ''; npFor = '';
      if (bar && root && isWide()) {
        bar.hidden = false;
        bar.classList.add('ml-bar-idle');
        ui.barTitle.textContent = t('remoteIdle');
        ui.barArtist.textContent = '';
        ui.barDev.textContent = t('connectedTo', name);
        ui.barDev.hidden = false;
        ui.barCover.textContent = '';
        ui.barCover.appendChild(icon('devices'));
        ui.bDevBtn.classList.add('ml-on');
        ui.bPos.textContent = '0:00'; ui.bDur.textContent = '0:00';
        ui.bSeek.value = '0'; paintRange(ui.bSeek);
      }
      if (np) np.hidden = true;
      if (root) root.classList.remove('ml-has-np');
    }

    function paint() {
      var has = !!P.item;
      if (!(isWide() && npRoom())) panels.filter(function (x) { return x.el.classList.contains('ml-panel-np'); }).forEach(function (x) { x.close(); });
      var m = ensureMini();
      if (!has && P.targetId) { paintIdle(m); return; }   // Zielgeraet gewaehlt, es spielt aber (noch) nichts: Player bleibt sichtbar
      m.classList.remove('ml-idle');
      ui.miniToggle.disabled = false;
      if (bar) bar.classList.remove('ml-bar-idle');
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
      var swap = lastItemId && lastItemId !== id ? beginSwap() : null;   // alten Titel merken, damit er herausgleiten kann
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
        // Farbe aus dem Cover mit einem eigenen, unsichtbaren Bild holen: Die Mini-Leiste ist am Computer ausgeblendet,
        // ihr (lazy geladenes) Bild wuerde dort nie laden und Vollansicht/rechte Spalte blieben grau.
        var pUrl = itemImg(P.item, 96);
        if (pUrl) {
          (function (forId) {
            var img = new Image();
            img.decoding = 'async';
            img.onload = function () { if (P.item && P.item.Id === forId) applyPalette(coverPalette(img)); };
            img.onerror = function () { if (P.item && P.item.Id === forId) applyPalette(null); };
            img.src = pUrl;
          })(id);
        } else applyPalette(null);
      }

      paintBar(it, sub, paused, remote);
      paintNp(it, sub);
      if (full) {
        paintTopLabel();
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
        var devText = remote ? t('connectedTo', P.targetName || '…') : '';
        ui.devLine.textContent = devText; ui.devLine.hidden = !remote;
        ui.devBtn.setAttribute('aria-label', remote ? t('devices') + ': ' + devText : t('devices'));
        ui.devBtn.classList.toggle('ml-on', remote);
        updateExtras();
      }
      if (lastItemId !== id) { lastItemId = id; markPlaying(); applySpeed(); }
      if (swap) swap();
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
      P.seen = { id: nid(P.item.Id), pos: p, dur: d };
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
      if (lyFull) paintLyricsFull(false);
    }

    /* ---------- Abfrage der Sitzung ---------- */
    // Autoplay: Laeuft der letzte Titel der Warteschlange, werden passende Titel (Sofortmix) angehaengt, damit die Musik nicht endet.
    var autoKey = '', autoBusy = false, autoRetryAt = 0, autoAdded = {};
    function maybeAutoplay(s) {
      if (!autoplayOn() || autoBusy || !P.item || P.repeat !== 'RepeatNone' || Date.now() < autoRetryAt) return;
      var q = P.queue || [];
      if (!q.length || queueIndex() !== q.length - 1) return;
      var key = s.Id + ':' + nid(P.item.Id) + ':' + q.length;
      if (autoKey === key) return;
      autoKey = key; autoBusy = true;
      var seed = P.item.Id, have = {};
      q.forEach(function (x) { have[nid(x.Id)] = 1; });
      loadSongMix(q.slice(-3).map(function (x) { return x.Id; }), 40).then(function (items) {
        var ids = [], seen = {};
        items.forEach(function (i) { var k = nid(i.Id); if (!have[k] && !seen[k] && ids.length < 25) { seen[k] = 1; ids.push(i.Id); } });
        // Nur anhaengen, wenn sich inzwischen nichts geaendert hat (anderer Titel, andere Warteschlange, Autoplay aus).
        if (!ids.length || !autoplayOn() || !P.item || nid(P.item.Id) !== nid(seed) || (P.queue || []).length !== q.length) return;
        return sessionCall(s, 'Playing', { playCommand: 'PlayLast', itemIds: ids.join(',') }).then(function () {
          ids.forEach(function (id) { autoAdded[nid(id)] = 1; });
          kick();
        });
      }).then(function () { autoBusy = false; }, function () { autoBusy = false; autoKey = ''; autoRetryAt = Date.now() + 15000; });
    }

    // Rueckfall fuer das Ende der Wiedergabe: Hat das Anhaengen oben nicht geklappt (Sitzung nicht erreichbar, Seite war im Hintergrund,
    // Jellyfin hat den Befehl ignoriert) und der letzte Titel ist zu Ende, startet hier direkt ein neuer Mix zu den letzten Titeln.
    var autoFired = '';
    function autoEnd() {
      if (!autoplayOn() || !P.item || P.repeat !== 'RepeatNone' || (P.session && P.session.Id === 'local') || Net.offline()) return false;
      var q = P.queue || [];
      if (!q.length || queueIndex() !== q.length - 1) return false;
      var key = nid(P.item.Id) + ':' + q.length;
      if (autoFired === key) return false;
      autoFired = key;
      var have = {}, seeds = q.slice(-3).map(function (x) { return x.Id; });
      q.forEach(function (x) { have[nid(x.Id)] = 1; });
      loadSongMix(seeds, 40).then(function (items) {
        var ids = [], seen = {};
        items.forEach(function (i) { var k = nid(i.Id); if (!have[k] && !seen[k] && ids.length < 25) { seen[k] = 1; ids.push(i.Id); } });
        if (!ids.length || !autoplayOn()) { autoFired = ''; return; }
        return playIds(ids, 0).then(function () { kick(); });
      }).then(null, function () { setTimeout(function () { if (autoFired === key) autoFired = ''; }, 15000); });
      return true;
    }
    function nearEnd(margin) {
      var d = duration() || P.dur, p = position();
      // Nach dem Ende setzt Jellyfin das Audio-Element zurueck: dann zaehlt die zuletzt gesehene Position
      if (P.seen && P.item && P.seen.id === nid(P.item.Id)) { p = Math.max(p, P.seen.pos); d = d || P.seen.dur; }
      return d > 0 && p >= d - margin;
    }

    var gapSince = 0;
    function applySession(s) {
      var np = s && s.NowPlayingItem;
      if (np) gapSince = 0;
      else if (P.item) {
        if (nearEnd(8) && autoEnd()) return;   // letzter Titel ist zu Ende und nichts folgt
        // Beim Titelwechsel meldet der Server kurz keinen Titel. Die Ansicht bleibt dann stehen, statt die Vollansicht zu schliessen.
        if (!gapSince) gapSince = Date.now();
        if (Date.now() - gapSince < 4500) { fastUntil = Math.max(fastUntil, Date.now() + 2500); return; }
      }
      if (!np) {
        gapSince = 0;
        ctxSig = ''; setCtx('');
        if (P.item) { P.item = null; P.full = null; P.lyrics = undefined; lastItemId = ''; heroCoverId = ''; extrasFor = ''; markPlaying(); }
        P.queue = [];
        paint();
        return;
      }
      var changed = !P.item || nid(P.item.Id) !== nid(np.Id);
      var isLocal = s.Id === 'local';
      if (!changed && P.item && P.item.__local !== np.__local) changed = true;
      var ps = s.PlayState || {};
      P.session = s; P.item = np;
      if (pendingPause && Date.now() < pendingPause.until) {
        if (!!ps.IsPaused === pendingPause.want) pendingPause = null; else ps = Object.assign({}, ps, { IsPaused: pendingPause.want });
      } else pendingPause = null;
      P.paused = !!ps.IsPaused;
      if (P.paused && nearEnd(1.5) && !pendingPause && !isLocal) setTimeout(autoEnd, 0);   // Wiedergabe am Ende stehengeblieben
      P.pos = (ps.PositionTicks || 0) / 1e7; P.at = Date.now();
      P.dur = (np.RunTimeTicks || 0) / 1e7;
      P.repeat = ps.RepeatMode || 'RepeatNone';
      P.shuffle = ps.PlaybackOrder === 'Shuffle';
      if (ps.VolumeLevel != null) P.volume = ps.VolumeLevel;
      P.queue = (s.NowPlayingQueue || []).map(function (x) { return { Id: x.Id, PlaylistItemId: x.PlaylistItemId }; });
      if (P.queue.length && !P.queue.some(function (x) { return autoAdded[nid(x.Id)]; })) autoAdded = {};
      if (changed) {
        P.full = null; P.lyrics = undefined; extrasFor = ''; lyricIdx = -2;
        var id = np.Id;
        P.fav = !!(np.UserData && np.UserData.IsFavorite);
        if (isLocal) P.full = np;
        else loadItem(id, 'Genres,People').then(function (it) {
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
      resolveContext();
      markContext();
      if (!isLocal) maybeAutoplay(s);
    }

    function poll() {
      if (!running) return Promise.resolve();
      if (polling && Date.now() - pollStartedAt < 15000) return Promise.resolve();   // haengende Anfrage nach 15 s ueberholen
      polling = true; pollStartedAt = Date.now();
      var my = ++pollSeq;
      function fin() { if (my !== pollSeq) return; polling = false; lastPollAt = Date.now(); schedule(); }
      return fetchState().then(function (st) { if (my === pollSeq) applySession(st); }, function () { /* naechster Versuch */ }).then(fin, fin);
    }
    // Wird von aussen regelmaessig aufgerufen: stellt sicher, dass die Abfrage nie dauerhaft stehen bleibt.
    function heartbeat() {
      if (!running || document.hidden) return;
      var late = Date.now() - lastPollAt;
      if ((!polling && late > 20000) || (polling && Date.now() - pollStartedAt >= 15000)) poll();
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
      lastPollAt = Date.now();
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
      closeLyricsFull(fromHistory);
      if (full) full.hidden = true;
      bodyCls('ml-full-on', false);
      if (was && fromHistory !== true) OV.release(fullEntry);
      fullEntry = null;
    }

    // Das Audio-Element des Web-Clients meldet Pause, Titelwechsel, Lautstaerke und Spulen sofort (Ereignisse blubbern nicht, daher Capture).
    // So bleibt die Anzeige auch dann richtig, wenn Medientasten, Bluetooth oder Jellyfin selbst etwas aendern.
    ['play', 'playing', 'pause', 'ended', 'loadedmetadata', 'loadstart', 'volumechange', 'seeked'].forEach(function (ev) {
      document.addEventListener(ev, function (e) {
        var a = e.target;
        if (!a || !a.classList || !a.classList.contains('mediaPlayerAudio')) return;
        if (ev === 'loadedmetadata' && speed !== 1) applySpeed();
        if (!running) return;
        if (ev === 'volumechange') {
          if (!P.targetId && isFinite(a.volume)) { P.volume = Math.min(100, Math.round(Math.pow(a.volume, 1 / 3) * 100)); paint(); }
        } else if (ev === 'seeked') progress();
        else if (ev === 'ended' || ev === 'loadstart') kick();
        else paint();
      }, true);
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden && running) kick(); });
    // Jellyfins Audio-Element meldet das Ende auch dann, wenn die Seite im Hintergrund ist und die Abfrage der Sitzung ruht (Handy, Bildschirm aus)
    document.addEventListener('ended', function (e) {
      var a = e.target;
      if (running && a && a.classList && a.classList.contains('mediaPlayerAudio')) autoEnd();
    }, true);
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !fullOpen || document.querySelector('.ml-backdrop')) return;
      if (panels.length) panels[panels.length - 1].close(); else closeFull();
    });

    // Wiedergabe vom Geraet (OFFPLAY): Zustand sofort uebernehmen bzw. wieder abgeben
    function syncLocal() { if (!running) return; var s = OFFPLAY.session(); if (s) applySession(s); }
    function dropLocal() {
      if (!(P.session && P.session.Id === 'local')) return;
      P.session = null; P.item = null; P.full = null; P.lyrics = undefined; P.queue = []; P.paused = true;
      lastItemId = ''; heroCoverId = ''; extrasFor = ''; ctxSig = ''; gapSince = 0; queueNames = {};
      setCtx(''); markPlaying(); paint(); kick();
    }
    function adoptLocal() { if (P.targetId) setTarget(null, ''); autoOff = true; }

    return {
      syncLocal: syncLocal, dropLocal: dropLocal, adoptLocal: adoptLocal,
      start: start, stop: stop, kick: kick, heartbeat: heartbeat, releaseAuto: releaseAuto, toggle: toggle,
      contextId: function () { return P.ctxId; }, isPlayingNow: function () { return !!P.item && !isPaused(); }, isRunning: function () { return running; }, hasUi: function () { return !!(mini && !mini.hidden) || !!P.item; }, currentId: currentId, refreshFavorite: refreshFavorite,
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
    OFFV.paintPill();
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
    // Zurueck zur normalen Jellyfin-Oberflaeche (Startseite mit allen Bibliotheken: Filme, Serien ...)
    var jf = btn('ml-side-navbtn ml-side-jellyfin');
    jf.dataset.tab = 'jellyfin';
    jf.title = t('allLibsHint');
    jf.setAttribute('aria-label', t('allLibs') + ' – ' + t('allLibsHint'));
    jf.appendChild(icon('apps'));
    jf.appendChild(el('span', null, t('allLibs')));
    jf.addEventListener('click', function () { goJellyfin('#/home'); });
    navBox.appendChild(jf);
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
    markContext();
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
    bodyCls('ml-app-wide', false);
    Player.stop();
    OFFPLAY.stop();   // ohne Oberflaeche gibt es keine Bedienung: Wiedergabe vom Geraet endet mit dem Verlassen der Musik-Ansicht
  }
  // Notausgang: blendet die Ansicht hart aus und stellt die Jellyfin-Seite wieder her (falls der normale Seitenwechsel haengt).
  function forceLeave() {
    try { hideApp(); } catch (e) { /* weiter */ }
    toggleClassicFab(false);
    if (root) root.hidden = true;
    bodyCls('ml-app-on', false); bodyCls('ml-app-wide', false); bodyCls('ml-mini-on', false); bodyCls('ml-full-on', false);
    ML.uncloak();
    if (ML.forceMusic) ML.forceMusic(false);
    try { ML.refresh(); } catch (e) { /* ignorieren */ }
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
      var dlView = isLib && route.params && route.params.mlview === 'downloads';
      var mixKind = isLib && route.params && route.params.mlview === 'mix' && /^(mix|radio|mixtape)$/.test(route.params.mlkind || '') && ID_RE.test(route.params.mlid || '') ? route.params.mlkind : null;
      if (isLib && route.id && !isMediaLib(route.id)) state.libraryId = route.id;
      var key;
      if (isLib) key = folderId ? 'folder|' + folderId : dlView ? 'downloads' : mixKind ? 'mix|' + mixKind + '|' + nid(route.params.mlid) : route.params && route.params.mlview === 'liked' ? 'liked' : 'tab|' + state.tab;
      else key = 'detail|' + route.id;
      if (isWide() && state.tab === 'library') state.tab = 'home';
      var mcat = isLib && route.id && !folderId && !mixKind && !dlView && !(route.params && route.params.mlview) ? mediaCategoryOf(route.id) : '';
      if (mcat && state.autoChip !== route.id) { state.autoChip = route.id; state.chip = mcat; state.tab = 'home'; key = 'tab|home'; }
      if (isDetail && route.params && route.params.mltrack && ID_RE.test(route.params.mltrack)) state.focusTrack = route.params.mltrack;
      var wasShown = root && !root.hidden;
      showApp();
      if (wasShown && state.key === key) { state.focusTrack = ''; updateNav(); return; }
      rememberScroll();
      setPalette(root, null);
      noteTrail(key);
      state.key = key;
      state.view++;
      var seq = state.view;
      if (folderId) showFolderDetail(content, seq, folderId, route.id);
      else if (dlView) showDownloadsPage(content, seq);
      else if (mixKind) showMixDetail(content, seq, mixKind, route.params.mlid, parseInt(route.params.mln, 10) || 0, route.params.mlt || '');
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

  // Selbstheilung: Wird regelmaessig und nach Ereignissen (Geraetewechsel, Rueckkehr in den Tab ...) aufgerufen.
  // Ist die aktuelle Seite eine Musik-Seite, muss die App sichtbar sein, Inhalt haben und der Player laufen; sonst wird sie neu aufgebaut.
  function ensureHealthy() {
    try {
      var r = ML.route();
      if (!r || r.kind === 'none') return false;
      if (!root) { onRoute(r); return true; }
      if (!document.body.contains(root)) document.body.appendChild(root);
      var cfg = ML.config();
      if (cfg && cfg.spotifyHome === false) return false;
      if (state.classic) return false;
      var broken = root.hidden || !document.body.classList.contains('ml-app-on') || !content || !content.firstChild;
      if (broken) { state.key = ''; onRoute(r); return true; }
      if (!Player.isRunning()) Player.start();
      Player.heartbeat();
      layout();
      Player.mount();
      Player.repaint();
    } catch (e) { if (window.console) console.error('Music Look ensure', e); }
    return false;
  }

  // Fokusrahmen nur bei Bedienung mit der Tastatur zeigen (Tab), nie nach einem Klick oder Tipp.
  document.addEventListener('keydown', function (e) { if (e.key === 'Tab') document.body.classList.add('ml-kbd'); }, true);
  ['pointerdown', 'mousedown', 'touchstart'].forEach(function (ev) {
    document.addEventListener(ev, function () { document.body.classList.remove('ml-kbd'); }, true);
  });

  ML.app = {
    route: onRoute,
    ensure: ensureHealthy,
    layout: layout,
    forceLeave: forceLeave,
    eq: EQ, off: OFF, offdb: MLOff, offplay: OFFPLAY, net: Net, taste: Taste,
    addToPlaylist: function (ids) { addToPlaylist(ids); }
  };

  // Ohne Server lassen sich heruntergeladene Playlists und Alben trotzdem oeffnen: der Kern fragt hier nach, was die ID ist.
  ML.offlineItem = function (id) {
    var k = nid(id), c = OFF.coll('pl:' + k);
    if (c) return { Id: k, Type: 'Playlist', MediaType: 'Audio', Name: c.name };
    c = OFF.coll('al:' + k);
    if (c) return { Id: k, Type: 'MusicAlbum', Name: c.name };
    return null;
  };
  Net.start();

  // Der Kern hat die Seite evtl. schon gemeldet, bevor dieses Script geladen war.
  // Stil-Index fuer Mixe im Hintergrund vorbereiten, damit die erste Startseite nicht darauf wartet.
  setTimeout(function () { try { if (!Net.offline()) Taste.load().then(null, function () { /* Rueckfall: Sofortmix */ }); } catch (e) { /* ohne Index */ } }, 3500);
  try {
    var first = ML.route();
    if (first && first.kind && first.kind !== 'none') onRoute(first);
  } catch (e) { if (window.console) console.error('Music Look app start', e); }
})();

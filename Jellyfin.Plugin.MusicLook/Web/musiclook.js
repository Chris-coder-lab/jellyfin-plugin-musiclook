/* Music Look - Client. Aktiv nur im Musik-Bereich. Nutzt ausschliesslich die Jellyfin-REST-API
   und die Plugin-Endpunkte unter /MusicLook; es werden keine Token oder Daten nach aussen gesendet.
   Ausgelegt auf jellyfin-web 12.x (neues "modern"-Layout mit Reiter-Menue) und auf die alten Layouts mit Reiterleiste. */
(function () {
  'use strict';
  if (window.__musicLookLoaded) return;
  window.__musicLookLoaded = true;

  var ID_RE = /^[0-9a-f]{32}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var CODE_RE = /^[A-HJKMNP-Z2-9]{6}$/;
  var MUSIC_TYPES = ['MusicAlbum', 'MusicArtist', 'Audio', 'MusicGenre'];
  var PLUS_TYPES = ['Audio', 'MusicAlbum', 'MusicArtist'];

  /* ---------- Texte (Deutsch, sonst Englisch) ---------- */
  var STR = {
    de: {
      addTitle: 'Hinzufügen zu …', loadingTracks: 'Lade Titel …', noTracks: 'Keine Titel gefunden.', tracks1: '1 Titel', tracksN: '{0} Titel',
      toJam: '➕  Zur Jam-Warteschlange', newPlaylistPh: 'Neue Playlist – Name eingeben', createPlaylist: 'Neue Playlist erstellen',
      playlistCreated: 'Playlist „{0}“ erstellt', addedTo: 'Zu „{0}“ hinzugefügt', addFailed: 'Hinzufügen fehlgeschlagen', createFailed: 'Erstellen fehlgeschlagen',
      loadFailed: 'Fehler beim Laden.', myPlaylists: 'Deine Playlists', noPlaylists: 'Noch keine bearbeitbaren Playlists.',
      plusTitle: 'Zu Playlist hinzufügen', share: 'Teilen', shareTitle: 'Playlist teilen',
      shareHint: 'Wähle Personen, die diese Playlist sehen dürfen. Entfernst du ein Häkchen, verliert die Person den Zugriff.',
      canEdit: 'darf bearbeiten', save: 'Speichern', noUsers: 'Keine weiteren Benutzer vorhanden.', usersFailed: 'Benutzerliste nicht verfügbar.',
      shareOnlyOwner: 'Nur der Besitzer kann eine Playlist teilen.', saved: 'Gespeichert', someFailed: '{0} Änderung(en) fehlgeschlagen',
      jam: 'Jam', jamTitle: 'Jam', jamIntro: 'Starte eine Jam: Alle in der Jam fügen Titel zur gemeinsamen Warteschlange hinzu, sie wird nacheinander abgespielt.',
      jamStart: 'Jam starten', jamCodePh: 'Code eingeben (6 Zeichen)', jamJoin: 'Beitreten', jamInvalid: 'Ungültiger Code', jamNotFound: 'Jam nicht gefunden oder voll',
      jamStartFail: 'Jam konnte nicht gestartet werden', jamCode: 'Code: {0} · {1} Teilnehmer', jamEmpty: 'Die Warteschlange ist leer. Nutze das „+“ an Titeln und Alben.',
      jamNext: 'Nächster Titel', jamLeave: 'Jam verlassen', jamEnded: 'Jam beendet', jamAdded: 'Zur Jam hinzugefügt', jamAddFail: 'Jam: Hinzufügen fehlgeschlagen',
      jamOwnOnly: 'Nur eigene Titel entfernbar', jamNoSession: 'Wiedergabe konnte nicht gestartet werden', jamQueueEnd: 'Ende der Warteschlange erreicht.', track: 'Titel'
    },
    en: {
      addTitle: 'Add to …', loadingTracks: 'Loading tracks …', noTracks: 'No tracks found.', tracks1: '1 track', tracksN: '{0} tracks',
      toJam: '➕  Add to Jam queue', newPlaylistPh: 'New playlist – enter a name', createPlaylist: 'Create new playlist',
      playlistCreated: 'Playlist "{0}" created', addedTo: 'Added to "{0}"', addFailed: 'Could not add', createFailed: 'Could not create',
      loadFailed: 'Loading failed.', myPlaylists: 'Your playlists', noPlaylists: 'No editable playlists yet.',
      plusTitle: 'Add to playlist', share: 'Share', shareTitle: 'Share playlist',
      shareHint: 'Choose who may see this playlist. Removing a tick removes their access.',
      canEdit: 'can edit', save: 'Save', noUsers: 'There are no other users.', usersFailed: 'User list not available.',
      shareOnlyOwner: 'Only the owner can share a playlist.', saved: 'Saved', someFailed: '{0} change(s) failed',
      jam: 'Jam', jamTitle: 'Jam', jamIntro: 'Start a Jam: everyone in the Jam adds tracks to a shared queue that plays one after another.',
      jamStart: 'Start Jam', jamCodePh: 'Enter code (6 characters)', jamJoin: 'Join', jamInvalid: 'Invalid code', jamNotFound: 'Jam not found or full',
      jamStartFail: 'Could not start the Jam', jamCode: 'Code: {0} · {1} members', jamEmpty: 'The queue is empty. Use the "+" on tracks and albums.',
      jamNext: 'Next track', jamLeave: 'Leave Jam', jamEnded: 'Jam ended', jamAdded: 'Added to the Jam', jamAddFail: 'Jam: could not add',
      jamOwnOnly: 'You can only remove your own tracks', jamNoSession: 'Playback could not be started', jamQueueEnd: 'End of the queue reached.', track: 'Track'
    }
  };
  var LANG = String(navigator.language || 'en').toLowerCase().indexOf('de') === 0 ? 'de' : 'en';
  function T(key, a, b) {
    var s = (STR[LANG] && STR[LANG][key]) || STR.en[key] || key;
    if (a != null) s = s.replace('{0}', a);
    if (b != null) s = s.replace('{1}', b);
    return s;
  }

  /* ---------- Zustand ---------- */
  var typeCache = {};
  // Bekannte Musik-Elemente merkt sich der Browser, damit eine Seite sofort als Musik erkannt wird (kein Aufblitzen des alten Layouts).
  var MUS_KEY = 'ml.mus1';
  function loadKnownMusic() {
    try {
      var m = JSON.parse(window.localStorage.getItem(MUS_KEY) || '{}');
      Object.keys(m).forEach(function (k) { typeCache[k] = m[k]; });
    } catch (e) { /* ungueltig oder gesperrt */ }
  }
  function rememberMusic(item) {
    try {
      var m = JSON.parse(window.localStorage.getItem(MUS_KEY) || '{}');
      var key = String(item.Id).replace(/-/g, '').toLowerCase();
      if (m[key]) return;
      m[key] = { Id: item.Id, Type: item.Type, MediaType: item.MediaType, CollectionType: item.CollectionType };
      var keys = Object.keys(m);
      if (keys.length > 300) keys.slice(0, keys.length - 300).forEach(function (k) { delete m[k]; });
      window.localStorage.setItem(MUS_KEY, JSON.stringify(m));
    } catch (e) { /* ignorieren */ }
  }
  function uncloak() { document.documentElement.classList.remove('ml-cloak'); }
  var config = { accentColor: '#1ed760', shareBaseUrl: '', jamEnabled: true, spotifyHome: true, podcastKeywords: ['podcast', 'predigt'], audiobookKeywords: ['hörbuch', 'hörbücher', 'audiobook', 'hörspiel'] };
  var configLoaded = false;
  var configDone = false;
  var configWaiters = [];
  var routeInfo = { kind: 'none' };
  var resumed = false;
  var jam = { code: null, state: null, version: 0, names: {}, startedSeq: null, timer: null, busy: false };
  var musicOn = false;
  var updateSeq = 0;
  var lastKey = null;

  /* ---------- Hilfsfunktionen ---------- */
  function client() {
    if (window.ApiClient) return window.ApiClient;
    var sc = window.ServerConnections;
    return sc && typeof sc.currentApiClient === 'function' ? sc.currentApiClient() : null;
  }
  function uid() { var c = client(); return c && c.getCurrentUserId ? c.getCurrentUserId() : null; }
  function nid(id) { return String(id || '').replace(/-/g, '').toLowerCase(); }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function button(cls, text) { var b = el('button', cls, text); b.type = 'button'; return b; }

  function toast(msg) {
    var n = el('div', 'ml-toast', msg);
    document.body.appendChild(n);
    setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 2600);
  }

  function call(type, path, params, body) {
    var c = client();
    if (!c) return Promise.reject(new Error('no client'));
    var opts = { type: type, url: c.getUrl(path, params || undefined) };
    if (body !== undefined) { opts.data = JSON.stringify(body); opts.contentType = 'application/json'; }
    return c.ajax(opts).then(function (res) {
      if (!res || typeof res.status !== 'number') return res;   // schon geparstes JSON
      if (res.status === 204) return null;
      var ct = res.headers && res.headers.get ? (res.headers.get('content-type') || '') : '';
      return ct.indexOf('json') >= 0 ? res.json() : null;
    });
  }

  function chunk(arr, n) {
    var out = [];
    for (var i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
    return out;
  }

  function safeStore(key, value) {
    try {
      if (value === undefined) return window.localStorage.getItem(key);
      if (value === null) window.localStorage.removeItem(key); else window.localStorage.setItem(key, value);
    } catch (e) { /* Speicher kann gesperrt sein */ }
    return null;
  }

  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- Musik-Kontext erkennen ---------- */
  function hashParts() {
    var h = location.hash || '';
    var q = h.indexOf('?');
    var path = (q >= 0 ? h.slice(0, q) : h).toLowerCase().replace(/\/+$/, '');
    var params = {};
    if (q >= 0) {
      h.slice(q + 1).split('&').forEach(function (kv) {
        var i = kv.indexOf('=');
        if (i <= 0) return;
        try { params[kv.slice(0, i).toLowerCase()] = decodeURIComponent(kv.slice(i + 1)); } catch (e) { /* ungueltige Kodierung */ }
      });
    }
    return { path: path, params: params };
  }

  function isLibraryRoute() { return hashParts().path === '#/music'; }

  function currentItemId() {
    var p = hashParts().params;
    var id = p.id || p.parentid || p.topparentid;
    return id && ID_RE.test(id) ? id : null;
  }

  function resolveItem(id) {
    id = String(id).replace(/-/g, '').toLowerCase();
    if (typeCache[id]) return Promise.resolve(typeCache[id]);
    return call('GET', 'Items', { Ids: id, UserId: uid(), Fields: 'ParentId', EnableImages: false, EnableUserData: false })
      .then(function (r) {
        var item = r && r.Items && r.Items[0];
        if (item) { typeCache[id] = item; if (isMusicItem(item)) rememberMusic(item); }
        return item;
      });
  }

  function isMusicItem(item) {
    if (!item) return false;
    if (item.CollectionType === 'music') return true;
    if (MUSIC_TYPES.indexOf(item.Type) >= 0) return true;
    return item.Type === 'Playlist' && item.MediaType === 'Audio';
  }

  function contextKey() { return location.hash + '|' + (client() && uid() ? uid() : ''); }

  // Schlaegt das Erkennen der Seite fehl (z. B. kurzer Netzwerkfehler beim Geraetewechsel), wird es mehrmals wiederholt,
  // statt die Spotify-Ansicht dauerhaft zu verlieren.
  var retryTimer = null, retryN = 0, retryKey = '';
  function retryLater() {
    clearTimeout(retryTimer);
    var waits = [700, 1500, 3000, 6000, 10000, 15000];
    if (retryN >= waits.length) return;
    var key = contextKey();
    retryTimer = setTimeout(function () { if (contextKey() === key) updateContext(); }, waits[retryN++]);
    lastKey = null;   // auch das naechste DOM-Ereignis darf einen neuen Versuch ausloesen
  }

  function updateContext() {
    var seq = ++updateSeq;
    var ck = contextKey();
    if (ck !== retryKey) { retryKey = ck; retryN = 0; clearTimeout(retryTimer); }
    lastKey = ck;
    if (!client() || !uid()) { setMusic(false); emitRoute({ kind: 'none' }); return; }
    maybeResumeJam();
    var hp = hashParts();
    if (isLibraryRoute()) {
      setMusic(true);
      var lib = hp.params.topparentid || hp.params.parentid;
      emitRoute({ kind: 'library', id: lib && ID_RE.test(lib) ? lib : null, params: hp.params });
      return;
    }
    // Nur die Bibliotheksseite (#/music) und Detailseiten (#/details) sind Musik-Seiten. Andere Seiten wie die Jellyfin-Suche
    // (#/search?parentId=<Musikbibliothek>) tragen zwar die ID der Bibliothek im Link, bleiben aber Jellyfin-Standard.
    if (hp.path !== '#/details') { setMusic(false); emitRoute({ kind: 'none' }); return; }
    var id = currentItemId();
    if (!id) { setMusic(false); emitRoute({ kind: 'none' }); return; }
    // Fehler beim Abfragen: bleibt dieselbe Seite offen, bleibt die Ansicht stehen; in jedem Fall wird es erneut versucht.
    var fail = function () {
      if (seq !== updateSeq) return;
      var same = routeInfo && routeInfo.kind === 'details' && nid(routeInfo.id) === nid(id);
      if (!same) { setMusic(false); emitRoute({ kind: 'none' }); }
      retryLater();
    };
    resolveItem(id).then(function (item) {
      if (seq !== updateSeq) return;
      // Ein Titel (z. B. aus der Suche) oeffnet das Album in der Spotify-Ansicht, der Titel wird dort markiert.
      if (item && item.Type === 'Audio' && isMusicItem(item)) {
        var cand = String(item.AlbumId || item.ParentId || '').replace(/-/g, '').toLowerCase();
        if (ID_RE.test(cand)) {
          resolveItem(cand).then(function (alb) {
            if (seq !== updateSeq) return;
            if (alb && alb.Type === 'MusicAlbum') {
              location.replace(location.href.split('#')[0] + '#/details?id=' + alb.Id + '&mltrack=' + item.Id);
            } else fail();
          }, fail);
          return;
        }
        fail();
        return;
      }
      retryN = 0;
      var music = isMusicItem(item);
      setMusic(music);
      emitRoute(music ? { kind: 'details', id: id, item: item, params: hp.params } : { kind: 'none' });
    }, fail);
  }

  // Meldet die aktuelle Seite an die App-Ansicht (musiclookapp.js), falls sie geladen ist.
  function emitRoute(route) {
    routeInfo = route;
    if (!route || route.kind === 'none') uncloak();
    if (api.app && typeof api.app.route === 'function') {
      try { api.app.route(route); } catch (e) { if (window.console) console.error('Music Look app route', e); }
    }
  }

  function appOn() { return document.body.classList.contains('ml-app-on'); }

  function setMusic(on) {
    if (on === musicOn) { if (on) decorate(); return; }
    musicOn = on;
    document.documentElement.classList.toggle('ml-music', on);
    document.body.classList.toggle('ml-music', on);
    if (on) { loadConfig(); decorate(); } else { removeChips(); }
    ensureJamButton();
  }

  function loadConfig() {
    if (configLoaded) return;
    configLoaded = true;
    call('GET', 'MusicLook/Config').then(function (c) {
      if (!c) { finishConfig(); return; }
      if (/^#[0-9a-fA-F]{6}$/.test(c.accentColor || '')) {
        config.accentColor = c.accentColor;
        document.documentElement.style.setProperty('--ml-accent', c.accentColor);
      }
      config.jamEnabled = c.jamEnabled !== false;
      config.spotifyHome = c.spotifyHome !== false;
      config.shareBaseUrl = typeof c.shareBaseUrl === 'string' ? c.shareBaseUrl : '';
      if (Array.isArray(c.podcastKeywords)) config.podcastKeywords = c.podcastKeywords.map(String);
      if (Array.isArray(c.audiobookKeywords)) config.audiobookKeywords = c.audiobookKeywords.map(String).map(function (k) { return k.toLowerCase() === 'hörbüch' ? 'hörbücher' : k; });
      finishConfig();
      ensureJamButton();
    }, function () { configLoaded = false; });
  }

  function finishConfig() {
    configDone = true;
    var waiters = configWaiters; configWaiters = [];
    waiters.forEach(function (fn) { try { fn(config); } catch (e) { /* App-Fehler duerfen den Kern nicht stoeren */ } });
  }

  // Ruft fn auf, sobald die Konfiguration geladen ist (sofort, wenn sie schon da ist).
  function whenConfig(fn) {
    if (configDone) fn(config); else { configWaiters.push(fn); if (musicOn) loadConfig(); }
  }

  /* ---------- Sheet ---------- */
  // Haelt eine Vollbild-Ebene (Sheet-Hintergrund) im sichtbaren Bereich. Die Bildschirmtastatur verkleinert auf Handys nur den
  // "visual viewport"; ohne diese Anpassung liegt ein unten verankertes Sheet unter der Tastatur. Gibt eine Aufraeum-Funktion zurueck.
  function fitViewport(node) {
    var vv = window.visualViewport;
    if (!vv || !node) return function () { /* nichts zu tun */ };
    function apply() {
      node.style.bottom = 'auto';
      node.style.top = Math.round(vv.offsetTop) + 'px';
      node.style.height = Math.round(vv.height) + 'px';
      node.style.setProperty('--ml-vvh', Math.round(vv.height) + 'px');
    }
    vv.addEventListener('resize', apply);
    vv.addEventListener('scroll', apply);
    apply();
    return function () { vv.removeEventListener('resize', apply); vv.removeEventListener('scroll', apply); };
  }

  function openSheet(title) {
    var backdrop = el('div', 'ml-backdrop');
    var sheet = el('div', 'ml-sheet');
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-label', title);
    sheet.appendChild(el('h3', null, title));
    backdrop.appendChild(sheet);
    var unfit = null;
    function close() {
      if (unfit) { unfit(); unfit = null; }
      if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      document.removeEventListener('keydown', onKey, true);
    }
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(backdrop);
    unfit = fitViewport(backdrop);
    return { sheet: sheet, close: close };
  }

  function rowButton(label, sub, onClick) {
    var b = button('ml-row-item');
    b.appendChild(el('span', 'ml-grow', label));
    if (sub) b.appendChild(el('span', 'ml-muted', sub));
    b.addEventListener('click', onClick);
    return b;
  }

  /* ---------- Titel-IDs ermitteln ---------- */
  function trackIds(id) {
    return resolveItem(id).then(function (item) {
      if (!item) return [];
      if (item.Type === 'Audio') return [item.Id];
      var params = { UserId: uid(), IncludeItemTypes: 'Audio', Recursive: true, Fields: '', EnableImages: false, EnableUserData: false };
      if (item.Type === 'MusicArtist') params.ArtistIds = item.Id;
      else if (item.Type === 'MusicGenre') params.GenreIds = item.Id;
      else { params.ParentId = item.Id; params.SortBy = 'ParentIndexNumber,IndexNumber,SortName'; }
      return call('GET', 'Items', params).then(function (r) {
        return ((r && r.Items) || []).map(function (i) { return i.Id; });
      });
    });
  }

  /* ---------- Plus: zu Playlist hinzufuegen ---------- */
  function addToPlaylist(playlistId, ids) {
    return chunk(ids, 80).reduce(function (p, part) {
      return p.then(function () {
        return call('POST', 'Playlists/' + playlistId + '/Items', { Ids: part.join(','), UserId: uid() });
      });
    }, Promise.resolve());
  }

  function createPlaylist(name, ids) {
    var parts = chunk(ids, 80);
    // IsPublic muss ausdruecklich false sein: Jellyfin legt Playlists sonst oeffentlich an.
    return call('POST', 'Playlists', null, { Name: name, Ids: parts[0] || [], UserId: uid(), MediaType: 'Audio', IsPublic: false })
      .then(function (r) {
        var pid = r && (r.Id || r.id);
        if (!pid) throw new Error('no playlist id');
        return addToPlaylist(pid, [].concat.apply([], parts.slice(1))).then(function () { return pid; });
      });
  }

  // Liefert nur Playlists, die der Benutzer bearbeiten darf (Besitzer oder mit Bearbeitungsrecht geteilt).
  function editablePlaylists() {
    var me = uid();
    return call('GET', 'Items', { UserId: me, IncludeItemTypes: 'Playlist', Recursive: true, SortBy: 'SortName', Fields: 'ChildCount' })
      .then(function (r) {
        var lists = ((r && r.Items) || []).filter(function (p) { return p.MediaType === 'Audio' || !p.MediaType; });
        return Promise.all(lists.slice(0, 60).map(function (p) {
          return call('GET', 'Playlists/' + p.Id + '/Users/' + me).then(function (perm) {
            return perm && perm.CanEdit ? p : null;
          }, function () { return null; });
        })).then(function (checked) { return checked.filter(Boolean); });
      });
  }

  function openPlusSheet(itemId) {
    if (api.app && typeof api.app.addToPlaylist === 'function') {
      trackIds(itemId).then(function (ids) {
        if (ids.length) api.app.addToPlaylist(ids); else toast(T('noTracks'));
      }, function () { toast(T('loadFailed')); });
      return;
    }
    var ui = openSheet(T('addTitle'));
    var status = el('div', 'ml-muted', T('loadingTracks'));
    ui.sheet.appendChild(status);

    trackIds(itemId).then(function (ids) {
      if (!ids.length) { status.textContent = T('noTracks'); return; }
      status.textContent = ids.length === 1 ? T('tracks1') : T('tracksN', ids.length);

      if (jam.code) {
        ui.sheet.appendChild(rowButton(T('toJam'), null, function () {
          call('POST', 'MusicLook/Jam/' + jam.code + '/Add', { ids: ids.slice(0, 200).join(',') }).then(function (s) {
            if (s) applyJamState(s);
            toast(T('jamAdded')); ui.close();
          }, function () { toast(T('jamAddFail')); });
        }));
      }

      var nameInput = el('input', 'ml-field');
      nameInput.type = 'text'; nameInput.maxLength = 100; nameInput.placeholder = T('newPlaylistPh');
      ui.sheet.appendChild(nameInput);
      var create = button('ml-pill ml-primary', T('createPlaylist'));
      create.addEventListener('click', function () {
        var name = nameInput.value.trim();
        if (!name) { nameInput.focus(); return; }
        create.disabled = true;
        createPlaylist(name, ids).then(function () { toast(T('playlistCreated', name)); ui.close(); },
          function () { create.disabled = false; toast(T('createFailed')); });
      });
      ui.sheet.appendChild(create);

      ui.sheet.appendChild(el('div', 'ml-subtitle', T('myPlaylists')));
      var list = el('div');
      ui.sheet.appendChild(list);
      editablePlaylists().then(function (playlists) {
        if (!playlists.length) { list.appendChild(el('div', 'ml-muted', T('noPlaylists'))); return; }
        playlists.forEach(function (p) {
          list.appendChild(rowButton(p.Name, p.ChildCount != null ? T('tracksN', p.ChildCount) : null, function () {
            addToPlaylist(p.Id, ids).then(function () { toast(T('addedTo', p.Name)); ui.close(); },
              function () { toast(T('addFailed')); });
          }));
        });
      }, function () { list.appendChild(el('div', 'ml-muted', T('loadFailed'))); });
    }, function () { status.textContent = T('loadFailed'); });
  }

  /* ---------- Playlist teilen ---------- */
  function openShareSheet(playlistId) {
    var ui = openSheet(T('shareTitle'));
    ui.sheet.appendChild(el('div', 'ml-muted', T('shareHint')));
    var list = el('div');
    ui.sheet.appendChild(list);

    // Nur der Besitzer darf die Freigaben lesen (sonst 403) - so erkennen wir auch gleich die Berechtigung.
    Promise.all([
      call('GET', 'Playlists/' + playlistId + '/Users'),
      call('GET', 'MusicLook/Users')
    ]).then(function (res) {
      var shares = res[0] || [];
      var users = res[1] || [];
      var current = {};   // userId (normalisiert) -> canEdit
      shares.forEach(function (s) { current[nid(s.UserId)] = !!s.CanEdit; });
      var boxes = [];

      if (!users.length) { list.appendChild(el('div', 'ml-muted', T('noUsers'))); return; }

      users.forEach(function (u) {
        var key = nid(u.id);
        var row = el('label', 'ml-row-item');
        var box = el('input'); box.type = 'checkbox'; box.checked = key in current;
        var edit = el('input'); edit.type = 'checkbox'; edit.checked = current[key] !== false;
        edit.disabled = !box.checked;
        box.addEventListener('change', function () { edit.disabled = !box.checked; });
        row.appendChild(box);
        row.appendChild(el('span', 'ml-grow', u.name));
        var editWrap = el('span', 'ml-muted');
        editWrap.appendChild(edit);
        editWrap.appendChild(document.createTextNode(' ' + T('canEdit')));
        row.appendChild(editWrap);
        list.appendChild(row);
        boxes.push({ id: u.id, key: key, box: box, edit: edit });
      });

      var go = button('ml-pill ml-primary', T('save'));
      go.addEventListener('click', function () {
        go.disabled = true;
        var failed = 0, jobs = [];
        boxes.forEach(function (b) {
          var had = b.key in current;
          if (b.box.checked && (!had || current[b.key] !== b.edit.checked)) {
            jobs.push(function () {
              return call('POST', 'Playlists/' + playlistId + '/Users/' + b.id, null, { CanEdit: b.edit.checked })
                .catch(function () { failed++; });
            });
          } else if (!b.box.checked && had) {
            jobs.push(function () {
              return call('DELETE', 'Playlists/' + playlistId + '/Users/' + b.id).catch(function () { failed++; });
            });
          }
        });
        jobs.reduce(function (p, job) { return p.then(job); }, Promise.resolve()).then(function () {
          go.disabled = false;
          toast(failed ? T('someFailed', failed) : T('saved'));
          if (!failed) ui.close();
        });
      });
      ui.sheet.appendChild(go);
    }, function (err) {
      list.appendChild(el('div', 'ml-muted', err && err.status === 403 ? T('shareOnlyOwner') : T('usersFailed')));
    });
  }

  /* ---------- Buttons einfuegen ---------- */
  var DONE = 'ml-done';
  function makePlus(cls, id) {
    var b = button('ml-plus ' + cls, '+');
    b.title = T('plusTitle'); b.setAttribute('aria-label', T('plusTitle'));
    b.dataset.mlId = id;
    return b;
  }

  function decorate() {
    if (!musicOn || appOn()) return;
    var i, nodes;

    nodes = qsa('.card[data-id][data-type]:not(.' + DONE + ')');
    for (i = 0; i < nodes.length; i++) {
      var card = nodes[i];
      var type = card.getAttribute('data-type');
      var cid = card.getAttribute('data-id');
      card.classList.add(DONE);
      if (PLUS_TYPES.indexOf(type) < 0 || !ID_RE.test(cid || '')) continue;
      var host = card.querySelector('.cardScalable') || card.querySelector('.cardBox');
      if (!host) continue;
      host.appendChild(makePlus('ml-card', cid));
      card.classList.add('ml-has-plus');
    }

    nodes = qsa('.listItem[data-id]:not(.' + DONE + ')');
    for (i = 0; i < nodes.length; i++) {
      var row = nodes[i];
      var rtype = row.getAttribute('data-type');
      var rid = row.getAttribute('data-id');
      row.classList.add(DONE);
      if ((rtype && PLUS_TYPES.indexOf(rtype) < 0) || !ID_RE.test(rid || '')) continue;
      var buttons = row.querySelector('.listViewUserDataButtons');
      var plus = makePlus('ml-row', rid);
      if (buttons) buttons.insertBefore(plus, buttons.firstChild); else row.appendChild(plus);
      row.classList.add('ml-has-plus');
    }

    decorateDetail();
    syncChips();
  }

  function decorateDetail() {
    var id = currentItemId();
    var page = document.querySelector('#itemDetailPage:not(.hide), .itemDetailPage:not(.hide)');
    if (!id || !page || hashParts().path !== '#/details') return;
    var bar = page.querySelector('.mainDetailButtons');
    if (!bar || bar.querySelector('.ml-detail-wrap[data-ml-for="' + id + '"]')) return;
    qsa('.ml-detail-wrap', bar).forEach(function (n) { n.remove(); });
    resolveItem(id).then(function (item) {
      if (!isMusicItem(item) || bar.querySelector('.ml-detail-wrap') || currentItemId() !== id) return;
      var wrap = el('span', 'ml-detail-wrap');
      wrap.dataset.mlFor = id;
      if (item.Type === 'Playlist') {
        var share = button('ml-pill', T('share'));
        share.addEventListener('click', function () { openShareSheet(id); });
        wrap.appendChild(share);
      } else if (PLUS_TYPES.indexOf(item.Type) >= 0) {
        wrap.appendChild(makePlus('ml-detail', id));
      }
      bar.appendChild(wrap);
    }, function () { /* ignorieren */ });
  }

  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.ml-plus') : null;
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var id = b.dataset.mlId;
    if (id && ID_RE.test(id)) openPlusSheet(id);
  }, true);

  /* ---------- Reiter: Chips (modern) und Wischen ---------- */
  // Neues Layout: die Reiter stecken in einem Menue (#library-view-menu). Altes Layout: Reiterleiste.
  function libraryTabs() {
    var menu = document.getElementById('library-view-menu');
    var items = menu ? qsa('[role="menuitem"]', menu) : [];
    if (items.length > 1) {
      return items.map(function (n) {
        return { el: n, label: (n.textContent || '').trim(), active: n.classList.contains('Mui-selected') || n.getAttribute('aria-selected') === 'true' };
      });
    }
    var tabs = qsa('.emby-tabs-slider .emby-tab-button').filter(function (b) { return b.offsetParent !== null; });
    return tabs.map(function (n) {
      return { el: n, label: (n.textContent || '').trim(), active: n.classList.contains('emby-tab-button-active'), legacy: true };
    });
  }

  function removeChips() {
    qsa('.ml-chips').forEach(function (n) { n.remove(); });
    document.body.classList.remove('ml-chips-on');
  }

  function syncChips() {
    if (!musicOn || !isLibraryRoute() || appOn()) { removeChips(); return; }
    var tabs = libraryTabs();
    var host = document.querySelector('header.MuiAppBar-root');
    if (!host || tabs.length < 2 || tabs[0].legacy) { removeChips(); return; }

    var signature = tabs.map(function (t) { return t.label + (t.active ? '*' : ''); }).join('|');
    var chips = host.querySelector('.ml-chips');
    if (chips && chips.getAttribute('data-sig') === signature) return;
    if (chips) chips.remove();

    chips = el('div', 'ml-chips');
    chips.setAttribute('data-sig', signature);
    chips.setAttribute('role', 'tablist');
    tabs.forEach(function (tab, index) {
      var chip = button('ml-chip' + (tab.active ? ' ml-active' : ''), tab.label);
      chip.setAttribute('role', 'tab');
      chip.setAttribute('aria-selected', tab.active ? 'true' : 'false');
      chip.addEventListener('click', function () { gotoTab(index); });
      chips.appendChild(chip);
    });
    host.insertBefore(chips, host.children[1] || null);
    document.body.classList.add('ml-chips-on');
    var active = chips.querySelector('.ml-active');
    if (active && active.scrollIntoView) { try { active.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) { /* alte Browser */ } }
  }

  function gotoTab(index) {
    var tabs = libraryTabs();
    if (tabs[index]) tabs[index].el.click();
  }

  var touch = null;
  function scrollsHorizontally(node) {
    while (node && node !== document.body && node.nodeType === 1) {
      if (node.scrollWidth > node.clientWidth + 4) {
        var ox = getComputedStyle(node).overflowX;
        if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return true;
      }
      if (node.matches && node.matches('input, textarea, select, [role="slider"], .ml-sheet, .MuiPopover-root, .nowPlayingBar')) return true;
      node = node.parentElement;
    }
    return false;
  }

  document.addEventListener('touchstart', function (e) {
    if (!musicOn || !isLibraryRoute() || appOn() || e.touches.length !== 1 || document.querySelector('.ml-backdrop') || scrollsHorizontally(e.target)) { touch = null; return; }
    touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    if (!touch || !musicOn) return;
    var p = e.changedTouches[0];
    var dx = p.clientX - touch.x, dy = p.clientY - touch.y;
    touch = null;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return;
    var tabs = libraryTabs();
    var cur = -1;
    tabs.forEach(function (t, i) { if (t.active) cur = i; });
    if (cur < 0) return;
    var next = cur + (dx < 0 ? 1 : -1);
    if (next >= 0 && next < tabs.length) tabs[next].el.click();
  }, { passive: true });

  /* ---------- Jam ---------- */
  function ensureJamButton() {
    var b = document.querySelector('.ml-jam-fab');
    if (!config.jamEnabled) { if (b) b.remove(); return; }
    if (!uid() || !document.body) return;
    if (!b) {
      b = button('ml-pill ml-primary ml-jam-fab');
      b.addEventListener('click', openJamSheet);
      document.body.appendChild(b);
    }
    b.textContent = jam.code ? '● ' + T('jam') + ' ' + jam.code : T('jam');
    b.style.display = musicOn && !appOn() ? '' : 'none';
  }

  function currentEntry() {
    var s = jam.state;
    return s && s.index >= 0 && s.index < s.queue.length ? s.queue[s.index] : null;
  }

  // opts.silent: nur uebernehmen, den aktuellen Titel aber nicht starten (z. B. nach einem Neuladen der Seite)
  function applyJamState(s, opts) {
    if (!s) return;
    jam.state = s; jam.version = s.version; jam.code = s.code;
    safeStore('ml.jamCode', s.code);
    if (opts && opts.silent) { var cur = currentEntry(); jam.startedSeq = cur ? cur.seq : null; }
    ensureJamButton();
    startPolling();
    followEntry();
    var open = document.querySelector('.ml-jam-body');
    if (open) renderJamBody(open);
  }

  function leaveLocal() {
    jam.code = null; jam.state = null; jam.version = 0; jam.startedSeq = null;
    safeStore('ml.jamCode', null);
    if (jam.timer) { clearInterval(jam.timer); jam.timer = null; }
    ensureJamButton();
  }

  function startPolling() {
    if (jam.timer) return;
    jam.timer = setInterval(pollJam, 2500);
  }

  function pollJam() {
    if (!jam.code || document.hidden || jam.busy) return;
    jam.busy = true;
    call('GET', 'MusicLook/Jam/' + jam.code, { since: jam.version }).then(function (s) {
      jam.busy = false;
      if (s) applyJamState(s);
    }, function (err) {
      jam.busy = false;
      if (err && (err.status === 404 || err.status === 403)) { toast(T('jamEnded')); leaveLocal(); }
    });
  }

  function mySession() {
    var c = client(), me = nid(uid());
    return call('GET', 'Sessions', { deviceId: c.deviceId() }).then(function (r) {
      var list = (r || []).filter(function (s) { return nid(s.UserId) === me; });
      return list.filter(function (s) { return s.SupportsRemoteControl !== false; })[0] || list[0] || null;
    });
  }

  // Spielt den aktuellen Jam-Titel genau einmal pro Eintrag (Seq) auf diesem Geraet.
  function followEntry() {
    var e = currentEntry();
    if (!e || jam.startedSeq === e.seq) return;
    jam.startedSeq = e.seq;
    mySession().then(function (sess) {
      if (!sess) { toast(T('jamNoSession')); return; }
      return call('POST', 'Sessions/' + sess.Id + '/Playing', { playCommand: 'PlayNow', itemIds: e.itemId });
    }).catch(function () { toast(T('jamNoSession')); });
  }

  // Titelende: das Audio-Element des Web-Clients meldet "ended" (Ereignis blubbert nicht, daher Capture).
  document.addEventListener('ended', function (e) {
    var a = e.target;
    var entry = currentEntry();
    if (!jam.code || !entry || entry.seq !== jam.startedSeq) return;
    if (!a || !a.classList || !a.classList.contains('mediaPlayerAudio')) return;
    if (nid(a.currentSrc || a.src || '').indexOf(nid(entry.itemId)) < 0) return;   // anderer Titel, nicht aus der Jam
    var from = jam.state.index;
    call('POST', 'MusicLook/Jam/' + jam.code + '/Advance', { from: from }).then(function (s) { applyJamState(s); }, function () { /* naechster Poll */ });
  }, true);

  function itemNames(ids) {
    var missing = ids.filter(function (id) { return !jam.names[nid(id)]; });
    if (!missing.length) return Promise.resolve();
    return call('GET', 'Items', { UserId: uid(), Ids: missing.slice(0, 200).join(','), Fields: '' }).then(function (r) {
      ((r && r.Items) || []).forEach(function (i) {
        jam.names[nid(i.Id)] = { n: i.Name, a: (i.Artists && i.Artists[0]) || i.AlbumArtist || '' };
      });
    });
  }

  function renderJamBody(body) {
    body.textContent = '';
    var s = jam.state;
    if (!jam.code || !s) {
      body.appendChild(el('div', 'ml-muted', T('jamIntro')));
      var start = button('ml-pill ml-primary', T('jamStart'));
      start.addEventListener('click', function () {
        call('POST', 'MusicLook/Jam').then(function (st) { applyJamState(st, { silent: true }); }, function () { toast(T('jamStartFail')); });
      });
      body.appendChild(start);
      var input = el('input', 'ml-field'); input.placeholder = T('jamCodePh'); input.maxLength = 6;
      input.setAttribute('autocapitalize', 'characters'); input.setAttribute('autocomplete', 'off');
      body.appendChild(input);
      var join = button('ml-pill', T('jamJoin'));
      join.addEventListener('click', function () {
        var code = input.value.trim().toUpperCase();
        if (!CODE_RE.test(code)) { toast(T('jamInvalid')); return; }
        jam.startedSeq = null;   // beim ausdruecklichen Beitritt den laufenden Titel direkt mithoeren
        call('POST', 'MusicLook/Jam/' + code + '/Join').then(function (st) { applyJamState(st); }, function () { toast(T('jamNotFound')); });
      });
      body.appendChild(join);
      return;
    }

    body.appendChild(el('div', 'ml-muted', T('jamCode', s.code, s.members.length)));
    var ids = s.queue.map(function (q) { return q.itemId; });
    itemNames(ids).then(function () {
      if (!body.isConnected || jam.state !== s) return;
      var list = el('div');
      s.queue.forEach(function (q, idx) {
        var info = jam.names[nid(q.itemId)] || { n: T('track'), a: '' };
        var row = el('div', 'ml-row-item' + (idx === s.index ? ' ml-current' : ''));
        row.appendChild(el('span', 'ml-grow', (idx === s.index ? '▶ ' : '') + info.n + (info.a ? ' – ' + info.a : '')));
        var jump = button('ml-pill', '▶');
        jump.addEventListener('click', function () {
          call('POST', 'MusicLook/Jam/' + jam.code + '/Advance', { from: s.index, to: idx }).then(function (st) { applyJamState(st); });
        });
        var rm = button('ml-pill', '✕');
        rm.addEventListener('click', function () {
          call('POST', 'MusicLook/Jam/' + jam.code + '/Remove', { index: idx }).then(function (st) { applyJamState(st); }, function () { toast(T('jamOwnOnly')); });
        });
        row.appendChild(jump); row.appendChild(rm);
        list.appendChild(row);
      });
      if (!s.queue.length) list.appendChild(el('div', 'ml-muted', T('jamEmpty')));
      else if (s.index >= s.queue.length) list.appendChild(el('div', 'ml-muted', T('jamQueueEnd')));
      body.appendChild(list);
      var next = button('ml-pill ml-primary', T('jamNext'));
      next.addEventListener('click', function () {
        call('POST', 'MusicLook/Jam/' + jam.code + '/Advance', { from: s.index }).then(function (st) { applyJamState(st); });
      });
      var leave = button('ml-pill', T('jamLeave'));
      leave.addEventListener('click', function () {
        var code = jam.code;
        function done() { leaveLocal(); renderJamBody(body); }
        call('POST', 'MusicLook/Jam/' + code + '/Leave').then(done, done);
      });
      body.appendChild(next); body.appendChild(leave);
    }, function () { body.appendChild(el('div', 'ml-muted', T('loadFailed'))); });
  }

  function openJamSheet() {
    var ui = openSheet(T('jamTitle'));
    var body = el('div', 'ml-jam-body');
    ui.sheet.appendChild(body);
    renderJamBody(body);
  }

  // Nach einem Neuladen der Seite der zuletzt genutzten Jam wieder beitreten (ohne den Titel neu zu starten).
  function maybeResumeJam() {
    if (resumed || !uid()) return;
    resumed = true;
    var code = safeStore('ml.jamCode');
    if (!code || !CODE_RE.test(code)) return;
    call('POST', 'MusicLook/Jam/' + code + '/Join').then(function (st) { applyJamState(st, { silent: true }); }, function () { safeStore('ml.jamCode', null); });
  }

  // Fuegt Titel einer Jam hinzu; startet vorher eine neue Jam, falls noch keine laeuft.
  function jamAddIds(ids) {
    if (!config.jamEnabled) return Promise.reject(new Error('jam disabled'));
    var ensure = jam.code ? Promise.resolve() : call('POST', 'MusicLook/Jam').then(function (st) { applyJamState(st, { silent: true }); });
    return ensure.then(function () {
      return call('POST', 'MusicLook/Jam/' + jam.code + '/Add', { ids: ids.slice(0, 200).join(',') });
    }).then(function (s) { if (s) applyJamState(s); });
  }

  /* ---------- Schnittstelle fuer musiclookapp.js ---------- */
  var api = {
    version: 2,
    app: null,
    ID_RE: ID_RE,
    call: call, el: el, button: button, toast: toast, chunk: chunk, qsa: qsa, safeStore: safeStore,
    uid: uid, nid: nid, client: client, hashParts: hashParts, resolveItem: resolveItem, T: T,
    openSheet: openSheet, fitViewport: fitViewport, rowButton: rowButton, openShareSheet: openShareSheet, openJamSheet: openJamSheet,
    config: function () { return config; }, whenConfig: whenConfig,
    route: function () { return routeInfo; },
    isMusic: function () { return musicOn; },
    jamAddIds: jamAddIds, mySession: mySession,
    jamState: function () { return { code: jam.code, state: jam.state }; },
    refresh: function () { updateContext(); },
    forceMusic: function (on) { musicOn = null; setMusic(!!on); },
    uncloak: uncloak
  };
  window.MusicLook = api;
  loadKnownMusic();

  /* ---------- Start ---------- */
  var scheduled = false;
  function scheduleDecorate() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(function () {
      scheduled = false;
      // ApiClient/Anmeldung koennen erst nach dem Laden dieses Scripts bereitstehen
      if (contextKey() !== lastKey) updateContext(); else decorate();
      if (api.app && typeof api.app.layout === 'function') { try { api.app.layout(); } catch (e) { /* ignorieren */ } }
    }, 200);
  }

  function init() {
    window.addEventListener('hashchange', updateContext);
    window.addEventListener('popstate', updateContext);
    document.addEventListener('viewshow', updateContext);
    new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        // Klassenaenderungen nur im Reiter-Menue beachten (dort wechselt die Auswahl), alles andere nur bei neuen Knoten.
        if (m.type === 'childList' || (m.target && m.target.closest && m.target.closest('#library-view-menu'))) { scheduleDecorate(); return; }
      }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-selected'] });
    updateContext();
    // Waechter: prueft regelmaessig und nach Rueckkehr in den Tab, ob die Seite noch zur Ansicht passt, und baut sie sonst neu auf.
    function guard() {
      try {
        if (!client() || !uid()) return;
        if (contextKey() !== lastKey && lastKey !== null) { updateContext(); return; }
        if (lastKey === null || (isLibraryRoute() && routeInfo.kind === 'none')) { updateContext(); return; }
        if (api.app && typeof api.app.ensure === 'function') api.app.ensure();
      } catch (e) { /* naechster Durchlauf */ }
    }
    setInterval(function () { if (!document.hidden) guard(); }, 2000);
    ['visibilitychange', 'focus', 'pageshow', 'online', 'resume'].forEach(function (ev) {
      (ev === 'visibilitychange' ? document : window).addEventListener(ev, function () { setTimeout(guard, 150); });
    });
    api.guard = guard;
  }

  if (document.body) init(); else document.addEventListener('DOMContentLoaded', init);
})();

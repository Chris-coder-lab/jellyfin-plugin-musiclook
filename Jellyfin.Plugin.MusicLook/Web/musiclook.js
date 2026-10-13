/* Music Look - Client. Aktiv nur im Musik-Bereich. Nutzt ausschliesslich die Jellyfin-REST-API
   und die Plugin-Endpunkte unter /MusicLook; es werden keine Token oder Daten nach aussen gesendet. */
(function () {
  'use strict';
  if (window.__musicLookLoaded) return;
  window.__musicLookLoaded = true;

  var MUSIC_TYPES = ['MusicAlbum', 'MusicArtist', 'Audio', 'MusicGenre'];
  var ID_RE = /^[0-9a-f]{32}$|^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var CODE_RE = /^[A-HJKMNP-Z2-9]{6}$/;

  var typeCache = {};
  var config = { accentColor: '#1ed760', jamEnabled: true };
  var configLoaded = false;
  var jam = { code: null, state: null, version: 0, names: {}, startedIndex: -2, startedAt: 0, timer: null, busy: false };

  /* ---------- Hilfsfunktionen ---------- */
  function client() {
    if (window.ApiClient) return window.ApiClient;
    var sc = window.ServerConnections;
    return sc && typeof sc.currentApiClient === 'function' ? sc.currentApiClient() : null;
  }
  function uid() { var c = client(); return c && c.getCurrentUserId ? c.getCurrentUserId() : null; }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function toast(msg) {
    var t = el('div', 'ml-toast', msg);
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2600);
  }

  function call(type, path, params, body) {
    var c = client();
    var opts = { type: type, url: c.getUrl(path, params || undefined) };
    if (body !== undefined) { opts.data = JSON.stringify(body); opts.contentType = 'application/json'; }
    return c.ajax(opts).then(function (res) {
      if (!res || typeof res.status !== 'number') return res;
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

  /* ---------- Musik-Kontext erkennen ---------- */
  function hashParts() {
    var h = location.hash || '';
    var q = h.indexOf('?');
    var path = (q >= 0 ? h.slice(0, q) : h).toLowerCase();
    var params = {};
    if (q >= 0) {
      h.slice(q + 1).split('&').forEach(function (kv) {
        var i = kv.indexOf('=');
        if (i > 0) params[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1));
      });
    }
    return { path: path, params: params };
  }

  function currentItemId() {
    var p = hashParts().params;
    var id = p.id || p.parentId || p.topParentId;
    return id && ID_RE.test(id) ? id : null;
  }

  function resolveItem(id) {
    if (typeCache[id]) return Promise.resolve(typeCache[id]);
    var c = client();
    var req = typeof c.getItem === 'function'
      ? c.getItem(uid(), id)
      : call('GET', 'Items', { Ids: id, UserId: uid(), Fields: '', EnableImages: false, EnableUserData: false })
        .then(function (r) { return r && r.Items && r.Items[0]; });
    return req.then(function (item) { if (item) typeCache[id] = item; return item; });
  }

  function isMusicItem(item) {
    if (!item) return false;
    if (item.CollectionType === 'music') return true;
    if (MUSIC_TYPES.indexOf(item.Type) >= 0) return true;
    return item.Type === 'Playlist' && item.MediaType === 'Audio';
  }

  var updateSeq = 0;
  function updateContext() {
    var seq = ++updateSeq;
    var c = client();
    if (!c || !uid()) { setMusic(false); return; }
    var hp = hashParts();
    if (hp.path.indexOf('#/music') === 0) { setMusic(true); return; }
    var id = currentItemId();
    if (!id) { setMusic(false); return; }
    resolveItem(id).then(function (item) {
      if (seq === updateSeq) setMusic(isMusicItem(item));
    }, function () { if (seq === updateSeq) setMusic(false); });
  }

  var musicOn = false;
  function setMusic(on) {
    if (on === musicOn) { if (on) decorate(); return; }
    musicOn = on;
    document.body.classList.toggle('ml-music', on);
    if (on) { loadConfig(); decorate(); ensureJamButton(); }
  }

  function loadConfig() {
    if (configLoaded) return;
    configLoaded = true;
    call('GET', 'MusicLook/Config').then(function (c) {
      if (!c) return;
      if (/^#[0-9a-fA-F]{6}$/.test(c.accentColor || '')) {
        config.accentColor = c.accentColor;
        document.body.style.setProperty('--ml-accent', c.accentColor);
      }
      config.jamEnabled = c.jamEnabled !== false;
      ensureJamButton();
    }, function () { configLoaded = false; });
  }

  /* ---------- Sheet ---------- */
  function openSheet(title) {
    var backdrop = el('div', 'ml-backdrop');
    var sheet = el('div', 'ml-sheet');
    sheet.appendChild(el('h3', null, title));
    backdrop.appendChild(sheet);
    function close() { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); document.removeEventListener('keydown', onKey, true); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    backdrop.addEventListener('click', function (e) { if (e.target === backdrop) close(); });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(backdrop);
    return { sheet: sheet, close: close };
  }

  function rowButton(label, sub, onClick) {
    var b = el('button', 'ml-row-item');
    b.type = 'button';
    var g = el('span', 'ml-grow', label);
    b.appendChild(g);
    if (sub) b.appendChild(el('span', 'ml-muted', sub));
    b.addEventListener('click', onClick);
    return b;
  }

  /* ---------- Titel-IDs ermitteln ---------- */
  function trackIds(id) {
    return resolveItem(id).then(function (item) {
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
    var parts = chunk(ids, 80);
    return parts.reduce(function (p, part) {
      return p.then(function () {
        return call('POST', 'Playlists/' + playlistId + '/Items', { Ids: part.join(','), UserId: uid() });
      });
    }, Promise.resolve());
  }

  function createPlaylist(name, ids) {
    var parts = chunk(ids, 80);
    // IsPublic must be false explicitly: Jellyfin creates playlists as public by default.
    return call('POST', 'Playlists', null, { Name: name, Ids: parts[0] || [], UserId: uid(), MediaType: 'Audio', IsPublic: false })
      .then(function (r) {
        var pid = r && (r.Id || r.id);
        if (!pid) throw new Error('keine Playlist-ID erhalten');
        return addToPlaylist(pid, [].concat.apply([], parts.slice(1))).then(function () { return pid; });
      });
  }

  function openPlusSheet(itemId) {
    var ui = openSheet('Hinzufügen zu …');
    var status = el('div', 'ml-muted', 'Lade Titel …');
    ui.sheet.appendChild(status);

    trackIds(itemId).then(function (ids) {
      if (!ids.length) { status.textContent = 'Keine Titel gefunden.'; return; }
      status.textContent = ids.length + (ids.length === 1 ? ' Titel' : ' Titel');

      if (jam.code) {
        ui.sheet.appendChild(rowButton('➕  Zur Jam-Warteschlange', null, function () {
          call('POST', 'MusicLook/Jam/' + jam.code + '/Add', { ids: ids.slice(0, 200).join(',') }).then(function (s) {
            if (s) applyJamState(s);
            toast('Zur Jam hinzugefügt'); ui.close();
          }, function () { toast('Jam: Hinzufügen fehlgeschlagen'); });
        }));
      }

      var nameInput = el('input', 'ml-field');
      nameInput.type = 'text'; nameInput.maxLength = 100; nameInput.placeholder = 'Neue Playlist – Name eingeben';
      ui.sheet.appendChild(nameInput);
      var create = el('button', 'ml-pill ml-primary', 'Neue Playlist erstellen');
      create.type = 'button';
      create.addEventListener('click', function () {
        var name = nameInput.value.trim();
        if (!name) { nameInput.focus(); return; }
        create.disabled = true;
        createPlaylist(name, ids).then(function () { toast('Playlist „' + name + '“ erstellt'); ui.close(); },
          function () { create.disabled = false; toast('Erstellen fehlgeschlagen'); });
      });
      ui.sheet.appendChild(create);

      var list = el('div');
      ui.sheet.appendChild(list);
      call('GET', 'Items', { UserId: uid(), IncludeItemTypes: 'Playlist', Recursive: true, SortBy: 'SortName', Fields: 'ChildCount' })
        .then(function (r) {
          ((r && r.Items) || []).filter(function (p) { return p.MediaType === 'Audio' || !p.MediaType; }).forEach(function (p) {
            list.appendChild(rowButton(p.Name, p.ChildCount != null ? p.ChildCount + ' Titel' : null, function () {
              addToPlaylist(p.Id, ids).then(function () { toast('Zu „' + p.Name + '“ hinzugefügt'); ui.close(); },
                function () { toast('Hinzufügen fehlgeschlagen (keine Berechtigung?)'); });
            }));
          });
        });
    }, function () { status.textContent = 'Fehler beim Laden.'; });
  }

  /* ---------- Playlist teilen ---------- */
  function openShareSheet(playlistId) {
    var ui = openSheet('Playlist teilen');
    var hint = el('div', 'ml-muted', 'Wähle Personen, die die Playlist sehen (und bearbeiten) dürfen.');
    ui.sheet.appendChild(hint);
    var canEdit = el('label', 'ml-row-item');
    var cb = el('input'); cb.type = 'checkbox'; cb.checked = true;
    canEdit.appendChild(cb); canEdit.appendChild(el('span', 'ml-grow', 'Darf bearbeiten (Titel hinzufügen)'));
    ui.sheet.appendChild(canEdit);
    var list = el('div'); ui.sheet.appendChild(list);
    var chosen = {};

    call('GET', 'MusicLook/Users').then(function (users) {
      (users || []).forEach(function (u) {
        var row = el('label', 'ml-row-item');
        var box = el('input'); box.type = 'checkbox';
        box.addEventListener('change', function () { if (box.checked) chosen[u.id] = u.name; else delete chosen[u.id]; });
        row.appendChild(box); row.appendChild(el('span', 'ml-grow', u.name));
        list.appendChild(row);
      });
      if (!users || !users.length) list.appendChild(el('div', 'ml-muted', 'Keine weiteren Benutzer vorhanden.'));
    }, function () { list.appendChild(el('div', 'ml-muted', 'Benutzerliste nicht verfügbar.')); });

    var go = el('button', 'ml-pill ml-primary', 'Teilen'); go.type = 'button';
    go.addEventListener('click', function () {
      var ids = Object.keys(chosen);
      if (!ids.length) { toast('Niemand ausgewählt'); return; }
      go.disabled = true;
      var failed = 0;
      ids.reduce(function (p, id) {
        return p.then(function () {
          return call('POST', 'Playlists/' + playlistId + '/Users/' + id, null, { CanEdit: cb.checked })
            .catch(function () { failed++; });
        });
      }, Promise.resolve()).then(function () {
        go.disabled = false;
        toast(failed ? failed + ' von ' + ids.length + ' fehlgeschlagen' : 'Geteilt mit ' + ids.length + (ids.length === 1 ? ' Person' : ' Personen'));
        if (!failed) ui.close();
      });
    });
    ui.sheet.appendChild(go);
  }

  /* ---------- Buttons einfuegen ---------- */
  var SKIP = 'ml-done';
  function makePlus(cls, id) {
    var b = el('button', 'ml-plus ' + cls, '+');
    b.type = 'button'; b.title = 'Zu Playlist hinzufügen'; b.setAttribute('aria-label', 'Zu Playlist hinzufügen');
    b.dataset.mlId = id;
    return b;
  }

  function decorate() {
    if (!musicOn) return;
    var i, nodes;
    nodes = document.querySelectorAll('.card[data-id][data-type]:not(.' + SKIP + ')');
    for (i = 0; i < nodes.length; i++) {
      var card = nodes[i];
      var t = card.getAttribute('data-type');
      card.classList.add(SKIP);
      if (t !== 'Audio' && t !== 'MusicAlbum' && t !== 'MusicArtist') continue;
      var box = card.querySelector('.cardBox');
      if (!box) continue;
      if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
      box.appendChild(makePlus('ml-card', card.getAttribute('data-id')));
    }
    nodes = document.querySelectorAll('.listItem[data-id]:not(.' + SKIP + ')');
    for (i = 0; i < nodes.length; i++) {
      var row = nodes[i];
      row.classList.add(SKIP);
      var rid = row.getAttribute('data-id');
      if (!ID_RE.test(rid || '')) continue;
      row.appendChild(makePlus('ml-row', rid));
    }
    decorateDetail();
  }

  function decorateDetail() {
    var id = currentItemId();
    var page = document.querySelector('.itemDetailPage:not(.hide), #itemDetailPage:not(.hide)');
    if (!id || !page) return;
    var bar = page.querySelector('.mainDetailButtons');
    if (!bar || bar.querySelector('.ml-detail-wrap[data-ml-for="' + id + '"]')) return;
    var old = bar.querySelector('.ml-detail-wrap');
    if (old) old.remove();
    resolveItem(id).then(function (item) {
      if (!isMusicItem(item) || bar.querySelector('.ml-detail-wrap')) return;
      var wrap = el('span', 'ml-detail-wrap');
      wrap.dataset.mlFor = id;
      if (item.Type !== 'Playlist') wrap.appendChild(makePlus('ml-detail', id));
      else {
        var share = el('button', 'ml-pill', 'Teilen'); share.type = 'button';
        share.addEventListener('click', function () { openShareSheet(id); });
        wrap.appendChild(share);
      }
      bar.appendChild(wrap);
    });
  }

  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.ml-plus') : null;
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    var id = b.dataset.mlId;
    if (id && ID_RE.test(id)) openPlusSheet(id);
  }, true);

  /* ---------- Wischen zwischen Reitern ---------- */
  var touch = null;
  function scrollableAncestor(node) {
    while (node && node !== document.body) {
      if (node.scrollWidth > node.clientWidth + 4) {
        var ox = getComputedStyle(node).overflowX;
        if (ox === 'auto' || ox === 'scroll') return true;
      }
      node = node.parentElement;
    }
    return false;
  }

  document.addEventListener('touchstart', function (e) {
    if (!musicOn || e.touches.length !== 1 || scrollableAncestor(e.target)) { touch = null; return; }
    touch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });

  document.addEventListener('touchend', function (e) {
    if (!touch || !musicOn) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - touch.x, dy = t.clientY - touch.y;
    touch = null;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 2) return;
    var tabs = Array.prototype.slice.call(document.querySelectorAll('.emby-tabs-slider .emby-tab-button'))
      .filter(function (b) { return b.offsetParent !== null; });
    var cur = tabs.findIndex(function (b) { return b.classList.contains('emby-tab-button-active'); });
    if (cur < 0) return;
    var next = tabs[cur + (dx < 0 ? 1 : -1)];
    if (next) next.click();
  }, { passive: true });

  /* ---------- Jam ---------- */
  function ensureJamButton() {
    if (!musicOn || !config.jamEnabled || !uid()) return;
    var b = document.querySelector('.ml-jam-fab');
    if (!b) {
      b = el('button', 'ml-pill ml-primary ml-jam-fab'); b.type = 'button';
      b.addEventListener('click', openJamSheet);
      document.body.appendChild(b);
    }
    b.textContent = jam.code ? '● Jam ' + jam.code : 'Jam';
  }

  function applyJamState(s) {
    if (!s) return;
    jam.state = s; jam.version = s.version; jam.code = s.code;
    safeStore('ml.jamCode', s.code);
    ensureJamButton();
    startPolling();
    followIndex();
    var open = document.querySelector('.ml-jam-body');
    if (open) renderJamBody(open);
  }

  function leaveLocal() {
    jam.code = null; jam.state = null; jam.version = 0; jam.startedIndex = -2;
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
      if (s) applyJamState(s); else detectTrackEnd();
    }, function (err) {
      jam.busy = false;
      if (err && (err.status === 404 || err.status === 403)) { toast('Jam beendet'); leaveLocal(); }
    });
  }

  function mySession() {
    var c = client();
    return call('GET', 'Sessions', { DeviceId: c.deviceId() }).then(function (r) { return r && r[0] ? r[0] : null; });
  }

  function currentEntry() {
    var s = jam.state;
    return s && s.index >= 0 && s.index < s.queue.length ? s.queue[s.index] : null;
  }

  function followIndex() {
    var s = jam.state, e = currentEntry();
    if (!s || !e || jam.startedIndex === s.index) return;
    jam.startedIndex = s.index; jam.startedAt = Date.now();
    mySession().then(function (sess) {
      if (!sess) return;
      call('POST', 'Sessions/' + sess.Id + '/Playing', { playCommand: 'PlayNow', itemIds: e.itemId });
    });
  }

  function detectTrackEnd() {
    var s = jam.state, e = currentEntry();
    if (!s || !e || jam.startedIndex !== s.index || Date.now() - jam.startedAt < 10000) return;
    mySession().then(function (sess) {
      if (!sess) return;
      var np = sess.NowPlayingItem;
      if (np && np.Id && nid(np.Id) === nid(e.itemId)) return;
      call('POST', 'MusicLook/Jam/' + jam.code + '/Advance', { from: s.index }).then(applyJamState);
    });
  }

  function nid(id) { return String(id || '').replace(/-/g, '').toLowerCase(); }

  function itemNames(ids) {
    var missing = ids.filter(function (id) { return !jam.names[nid(id)]; });
    if (!missing.length) return Promise.resolve();
    return call('GET', 'Items', { UserId: uid(), Ids: missing.join(','), Fields: '' }).then(function (r) {
      ((r && r.Items) || []).forEach(function (i) {
        jam.names[nid(i.Id)] = { n: i.Name, a: (i.Artists && i.Artists[0]) || i.AlbumArtist || '' };
      });
    });
  }

  function renderJamBody(body) {
    body.textContent = '';
    var s = jam.state;
    if (!jam.code || !s) {
      body.appendChild(el('div', 'ml-muted', 'Starte eine Jam: Alle in der Jam fügen Titel zur gemeinsamen Warteschlange hinzu, sie wird nacheinander abgespielt.'));
      var start = el('button', 'ml-pill ml-primary', 'Jam starten'); start.type = 'button';
      start.addEventListener('click', function () {
        call('POST', 'MusicLook/Jam').then(applyJamState, function () { toast('Jam konnte nicht gestartet werden'); });
      });
      body.appendChild(start);
      var input = el('input', 'ml-field'); input.placeholder = 'Code eingeben (6 Zeichen)'; input.maxLength = 6;
      input.autocapitalize = 'characters';
      body.appendChild(input);
      var join = el('button', 'ml-pill', 'Beitreten'); join.type = 'button';
      join.addEventListener('click', function () {
        var code = input.value.trim().toUpperCase();
        if (!CODE_RE.test(code)) { toast('Ungültiger Code'); return; }
        call('POST', 'MusicLook/Jam/' + code + '/Join').then(applyJamState, function () { toast('Jam nicht gefunden oder voll'); });
      });
      body.appendChild(join);
      return;
    }

    body.appendChild(el('div', 'ml-muted', 'Code: ' + s.code + ' · ' + s.members.length + ' Teilnehmer'));
    var ids = s.queue.map(function (q) { return q.itemId; });
    itemNames(ids).then(function () {
      if (!body.isConnected) return;
      var list = el('div');
      s.queue.forEach(function (q, idx) {
        var info = jam.names[nid(q.itemId)] || { n: 'Titel', a: '' };
        var row = el('div', 'ml-row-item' + (idx === s.index ? ' ml-current' : ''));
        row.appendChild(el('span', 'ml-grow', (idx === s.index ? '▶ ' : '') + info.n + (info.a ? ' – ' + info.a : '')));
        var jump = el('button', 'ml-pill', '▶'); jump.type = 'button';
        jump.addEventListener('click', function () { call('POST', 'MusicLook/Jam/' + jam.code + '/Advance', { from: s.index, to: idx }).then(applyJamState); });
        var rm = el('button', 'ml-pill', '✕'); rm.type = 'button';
        rm.addEventListener('click', function () { call('POST', 'MusicLook/Jam/' + jam.code + '/Remove', { index: idx }).then(applyJamState, function () { toast('Nur eigene Titel entfernbar'); }); });
        row.appendChild(jump); row.appendChild(rm);
        list.appendChild(row);
      });
      if (!s.queue.length) list.appendChild(el('div', 'ml-muted', 'Die Warteschlange ist leer. Nutze das „+“ an Titeln und Alben.'));
      body.appendChild(list);
      var next = el('button', 'ml-pill ml-primary', 'Nächster Titel'); next.type = 'button';
      next.addEventListener('click', function () { call('POST', 'MusicLook/Jam/' + jam.code + '/Advance', { from: s.index }).then(applyJamState); });
      var leave = el('button', 'ml-pill', 'Jam verlassen'); leave.type = 'button';
      leave.addEventListener('click', function () {
        var code = jam.code;
        call('POST', 'MusicLook/Jam/' + code + '/Leave').then(function () { leaveLocal(); renderJamBody(body); }, function () { leaveLocal(); renderJamBody(body); });
      });
      body.appendChild(next); body.appendChild(leave);
    });
  }

  function openJamSheet() {
    var ui = openSheet('Jam');
    var body = el('div', 'ml-jam-body');
    ui.sheet.appendChild(body);
    renderJamBody(body);
  }

  function resumeJam() {
    var code = safeStore('ml.jamCode');
    if (!code || !CODE_RE.test(code) || !uid()) return;
    call('POST', 'MusicLook/Jam/' + code + '/Join').then(applyJamState, function () { safeStore('ml.jamCode', null); });
  }

  /* ---------- Start ---------- */
  var scheduled = false;
  function scheduleDecorate() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(function () { scheduled = false; decorate(); }, 250);
  }

  function init() {
    window.addEventListener('hashchange', updateContext);
    document.addEventListener('viewshow', updateContext);
    new MutationObserver(scheduleDecorate).observe(document.body, { childList: true, subtree: true });
    updateContext();
    setTimeout(resumeJam, 1500);
  }

  (function waitForApi(n) {
    if (client() && document.body) return init();
    if (n > 200) return;
    setTimeout(function () { waitForApi(n + 1); }, 250);
  })(0);
})();

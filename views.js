'use strict';
// ================= Musio — écrans principaux =================

// ---------- FEED ----------
function feedPosts() {
  let list = allPosts().filter(p => !blocked(p.author) && !S.hiddenPosts.includes(p.id));
  if (U.feedMode === 'following') list = list.filter(p => p.author === 'me' || S.followed.includes(p.author));
  else if (S.consents.reco && S.prefs.genres.length) {
    const score = p => p.author === 'me' && Date.now() - (p.at || 0) < 3600000 ? -1 : (S.prefs.genres.includes(T(p.trackId).genre) ? 0 : 1);
    list = list.map((p, i) => [p, i]).sort((a, b) => score(a[0]) - score(b[0]) || a[1] - b[1]).map(x => x[0]);
  }
  // échos : un post relayé par toi ou par un compte suivi affiche le bandeau du dernier écho
  const vis = e => !blocked(e.by) && (e.by === 'me' || S.followed.includes(e.by));
  const items = list.map(p => ({ p, e: S.echoes.filter(e => e.post === p.id && vis(e)).sort((a, b) => b.at - a.at)[0] || null }));
  if (U.feedMode === 'following') { const ids = new Set(items.map(i => i.p.id)); S.echoes.filter(vis).forEach(e => { const p = post(e.post); if (p && !ids.has(p.id) && !blocked(p.author) && !S.hiddenPosts.includes(p.id)) { ids.add(p.id); items.push({ p, e }); } }); }
  // ton écho récent remonte en haut
  const fresh = i => i.e && i.e.by === 'me' && Date.now() - i.e.at < 3600000;
  return items.filter(fresh).concat(items.filter(i => !fresh(i)));
}
function postHTML(it) {
  const p = it.p || it, e = it.p ? it.e : null;
  const u = user(p.author), t = T(p.trackId), liked = S.likedPosts.includes(p.id), mine = myEcho(p.id);
  const fol = p.author === 'me' || S.followed.includes(p.author);
  return `<article class="post paused" data-post="${p.id}">
    ${mediaHTML(p)}
    ${(p.texts || []).map(l => textLayerHTML(l, false)).join('')}
    ${e && (e.img || e.react) ? `<div class="echo-stk">${e.img ? `<img src="${e.img}" alt="">` : reactHTML(e.react, true)}</div>` : ''}
    <div class="scrim"></div><div class="pz"><span class="glass strong">${icf('play', 40)}</span></div>
    <div class="rail">
      <div class="rail-av"><button data-a="openProfile" data-id="${p.author}" aria-label="Profil de ${esc(u.name)}">${avatar(u, 48)}</button>${fol ? '' : `<button class="follow-plus" data-a="follow" data-id="${p.author}" aria-label="Suivre ${esc(u.name)}">${ic('plus', 14)}</button>`}</div>
      <button class="${liked ? 'liked' : ''}" data-a="likePost" data-id="${p.id}" aria-pressed="${liked}" aria-label="J’aime"><span class="rb glass">${liked ? icf('heart', 26) : ic('heart', 26)}</span><span data-count="likes">${fmtN(p.likes + (liked ? 1 : 0))}</span></button>
      <button data-a="comments" data-id="${p.id}" aria-label="Commentaires"><span class="rb glass">${ic('comment', 24)}</span><span data-count="comments">${fmtN(p.commentsBase + p.comments.length)}</span></button>
      <button class="${mine ? 'echoed' : ''}" data-a="echo" data-id="${p.id}" aria-pressed="${!!mine}" aria-label="Faire écho"><span class="rb glass">${ic('echo', 25)}</span><span data-count="echoes">${fmtN(echoCount(p))}</span></button>
      <button data-a="sharePost" data-id="${p.id}" aria-label="Partager ou signaler"><span class="rb glass">${ic('share', 24)}</span><span data-count="shares">${fmtN(p.shares)}</span></button>
      <button data-a="openTrack" data-id="${t.id}" data-post="${p.id}" aria-label="Ouvrir le son ${esc(t.title)}"><span class="disc glass strong">${cover(t, 32, 16)}</span></button>
    </div>
    <div class="cap">
      ${e ? (() => { const eu = user(e.by); return `<button class="echo-note glass strong" data-a="${e.by === 'me' ? 'echo' : 'openProfile'}" data-id="${e.by === 'me' ? p.id : e.by}">${ic('echo', 15)}${avatar(eu, 22)}<span class="en-t"><b>${e.by === 'me' ? 'Tu as fait écho' : esc(eu.name) + ' a fait écho'}</b><small>${ago(e.at)}</small>${e.text ? `<span class="en-x">${esc(e.text)}</span>` : ''}</span></button>`; })() : ''}
      <button class="who" data-a="openProfile" data-id="${p.author}">@${esc(u.handle)}${verified(u)}${p.author === 'me' ? ' <span class="t2" style="font-weight:500">&nbsp;· toi</span>' : ''}</button>
      <p>${captionHTML(p.caption)}</p>
      <span class="views-l">${icf('play', 11)}<span data-count="views">${fmtN(postViews(p))}</span> vues</span>
      <button class="snd glass" data-a="openTrack" data-id="${t.id}" data-post="${p.id}">${ic('music', 14)}<span class="marq">${esc(t.title)} · ${esc(t.artist)}</span></button>
    </div>
    <div class="post-prog" aria-hidden="true"><i></i></div>
  </article>`;
}
function feedTop() {
  const unread = S.activity.some(a => !a.read);
  return `<div class="feed-top">${seg('feed', [['following', 'Abonnés'], ['foryou', 'Pour toi'], ['music', 'Musique']], U.feedMode, 'feedMode')}<div class="tools glass strong lens"><button class="icon-btn" data-a="search" aria-label="Rechercher">${ic('search')}</button><button class="icon-btn" data-a="activity" aria-label="Activité${unread ? ' (nouveau)' : ''}">${ic('bell')}${unread ? '<i class="dot"></i>' : ''}</button></div></div>`;
}
VIEWS.feed = () => {
  if (U.feedMode === 'music') return viewMusic() + feedTop();
  const posts = feedPosts();
  return `<div class="feed" id="feed">${posts.length ? posts.map(postHTML).join('') : `<div class="empty">${ic('users', 40)}<b>Rien ici pour l’instant</b><span>Suis des personnes pour remplir ce fil.</span></div>`}</div>${feedTop()}${!U.unlocked ? `<button class="unlock glass strong lens" data-a="unlock">${ic('volume', 20)}Touchez pour activer le son</button>` : ''}`;
};
let feedObs = null;
AFTER.feed = () => {
  const feed = $('#feed'); if (feedObs) { feedObs.disconnect(); feedObs = null; }
  if (!feed) return;
  const els = $$('.post', feed);
  if (U.activePost) { const i = els.findIndex(e => e.dataset.post === U.activePost); if (i > 0) feed.scrollTop = i * feed.clientHeight; if (i < 0) U.activePost = null; }
  feedObs = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting && en.intersectionRatio >= 0.6) setActivePost(en.target.dataset.post); }), { root: feed, threshold: [0.6] });
  els.forEach(e => feedObs.observe(e));
  if (!U.activePost && els[0]) setActivePost(els[0].dataset.post, true);
  else syncFeed();
};
function setActivePost(id, force) {
  if (U.activePost === id && !force) return;
  U.activePost = id;
  $$('#feed .post video').forEach(v => { if (v.closest('.post').dataset.post === id) v.play().catch(() => {}); else v.pause(); });
  const p = post(id);
  if (p && U.unlocked && S.settings.autoplay && U.tab === 'feed' && !hasScreen()) playTrack(p.trackId, { queue: [p.trackId], at: p.start || 0, source: 'Feed · @' + user(p.author).handle, post: id });
  syncFeed();
}
function syncFeed() {
  $$('.post').forEach(el => { const p = post(el.dataset.post); const on = p && E.isPlaying() && P.trackId === p.trackId && P.post === p.id; el.classList.toggle('paused', !on); });
}
let lastTap = 0, tapTimer = null;
function postTap(el, e) {
  if (U.justUnlocked && Date.now() - U.justUnlocked < 500) return;
  const now = Date.now(), id = el.dataset.post;
  if (now - lastTap < 300) { clearTimeout(tapTimer); lastTap = 0; doubleLike(el, e); return; }
  lastTap = now;
  tapTimer = setTimeout(() => {
    const p = post(id); if (!p) return;
    if (P.post === id && P.trackId === p.trackId) togglePlay();
    else playTrack(p.trackId, { queue: [p.trackId], at: p.start || 0, source: 'Feed · @' + user(p.author).handle, post: id });
  }, 260);
}
function doubleLike(el, e) {
  const id = el.dataset.post; if (!S.likedPosts.includes(id)) toggleLikePost(id);
  const r = el.getBoundingClientRect(); const b = document.createElement('span');
  b.className = 'burst'; b.style.left = (e.clientX - r.left) + 'px'; b.style.top = (e.clientY - r.top) + 'px'; b.innerHTML = icf('heart', 110);
  el.appendChild(b); setTimeout(() => b.remove(), 920); haptic(12);
}
function toggleLikePost(id) {
  const i = S.likedPosts.indexOf(id); if (i >= 0) S.likedPosts.splice(i, 1); else { S.likedPosts.push(id); haptic(); }
  save(); updatePostDOM(id);
}
function updatePostDOM(id) {
  const p = post(id); if (!p) return;
  $$(`.post[data-post="${id}"]`).forEach(el => {
    const liked = S.likedPosts.includes(id); const b = $('[data-a="likePost"]', el);
    b.classList.toggle('liked', liked); b.setAttribute('aria-pressed', liked); $('.rb', b).innerHTML = liked ? icf('heart', 26) : ic('heart', 26);
    $('[data-count="likes"]', el).textContent = fmtN(p.likes + (liked ? 1 : 0));
    $('[data-count="comments"]', el).textContent = fmtN(p.commentsBase + p.comments.length);
    $('[data-count="shares"]', el).textContent = fmtN(p.shares);
    const vw = $('[data-count="views"]', el); if (vw) vw.textContent = fmtN(postViews(p));
    const eb = $('[data-a="echo"][aria-label]', el); if (eb) { const m = !!myEcho(id); eb.classList.toggle('echoed', m); eb.setAttribute('aria-pressed', m); $('[data-count="echoes"]', eb).textContent = fmtN(echoCount(p)); }
  });
}

// ---------- MUSIQUE ----------
function viewMusic() {
  const g = U.genre; const tr = D.tracks.filter(t => g === 'Tout' || t.genre === g);
  const mixes = D.mixes.filter(m => g === 'Tout' || m.genre === g);
  const h = new Date().getHours(); const hello = h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir';
  const day = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const t = T(P.trackId);
  const tiles = [PL('liked')].concat(D.playlists.slice(0, 3));
  const hero = t
    ? `<div class="hero glass strong"><button class="hero-art" data-a="openPlayer" aria-label="Ouvrir le lecteur">${cover(t, 112, 24)}</button><div class="hero-txt"><small>${E.isPlaying() ? 'EN COURS' : 'REPRENDRE'}</small><b>${esc(t.title)}</b><span class="t2">${esc(t.artist)} · ${esc(P.source || 'Ta bibliothèque')}</span><div class="hero-prog"><i data-prog></i></div></div><button class="hero-play" data-a="pp" data-pp="26" aria-label="Lecture / pause">${icf(E.isPlaying() ? 'pause' : 'play', 26)}</button></div>`
    : `<div class="hero glass strong">${cover(D.playlists[0], 112, 24)}<div class="hero-txt"><small>POUR COMMENCER</small><b>${esc(D.playlists[0].title)}</b><span class="t2">${esc(D.playlists[0].desc)}</span></div><button class="hero-play" data-a="playPl" data-id="pl1" aria-label="Lancer">${icf('play', 26)}</button></div>`;
  return `<div class="scroll music">
    <div class="greet"><small class="t3">${esc(day.charAt(0).toUpperCase() + day.slice(1))}</small><h1>${hello}${S.me.name && S.me.name !== 'Toi' ? ', ' + esc(S.me.name) : ''}</h1></div>
    ${hero}
    <div class="chips">${['Tout'].concat(GENRES).map(x => `<button class="chip glass ${x === g ? 'on' : ''}" data-a="genre" data-id="${x}" aria-pressed="${x === g}">${x}</button>`).join('')}</div>
    ${mixes.length ? `<div class="sec-h"><h2>Pour toi</h2><span class="t3" style="font-size:13px">${mixes.length} mix</span></div><div class="hscroll">${mixes.map(mx => `<button class="mixcard big" data-a="openPlaylist" data-id="${mx.id}">${cover(mx, 168, 28, `<span class="gtag">${mx.tag}</span>`)}<b>${esc(mx.title)}</b><small>${esc(mx.sub)}</small></button>`).join('')}</div>` : ''}
    ${typeof cloudTracksHTML === 'function' ? cloudTracksHTML() : ''}
    <h2>Reprendre</h2>
    <div class="tiles">${tiles.concat(S.playlists).map(pl => `<button class="tile glass" data-a="openPlaylist" data-id="${pl.id}">${cover(pl, 46, 14)}<span>${esc(pl.title)}</span></button>`).join('')}<button class="tile glass add" data-a="newPlaylist">${`<span class="tile-plus">${ic('plus', 22)}</span>`}<span>Nouvelle playlist</span></button></div>
    <div class="sec-h"><h2>${g === 'Tout' ? 'Nouveautés' : 'Titres ' + esc(g)}</h2><button class="chip glass" data-a="playList" data-q="${tr.map(x => x.id).join(',')}" data-src="Nouveautés">${icf('play', 14)}Tout lire</button></div>
    <div class="panel glass"><div class="tracklist">${tr.map(x => trackRow(x, tr.map(y => y.id), g === 'Tout' ? 'Nouveautés' : 'Titres ' + g)).join('')}</div></div>
  </div>`;
}

// ---------- MAP ----------
// Vraie carte : MapLibre GL + tuiles OpenFreeMap (OpenStreetMap), gratuites et sans clé.
// La carte est créée une seule fois et garde sa position quand l'écran se redessine.
const MAP_STYLE = 'https://tiles.openfreemap.org/styles/dark';
const MAP_DEFAULT = { center: [2.3522, 48.8566], zoom: 11.5 };   // Paris, avant que la position soit connue
const GEO = { pos: null, watching: false, err: '' };
const MAPGL = { lib: null, map: null, el: null, markers: [], me: null, loading: null, failed: false };
function loadMapLib() {
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  if (!MAPGL.loading) MAPGL.loading = new Promise((res, rej) => {
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'vendor/maplibre/maplibre-gl.css'; document.head.appendChild(css);
    const sc = document.createElement('script'); sc.src = 'vendor/maplibre/maplibre-gl.js'; sc.async = true;
    sc.onload = () => window.maplibregl ? res(window.maplibregl) : rej(new Error('maplibre'));
    sc.onerror = () => { MAPGL.loading = null; rej(new Error('maplibre')); };
    document.head.appendChild(sc);
  });
  return MAPGL.loading;
}
// position arrondie (~100 m) : assez pour la carte, sans adresse exacte
const roundGeo = (lat, lng) => ({ lat: Math.round(lat * 1000) / 1000, lng: Math.round(lng * 1000) / 1000 });
function locateMe(fly) {
  if (!navigator.geolocation) { GEO.err = 'Ton appareil ne permet pas la localisation.'; refreshMapUI(); return; }
  GEO.asking = true; refreshMapUI();
  navigator.geolocation.getCurrentPosition(p => {
    GEO.asking = false; GEO.err = ''; GEO.pos = roundGeo(p.coords.latitude, p.coords.longitude);
    S.geo = Object.assign({ on: true, at: Date.now() }, GEO.pos); save();
    syncMarkers(); refreshMapUI();
    if (MAPGL.map && fly !== false) MAPGL.map.flyTo({ center: [GEO.pos.lng, GEO.pos.lat], zoom: Math.max(MAPGL.map.getZoom(), 14), speed: 1.4 });
  }, e => {
    GEO.asking = false;
    GEO.err = e && e.code === 1 ? 'Localisation refusée. Tu peux l’autoriser dans les réglages de ton navigateur.' : 'Position introuvable pour le moment.';
    if (e && e.code === 1 && S.geo) { S.geo.on = false; save(); }
    refreshMapUI();
  }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 5 * 60000 });
}
function meMarkerEl() {
  const t = T(P.trackId), el = document.createElement('div');
  el.className = 'marker me';
  el.innerHTML = S.settings.shareListening
    ? `<span class="bubble glass strong">${t && E.isPlaying() ? eqHTML() + `<span>${esc(t.title)}</span>` : '<span>Toi</span>'}</span><span class="me-dot">${S.me.photo ? avatar(user('me'), 18) : ''}</span>`
    : `<span class="bubble glass">${ic('ghost', 14)}<span>Mode fantôme</span></span><span class="me-dot" style="opacity:.4"></span>`;
  return el;
}
function friendMarkerEl(f) {
  const t = T(f.trackId), b = document.createElement('button');
  b.className = 'marker'; b.dataset.a = 'friend'; b.dataset.id = f.id;
  b.setAttribute('aria-label', `${f.name} ${f.live ? 'écoute' : 'a écouté'} ${t ? t.title : ''}`);
  b.innerHTML = `<span class="bubble glass strong">${f.live ? eqHTML() : ic('music', 14)}<span>${esc(t ? t.title : '')}</span></span><span class="mk-av ${f.live ? 'live' : ''}" style="background:${f.color};color:${f.color}">${avatar(f, 44)}</span><span class="mk-name">${esc(f.name)}${f.live ? '' : ' · ' + (f.ago || '')}</span>`;
  return b;
}
const mapFriends = () => FRIENDS.filter(f => !blocked(f.id) && (U.mapMode === 'all' || f.live) && isFinite(f.lat) && isFinite(f.lng));
function syncMarkers() {
  const map = MAPGL.map, lib = MAPGL.lib; if (!map || !lib) return;
  MAPGL.markers.forEach(m => m.remove()); MAPGL.markers = [];
  if (MAPGL.me) { MAPGL.me.remove(); MAPGL.me = null; }
  if (GEO.pos) MAPGL.me = new lib.Marker({ element: meMarkerEl(), anchor: 'bottom' }).setLngLat([GEO.pos.lng, GEO.pos.lat]).addTo(map);
  mapFriends().forEach(f => MAPGL.markers.push(new lib.Marker({ element: friendMarkerEl(f), anchor: 'bottom' }).setLngLat([f.lng, f.lat]).addTo(map)));
}
// petites zones de l'écran Map qui changent sans redessiner la carte
function geoCardHTML() {
  if (MAPGL.failed) return `<div class="geo-card glass strong">${ic('info', 20)}<span class="grow tt"><b>Carte indisponible</b><small>Vérifie ta connexion Internet puis rouvre la Map.</small></span></div>`;
  if (GEO.pos) return '';
  return `<div class="geo-card glass strong">${ic('locate', 22)}<span class="grow tt"><b>${GEO.asking ? 'Localisation…' : 'Apparais sur la Map'}</b><small>${esc(GEO.err || 'Ta position est arrondie à ton quartier. Tu peux passer en mode fantôme à tout moment.')}</small></span>${GEO.asking ? '' : `<button class="btn primary sm-btn" data-a="locate">Activer</button>`}</div>`;
}
function refreshMapUI() { const c = $('#geoCard'); if (c) c.innerHTML = geoCardHTML(); }
VIEWS.map = () => {
  const fl = FRIENDS.filter(f => !blocked(f.id) && (U.mapMode === 'all' || f.live)), live = fl.filter(f => f.live);
  return `<div class="map" id="map"></div>
    <div class="map-top"><div class="map-head glass strong lens"><h1>Map</h1>${seg('map', [['live', 'En direct'], ['all', '24 h']], U.mapMode, 'mapMode')}</div><button class="icon-btn glass strong ${S.settings.shareListening ? '' : 'on'}" style="width:52px;height:52px" data-a="ghost" aria-pressed="${!S.settings.shareListening}" aria-label="Mode fantôme">${ic(S.settings.shareListening ? 'eye' : 'ghost')}</button></div>
    <div class="map-zoom glass strong"><button class="icon-btn" data-a="zoom" data-id="1" aria-label="Zoomer">${ic('plus')}</button><button class="icon-btn" data-a="zoom" data-id="-1" aria-label="Dézoomer">${ic('minus')}</button><button class="icon-btn" data-a="recenter" aria-label="Me localiser">${ic('locate')}</button></div>
    <div id="geoCard" class="geo-wrap">${geoCardHTML()}</div>
    <div class="dock glass strong ${U.mapPanel ? 'open' : ''}">
      <button class="dock-head" data-a="mapPanel" aria-expanded="${U.mapPanel}"><span class="tt"><b>${live.length} ami${live.length > 1 ? 's' : ''} en direct</b><small>${fl.length ? (U.mapPanel ? 'Touche un ami pour écouter avec lui' : fl.length - live.length ? `+ ${fl.length - live.length} ces dernières 24 h` : 'Ce que tes amis écoutent, maintenant') : 'Suis des personnes pour voir ce qu’elles écoutent'}</small></span><span class="icon-btn sm glass">${ic(U.mapPanel ? 'down' : 'up', 18)}</span></button>
      ${U.mapPanel
        ? `<div class="list dock-list">${fl.map(f => { const tr = T(f.trackId); return `<button class="li" data-a="friend" data-id="${f.id}">${avatar(f, 44)}<span class="grow tt"><b>${esc(f.name)}${f.place ? ` <span class="t3" style="font-weight:500">· ${esc(f.place)}</span>` : ''}</b><small>${esc(tr.title)} — ${esc(tr.artist)}</small></span>${f.live ? eqHTML() : `<small class="t3">${f.ago || ''}</small>`}</button>`; }).join('')}</div>`
        : `<div class="dock-avs">${fl.map(f => `<button class="dock-av" data-a="friend" data-id="${f.id}" aria-label="${esc(f.name)}"><span class="mk-av ${f.live ? 'live' : ''}" style="background:${f.color};color:${f.color}">${avatar(f, 42)}</span><small>${esc(f.name)}</small></button>`).join('')}</div>`}
    </div>`;
};
AFTER.map = () => {
  const slot = $('#map'); if (!slot) return;
  if (MAPGL.el) { slot.appendChild(MAPGL.el); if (MAPGL.map) { MAPGL.map.resize(); syncMarkers(); } }
  else {
    MAPGL.el = document.createElement('div'); MAPGL.el.className = 'map-gl'; slot.appendChild(MAPGL.el);
    loadMapLib().then(lib => {
      MAPGL.lib = lib;
      const start = S.geo && isFinite(S.geo.lat) ? { center: [S.geo.lng, S.geo.lat], zoom: 13.5 } : MAP_DEFAULT;
      MAPGL.map = new lib.Map({ container: MAPGL.el, style: MAP_STYLE, center: start.center, zoom: start.zoom, minZoom: 2, maxZoom: 18, attributionControl: false, dragRotate: false, pitchWithRotate: false, touchPitch: false, cooperativeGestures: false });
      MAPGL.map.touchZoomRotate.disableRotation();
      MAPGL.map.addControl(new lib.AttributionControl({ compact: true }), 'top-right');
      MAPGL.map.on('error', e => { if (e && e.error && /style|Failed to fetch/i.test(String(e.error.message || ''))) { MAPGL.failed = true; refreshMapUI(); } });
      MAPGL.map.on('load', () => { MAPGL.failed = false; refreshMapUI(); });
      MAPGL.map.on('dragstart', () => { U.mapDrag = true; }); MAPGL.map.on('dragend', () => { U.mapDrag = false; U.mapMoved = Date.now(); });
      syncMarkers();
    }).catch(() => { MAPGL.failed = true; refreshMapUI(); });
  }
  // position déjà autorisée : on la rafraîchit sans redemander
  if (S.geo && S.geo.on && !GEO.pos) { GEO.pos = { lat: S.geo.lat, lng: S.geo.lng }; locateMe(false); }
};
function mapZoom(dir) { if (MAPGL.map) MAPGL.map.easeTo({ zoom: MAPGL.map.getZoom() + dir, duration: 300 }); }
function mapFlyTo(lng, lat, offsetY) { if (MAPGL.map) MAPGL.map.flyTo({ center: [lng, lat], zoom: Math.max(MAPGL.map.getZoom(), 14), offset: [0, -(offsetY || 0)], speed: 1.4 }); }

// ---------- MATCH ----------
function deck() {
  const f = S.match.filters, lim = f.dist >= MAX_DIST ? Infinity : f.dist;
  let list = D.profiles.filter(p => !blocked(p.id) && !S.match.liked.includes(p.id) && !S.match.passed.includes(p.id) && p.dist <= lim && (!f.genres.length || p.genres.some(g => f.genres.includes(g))));
  if (S.consents.reco && S.prefs.genres.length) list = list.slice().sort((a, b) => (b.genres.some(g => S.prefs.genres.includes(g)) ? 1 : 0) - (a.genres.some(g => S.prefs.genres.includes(g)) ? 1 : 0));
  return list;
}
const distTxt = d => d < 1 ? Math.round(d * 1000) + ' m' : String(d).replace('.', ',') + ' km';
function cardHTML(p, top) {
  const t = T(p.anthem);
  return `<div class="mcard ${top ? '' : 'back'}" data-card="${p.id}" style="background:${p.color}" ${top ? '' : 'aria-hidden="true"'}>${shapeHTML(p.shape)}<span class="mc-letter" aria-hidden="true">${initial(p.name)}</span>
    <span class="stamp like">LIKE</span><span class="stamp nope">NOPE</span><span class="stamp super">SUPER</span>
    <div class="mc-info glass strong">
      <div class="mc-row"><div><h2>${esc(p.name)}, ${p.age}</h2><small class="t2" style="display:flex;align-items:center;gap:4px">${ic('map', 13)} à ${distTxt(p.dist)} · vu·e dans ton feed</small></div><span class="compat" style="--p:${p.compat}" aria-label="${p.compat} % de compatibilité"><span>${p.compat} %</span></span></div>
      <p style="font-size:14px;line-height:1.4">${esc(p.bio)}</p>
      <div class="mc-tags">${p.top.map(a => `<span class="tagc">${esc(a)}</span>`).join('')}</div>
      <button class="anthem" data-a="playTrack" data-id="${t.id}" data-q="${t.id}" data-src="Hymne de ${esc(p.name)}">${cover(t, 40, 12)}<span class="tt"><small>Son hymne</small><b>${esc(t.title)} — ${esc(t.artist)}</b></span>${icf('play', 20)}</button>
    </div></div>`;
}
VIEWS.match = () => {
  const n = S.match.matches.filter(m => !blocked(m.id)).length;
  const head = `<div class="m-head"><h1>Match</h1><div class="acts">${seg('match', [['discover', 'Découvrir'], ['matches', 'Matchs' + (n ? ' · ' + n : '')]], U.matchMode, 'matchMode')}<button class="icon-btn glass strong" data-a="matchFilters" aria-label="Filtres">${ic('filter')}</button></div></div>`;
  if (!S.settings.matchVisible) return `<div class="scroll">${head}<div class="glass strong" style="border-radius:30px;padding:22px;display:flex;flex-direction:column;gap:12px;align-items:flex-start">${ic('lock', 28)}<h2>Ton profil est masqué</h2><p class="t2">Active « Visible dans Match » dans les réglages pour découvrir des personnes.</p><button class="btn primary" data-a="openSettings">Ouvrir les réglages</button></div></div>`;
  if (U.matchMode === 'matches') {
    const ms = S.match.matches.filter(m => !blocked(m.id));
    return `<div class="scroll">${head}${ms.length ? `<div class="panel glass"><div class="list">${ms.map(m => { const p = D.profiles.find(x => x.id === m.id); return `<div class="conv"><button class="row grow" data-a="openProfile" data-id="${p.id}">${avatar(p, 52)}<span class="tt"><b>${esc(p.name)}, ${p.age}</b><small>${p.compat} % · ${esc(p.top[0])} · match ${ago(m.at)}</small></span></button><button class="btn primary" style="height:38px;padding:0 16px" data-a="openChatWith" data-id="${p.id}">Écrire</button></div>`; }).join('')}</div></div>` : `<div class="empty">${ic('match', 40)}<b>Pas encore de match</b><span>Swipe à droite sur les profils qui te plaisent. Un match arrive quand c’est réciproque.</span><button class="btn primary" data-a="matchMode" data-id="discover">Découvrir des profils</button></div>`}</div>`;
  }
  const d = deck(), f = S.match.filters;
  return `<div class="m-wrap">${head}<div class="deck" id="deck">${d.length ? d.slice(0, 2).reverse().map((p, i, arr) => cardHTML(p, i === arr.length - 1)).join('') : `<div class="empty glass strong" style="position:absolute;inset:0;border-radius:36px">${ic('sparkle', 40)}<b>${D.profiles.length ? 'Tu as vu tout le monde' : 'Personne pour l’instant'}</b><span>${D.profiles.length ? `Élargis la distance (${f.dist >= MAX_DIST ? 'déjà au maximum' : 'actuellement ' + f.dist + ' km'}) ou recommence la sélection.` : 'Les personnes qui ont tes goûts apparaîtront ici dès qu’elles rejoindront Musio.'}</span>${D.profiles.length ? `<div class="btn-row"><button class="btn glass" data-a="matchFilters">Filtres</button><button class="btn primary" data-a="matchReset">Recommencer</button></div>` : ''}</div>`}</div>
    ${d.length ? `<div class="m-actions"><button class="med glass strong nope-c" data-a="swipe" data-id="left" aria-label="Passer">${ic('close', 26)}</button><button class="big glass strong super-c" data-a="swipe" data-id="up" aria-label="Super like">${icf('star', 30)}</button><button class="big glass strong like-c" data-a="swipe" data-id="right" aria-label="J’aime">${icf('heart', 30)}</button><button class="med glass strong" data-a="openProfile" data-id="${d[0].id}" aria-label="Voir le profil de ${esc(d[0].name)}">${ic('info', 24)}</button></div>` : ''}</div>`;
};
function stamps(card, dx, dy) {
  $('.stamp.like', card).style.opacity = clamp(dx / 100, 0, 1);
  $('.stamp.nope', card).style.opacity = clamp(-dx / 100, 0, 1);
  $('.stamp.super', card).style.opacity = Math.abs(dx) < 60 ? clamp(-dy / 120, 0, 1) : 0;
}
AFTER.match = () => {
  const card = $('.mcard:not(.back)'); if (!card) return;
  let sx = 0, sy = 0, dx = 0, dy = 0, drag = false;
  card.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; drag = true; sx = e.clientX; sy = e.clientY; card.classList.remove('ret'); try { card.setPointerCapture(e.pointerId); } catch (er) {} });
  card.addEventListener('pointermove', e => { if (!drag) return; dx = e.clientX - sx; dy = e.clientY - sy; card.style.transform = `translate(${dx}px,${dy}px) rotate(${dx / 18}deg)`; stamps(card, dx, dy); });
  const up = () => { if (!drag) return; drag = false; if (dx > 110) swipe('right'); else if (dx < -110) swipe('left'); else if (dy < -140) swipe('up'); else { card.classList.add('ret'); card.style.transform = ''; stamps(card, 0, 0); } dx = dy = 0; };
  card.addEventListener('pointerup', up); card.addEventListener('pointercancel', up);
};
function swipe(dir) {
  const card = $('.mcard:not(.back)'); if (!card || U.swiping) return; U.swiping = true; haptic(10);
  const id = card.dataset.card, p = D.profiles.find(x => x.id === id);
  card.classList.remove('ret'); card.classList.add('fly');
  const W = window.innerWidth + 200;
  card.style.transform = dir === 'right' ? `translate(${W}px,40px) rotate(28deg)` : dir === 'left' ? `translate(${-W}px,40px) rotate(-28deg)` : `translate(0,${-window.innerHeight - 100}px)`;
  stamps(card, dir === 'right' ? 200 : dir === 'left' ? -200 : 0, dir === 'up' ? -200 : 0);
  setTimeout(() => {
    U.swiping = false;
    if (dir === 'left') S.match.passed.push(id);
    else {
      S.match.liked.push(id);
      if (p.likesYou) { S.match.matches.unshift({ id, at: Date.now() }); S.match.newCount++; addActivity('match', id, 'et toi, c’est un match'); push('matchModal', { id }); haptic(30); }
      else toast(`Like envoyé à ${p.name}`, ic('heart', 20));
    }
    save(); renderView(); renderChrome();
  }, 380);
}

// ---------- DISCUSSION ----------
const lastAt = c => c.msgs.length ? c.msgs[c.msgs.length - 1].at : 0;
function convRow(c) {
  const u = user(c.with), last = c.msgs[c.msgs.length - 1];
  const prev = last ? (last.from === 'me' ? 'Toi : ' : '') + (last.text || (last.track ? 'a partagé « ' + T(last.track).title + ' »' : 'a partagé une publication')) : 'Nouveau match, dis bonjour !';
  return `<button class="conv ${c.unread ? 'unread' : ''}" data-a="openConv" data-id="${c.id}">${avatar(u, 52)}<span class="grow"><b style="display:flex;align-items:center">${esc(u.name)}${verified(u)}</b><small>${esc(prev)}</small></span><span class="meta">${last ? ago(last.at) : ''}${c.unread ? `<span class="badge">${c.unread}</span>` : ''}</span></button>`;
}
function chatListHTML() {
  const q = U.chatQ.trim().toLowerCase();
  if (U.chatMode === 'msgs') {
    const convs = S.convs.filter(c => !blocked(c.with) && (!q || user(c.with).name.toLowerCase().includes(q))).sort((a, b) => lastAt(b) - lastAt(a));
    return convs.length ? `<div class="panel glass"><div class="list">${convs.map(convRow).join('')}</div></div>` : `<div class="empty">${ic('chat', 36)}<span>Aucune conversation${q ? ' pour « ' + esc(U.chatQ) + ' »' : ''}.</span></div>`;
  }
  const ks = allComms().filter(k => !q || k.name.toLowerCase().includes(q));
  const create = `<button class="imp-card glass strong" data-a="newComm">${ic('plus', 22)}<span class="grow tt"><b>Créer une communauté</b><small>Autour d’un genre, d’un artiste, d’une ville…</small></span>${ic('chevron', 20)}</button>`;
  if (!ks.length) return create + `<div class="empty">${ic('users', 36)}<span>${q ? 'Aucune communauté pour « ' + esc(U.chatQ) + ' ».' : window.CLOUD_COMMS === undefined || window.CLOUD_COMMS ? 'Aucune communauté pour l’instant. Crée la première !' : 'Chargement…'}</span></div>`;
  const bs = (arr) => typeof boostSort === 'function' ? boostSort(arr, 'community') : arr, bb = id => typeof boostBadge === 'function' ? boostBadge('community', id) : '';
  const joined = bs(ks.filter(k => k.joined)), other = bs(ks.filter(k => !k.joined));
  return `${create}${joined.length ? `<p class="result-h">Tes communautés</p><div class="panel glass"><div class="list">${joined.map(k => { const lp = k.posts[k.posts.length - 1]; return `<button class="conv" data-a="openCommunity" data-id="${k.id}">${cover(k, 52, 18)}<span class="grow"><b>${esc(k.name)}</b><small>${lp ? esc((lp.me ? 'Toi' : lp.user) + ' : ' + (lp.text || 'a partagé un son')) : ''}</small></span><span class="meta">${fmtN(k.members)}</span></button>`; }).join('')}</div></div>` : ''}
    ${other.length ? `<p class="result-h">À découvrir</p><div class="ccards">${other.map(k => `<div class="ccard glass"><button class="ccard-main" data-a="openCommunity" data-id="${k.id}">${cover(k, 300, 22)}<b>${esc(k.name)}</b>${bb(k.id)}<small>${fmtN(k.members)} membre${k.members > 1 ? 's' : ''}</small></button><button class="btn primary" style="height:38px" data-a="join" data-id="${k.id}">Rejoindre</button></div>`).join('')}</div>` : ''}`;
}
VIEWS.chat = () => {
  const live = FRIENDS.filter(f => f.live && !blocked(f.id));
  return `<div class="scroll">
    <div class="head-row"><h1>Discussion</h1><div class="tools glass strong lens"><button class="icon-btn" data-a="newMsg" aria-label="Nouveau message">${ic('edit', 20)}</button></div></div>
    <label class="search-in glass">${ic('search', 18)}<span class="sr">Rechercher</span><input data-in="chatQ" placeholder="${U.chatMode === 'msgs' ? 'Rechercher une conversation' : 'Rechercher une communauté'}" value="${esc(U.chatQ)}" autocomplete="off"></label>
    ${seg('chat', [['msgs', 'Messages'], ['comms', 'Communautés']], U.chatMode, 'chatMode')}
    ${U.chatMode === 'msgs' && live.length ? `<p class="result-h">Écoutent maintenant</p><div class="stories">${live.map(f => `<button class="story" data-a="openChatWith" data-id="${f.id}"><span class="ring" style="border-color:${f.color}">${avatar(f, 56)}</span><span>${esc(f.name)}</span></button>`).join('')}</div>` : ''}
    <div id="chatList" style="display:flex;flex-direction:column;gap:14px">${chatListHTML()}</div>
  </div>`;
};

// ---------- COMPTE ----------
function echoListHTML(id) {
  const list = S.echoes.filter(e => e.by === id && post(e.post) && !blocked(post(e.post).author)).sort((a, b) => b.at - a.at), mine = id === 'me';
  if (!list.length) return `<div class="empty">${ic('echo', 36)}<span>${mine ? 'Tu n’as encore fait écho à rien. Touche ' + ic('echo', 16) + ' sur une publication pour la relayer.' : 'Aucun écho pour l’instant.'}</span></div>`;
  return `<div class="echo-list">${list.map(e => { const p = post(e.post), t = T(p.trackId), a = user(p.author);
    return `<div class="echo-card glass"><div class="ec-top">${ic('echo', 15)}<small>${ago(e.at)}</small>${mine ? `<button class="icon-btn sm" data-a="echo" data-id="${p.id}" aria-label="Modifier ou retirer cet écho">${ic('more', 18)}</button>` : ''}</div>
      ${e.text ? `<p class="ec-txt">${esc(e.text)}</p>` : ''}
      <button class="ec-post" data-a="postView" data-id="${p.id}"><span class="ec-th" style="background:${t.color}">${p.photos && p.photos.length ? `<img src="${p.photos[0]}" alt="">` : shapeHTML(t.shape)}${e.img ? `<img class="ec-gif" src="${e.img}" alt="">` : e.react ? `<span class="ec-rx">${reactHTML(e.react)}</span>` : ''}</span><span class="tt"><b style="display:flex;align-items:center">@${esc(a.handle)}${verified(a)}</b><small>${esc(p.caption)}</small><small class="t3">${icf('play', 10)} ${fmtN(postViews(p))} vues · ${esc(t.title)}</small></span>${ic('chevron', 18)}</button></div>`; }).join('')}</div>`;
}
function statsHTML(id, followers, following, locked, cls) {
  const t = totals(id), d = v => locked ? '—' : fmtN(v);
  return `<div class="${cls || 'stats'}"><button data-a="followList" data-id="${id}" data-k="followers"><b>${fmtN(followers)}</b><small>Abonnés</small></button><button data-a="followList" data-id="${id}" data-k="following"><b>${fmtN(following)}</b><small>Abonnements</small></button><button data-a="statLikes" data-id="${id}"><b>${d(t.likes)}</b><small>J’aime</small></button><button data-a="statViews" data-id="${id}"><b>${d(t.views)}</b><small>Vues</small></button></div>`;
}
VIEWS.account = () => {
  const me = user('me'), mine = allPosts().filter(p => p.author === 'me'), t = T(P.trackId);
  const unread = S.activity.some(a => !a.read);
  let tabBody = '';
  if (U.accTab === 'posts') tabBody = mine.length ? gridPosts(mine) : `<div class="empty">${ic('video', 36)}<span>Tu n’as encore rien publié.</span><button class="btn primary" data-a="create">${ic('plus', 18)}Créer une publication</button></div>`;
  else if (U.accTab === 'liked') { const lt = S.likedTracks.slice().reverse().map(T).filter(Boolean); tabBody = lt.length ? `<div class="panel glass"><div class="tracklist">${lt.map(x => trackRow(x, lt.map(y => y.id), 'Titres likés')).join('')}</div></div>` : `<div class="empty">${ic('heart', 36)}<span>Aucun titre liké.</span></div>`; }
  else if (U.accTab === 'echoes') tabBody = echoListHTML('me');
  else if (U.accTab === 'sounds') { const mt = S.myTracks; tabBody = `<label class="imp-card glass strong">${ic('upload', 22)}<span class="grow tt"><b>Importer de la musique</b><small>${isDesk() ? 'Choisis plusieurs fichiers ou glisse-les ici' : 'MP3, M4A, WAV… tu peux en choisir plusieurs'}</small></span>${ic('plus', 20)}<input type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac" multiple class="sr" data-ch="importAudio"></label>` + (mt.length ? `<div class="btn-row"><button class="btn primary" data-a="playMine">${icf('play', 16)}Tout lire</button><button class="btn glass" data-a="playMine" data-id="shuffle">${ic('shuffle', 18)}Aléatoire</button></div><p class="t3" style="font-size:12px;margin-top:-4px">${mt.length} son${mt.length > 1 ? 's' : ''} · gardés uniquement sur cet appareil, jamais envoyés en ligne.</p>` + `<div class="panel glass"><div class="tracklist">${mt.map(x => trackRow(x, mt.map(y => y.id), 'Mes sons').replace(/<\/div>$/, `<button class="icon-btn sm" data-a="editTrack" data-id="${x.id}" aria-label="Modifier ${esc(x.title)}">${ic('more', 20)}</button></div>`)).join('')}</div></div>` : `<div class="empty">${ic('music', 36)}<span>Importe tes propres sons pour les écouter et les mettre dans tes vidéos.</span></div>`); }
  else tabBody = `<div class="panel glass"><div class="list"><button class="li" data-a="newPlaylist"><span class="tile-plus" style="width:52px;height:52px">${ic('plus', 22)}</span><span class="grow tt"><b>Nouvelle playlist</b><small>Crée ta propre sélection</small></span></button>${[PL('liked')].concat(S.playlists, D.playlists, D.mixes).map(pl => `<button class="li" data-a="openPlaylist" data-id="${pl.id}">${cover(pl, 52, 14)}<span class="grow tt"><b>${esc(pl.title)}</b><small>${pl.tracks.length} titre${pl.tracks.length > 1 ? 's' : ''}${pl.mine ? ' · par toi' : ''}</small></span>${ic('chevron', 18)}</button>`).join('')}</div></div>`;
  return `<div class="scroll acc">
    <div class="acc-banner ${S.me.banner ? 'has-img' : ''}">${S.me.banner ? `<img src="${S.me.banner}" alt="Ta bannière">` : ''}<label class="ban-edit glass strong" aria-label="${S.me.banner ? 'Changer la bannière' : 'Ajouter une bannière'}">${ic('image', 17)}<span>${S.me.banner ? 'Bannière' : 'Ajouter une bannière'}</span><input type="file" accept="image/*" class="sr" data-ch="banner"></label></div>
    <div class="acc-tools"><div class="tools glass strong lens"><button class="icon-btn" data-a="profileViews" aria-label="Vues du profil">${ic('eye')}${S.settings.profileViews && S.pviews.some(v => !v.seen) ? '<i class="dot"></i>' : ''}</button><button class="icon-btn" data-a="activity" aria-label="Activité">${ic('bell')}${unread ? '<i class="dot"></i>' : ''}</button><button class="icon-btn" data-a="openSettings" aria-label="Réglages">${ic('settings')}</button></div></div>
    <div class="acc-id"><button class="avatar-pick" data-a="editProfile" aria-label="Modifier le profil et la photo">${avatar(me, 108)}<span class="cam glass strong">${ic('camera', 18)}</span></button>
      <h1 class="acc-name">${esc(S.me.name)}${isCreator() ? cBadge(22) : ''}</h1>${isCreator() ? `<button class="creator-pill" data-a="creatorInfo">${LOGO(18)}<span>Créateur de Musio</span></button>` : ''}<div class="t2" style="display:flex;align-items:center;gap:6px;justify-content:center">@${esc(S.me.handle)}${S.settings.private ? `<span class="privtag">${ic('lock', 12)}Privé</span>` : ''}</div>${S.me.bio ? `<p class="t2 acc-bio">${esc(S.me.bio)}</p>` : ''}</div>
    ${statsHTML('me', S.me.followers, S.followed.length, false, 'stats glass strong')}
    <div class="btn-row"><button class="btn glass" data-a="editProfile">${ic('edit', 18)}Modifier</button><button class="btn glass" data-a="copyLink" data-id="profil">${ic('share', 18)}Partager</button><label class="btn glass" aria-label="Importer une musique">${ic('upload', 18)}Importer<input type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac" multiple class="sr" data-ch="importAudio"></label></div>
    ${t ? `<button class="track-card glass strong" data-a="openPlayer">${cover(t, 54, 14)}<span class="tt"><small>${E.isPlaying() ? 'En écoute' : 'En pause'}</small><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></span>${eqHTML(E.isPlaying())}</button>` : ''}
    <div class="stat-cards"><div class="glass"><b>${Math.floor(S.listenSec / 60)}</b><small>minutes écoutées</small></div><div class="glass"><b>${S.likedTracks.length}</b><small>titres likés</small></div><div class="glass"><b>${S.match.matches.length}</b><small>matchs</small></div></div>
    ${seg('acc', [['posts', 'Posts'], ['echoes', 'Échos'], ['sounds', 'Sons'], ['liked', 'Likés'], ['playlists', 'Playlists']], U.accTab, 'accTab')}
    ${tabBody}
  </div>`;
};

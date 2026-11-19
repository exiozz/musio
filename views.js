'use strict';
// ================= Musio — écrans principaux =================

// ---------- FEED ----------
function feedPosts() {
  let list = S.posts.filter(p => !blocked(p.author) && !S.hiddenPosts.includes(p.id));
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
    <h2>Reprendre</h2>
    <div class="tiles">${tiles.concat(S.playlists).map(pl => `<button class="tile glass" data-a="openPlaylist" data-id="${pl.id}">${cover(pl, 46, 14)}<span>${esc(pl.title)}</span></button>`).join('')}<button class="tile glass add" data-a="newPlaylist">${`<span class="tile-plus">${ic('plus', 22)}</span>`}<span>Nouvelle playlist</span></button></div>
    <div class="sec-h"><h2>${g === 'Tout' ? 'Nouveautés' : 'Titres ' + esc(g)}</h2><button class="chip glass" data-a="playList" data-q="${tr.map(x => x.id).join(',')}" data-src="Nouveautés">${icf('play', 14)}Tout lire</button></div>
    <div class="panel glass"><div class="tracklist">${tr.map(x => trackRow(x, tr.map(y => y.id), g === 'Tout' ? 'Nouveautés' : 'Titres ' + g)).join('')}</div></div>
  </div>`;
}

// ---------- MAP ----------
const MAPSVG = (() => {
  let s = '<defs><radialGradient id="mapglow" cx="50%" cy="50%" r="60%"><stop offset="0" stop-color="#1B1640"/><stop offset="1" stop-color="#0E0C1C"/></radialGradient></defs><rect width="1200" height="1400" fill="url(#mapglow)"/>';
  for (let x = -40; x < 1260; x += 92) s += `<path d="M${x} -20 L${x + 70} 1420" stroke="#1C1834" stroke-width="5"/>`;
  for (let y = 30; y < 1480; y += 86) s += `<path d="M-20 ${y} L1220 ${y - 50}" stroke="#1C1834" stroke-width="5"/>`;
  s += '<rect x="70" y="300" width="300" height="220" rx="60" fill="#13291F"/><rect x="690" y="120" width="230" height="160" rx="40" fill="#13291F"/><ellipse cx="960" cy="1180" rx="190" ry="120" fill="#13291F"/>';
  s += '<path d="M-30 990 C 200 900, 380 1060, 600 975 S 1000 830, 1230 900" stroke="#173055" stroke-width="54" fill="none" stroke-linecap="round"/><path d="M560 -20 C 530 200, 610 380, 560 580 S 520 820, 600 975" stroke="#173055" stroke-width="20" fill="none"/>';
  ['M-20 260 L1220 200', 'M-20 760 L1220 700', 'M330 -20 L380 1420', 'M880 -20 L830 1420', 'M-20 1320 L1220 120', 'M-20 520 C 400 560, 800 420, 1220 480'].forEach(d => { s += `<path d="${d}" stroke="#2B2650" stroke-width="16" fill="none" stroke-linecap="round"/>`; });
  [['BELLEVILLE', 960, 400, 0], ['RÉPUBLIQUE', 420, 820, 0], ['BUTTES-CHAUMONT', 805, 205, 0], ['BASTILLE', 700, 1250, 0], ['OBERKAMPF', 960, 900, -4], ['MARAIS', 200, 1060, 0], ['LA SEINE', 300, 1000, 8], ['CANAL SAINT-MARTIN', 610, 300, -84]].forEach(([t, x, y, r]) => { s += `<text x="${x}" y="${y}" transform="rotate(${r} ${x} ${y})" fill="rgba(255,255,255,.3)" font-family="Sansation, sans-serif" font-size="13" font-weight="700" letter-spacing="2" text-anchor="middle">${t}</text>`; });
  return s;
})();
const ME_POS = { x: 600, y: 720 };
function markerHTML(f) {
  const t = T(f.trackId);
  return `<button class="marker" data-x="${f.x}" data-y="${f.y}" data-a="friend" data-id="${f.id}" aria-label="${esc(f.name)} ${f.live ? 'écoute' : 'a écouté'} ${esc(t.title)}"><span class="bubble glass strong">${f.live ? eqHTML() : ic('music', 14)}<span>${esc(t.title)}</span></span><span class="mk-av ${f.live ? 'live' : ''}" style="background:${f.color};color:${f.color}">${avatar(f, 44)}</span><span class="mk-name">${esc(f.name)}${f.live ? '' : ' · ' + f.ago}</span></button>`;
}
VIEWS.map = () => {
  const fl = FRIENDS.filter(f => !blocked(f.id) && (U.mapMode === 'all' || f.live)), live = fl.filter(f => f.live);
  const t = T(P.trackId);
  const me = S.settings.shareListening
    ? `<div class="marker me" data-x="${ME_POS.x}" data-y="${ME_POS.y}"><span class="bubble glass strong">${t && E.isPlaying() ? eqHTML() + `<span>${esc(t.title)}</span>` : '<span>Toi</span>'}</span><span class="me-dot">${S.me.photo ? avatar(user('me'), 18) : ''}</span></div>`
    : `<div class="marker me" data-x="${ME_POS.x}" data-y="${ME_POS.y}"><span class="bubble glass">${ic('ghost', 14)}<span>Mode fantôme</span></span><span class="me-dot" style="opacity:.4"></span></div>`;
  return `<div class="map" id="map"><svg class="map-svg" id="mapSvg" viewBox="0 0 1200 1400" preserveAspectRatio="none" aria-hidden="true">${MAPSVG}</svg><div class="map-pins" id="mapPins">${me}${fl.map(markerHTML).join('')}</div></div>
    <div class="map-top"><div class="map-head glass strong lens"><h1>Map</h1>${seg('map', [['live', 'En direct'], ['all', '24 h']], U.mapMode, 'mapMode')}</div><button class="icon-btn glass strong ${S.settings.shareListening ? '' : 'on'}" style="width:52px;height:52px" data-a="ghost" aria-pressed="${!S.settings.shareListening}" aria-label="Mode fantôme">${ic(S.settings.shareListening ? 'eye' : 'ghost')}</button></div>
    <div class="map-zoom glass strong"><button class="icon-btn" data-a="zoom" data-id="1.25" aria-label="Zoomer">${ic('plus')}</button><button class="icon-btn" data-a="zoom" data-id="0.8" aria-label="Dézoomer">${ic('minus')}</button><button class="icon-btn" data-a="recenter" aria-label="Me recentrer">${ic('locate')}</button></div>
    <div class="dock glass strong ${U.mapPanel ? 'open' : ''}">
      <button class="dock-head" data-a="mapPanel" aria-expanded="${U.mapPanel}"><span class="tt"><b>${live.length} ami${live.length > 1 ? 's' : ''} en direct</b><small>${U.mapPanel ? 'Touche un ami pour écouter avec lui' : fl.length - live.length ? `+ ${fl.length - live.length} ces dernières 24 h` : 'Ce que tes amis écoutent, maintenant'}</small></span><span class="icon-btn sm glass">${ic(U.mapPanel ? 'down' : 'up', 18)}</span></button>
      ${U.mapPanel
        ? `<div class="list dock-list">${fl.map(f => { const tr = T(f.trackId); return `<button class="li" data-a="friend" data-id="${f.id}">${avatar(f, 44)}<span class="grow tt"><b>${esc(f.name)} <span class="t3" style="font-weight:500">· ${esc(f.place)}</span></b><small>${esc(tr.title)} — ${esc(tr.artist)}</small></span>${f.live ? eqHTML() : `<small class="t3">${f.ago}</small>`}</button>`; }).join('')}</div>`
        : `<div class="dock-avs">${fl.map(f => `<button class="dock-av" data-a="friend" data-id="${f.id}" aria-label="${esc(f.name)}"><span class="mk-av ${f.live ? 'live' : ''}" style="background:${f.color};color:${f.color}">${avatar(f, 42)}</span><small>${esc(f.name)}</small></button>`).join('')}</div>`}
    </div>`;
};
function clampMap(m) {
  const map = $('#map'); if (!map) return m; const w = map.clientWidth, h = map.clientHeight;
  m.z = clamp(m.z, 0.45, 2.6);
  m.x = clamp(m.x, Math.min(120, w - 1200 * m.z - 120), Math.max(120, w - 1200 * m.z - 120)); m.y = clamp(m.y, Math.min(160, h - 1400 * m.z - 160), Math.max(160, h - 1400 * m.z - 160));
  return m;
}
function drawMap() {
  const map = $('#map'), svg = $('#mapSvg'); if (!map || !svg || !U.mapT) return;
  const m = U.mapT, w = map.clientWidth, h = map.clientHeight;
  svg.setAttribute('viewBox', `${(-m.x / m.z).toFixed(2)} ${(-m.y / m.z).toFixed(2)} ${(w / m.z).toFixed(2)} ${(h / m.z).toFixed(2)}`);
  $$('#mapPins .marker').forEach(el => { const x = +el.dataset.x * m.z + m.x, y = +el.dataset.y * m.z + m.y; el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-50%)`; });
}
let mapAnim = 0, mapGoal = null;
function applyMap(animate, target) {
  if (!U.mapT) return;
  cancelAnimationFrame(mapAnim); mapGoal = null;
  if (!animate) { if (target) Object.assign(U.mapT, target); clampMap(U.mapT); drawMap(); return; }
  const from = Object.assign({}, U.mapT), to = clampMap(Object.assign({}, U.mapT, target || {})); mapGoal = to;
  const t0 = performance.now(), dur = 420, ease = k => 1 - Math.pow(1 - k, 3);
  const step = now => { const k = Math.min(1, (now - t0) / dur), e = ease(k);
    const z = from.z * Math.pow(to.z / from.z, e);
    U.mapT.z = z; U.mapT.x = from.x + (to.x - from.x) * e; U.mapT.y = from.y + (to.y - from.y) * e; drawMap();
    if (k < 1) mapAnim = requestAnimationFrame(step); else mapGoal = null; };
  mapAnim = requestAnimationFrame(step);
}
function centerOn(x, y, dy) { const map = $('#map'); if (!map) return; const z = U.mapT.z; applyMap(true, { x: map.clientWidth / 2 - x * z, y: map.clientHeight / 2 - y * z - (dy || 0) }); }
function zoomBy(f, cx, cy, instant) {
  const map = $('#map'); if (!map) return; const r = map.getBoundingClientRect();
  cx = cx == null ? r.width / 2 : cx - r.left; cy = cy == null ? r.height / 2 : cy - r.top;
  const m = (!instant && mapGoal) || U.mapT, z = clamp(m.z * f, 0.45, 2.6);
  applyMap(!instant, { z, x: cx - (cx - m.x) * (z / m.z), y: cy - (cy - m.y) * (z / m.z) });
}
AFTER.map = () => {
  const map = $('#map'); if (!map) return;
  if (!U.mapT) { const z = isDesk() ? 1 : 0.85; U.mapT = { z, x: map.clientWidth / 2 - ME_POS.x * z, y: map.clientHeight / 2 - ME_POS.y * z - 40 }; }
  applyMap(false);
  const pts = new Map(); let st = null;
  const snap = () => ({ t: Object.assign({}, U.mapT), pts: new Map(Array.from(pts, ([k, v]) => [k, Object.assign({}, v)])), moved: st ? st.moved : false });
  map.addEventListener('pointerdown', e => { cancelAnimationFrame(mapAnim); mapGoal = null; pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); st = snap(); st.moved = false; U.mapDrag = true; });
  map.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId) || !st) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const a = Array.from(pts.values()), b = Array.from(st.pts.values());
    if (a.length === 1 && b.length === 1) {
      const dx = a[0].x - b[0].x, dy = a[0].y - b[0].y;
      if (Math.abs(dx) + Math.abs(dy) > 6) st.moved = true;
      if (!st.moved) return;
      U.mapT.x = st.t.x + dx; U.mapT.y = st.t.y + dy;
    } else if (a.length >= 2 && b.length >= 2) {
      const d1 = Math.hypot(b[0].x - b[1].x, b[0].y - b[1].y) || 1, d2 = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
      const r = map.getBoundingClientRect(); const cx = (b[0].x + b[1].x) / 2 - r.left, cy = (b[0].y + b[1].y) / 2 - r.top;
      const z = clamp(st.t.z * d2 / d1, 0.45, 2.6);
      U.mapT.z = z; U.mapT.x = cx - (cx - st.t.x) * (z / st.t.z); U.mapT.y = cy - (cy - st.t.y) * (z / st.t.z); st.moved = true;
    }
    applyMap(false);
  });
  const end = e => { if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId); if (st && st.moved) U.mapMoved = Date.now(); st = pts.size ? snap() : null; if (!pts.size) U.mapDrag = false; };
  map.addEventListener('pointerup', end); map.addEventListener('pointercancel', end);
  map.addEventListener('wheel', e => { e.preventDefault(); zoomBy(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0022)), e.clientX, e.clientY, true); }, { passive: false });
};

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
  return `<div class="m-wrap">${head}<div class="deck" id="deck">${d.length ? d.slice(0, 2).reverse().map((p, i, arr) => cardHTML(p, i === arr.length - 1)).join('') : `<div class="empty glass strong" style="position:absolute;inset:0;border-radius:36px">${ic('sparkle', 40)}<b>Tu as vu tout le monde</b><span>Élargis la distance (${f.dist >= MAX_DIST ? 'déjà au maximum' : 'actuellement ' + f.dist + ' km'}) ou recommence la sélection.</span><div class="btn-row"><button class="btn glass" data-a="matchFilters">Filtres</button><button class="btn primary" data-a="matchReset">Recommencer</button></div></div>`}</div>
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
      if (p.likesYou || dir === 'up') { S.match.matches.unshift({ id, at: Date.now() }); S.match.newCount++; addActivity('match', id, 'et toi, c’est un match'); push('matchModal', { id }); haptic(30); }
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
  const ks = S.communities.filter(k => !q || k.name.toLowerCase().includes(q));
  const joined = ks.filter(k => k.joined), other = ks.filter(k => !k.joined);
  return `${joined.length ? `<p class="result-h">Tes communautés</p><div class="panel glass"><div class="list">${joined.map(k => { const lp = k.posts[k.posts.length - 1]; return `<button class="conv" data-a="openCommunity" data-id="${k.id}">${cover(k, 52, 18)}<span class="grow"><b>${esc(k.name)}</b><small>${lp ? esc((lp.me ? 'Toi' : lp.user) + ' : ' + (lp.text || 'a partagé un son')) : ''}</small></span><span class="meta">${fmtN(k.members)}</span></button>`; }).join('')}</div></div>` : ''}
    ${other.length ? `<p class="result-h">À découvrir</p><div class="ccards">${other.map(k => `<div class="ccard glass"><button class="ccard-main" data-a="openCommunity" data-id="${k.id}">${cover(k, 300, 22)}<b>${esc(k.name)}</b><small>${fmtN(k.members)} membres</small></button><button class="btn primary" style="height:38px" data-a="join" data-id="${k.id}">Rejoindre</button></div>`).join('')}</div>` : ''}`;
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
  const me = user('me'), mine = S.posts.filter(p => p.author === 'me'), t = T(P.trackId);
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
      <h1 class="acc-name">${esc(S.me.name)}${cBadge(22)}</h1><button class="creator-pill" data-a="creatorInfo">${LOGO(18)}<span>Créateur de Musio</span></button><div class="t2" style="display:flex;align-items:center;gap:6px;justify-content:center">@${esc(S.me.handle)}${S.settings.private ? `<span class="privtag">${ic('lock', 12)}Privé</span>` : ''}</div>${S.me.bio ? `<p class="t2 acc-bio">${esc(S.me.bio)}</p>` : ''}</div>
    ${statsHTML('me', S.me.followers, S.followed.length, false, 'stats glass strong')}
    <div class="btn-row"><button class="btn glass" data-a="editProfile">${ic('edit', 18)}Modifier</button><button class="btn glass" data-a="copyLink" data-id="profil">${ic('share', 18)}Partager</button><label class="btn glass" aria-label="Importer une musique">${ic('upload', 18)}Importer<input type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac" multiple class="sr" data-ch="importAudio"></label></div>
    ${t ? `<button class="track-card glass strong" data-a="openPlayer">${cover(t, 54, 14)}<span class="tt"><small>${E.isPlaying() ? 'En écoute' : 'En pause'}</small><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></span>${eqHTML(E.isPlaying())}</button>` : ''}
    <div class="stat-cards"><div class="glass"><b>${Math.floor(S.listenSec / 60)}</b><small>minutes écoutées</small></div><div class="glass"><b>${S.likedTracks.length}</b><small>titres likés</small></div><div class="glass"><b>${S.match.matches.length}</b><small>matchs</small></div></div>
    ${seg('acc', [['posts', 'Posts'], ['echoes', 'Échos'], ['sounds', 'Sons'], ['liked', 'Likés'], ['playlists', 'Playlists']], U.accTab, 'accTab')}
    ${tabBody}
  </div>`;
};

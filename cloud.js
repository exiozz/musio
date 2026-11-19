'use strict';
// ================= Musio — communautés et sons en ligne (Supabase) =================
// Sans comptes en ligne (config.js vide), les communautés restent sur l'appareil
// et la publication de sons n'est pas proposée.

const CLOUD = { commsAt: 0, tracksAt: 0, channel: null, names: {} };
const uidMe = () => AUTH.user && AUTH.user.id;
const pubUrl = (bucket, path) => path ? SB.storage.from(bucket).getPublicUrl(path).data.publicUrl : null;
const cloudErr = e => (e && e.message && !/fetch|network/i.test(e.message)) ? (/duplicate key|communities_name_key/.test(e.message) ? 'Ce nom de communauté est déjà pris.' : e.message) : 'Connexion impossible. Réessaie dans un instant.';
const SHAPES = ['disc', 'ring', 'dome', 'pill', 'diamond', 'stripes'];

// ---------- COMMUNAUTÉS ----------
function refreshChatList() { const l = $('#chatList'); if (l) l.innerHTML = chatListHTML(); }
async function loadComms(force) {
  if (!SB || !uidMe()) return;
  if (!force && Date.now() - CLOUD.commsAt < 15000) return;
  CLOUD.commsAt = Date.now();
  const [r1, r2] = await Promise.all([
    SB.from('communities').select('id,name,description,color,shape,members_count,owner_id,created_at').order('members_count', { ascending: false }).limit(200),
    SB.from('community_members').select('community_id').eq('user_id', uidMe()),
  ]);
  if (r1.error || r2.error) { CLOUD.commsAt = 0; if (window.CLOUD_COMMS === null) window.CLOUD_COMMS = []; refreshChatList(); return; }
  const mine = new Set((r2.data || []).map(m => m.community_id));
  const old = new Map((window.CLOUD_COMMS || []).map(k => [k.id, k]));
  window.CLOUD_COMMS = (r1.data || []).map(r => Object.assign(old.get(r.id) || { posts: [], loaded: false }, {
    id: r.id, name: r.name, desc: r.description, color: r.color, shape: r.shape, c2: null,
    members: Math.max(r.members_count, 1), joined: mine.has(r.id), mine: r.owner_id === uidMe(), ownerId: r.owner_id, cloud: true,
  }));
  refreshChatList();
  U.ov.filter(o => o.type === 'community').forEach(() => refreshOv('community'));
}
const toCPost = r => ({ id: r.id, user: (r.author && r.author.name) || CLOUD.names[r.author_id] || 'Membre', me: r.author_id === uidMe(), authorId: r.author_id, text: r.text || '', track: r.track, at: Date.parse(r.created_at) || Date.now(), likes: 0 });
async function loadPosts(k) {
  const { data, error } = await SB.from('community_posts').select('id,text,track,created_at,author_id,author:profiles(name)').eq('community_id', k.id).order('created_at', { ascending: false }).limit(100);
  if (error) { toast(cloudErr(error), ic('info', 20)); return; }
  (data || []).forEach(r => { if (r.author) CLOUD.names[r.author_id] = r.author.name; });
  k.posts = (data || []).reverse().map(toCPost); k.loaded = true;
  if (k.posts.some(p => p.track && !T(p.track))) await loadTracks(true);
  if (U.ov.some(o => o.type === 'community' && o.id === k.id)) { refreshOv('community'); updateComm(k); }
}
function listenComm(k) {
  stopListening();
  CLOUD.channel = SB.channel('commu-' + k.id)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts', filter: 'community_id=eq.' + k.id }, async ({ new: r }) => {
      if (!r || k.posts.some(p => p.id === r.id)) return;
      if (!CLOUD.names[r.author_id]) { const { data } = await SB.from('profiles').select('name').eq('id', r.author_id).maybeSingle(); if (data) CLOUD.names[r.author_id] = data.name; }
      if (r.track && !T(r.track)) await loadTracks(true);
      if (k.posts.some(p => p.id === r.id)) return;
      k.posts.push(toCPost(r)); updateComm(k);
    })
    .subscribe();
}
function stopListening() { if (CLOUD.channel) { try { SB.removeChannel(CLOUD.channel); } catch (e) {} CLOUD.channel = null; } }
// identifiant d'un son partageable en ligne (catalogue ou son publié)
function shareableTrack(id) {
  const t = T(id); if (!t) return null;
  if (D.tracks.includes(t) || t.cloud) return t.id;
  if (t.cloudId) return 'ct-' + t.cloudId;
  return null;
}
async function cloudPost(k, fields) {
  if (!k.joined) { toast('Rejoins la communauté pour écrire', ic('info', 20)); return false; }
  const { data, error } = await SB.from('community_posts').insert(Object.assign({ community_id: k.id }, fields)).select('id,text,track,created_at,author_id').single();
  if (error) { toast(cloudErr(error), ic('info', 20)); return false; }
  CLOUD.names[uidMe()] = S.me.name;
  if (!k.posts.some(p => p.id === data.id)) k.posts.push(toCPost(data));
  updateComm(k); return true;
}

// création d'une communauté (en ligne ou sur l'appareil)
OV.newComm = {
  kind: 'sheet', label: 'Nouvelle communauté',
  html: o => {
    const prev = { color: o.color, shape: o.shape };
    return `<h2>Créer une communauté</h2>
    <form class="nc-form" data-form="newComm">
      <div class="nc-prev">${cover(prev, 72, 22)}<span class="tt"><b id="ncPrevName">${esc(o.name || 'Ta communauté')}</b><small>${window.MUSIO_CLOUD ? 'Visible par tous les membres de Musio' : 'Sur cet appareil'}</small></span></div>
      <div class="field"><label for="ncName">Nom</label><input id="ncName" class="glass" maxlength="40" required placeholder="Rap FR, Lo-fi Lyon, Fans de jazz…" value="${esc(o.name || '')}" data-in="ncName" autocomplete="off"></div>
      <div class="field"><label for="ncDesc">Description</label><textarea id="ncDesc" class="glass" rows="3" maxlength="200" placeholder="De quoi parle-t-on ici ?">${esc(o.desc || '')}</textarea></div>
      <div class="field"><label>Couleur</label><div class="swatches" style="padding:0 6px">${PALETTE.map(c => `<button type="button" class="swatch ${o.color === c ? 'on' : ''}" style="background:${c}" data-a="ncColor" data-id="${c}" aria-label="Couleur ${c}" aria-pressed="${o.color === c}"></button>`).join('')}</div></div>
      <div class="field"><label>Motif</label><div class="shapes">${SHAPES.map(sh => `<button type="button" class="${o.shape === sh ? 'on' : ''}" data-a="ncShape" data-id="${sh}" aria-label="Motif ${sh}" aria-pressed="${o.shape === sh}">${cover({ color: o.color, shape: sh }, 44, 12)}</button>`).join('')}</div></div>
      <p class="pub-note">En créant une communauté, tu t’engages à la modérer et à respecter les <button type="button" class="lnk" data-a="legal" data-id="community">Règles de la communauté</button>.</p>
      <button type="submit" class="btn primary block" ${o.busy ? 'disabled' : ''}>${o.busy ? 'Création…' : 'Créer la communauté'}</button>
    </form>`;
  },
  after: (o, el, fresh) => { if (fresh) setTimeout(() => { const i = $('#ncName'); if (i) i.focus(); }, 300); },
};
const ncOv = () => U.ov.find(o => o.type === 'newComm');
function ncKeep() { const o = ncOv(); if (!o) return; const n = $('#ncName'), d = $('#ncDesc'); if (n) o.name = n.value; if (d) o.desc = d.value; }
A.newComm = () => push('newComm', { name: '', desc: '', color: pick(PALETTE), shape: pick(SHAPES) });
A.ncColor = el => { ncKeep(); ncOv().color = el.dataset.id; refreshOv('newComm'); };
A.ncShape = el => { ncKeep(); ncOv().shape = el.dataset.id; refreshOv('newComm'); };
IN.ncName = el => { const p = $('#ncPrevName'); if (p) p.textContent = el.value.trim() || 'Ta communauté'; };
FORMS.newComm = async () => {
  const o = ncOv(); if (!o || o.busy) return; ncKeep();
  const name = o.name.trim(), desc = o.desc.trim();
  if (name.length < 2) { toast('Donne un nom d’au moins 2 caractères', ic('info', 20)); return; }
  let k;
  if (window.MUSIO_CLOUD && SB && uidMe()) {
    o.busy = true; refreshOv('newComm');
    const { data, error } = await SB.from('communities').insert({ name, description: desc, color: o.color, shape: o.shape }).select('id,name,description,color,shape,owner_id').single();
    o.busy = false;
    if (error) { refreshOv('newComm'); toast(cloudErr(error), ic('info', 20)); return; }
    k = { id: data.id, name: data.name, desc: data.description, color: data.color, shape: data.shape, members: 1, joined: true, mine: true, ownerId: data.owner_id, cloud: true, posts: [], loaded: true };
    window.CLOUD_COMMS = [k].concat(window.CLOUD_COMMS || []);
  } else {
    k = { id: 'k' + uid(), name, desc, color: o.color, shape: o.shape, members: 1, joined: true, mine: true, posts: [], crew: [] };
    S.communities.unshift(k); save();
  }
  U.ov = U.ov.filter(x => x.type !== 'newComm'); U.chatMode = 'comms';
  if (U.tab === 'chat') renderView();
  push('community', { id: k.id }); haptic(20);
  toast(`${k.name} est créée`, cover(k, 28, 8));
  if (k.cloud) listenComm(k);
};
A.deleteComm = el => {
  const k = comm(el.dataset.id); if (!k) return;
  U.dialogFn = async () => {
    if (k.cloud) {
      const { error } = await SB.from('communities').delete().eq('id', k.id);
      if (error) { toast(cloudErr(error), ic('info', 20)); return; }
      window.CLOUD_COMMS = window.CLOUD_COMMS.filter(x => x.id !== k.id); stopListening();
    } else { S.communities = S.communities.filter(x => x.id !== k.id); save(); }
    U.ov = U.ov.filter(o => !(o.type === 'community' && o.id === k.id) && o.type !== 'more'); renderAll();
    toast(`${k.name} a été supprimée`, ic('trash', 18));
  };
  push('dialog', { title: `Supprimer ${k.name} ?`, text: 'La communauté, ses membres et tous ses messages seront effacés pour tout le monde. Cette action est définitive.', ok: 'Supprimer', danger: true });
};

// ---------- SONS EN LIGNE ----------
function toTrack(r) {
  return {
    id: 'ct-' + r.id, cloudId: r.id, cloud: true, file: true, title: r.title, artist: r.artist, genre: r.genre || 'Import',
    dur: r.duration, color: r.color, c2: null, shape: 'disc', bpm: 100, root: 48,
    src: pubUrl('sounds', r.audio_path), art: pubUrl('covers', r.cover_path), ownerId: r.owner_id, by: r.owner && r.owner.name,
    audioPath: r.audio_path, coverPath: r.cover_path, at: Date.parse(r.created_at) || 0,
  };
}
async function loadTracks(force) {
  if (!SB || !uidMe()) return;
  if (!force && Date.now() - CLOUD.tracksAt < 30000) return;
  CLOUD.tracksAt = Date.now();
  const { data, error } = await SB.from('tracks').select('id,title,artist,genre,duration,audio_path,cover_path,color,owner_id,created_at,owner:profiles(name)').order('created_at', { ascending: false }).limit(200);
  if (error) { CLOUD.tracksAt = 0; return; }
  const local = new Set((S.myTracks || []).map(t => t.cloudId).filter(Boolean));
  window.CLOUD_TRACKS = (data || []).filter(r => !local.has(r.id)).map(toTrack);
  if (U.tab === 'feed' && U.feedMode === 'music' && !hasScreen()) renderView();
}
function cloudTracksHTML() {
  const all = window.CLOUD_TRACKS || [], up = typeof isBoosted === 'function' ? all.filter(t => isBoosted('track', t.cloudId)) : [];
  const list = all.filter(t => !up.includes(t)).slice(0, 30);
  if (!window.MUSIO_CLOUD || !all.length) return '';
  const featured = up.length ? `<div class="sec-h"><h2>À la une</h2><span class="boost-tag">${ic('sparkle', 12)}Mis en avant</span></div><div class="hscroll">${up.map(t => `<button class="mixcard big" data-a="playTrack" data-id="${t.id}" data-q="${up.map(x => x.id).join(',')}" data-src="À la une">${cover(t, 168, 28)}<b>${esc(t.title)}</b><small>${esc(t.artist)}</small></button>`).join('')}</div>` : '';
  if (!list.length) return featured;
  return featured + `<div class="sec-h"><h2>Publiés sur Musio</h2><button class="chip glass" data-a="playList" data-q="${list.map(x => x.id).join(',')}" data-src="Publiés sur Musio">${icf('play', 14)}Tout lire</button></div>
    <div class="panel glass"><div class="tracklist">${list.map(x => trackRow(x, list.map(y => y.id), 'Publiés sur Musio')).join('')}</div></div>`;
}
function publishBtnHTML(t) {
  if (!window.MUSIO_CLOUD || !t.mine || !t.file) return '';
  return t.cloudId
    ? `<button type="button" class="btn glass" data-a="unpublishMine" data-id="${t.id}">${ic('close', 16)}Retirer de Musio</button>`
    : `<button type="button" class="btn primary" data-a="publishSound" data-id="${t.id}">${ic('upload', 16)}Publier sur Musio</button>`;
}
OV.publishSound = {
  kind: 'sheet', label: 'Publier un son',
  html: o => { const t = T(o.id); if (!t) return '';
    return `<h2>Publier sur Musio</h2>
      <div class="nc-prev">${cover(t, 72, 16)}<span class="tt"><b>${esc(t.title)}</b><small>${esc(t.artist)} · ${fmt(t.dur)}</small></span></div>
      <p class="t2" style="font-size:14px;line-height:1.5">Une fois publié, tout le monde sur Musio peut écouter ce son, l’ajouter à ses playlists et le partager dans les communautés.</p>
      <div class="group glass" style="padding:6px 16px"><div class="check ${o.rights ? 'on' : ''}"><button type="button" class="box" data-a="pubRights" role="checkbox" aria-checked="${!!o.rights}" aria-label="Je certifie avoir les droits">${o.rights ? icf('check', 16) : ''}</button><span>Je certifie avoir <b>les droits de diffuser ce son</b> : c’est ma création, ou ses auteurs m’ont donné leur accord. Je sais qu’il sera retiré en cas de signalement fondé.</span></div></div>
      ${o.status ? `<p class="t2" style="font-size:14px">${esc(o.status)}</p>` : ''}
      <button class="btn primary block" data-a="pubGo" ${o.rights && !o.busy ? '' : 'disabled'}>${o.busy ? 'Publication…' : 'Publier'}</button>
      <p class="pub-note">Formats acceptés : MP3, M4A, WAV, OGG, FLAC · 20 Mo maximum. <button type="button" class="lnk" data-a="legal" data-id="copyright">Droits d’auteur</button></p>`; },
};
const pubOv = () => U.ov.find(o => o.type === 'publishSound');
A.publishSound = el => push('publishSound', { id: el.dataset.id, rights: false });
A.pubRights = () => { const o = pubOv(); o.rights = !o.rights; haptic(); refreshOv('publishSound'); };
const AUDIO_TYPES = { mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', aac: 'audio/aac', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', opus: 'audio/ogg', webm: 'audio/webm', flac: 'audio/flac' };
A.pubGo = async () => {
  const o = pubOv(); if (!o || o.busy || !o.rights) return;
  const t = T(o.id); if (!t || !uidMe()) return;
  const set = (status, busy) => { o.status = status; o.busy = busy; refreshOv('publishSound'); };
  set('Préparation du fichier…', true);
  let file = null; try { file = await IDB.get(t.id); } catch (e) {}
  if (!file) { set('Fichier introuvable sur cet appareil : réimporte ce son puis réessaie.', false); return; }
  if (file.size > 20 * 1024 * 1024) { set('Ce fichier fait plus de 20 Mo.', false); return; }
  const ext = ((file.name || '').match(/\.([a-z0-9]+)$/i) || [, 'mp3'])[1].toLowerCase();
  const type = /^audio\//.test(file.type) ? file.type : AUDIO_TYPES[ext] || 'audio/mpeg';
  if (/^video\//.test(file.type)) { set('Les vidéos ne peuvent pas être publiées comme son.', false); return; }
  const key = (crypto.randomUUID ? crypto.randomUUID() : uid() + uid()), audioPath = `${uidMe()}/${key}.${AUDIO_TYPES[ext] ? ext : 'mp3'}`;
  set('Envoi du son…', true);
  const up = await SB.storage.from('sounds').upload(audioPath, file, { contentType: type, upsert: false, cacheControl: '31536000' });
  if (up.error) { set(/mime|type/i.test(up.error.message) ? 'Ce format de fichier n’est pas accepté.' : /size|large/i.test(up.error.message) ? 'Ce fichier est trop lourd (20 Mo maximum).' : cloudErr(up.error), false); return; }
  let coverPath = null;
  const art = S.trackArt[t.id];
  if (art) { try { const blob = await (await fetch(art)).blob(); const cp = `${uidMe()}/${key}.jpg`; const cu = await SB.storage.from('covers').upload(cp, blob, { contentType: 'image/jpeg', upsert: false, cacheControl: '31536000' }); if (!cu.error) coverPath = cp; } catch (e) {} }
  set('Publication…', true);
  const color = /^#[0-9A-Fa-f]{6}$/.test(t.color || '') ? t.color : '#7C5CFF';
  const { data, error } = await SB.from('tracks').insert({ title: t.title.trim().slice(0, 60), artist: (t.artist || S.me.name).trim().slice(0, 40), genre: (t.genre || 'Import').slice(0, 24), duration: Math.max(1, Math.min(1800, Math.round(t.dur))), audio_path: audioPath, cover_path: coverPath, color, rights_ok: true }).select('id').single();
  if (error) { SB.storage.from('sounds').remove([audioPath]); if (coverPath) SB.storage.from('covers').remove([coverPath]); set(cloudErr(error), false); return; }
  t.cloudId = data.id; t.cloudAudio = audioPath; t.cloudCover = coverPath; save();
  U.ov = U.ov.filter(x => x.type !== 'publishSound'); refreshOv('trackEdit'); renderOverlays();
  toast(`« ${t.title} » est en ligne`, cover(t, 30, 7)); haptic(20);
  loadTracks(true);
};
async function unpublish(row) {
  const { error } = await SB.from('tracks').delete().eq('id', row.cloudId);
  if (error) { toast(cloudErr(error), ic('info', 20)); return false; }
  const files = [[ 'sounds', row.audioPath ], [ 'covers', row.coverPath ]].filter(([, p]) => p);
  files.forEach(([b, p]) => SB.storage.from(b).remove([p]).catch(() => {}));
  return true;
}
A.unpublishMine = el => {
  const t = T(el.dataset.id); if (!t || !t.cloudId) return;
  U.dialogFn = async () => {
    if (!await unpublish({ cloudId: t.cloudId, audioPath: t.cloudAudio, coverPath: t.cloudCover })) return;
    delete t.cloudId; delete t.cloudAudio; delete t.cloudCover; save(); refreshOv('trackEdit'); toast('Son retiré de Musio', ic('check', 20)); loadTracks(true);
  };
  push('dialog', { title: 'Retirer ce son de Musio ?', text: 'Il ne sera plus écoutable par les autres membres. Il reste dans tes sons sur cet appareil.', ok: 'Retirer', danger: true });
};
A.unpublishCloud = el => {
  const t = T(el.dataset.id); if (!t || !t.cloud) return;
  U.dialogFn = async () => {
    if (!await unpublish(t)) return;
    window.CLOUD_TRACKS = (window.CLOUD_TRACKS || []).filter(x => x.id !== t.id);
    if (P.trackId === t.id) { E.pause(); }
    U.ov = U.ov.filter(o => o.type !== 'playerMore'); renderAll(); toast('Son retiré de Musio', ic('check', 20));
  };
  push('dialog', { title: `Retirer « ${t.title} » ?`, text: 'Le son sera supprimé de Musio pour tout le monde.', ok: 'Retirer', danger: true });
};

// ---------- branchement ----------
function bootCloud() {
  if (!SB) return;
  window.CLOUD_COMMS = null; window.CLOUD_TRACKS = [];
  const baseOpen = A.openCommunity;
  A.openCommunity = el => { baseOpen(el); const k = comm(el.dataset.id); if (k && k.cloud) { loadPosts(k); listenComm(k); } };
  const baseClose = OV.community.onClose;
  OV.community.onClose = o => { stopListening(); if (baseClose) baseClose(o); };
  A.join = async el => {
    const k = comm(el.dataset.id); if (!k) return;
    if (!k.cloud) return;
    if (k.mine) { toast('Tu as fondé cette communauté : tu peux la supprimer depuis ⋯', ic('info', 20)); return; }
    const res = k.joined
      ? await SB.from('community_members').delete().eq('community_id', k.id).eq('user_id', uidMe())
      : await SB.from('community_members').insert({ community_id: k.id, user_id: uidMe(), role: 'member' });
    if (res.error && !/duplicate/.test(res.error.message)) { toast(cloudErr(res.error), ic('info', 20)); return; }
    k.joined = !k.joined; k.members = Math.max(1, k.members + (k.joined ? 1 : -1));
    if (topOv() && topOv().type === 'more') U.ov.pop();
    toast(k.joined ? `Bienvenue dans ${k.name}` : `Tu as quitté ${k.name}`, cover(k, 28, 8));
    if (U.ov.some(o => o.type === 'community' && o.id === k.id)) renderOverlays(); else renderView();
    if (k.joined && !k.loaded) loadPosts(k);
  };
  FORMS.cpost = async f => {
    const i = $('#cpIn'), txt = i.value.trim(); if (!txt) return;
    const k = comm(f.dataset.id); if (!k || !k.cloud) return;
    i.value = ''; if (!await cloudPost(k, { text: txt.slice(0, 1000) })) i.value = txt;
  };
  A.shareNowComm = async el => {
    const k = comm(el.dataset.id); if (!k) return;
    if (!P.trackId) { toast('Aucun son en cours', ic('music', 20)); return; }
    const tid = shareableTrack(P.trackId); if (!tid) { toast('Publie d’abord ce son sur Musio pour le partager', ic('info', 20)); return; }
    cloudPost(k, { track: tid });
  };
  A.sendToComm = async el => {
    const o = topOv(), k = comm(el.dataset.id); if (!k) return;
    const p = o.post && post(o.post), tid = shareableTrack(o.track || (p && p.trackId));
    if (!tid) { toast('Publie d’abord ce son sur Musio pour le partager', ic('info', 20)); return; }
    pop(); if (await cloudPost(k, { track: tid })) toast(`Partagé dans ${k.name}`, cover(k, 28, 8));
  };
  const baseChatMode = A.chatMode;
  A.chatMode = el => { baseChatMode(el); if (U.chatMode === 'comms') loadComms(); };
  const baseTab = A.tab;
  A.tab = el => { baseTab(el); if (el.dataset.id === 'chat') loadComms(); if (el.dataset.id === 'feed') loadTracks(); };
  const baseFeedMode = A.feedMode;
  A.feedMode = el => { baseFeedMode(el); if (U.feedMode === 'music') loadTracks(); };
}
// appelé une fois le compte connecté
function cloudSignedIn() { if (!SB) return; loadComms(true); loadTracks(true); if (typeof adminSignedIn === 'function') adminSignedIn(); }

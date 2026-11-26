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
// ---------- personnes et abonnements en ligne ----------
// window.CLOUD_PEOPLE : profils des membres (id → personne), FOL : qui suit qui (par profil ouvert)
window.CLOUD_PEOPLE = {};
const FOL = {};
const toPerson = r => ({ id: r.id, name: r.name, handle: r.handle, color: r.color || '#9B85FF', bio: r.bio || '', creator: r.role === 'creator', cloud: true });
const PEOPLE_COLS = 'id,name,handle,bio,color,role';
function addPeople(rows) { (rows || []).forEach(r => { if (r && r.id && r.id !== uidMe()) window.CLOUD_PEOPLE[r.id] = toPerson(r); }); }
const isCloudId = id => /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(String(id));
function refreshPeople() { ['profile', 'follows'].forEach(refreshOv); const r = $('#results'); if (r && U.ov.some(o => o.type === 'search')) r.innerHTML = searchResults(); if (!hasScreen() && U.tab === 'account') renderView(); }
async function loadPeople() {
  if (!SB || !uidMe()) return;
  const { data, error } = await SB.from('profiles').select(PEOPLE_COLS).neq('id', uidMe()).order('created_at', { ascending: false }).limit(100);
  if (!error) addPeople(data);
  await loadMyFollows();
  refreshPeople();
}
// mes abonnements en ligne → S.followed (on garde les éventuels abonnements locaux)
async function loadMyFollows() {
  const me = uidMe(); if (!me) return;
  const [a, b] = await Promise.all([
    SB.from('follows').select('followee_id').eq('follower_id', me),
    SB.from('follows').select('follower_id', { count: 'exact', head: true }).eq('followee_id', me),
  ]);
  if (!a.error) {
    const ids = (a.data || []).map(r => r.followee_id);
    S.followed = S.followed.filter(id => !isCloudId(id)).concat(ids);
    const miss = ids.filter(id => !window.CLOUD_PEOPLE[id]);
    if (miss.length) { const { data } = await SB.from('profiles').select(PEOPLE_COLS).in('id', miss); addPeople(data); }
  }
  if (!b.error) S.me.followers = b.count || 0;
  save();
}
let peopleQT = 0, peopleQ = '';
function searchPeople(q) {
  q = (q || '').trim().replace(/^@/, '').replace(/[%_,()]/g, '');
  clearTimeout(peopleQT);
  if (!SB || !uidMe() || q.length < 1 || q === peopleQ) return;
  peopleQT = setTimeout(async () => {
    peopleQ = q;
    const { data, error } = await SB.from('profiles').select(PEOPLE_COLS).or(`name.ilike.%${q}%,handle.ilike.%${q.toLowerCase()}%`).neq('id', uidMe()).limit(30);
    if (!error) { addPeople(data); refreshPeople(); }
  }, 250);
}
// abonnés / abonnements d'un profil en ligne (et du mien)
async function loadFollowInfo(id) {
  const uid = id === 'me' ? uidMe() : id; if (!SB || !uid || !isCloudId(uid)) return;
  const [a, b] = await Promise.all([
    SB.from('follows').select('follower_id').eq('followee_id', uid).order('created_at', { ascending: false }).limit(500),
    SB.from('follows').select('followee_id').eq('follower_id', uid).order('created_at', { ascending: false }).limit(500),
  ]);
  if (a.error || b.error) return;
  const followers = a.data.map(r => r.follower_id), following = b.data.map(r => r.followee_id);
  const miss = followers.concat(following, id === 'me' ? [] : [uid]).filter(x => x !== uidMe() && !window.CLOUD_PEOPLE[x]);
  if (miss.length) { const { data } = await SB.from('profiles').select(PEOPLE_COLS).in('id', Array.from(new Set(miss))); addPeople(data); }
  FOL[uid] = { followers, following };
  if (id === 'me') S.me.followers = followers.length;
  refreshPeople();
}
const asUser = x => x === uidMe() ? user('me') : user(x);
function cloudFollowData(id) {
  const uid = id === 'me' ? uidMe() : id; if (!uid || !isCloudId(uid)) return null;
  const f = FOL[uid];
  if (id === 'me') {
    const following = S.followed.map(user).filter(u => !blocked(u.id));
    const followers = f ? f.followers.map(asUser).filter(u => !blocked(u.id)) : [];
    return { followers, following, followersTotal: f ? f.followers.length : (S.me.followers || 0), followingTotal: following.length };
  }
  if (!f) return { followers: S.followed.includes(id) ? [user('me')] : [], following: [], followersTotal: 0, followingTotal: 0 };
  // le profil ajoute lui-même +1 si je suis abonné : on ne me compte pas ici
  const others = f.followers.filter(x => x !== uidMe());
  return { followers: (S.followed.includes(id) ? [user('me')] : []).concat(others.map(asUser).filter(u => !blocked(u.id))), following: f.following.map(asUser).filter(u => !blocked(u.id)), followersTotal: others.length, followingTotal: f.following.length };
}

// ---------- Map en ligne : ma position (arrondie) + celles des gens qui me suivent ----------
window.PRESENCE_TRACKS = {};
const MAPC = { timer: 0, sent: false, last: '' };
function presenceTrack(r) {
  if (r.track_id && T(r.track_id) && !T(r.track_id).synthetic) return r.track_id;
  const id = 'pz-' + r.user_id;
  window.PRESENCE_TRACKS[id] = { id, title: r.track_title || 'Rien en écoute', artist: r.track_artist || '', genre: 'Musique', color: r.track_color || '#9B85FF', shape: 'disc', dur: 180, synthetic: true };
  return id;
}
async function pushPresence(force) {
  const me = uidMe(); if (!SB || !me) return;
  const share = S.settings.shareListening && S.geo && S.geo.on && isFinite(S.geo.lat) && isFinite(S.geo.lng);
  if (!share) { if (MAPC.sent || force) { await SB.from('presence').delete().eq('user_id', me); MAPC.sent = false; MAPC.last = ''; } return; }
  const t = T(P.trackId), playing = !!(t && E.isPlaying());
  const row = { user_id: me, lat: S.geo.lat, lng: S.geo.lng, playing,
    track_id: t ? String(t.cloudId ? t.id : t.id).slice(0, 60) : null,
    track_title: t ? String(t.title).slice(0, 80) : null, track_artist: t ? String(t.artist || '').slice(0, 60) : null,
    track_color: t && /^#[0-9A-Fa-f]{6}$/.test(t.color || '') ? t.color : null };
  const key = JSON.stringify(row);
  // on renvoie au moins toutes les 2 min pour rester « en direct »
  if (!force && key === MAPC.last && Date.now() - (MAPC.at || 0) < 120000) return;
  const { error } = await SB.from('presence').upsert(row);
  if (!error) { MAPC.sent = true; MAPC.last = key; MAPC.at = Date.now(); }
}
async function pullPresence() {
  const me = uidMe(); if (!SB || !me) return;
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data, error } = await SB.from('presence').select('*').neq('user_id', me).gte('updated_at', since).limit(300);
  if (error) return;
  const miss = (data || []).map(r => r.user_id).filter(id => !window.CLOUD_PEOPLE[id]);
  if (miss.length) { const r = await SB.from('profiles').select(PEOPLE_COLS).in('id', miss); addPeople(r.data); }
  const now = Date.now();
  const fr = (data || []).filter(r => window.CLOUD_PEOPLE[r.user_id]).map(r => {
    const p = window.CLOUD_PEOPLE[r.user_id], at = Date.parse(r.updated_at) || now;
    return Object.assign({}, p, { lat: r.lat, lng: r.lng, trackId: presenceTrack(r), live: now - at < 5 * 60000, ago: ago(at), place: '', cloudFriend: true });
  });
  FRIENDS = FRIENDS.filter(f => !f.cloudFriend).concat(fr);
  if (U.tab === 'map' && !hasScreen()) { if (typeof syncMarkers === 'function') syncMarkers(); const d = $('.dock'); if (d) renderView(); }
}
function mapTick() { pushPresence().then(pullPresence).catch(() => {}); }
function startMapSync() { clearTimeout(MAPC.timer); mapTick(); const loop = () => { MAPC.timer = setTimeout(() => { if (!document.hidden) mapTick(); loop(); }, U.tab === 'map' ? 20000 : 60000); }; loop(); }

// ---------- publications du feed en ligne ----------
window.CLOUD_POSTS = [];
const POSTC = { at: 0 };
const okColor = c => /^#[0-9A-Fa-f]{6}$/.test(c || '') ? c : null;
function postTrack(r) {
  const t = r.track_id && T(r.track_id);
  if (t && !t.synthetic) return t.id;
  const id = 'pt-' + r.id;
  window.PRESENCE_TRACKS[id] = { id, title: r.track_title || 'Son', artist: r.track_artist || '', genre: 'Musique', color: r.track_color || '#9B85FF', shape: 'disc', dur: 180, bpm: 100, synthetic: true, quiet: true };
  return id;
}
function toPost(r) {
  const me = uidMe();
  if (r.author) addPeople([r.author]);
  return {
    id: r.id, cloudId: r.id, cloud: true, author: r.author_id === me ? 'me' : r.author_id,
    trackId: postTrack(r), start: r.start_sec || 0, len: r.len_sec || 30, style: r.style || 'waves', filter: r.filter || 'normal',
    texts: Array.isArray(r.texts) ? r.texts : [], caption: r.caption || '',
    video: r.video_path ? pubUrl('posts', r.video_path) : null,
    photos: r.photo_paths && r.photo_paths.length ? r.photo_paths.map(x => pubUrl('posts', x)) : null,
    likes: 0, views: 0, commentsBase: 0, shares: 0, comments: [], allowComments: r.allow_comments !== false, vis: r.vis, at: Date.parse(r.created_at) || Date.now(),
    videoPath: r.video_path, photoPaths: r.photo_paths || [],
  };
}
async function loadFeedPosts(force) {
  if (!SB || !uidMe()) return;
  if (!force && Date.now() - POSTC.at < 20000) return;
  POSTC.at = Date.now();
  const { data, error } = await SB.from('posts').select('*,author:profiles(' + PEOPLE_COLS + ')').order('created_at', { ascending: false }).limit(200);
  if (error) { POSTC.at = 0; return; }
  const local = new Set(S.posts.map(p => p.cloudId).filter(Boolean));
  window.CLOUD_POSTS = (data || []).filter(r => !local.has(r.id)).map(toPost);
  if (!hasScreen() && (U.tab === 'feed' || U.tab === 'account') && !U.activePost) renderView();
  ['profile', 'tag'].forEach(refreshOv);
}
const dataToBlob = d => fetch(d).then(r => r.blob());
const VIDEO_TYPES = { mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm' };
async function uploadPost(p, file) {
  const me = uidMe(), id = (crypto.randomUUID ? crypto.randomUUID() : null); if (!me || !id) return;
  toast('Envoi de ta publication…', ic('upload', 20));
  try {
    let video_path = null, photo_paths = [];
    if (file) {
      const ext = ((file.name || '').split('.').pop() || 'mp4').toLowerCase(), type = file.type || VIDEO_TYPES[ext] || 'video/mp4';
      if (file.size > 50 * 1048576) throw new Error('Vidéo trop lourde : 50 Mo maximum pour la mettre en ligne.');
      video_path = `${me}/${id}/video.${VIDEO_TYPES[ext] ? ext : 'mp4'}`;
      const up = await SB.storage.from('posts').upload(video_path, file, { contentType: type, upsert: false });
      if (up.error) throw up.error;
    }
    for (let i = 0; i < (p.photos || []).length; i++) {
      const src = p.photos[i]; if (/^https?:/.test(src)) continue;
      const b = await dataToBlob(src), path = `${me}/${id}/${i}.jpg`;
      const up = await SB.storage.from('posts').upload(path, b, { contentType: b.type || 'image/jpeg', upsert: false });
      if (up.error) throw up.error;
      photo_paths.push(path);
    }
    const t = T(p.trackId), shareable = t && !t.synthetic && (!t.mine || t.cloud) ? t.id : null;
    const row = { id, track_id: shareable, track_title: t ? String(t.title).slice(0, 80) : null, track_artist: t ? String(t.artist || '').slice(0, 60) : null, track_color: t ? okColor(t.color) : null,
      start_sec: Math.round(p.start || 0), len_sec: Math.round(p.len || 30), style: p.style || 'waves', filter: p.filter || 'normal', texts: p.texts || [], caption: (p.caption || '').slice(0, 2200),
      video_path, photo_paths, allow_comments: p.allowComments !== false, vis: p.vis === 'Amis' ? 'Amis' : 'Public' };
    const { error } = await SB.from('posts').insert(row);
    if (error) throw error;
    p.cloudId = id; p.videoPath = video_path; p.photoPaths = photo_paths;
    if (video_path) p.video = pubUrl('posts', video_path);
    if (photo_paths.length) p.photos = photo_paths.map(x => pubUrl('posts', x));
    save(); toast('Publication en ligne : tes abonnés peuvent la voir', ic('check', 20));
  } catch (e) {
    toast((e && e.message && /Mo maximum/.test(e.message)) ? e.message : 'Publication gardée sur cet appareil : l’envoi en ligne a échoué (' + cloudErr(e) + ')', ic('info', 20));
  }
}
async function deleteCloudPost(p) {
  if (!p || !p.cloudId || !SB) return;
  await SB.from('posts').delete().eq('id', p.cloudId);
  const files = [p.videoPath].concat(p.photoPaths || []).filter(Boolean);
  if (files.length) SB.storage.from('posts').remove(files).catch(() => {});
  window.CLOUD_POSTS = window.CLOUD_POSTS.filter(x => x.cloudId !== p.cloudId);
}

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
  // abonnements réels
  const baseFollow = A.follow;
  A.follow = async el => {
    const id = el.dataset.id;
    if (!isCloudId(id) || !uidMe()) return baseFollow(el);
    const was = S.followed.includes(id);
    const res = was
      ? await SB.from('follows').delete().eq('follower_id', uidMe()).eq('followee_id', id)
      : await SB.from('follows').insert({ follower_id: uidMe(), followee_id: id });
    if (res.error && !/duplicate/.test(res.error.message)) { toast(cloudErr(res.error), ic('info', 20)); return; }
    baseFollow(el);
    const f = FOL[id]; if (f) { f.followers = f.followers.filter(x => x !== uidMe()); if (!was) f.followers.unshift(uidMe()); }
  };
  const baseOpenProfile = A.openProfile;
  A.openProfile = el => { baseOpenProfile(el); loadFollowInfo(el.dataset.id); };
  const baseFollowList = A.followList;
  A.followList = el => { baseFollowList(el); loadFollowInfo(el.dataset.id); };
  const baseSearch = A.search;
  A.search = () => { baseSearch(); loadPeople(); };
  const baseIn = IN.search;
  IN.search = el => { baseIn(el); searchPeople(el.value); };


  // publications en ligne
  const basePublish = A.publish;
  A.publish = el => {
    const c = U.create; if (!c) return;
    const file = c.src === 'video' ? c.videoFile : null, before = S.posts[0];
    basePublish(el);
    const p = S.posts[0];
    if (p && p !== before && p.vis !== 'Moi seulement' && uidMe()) uploadPost(p, file);
  };
  const baseDelete = A.deletePost;
  A.deletePost = el => {
    const p = post(el.dataset.id);
    baseDelete(el);
    const fn = U.dialogFn;
    if (p && p.cloudId) U.dialogFn = async () => { await deleteCloudPost(p); S.posts = S.posts.filter(x => x.id !== p.id); fn(); };
  };
  const baseTab3 = A.tab;
  A.tab = el => { baseTab3(el); if (el.dataset.id === 'feed' || el.dataset.id === 'account') loadFeedPosts(); };
  const baseFeedMode2 = A.feedMode;
  A.feedMode = el => { baseFeedMode2(el); loadFeedPosts(); };
  const baseOpenProfile2 = A.openProfile;
  A.openProfile = el => { baseOpenProfile2(el); loadFeedPosts(); };
  // Map en ligne
  const baseGhost = A.ghost;
  A.ghost = el => { baseGhost(el); pushPresence(true); };
  const baseTab2 = A.tab;
  A.tab = el => { baseTab2(el); if (el.dataset.id === 'map') mapTick(); };
  const baseLocate = A.locate;
  if (baseLocate) A.locate = el => { baseLocate(el); setTimeout(() => pushPresence(true), 4000); };
  const baseLogout = A.authLogout;
  if (baseLogout) A.authLogout = el => { if (MAPC.sent && uidMe()) SB.from('presence').delete().eq('user_id', uidMe()).then(() => { MAPC.sent = false; MAPC.last = ''; }); baseLogout(el); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden && uidMe()) mapTick(); });
}
// appelé une fois le compte connecté
function cloudSignedIn() { if (!SB) return; window.CLOUD_PEOPLE = {}; window.CLOUD_POSTS = []; Object.keys(FOL).forEach(k => delete FOL[k]); peopleQ = ''; loadComms(true); loadTracks(true); loadPeople(); loadFeedPosts(true); startMapSync(); if (typeof adminSignedIn === 'function') adminSignedIn(); }

'use strict';
// ================= Musio — actions, messages, visuels, boucle, démarrage =================

// ---------- messages & communautés ----------
function msgHTML(m) {
  const mine = m.from === 'me', cls = mine ? 'me' : 'them glass';
  if (m.track) { const t = T(m.track); return `<button class="msg card ${cls}" data-a="playTrack" data-id="${t.id}" data-q="${t.id}" data-src="Partagé dans Discussion">${cover(t, 44, 12)}<span class="tt"><b>${esc(t.title)}</b><small style="${mine ? 'color:inherit;opacity:.75' : ''}">${esc(t.artist)}</small></span>${icf('play', 20)}</button>`; }
  if (m.post) { const p = post(m.post); if (p) { const t = T(p.trackId); return `<button class="msg card ${cls}" data-a="postView" data-id="${p.id}">${p.photos && p.photos[0] ? `<span class="cover" style="width:44px;height:44px;border-radius:12px"><img src="${p.photos[0]}" alt="" style="width:100%;height:100%;object-fit:cover"></span>` : cover(t, 44, 12)}<span class="tt"><b>Publication de @${esc(user(p.author).handle)}</b><small style="${mine ? 'color:inherit;opacity:.75' : ''}">${esc(p.caption.slice(0, 42))}…</small></span></button>`; } }
  return `<div class="msg ${cls}">${esc(m.text)}</div>`;
}
function msgsHTML(c) {
  const prof = D.profiles.find(p => p.id === c.with);
  let h = prof ? `<div class="day">Vous avez matché · ${prof.compat} % de compatibilité</div>` : '';
  if (!c.msgs.length && prof) h += `<div class="empty" style="padding:20px">${avatar(prof, 76)}<span>Brise la glace avec un son. ${esc(prof.name)} adore ${esc(prof.top[0])}.</span><button class="btn primary" data-a="sendTrackTo" data-id="${c.id}" data-t="${prof.anthem}">${ic('music', 18)}Envoyer « ${esc(T(prof.anthem).title)} »</button></div>`;
  h += c.msgs.filter(m => m.text || m.track || m.post).map(msgHTML).join('');
  if (U.typing[c.id]) h += '<div class="msg them glass typing" aria-label="En train d’écrire"><i></i><i></i><i></i></div>';
  return h;
}
const isTop = (type, key, val) => { const o = topOv(); return o && o.type === type && o[key] === val; };
function updateMsgs(c) { if (!isTop('chat', 'convId', c.id)) return; const box = $('#msgs'); if (!box) return; box.innerHTML = msgsHTML(c); const b = $('#chatBody'); if (b) b.scrollTop = b.scrollHeight; }
function ensureConv(id) { let c = S.convs.find(x => x.with === id); if (!c) { c = { id: 'c-' + id, with: id, msgs: [], unread: 0 }; S.convs.push(c); save(); } return c; }
function openChatWith(id) { if (blocked(id)) { toast('Tu as bloqué ce compte', ic('block', 20)); return; } const c = ensureConv(id); popToScreen(); if (D.profiles.some(p => p.id === id) && S.match.newCount) S.match.newCount = 0; push('chat', { convId: c.id }); renderChrome(); }
function cpostHTML(k, p) {
  const u = nameUser(p.user, p.me); const sh = p.post ? post(p.post) : null;
  return `<div class="cpost glass">${avatar(u, 38)}<div class="grow"><div class="meta"><b style="color:#fff;font-size:14px">${esc(p.me ? S.me.name : p.user)}</b>${ago(p.at)}</div>${p.text ? `<p style="font-size:14.5px;line-height:1.4">${esc(p.text)}</p>` : ''}${p.track ? `<button class="track-card glass" style="padding:8px" data-a="playTrack" data-id="${p.track}" data-q="${p.track}" data-src="${esc(k.name)}">${cover(T(p.track), 40, 12)}<span class="tt"><b>${esc(T(p.track).title)}</b><small>${esc(T(p.track).artist)}</small></span>${icf('play', 18)}</button>` : ''}${sh ? `<button class="track-card glass" style="padding:8px" data-a="postView" data-id="${sh.id}">${cover(T(sh.trackId), 40, 12)}<span class="tt"><b>Publication de @${esc(user(sh.author).handle)}</b><small>${esc(sh.caption.slice(0, 40))}…</small></span></button>` : ''}<div><button class="chip ${p.likedByMe ? 'on' : 'glass'}" style="height:30px;padding:0 12px;font-size:12px" data-a="likeCPost" data-k="${k.id}" data-id="${p.id}" aria-pressed="${!!p.likedByMe}">${p.likedByMe ? icf('heart', 14) : ic('heart', 14)} ${p.likes + (p.likedByMe ? 1 : 0)}</button></div></div></div>`;
}
function updateComm(k) { if (!isTop('community', 'id', k.id)) return; const box = $('#commPosts'); if (!box) return; box.innerHTML = k.posts.map(p => cpostHTML(k, p)).join(''); const b = $('#chatBody'); if (b) b.scrollTop = b.scrollHeight; }
function addActivity(type, userId, text) { S.activity.unshift({ id: uid(), type, user: userId, text, at: Date.now(), read: false }); S.activity = S.activity.slice(0, 40); save(); renderChrome(); }

// ---------- réponses (Claude si disponible) ----------
let samplerP = null;
function sampler() {
  if (U.aiOff) return Promise.resolve(null);
  if (samplerP) return samplerP;
  if (!window.claude || typeof window.claude.use !== 'function') return Promise.resolve(null);
  samplerP = window.claude.use('sample').catch(() => null);
  return samplerP;
}
async function ask(prompt) {
  const s = await sampler(); if (!s) return null;
  try { const r = await s(prompt, { modelTier: 'quick', cache: false }); const t = (r && r.text || '').trim(); return t || null; }
  catch (e) { if (e && (e.code === 'not_granted' || e.code === 'rate_limited')) U.aiOff = true; return null; }
}
const catalog = () => D.tracks.map(t => `« ${t.title} » (${t.artist}, ${t.genre})`).join(', ');
function clean(text, name) { return text.replace(/^["«“]+|["»”]+$/g, '').replace(new RegExp('^' + name + '\\s*:\\s*', 'i'), '').trim().slice(0, 400); }
function canned(c) {
  const last = c.msgs.filter(m => m.from === 'me').pop() || {}; const txt = (last.text || '').toLowerCase(); const t = last.track && T(last.track);
  if (t) return pick([`Ah « ${t.title} », j’adore ce son`, 'Je lance ça tout de suite', `${t.artist}, c’est toujours une valeur sûre`]);
  if (/salut|hello|coucou|yo|wesh|bonjour|hey/.test(txt)) return pick(['Hey ! Ça va ?', 'Yo ! Tu écoutes quoi en ce moment ?', 'Coucou !']);
  if (/\?\s*$/.test(txt)) return pick(['Grave, pourquoi pas !', 'Bonne question… je te dis ce soir', 'Carrément']);
  return pick(['Trop bien', 'Haha j’avoue', 'Je t’envoie un son après', 'Ok ça marche', 'Ça me parle']);
}
async function reply(c) {
  return; // pas de réponses automatiques : seuls de vrais utilisateurs répondent
  if (U.typing[c.id] || blocked(c.with)) return;
  const u = user(c.with);
  await wait(700); U.typing[c.id] = true; updateMsgs(c);
  const fr = FRIENDS.find(f => f.id === c.with), prof = D.profiles.find(p => p.id === c.with);
  const persona = (fr && fr.persona) || (prof && prof.persona) || `${u.name}, ${u.bio || 'un compte de musique'}`;
  const hist = c.msgs.slice(-14).map(m => `${m.from === 'me' ? S.me.name : u.name} : ${m.text || (m.track ? `[partage le titre « ${T(m.track).title} » de ${T(m.track).artist}]` : '[partage une publication du feed]')}`).join('\n');
  const nowT = fr ? T(fr.trackId) : null;
  const prompt = `Tu incarnes ${persona}. Vous discutez en messages privés dans « Musio », une app de musique sociale. ${prof ? `Vous venez de matcher grâce à vos goûts musicaux (${prof.compat} % de compatibilité ; artistes préférés : ${prof.top.join(', ')}).` : `Tu es ami·e avec ${S.me.name}.`}${nowT ? ` Tu écoutes en ce moment « ${nowT.title} » de ${nowT.artist}.` : ''}
Morceaux qui existent dans l’app : ${catalog()}.
Réponds au dernier message comme dans un vrai texto : en français, 1 ou 2 phrases courtes, ton naturel qui colle au personnage. Reste respectueux. Pas de guillemets, pas de prénom en préfixe, pas de hashtag. Ne dis jamais que tu es une IA.

Conversation :
${hist}

Ta réponse :`;
  const ai = await ask(prompt);
  const text = ai ? clean(ai, u.name) : canned(c);
  await wait(300 + Math.min(1400, text.length * 18));
  U.typing[c.id] = false;
  c.msgs.push({ from: c.with, text, at: Date.now() });
  if (!isTop('chat', 'convId', c.id)) {
    c.unread = (c.unread || 0) + 1; renderChrome();
    if (S.settings.notif.messages) toast(`${u.name} : ${text}`, avatar(u, 30), () => { U.tab = 'chat'; U.ov = []; renderAll(); push('chat', { convId: c.id }); });
    if (U.tab === 'chat' && !hasScreen()) renderView();
  }
  save(); updateMsgs(c);
}
async function commReply(k) {
  return; // pas de messages automatiques dans les communautés
  await wait(1400);
  const name = pick(k.crew); const hist = k.posts.slice(-8).map(p => `${p.me ? S.me.name : p.user} : ${p.text || (p.track ? `[partage « ${T(p.track).title} » de ${T(p.track).artist}]` : '[partage une publication]')}`).join('\n');
  const prompt = `Tu es ${name}, membre de la communauté « ${k.name} » (${k.desc}) dans Musio, une app de musique sociale. Réponds au dernier message du fil comme dans un chat de groupe : en français, une seule phrase courte et naturelle, ton amical et respectueux. Pas de guillemets, pas de prénom en préfixe, pas de hashtag. Ne dis jamais que tu es une IA.
Morceaux qui existent dans l’app : ${catalog()}.

Fil :
${hist}

Ta réponse :`;
  const ai = await ask(prompt);
  const text = ai ? clean(ai, name) : pick(['Trop bien, merci du partage', 'Je valide à 100 %', 'Ah enfin quelqu’un qui a du goût', 'Je l’ajoute à ma playlist direct']);
  k.posts.push({ id: uid(), user: name, text, at: Date.now(), likes: 0 }); save(); updateComm(k);
}

// ---------- images ----------
function readImage(file, max, q, square) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file); const img = new Image();
    img.onload = () => {
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
      if (square) { const m = Math.min(sw, sh); sx = (sw - m) / 2; sy = (sh - m) / 2; sw = sh = m; }
      const r = Math.min(1, max / Math.max(sw, sh)), w = Math.round(sw * r), h = Math.round(sh * r);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      URL.revokeObjectURL(url); res(cv.toDataURL('image/jpeg', q));
    };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('image')); };
    img.src = url;
  });
}

// ================= ACTIONS =================
A.back = () => pop();
A.tab = el => { const id = el.dataset.id; haptic(6); if (U.tab === id && !U.ov.length) { const sc = $('#view .scroll') || $('#feed'); if (sc) sc.scrollTo({ top: 0, behavior: 'smooth' }); return; } U.tab = id; U.ov = U.ov.filter(o => OV[o.type].locked); if (id !== 'feed') $$('#view video').forEach(v => v.pause()); renderAll(); };
A.unlock = () => unlock();
A.feedMode = el => { U.feedMode = el.dataset.id; U.activePost = null; renderView(); renderChrome(); };
A.genre = el => { U.genre = el.dataset.id; renderView(); };
A.search = () => { U.search = { q: '', tab: 'Tout' }; popToScreen(); push('search'); };
A.searchTab = el => { U.search.tab = el.dataset.id; refreshOv('search'); };
A.recent = el => { U.search.q = el.dataset.id; refreshOv('search'); };
A.clearRecent = () => { S.recent = []; save(); refreshOv('search'); };
A.tag = el => { popToScreen(); push('tag', { tag: el.dataset.id }); };
A.postView = el => { popToScreen(); push('postView', { id: el.dataset.id }); };
A.activity = () => push('activity');
A.clearActivity = () => { S.activity = []; save(); refreshOv('activity'); renderChrome(); };
// feed
A.likePost = el => toggleLikePost(el.dataset.id);
A.comments = el => push('comments', { postId: el.dataset.id });
A.likeCmt = el => { const p = post(el.dataset.p), c = p.comments[+el.dataset.id]; c.liked = !c.liked; save(); refreshOv('comments'); };
A.sharePost = el => push('share', { post: el.dataset.id });
A.shareTrack = el => { popToScreen(); push('share', { track: el.dataset.id }); };
A.openTrack = el => { const pid = el.dataset.post, p = pid && post(pid); if (p) playTrack(p.trackId, { queue: [p.trackId], at: p.start || 0, source: 'Feed · @' + user(p.author).handle, post: pid }); else playTrack(el.dataset.id); push('player'); };
A.hidePost = el => { S.hiddenPosts.push(el.dataset.id); save(); pop(); toast('Tu verras moins de publications comme celle-ci', ic('eyeoff', 20)); if (U.tab === 'feed' && !hasScreen()) { U.activePost = null; renderView(); } };
A.deletePost = el => { const id = el.dataset.id; U.dialogFn = () => { S.posts = S.posts.filter(p => p.id !== id); save(); U.ov = U.ov.filter(o => !(o.type === 'postView' && o.id === id) && o.type !== 'share'); renderAll(); toast('Publication supprimée', ic('trash', 20)); }; push('dialog', { title: 'Supprimer la publication ?', text: 'Elle disparaîtra du feed et de ton profil. Cette action est définitive.', ok: 'Supprimer', danger: true }); };
A.follow = el => {
  const id = el.dataset.id, i = S.followed.indexOf(id), u = user(id), prof = D.profiles.find(p => p.id === id);
  if (i >= 0) { S.followed.splice(i, 1); toast(`Tu ne suis plus ${u.name}`, avatar(u, 30)); }
  else if (S.requested.includes(id)) { S.requested = S.requested.filter(x => x !== id); toast('Demande annulée', avatar(u, 30)); }
  else if (prof && prof.private) { S.requested.push(id); haptic(); toast(`Demande envoyée à ${u.name}`, avatar(u, 30)); }
  else { S.followed.push(id); haptic(); toast(`Tu suis maintenant ${u.name}`, avatar(u, 30)); }
  save(); $$(`.follow-plus[data-id="${id}"]`).forEach(b => b.remove());
  if (topOv() && topOv().type === 'more') pop();
  refreshOv('profile'); refreshOv('search'); refreshOv('follows');
  if (!hasScreen() && U.tab === 'account') renderView();
};
A.profileViews = () => { popToScreen(); push('profileViews'); setTimeout(() => { S.pviews.forEach(v => v.seen = true); save(); if (U.tab === 'account') renderView(); }, 1200); };
A.toggleVisits = () => { S.settings.showMyVisits = !S.settings.showMyVisits; save(); refreshOv('profile'); toast(S.settings.showMyVisits ? 'Tes visites de profil sont à nouveau visibles' : 'Visite discrète activée : personne ne voit que tu regardes son profil', ic(S.settings.showMyVisits ? 'eye' : 'eyeoff', 18)); };
A.creatorInfo = () => push('creator');
A.statLikes = el => push('stat', { id: el.dataset.id, k: 'likes' });
A.statViews = el => push('stat', { id: el.dataset.id, k: 'views' });
A.followList = el => { popToScreen(); push('follows', { id: el.dataset.id, k: el.dataset.k, q: '' }); };
A.followTab = el => { const o = topOv(); if (!o || o.type !== 'follows') return; o.k = el.dataset.id; o.q = ''; refreshOv('follows'); };
A.openProfile = el => { const id = el.dataset.id; if (id === 'me') { U.tab = 'account'; U.ov = []; renderAll(); return; } popToScreen(); push('profile', { id }); };
A.openArtist = el => { const name = el.dataset.id; const u = D.others.find(x => x.artist && name.indexOf(x.artist) === 0); popToScreen(); if (u) push('profile', { id: u.id }); else { U.search = { q: name, tab: 'Tout' }; push('search'); } };
// lecture
A.playTrack = el => { const id = el.dataset.id; if (P.trackId === id && E.current() === T(id)) { togglePlay(); return; } playTrack(id, { queue: el.dataset.q ? el.dataset.q.split(',') : [id], source: el.dataset.src || 'Ta bibliothèque' }); };
A.playList = el => { const q = el.dataset.q.split(','); P.shuffle = false; playTrack(q[0], { queue: q, source: el.dataset.src || 'Ta bibliothèque' }); };
A.likeTrack = el => {
  const id = el.dataset.id, i = S.likedTracks.indexOf(id);
  if (i >= 0) { S.likedTracks.splice(i, 1); toast('Retiré des titres likés', ic('heart', 20)); } else { S.likedTracks.push(id); haptic(); toast('Ajouté aux titres likés', `<span class="liked-ic">${icf('heart', 20)}</span>`); }
  save(); renderMini(); renderSide(); ['player', 'playlist', 'profile', 'playerMore', 'search'].forEach(refreshOv);
  if (!hasScreen() && (U.tab === 'account' || (U.tab === 'feed' && U.feedMode === 'music'))) renderView();
};
A.pp = () => togglePlay();
A.next = () => next(false);
A.prev = () => prev();
A.openPlayer = () => { if (P.trackId) { popToScreen(); push('player'); } };
A.shuffle = () => { P.shuffle = !P.shuffle; save(); refreshOv('player'); toast(P.shuffle ? 'Lecture aléatoire activée' : 'Lecture aléatoire désactivée', ic('shuffle', 20)); };
A.repeat = () => { P.repeat = { off: 'all', all: 'one', one: 'off' }[P.repeat]; save(); refreshOv('player'); toast({ off: 'Répétition désactivée', all: 'Répéter la file', one: 'Répéter ce titre' }[P.repeat], ic('repeat', 20)); };
A.lyrics = () => { P.lyrics = !P.lyrics; refreshOv('player'); };
A.seekTo = el => { E.seek(+el.dataset.id); if (!E.isPlaying()) togglePlay(); };
A.devices = () => push('devices');
A.setDevice = el => { S.settings.device = el.dataset.id; save(); pop(); refreshOv('player'); refreshOv('settings'); toast('Lecture sur : ' + el.dataset.id, ic(devIcon(), 20)); };
A.queue = () => { if (topOv() && topOv().type === 'playerMore') U.ov.pop(); push('queue'); };
A.jumpQ = el => { startIdx(+el.dataset.id); refreshOv('queue'); };
A.removeQ = el => { const i = +el.dataset.id; P.queue.splice(i, 1); if (i < P.qi) P.qi--; save(); refreshOv('queue'); };
A.addQ = el => { P.queue.push(el.dataset.id); save(); refreshOv('queue'); toast('Ajouté à la file d’attente', ic('queue', 20)); };
A.playerMore = () => push('playerMore');
A.sleep = () => { U.ov.pop(); push('sleep'); };
A.setSleep = el => { const v = el.dataset.id; U.sleepAt = null; U.sleepEnd = false; if (v === 'end') U.sleepEnd = true; else if (v !== 'off') U.sleepAt = Date.now() + (+v) * 60000; pop(); toast(v === 'off' ? 'Minuterie désactivée' : v === 'end' ? 'Pause à la fin du titre' : `Pause dans ${v} min`, ic('moon', 20)); };
// playlists
A.openPlaylist = el => push('playlist', { id: el.dataset.id });
A.playPl = el => { const pl = PL(el.dataset.id); if (!pl || !pl.tracks.length) return; P.shuffle = false; playTrack(pl.tracks[0], { queue: pl.tracks, source: pl.title }); };
A.shufflePl = el => { const pl = PL(el.dataset.id); if (!pl.tracks.length) return; P.shuffle = true; playTrack(pick(pl.tracks), { queue: pl.tracks, source: pl.title }); toast('Lecture aléatoire', ic('shuffle', 20)); };
A.addToPl = el => { if (topOv() && OV[topOv().type].kind === 'sheet') U.ov.pop(); push('addToPlaylist', { track: el.dataset.id }); };
A.newPlaylist = el => {
  const t = el.dataset.id;
  U.promptFn = name => {
    const pl = { id: 'up' + uid(), title: name, desc: '', color: pick(PALETTE), shape: pick(['disc', 'ring', 'dome', 'pill', 'diamond', 'stripes']), tracks: t ? [t] : [], mine: true };
    S.playlists.push(pl); save(); toast(`Playlist « ${name} » créée`, cover(pl, 28, 8));
    if (topOv() && topOv().type === 'addToPlaylist') refreshOv('addToPlaylist'); else if (!hasScreen()) renderView(); else push('playlist', { id: pl.id });
  };
  push('prompt', { title: 'Nouvelle playlist', placeholder: 'Nom de la playlist', ok: 'Créer' });
};
A.toggleInPl = el => { const pl = S.playlists.find(x => x.id === el.dataset.id), t = el.dataset.t; if (!pl) return; const i = pl.tracks.indexOf(t); if (i >= 0) { pl.tracks.splice(i, 1); toast(`Retiré de « ${pl.title} »`, ic('close', 20)); } else { pl.tracks.push(t); haptic(); toast(`Ajouté à « ${pl.title} »`, ic('check', 20)); } save(); refreshOv('addToPlaylist'); refreshOv('playlist'); };
A.deletePl = el => { const id = el.dataset.id; U.dialogFn = () => { S.playlists = S.playlists.filter(p => p.id !== id); save(); U.ov = U.ov.filter(o => !(o.type === 'playlist' && o.id === id)); renderAll(); toast('Playlist supprimée', ic('trash', 20)); }; push('dialog', { title: 'Supprimer la playlist ?', text: 'Les titres restent disponibles dans l’app.', ok: 'Supprimer', danger: true }); };
// map
A.mapMode = el => { U.mapMode = el.dataset.id; renderView(); };
A.mapPanel = () => { U.mapPanel = !U.mapPanel; renderView(); };
A.ghost = () => { S.settings.shareListening = !S.settings.shareListening; save(); renderView(); syncMarkers(); toast(S.settings.shareListening ? 'Tes amis voient à nouveau ton écoute' : 'Mode fantôme : tes amis ne te voient plus', ic(S.settings.shareListening ? 'eye' : 'ghost', 20)); };
A.zoom = el => mapZoom(+el.dataset.id);
A.recenter = () => { if (GEO.pos) mapFlyTo(GEO.pos.lng, GEO.pos.lat); else locateMe(); };
A.locate = () => locateMe();
A.friend = el => { if (U.mapMoved && Date.now() - U.mapMoved < 300) return; const f = FRIENDS.find(x => x.id === el.dataset.id); if (U.tab === 'map' && $('#map') && isFinite(f.lat)) mapFlyTo(f.lng, f.lat, isDesk() ? 0 : 120); push('friend', { id: f.id }); };
A.listenWith = el => { const f = FRIENDS.find(x => x.id === el.dataset.id); playTrack(f.trackId, { queue: [f.trackId], at: 20 + hashN(f.id) % 60, source: 'Avec ' + f.name }); if (topOv() && OV[topOv().type].kind === 'sheet') pop(); toast(`Tu écoutes avec ${f.name}`, avatar(f, 30)); };
A.openChatWith = el => openChatWith(el.dataset.id);
// match
A.matchMode = el => { U.matchMode = el.dataset.id; if (U.matchMode === 'matches') S.match.newCount = 0; save(); renderView(); renderChrome(); };
A.swipe = el => swipe(el.dataset.id);
A.matchFilters = () => push('matchFilters');
A.mfGenre = el => { const g = el.dataset.id, a = S.match.filters.genres, i = a.indexOf(g); if (i >= 0) a.splice(i, 1); else a.push(g); refreshOv('matchFilters'); };
A.mfDistSet = el => { S.match.filters.dist = +el.dataset.id; refreshOv('matchFilters'); };
A.mfReset = () => { S.match.filters = { genres: [], dist: 100 }; refreshOv('matchFilters'); };
A.matchReset = () => { S.match.passed = []; S.match.liked = S.match.liked.filter(id => S.match.matches.some(m => m.id === id)); save(); renderView(); };
// discussion
A.chatMode = el => { U.chatMode = el.dataset.id; renderView(); };
A.openConv = el => push('chat', { convId: el.dataset.id });
A.newMsg = () => push('newMsg');
A.openCommunity = el => push('community', { id: el.dataset.id });
A.join = el => { const k = comm(el.dataset.id); k.joined = !k.joined; k.members += k.joined ? 1 : -1; save(); if (topOv() && topOv().type === 'more') U.ov.pop(); toast(k.joined ? `Bienvenue dans ${k.name}` : `Tu as quitté ${k.name}`, cover(k, 28, 8)); if (U.ov.some(o => o.type === 'community' && o.id === k.id)) { renderOverlays(); } else renderView(); };
A.likeCPost = el => { const k = comm(el.dataset.k), p = k.posts.find(x => x.id === el.dataset.id); p.likedByMe = !p.likedByMe; save(); updateComm(k); };
A.shareNow = el => { const c = conv(el.dataset.id); if (!P.trackId) { toast('Aucun son en cours', ic('music', 20)); return; } c.msgs.push({ from: 'me', text: '', track: P.trackId, at: Date.now() }); save(); updateMsgs(c); reply(c); };
A.sendTrackTo = el => { const c = conv(el.dataset.id); c.msgs.push({ from: 'me', text: '', track: el.dataset.t, at: Date.now() }); save(); updateMsgs(c); reply(c); };
A.shareNowComm = el => { const k = comm(el.dataset.id); if (!P.trackId) { toast('Aucun son en cours', ic('music', 20)); return; } k.posts.push({ id: uid(), user: S.me.name, me: true, text: '', track: P.trackId, at: Date.now(), likes: 0 }); save(); updateComm(k); commReply(k); };
A.sendTo = el => {
  const o = topOv(), f = FRIENDS.find(x => x.id === el.dataset.id), c = ensureConv(f.id);
  c.msgs.push({ from: 'me', text: '', track: o.track || null, post: o.post || null, at: Date.now() });
  if (o.post) { const p = post(o.post); p.shares++; updatePostDOM(p.id); }
  save(); pop(); toast(`Envoyé à ${f.name}`, avatar(f, 30)); reply(c);
};
A.sendToComm = el => {
  const o = topOv(), k = comm(el.dataset.id);
  k.posts.push({ id: uid(), user: S.me.name, me: true, text: '', track: o.track || null, post: o.post || null, at: Date.now(), likes: 0 });
  if (o.post) { const p = post(o.post); p.shares++; updatePostDOM(p.id); }
  save(); pop(); toast(`Partagé dans ${k.name}`, cover(k, 28, 8)); commReply(k);
};
A.copyLink = el => {
  const what = (el.dataset.id === 'profil') ? '@' + S.me.handle : 'partage';
  const url = 'https://musio.app/' + encodeURIComponent(what);
  const done = ok => { if (topOv() && ['share', 'more'].includes(topOv().type)) pop(); toast(ok ? 'Lien copié' : 'Impossible de copier ici : ' + url, ic('link', 20)); };
  try { navigator.clipboard.writeText(url).then(() => done(true), () => done(false)); } catch (e) { done(false); }
};
// sécurité
A.more = el => push('more', { k: el.dataset.k, id: el.dataset.id });
A.report = el => { if (topOv() && OV[topOv().type].kind === 'sheet') U.ov.pop(); push('report', { k: el.dataset.k, id: el.dataset.id, step: 1 }); };
A.reportReason = el => { const o = topOv(); S.reports.push({ k: o.k, id: o.id, reason: el.dataset.id, at: Date.now() }); o.step = 2; o.reason = el.dataset.id; save(); refreshOv('report'); haptic(); };
A.block = el => {
  const id = el.dataset.id; if (!blocked(id)) S.blocked.push(id);
  S.followed = S.followed.filter(x => x !== id); save();
  U.ov = U.ov.filter(o => !((o.type === 'profile' && o.id === id) || (o.type === 'chat' && conv(o.convId) && conv(o.convId).with === id) || ['report', 'more', 'share'].includes(o.type)));
  renderAll(); toast(`${user(id).name} est bloqué·e`, ic('block', 20));
};
A.unblock = el => { const id = el.dataset.id; S.blocked = S.blocked.filter(x => x !== id); save(); if (topOv() && topOv().type === 'more') U.ov.pop(); renderAll(); toast(`${user(id).name} est débloqué·e`, ic('check', 20)); };
A.deleteConv = el => { const id = el.dataset.id; U.dialogFn = () => { S.convs = S.convs.filter(c => c.id !== id); save(); U.ov = U.ov.filter(o => !(o.type === 'chat' && o.convId === id) && o.type !== 'more'); renderAll(); toast('Conversation supprimée', ic('trash', 20)); }; push('dialog', { title: 'Supprimer la conversation ?', text: 'Elle sera supprimée de ton appareil uniquement.', ok: 'Supprimer', danger: true }); };
A.legal = el => push('legal', { id: el.dataset.id });
A.openBlocked = () => push('blockedList');
A.openConsents = () => push('consents');
A.consentAll = el => { const v = el.dataset.id === '1'; Object.assign(S.consents, { reco: v, audience: v, ads: v, at: Date.now() }); save(); refreshOv('consents'); toast(v ? 'Tout est accepté' : 'Tout est refusé', ic('cookie', 20)); };
A.openMyData = () => push('myData');
A.exportData = () => { const data = JSON.stringify({ profil: { nom: S.me.name, utilisateur: S.me.handle, bio: S.me.bio }, consentements: S.consents, abonnements: S.followed, titresLikes: S.likedTracks, publications: S.posts.filter(p => p.author === 'me').map(p => ({ legende: p.caption, son: T(p.trackId).title, date: p.at })), playlists: S.playlists, messages: S.convs.map(c => ({ avec: user(c.with).name, messages: c.msgs.map(m => ({ de: m.from === 'me' ? 'moi' : user(m.from).name, texte: m.text, date: m.at })) })) }, null, 2); try { navigator.clipboard.writeText(data).then(() => toast('Données copiées (JSON)', ic('copy', 20)), () => toast('Copie impossible ici', ic('info', 20))); } catch (e) { toast('Copie impossible ici', ic('info', 20)); } };
A.deleteAccount = () => { U.dialogFn = () => doReset(true); push('dialog', { title: 'Supprimer ton compte ?', text: 'Ton profil, tes publications, messages, likes et réglages seront effacés de cet appareil. Cette action est définitive.', ok: 'Supprimer', danger: true }); };
// compte & réglages
A.profTab = el => { const o = U.ov.slice().reverse().find(x => x.type === 'profile'); if (o) { o.tab = el.dataset.id; refreshOv('profile'); } };
CH.banner = async el => {
  const f = el.files && el.files[0]; el.value = ''; if (!f) return;
  try { S.me.banner = await readImage(f, 1500, 0.82); save(); } catch (e) { toast('Impossible de lire cette image', ic('info', 20)); return; }
  if (U.tab === 'account') renderView(); refreshOv('editProfile'); toast('Bannière mise à jour', ic('image', 20));
};
A.removeBanner = () => { S.me.banner = null; save(); if (U.tab === 'account') renderView(); refreshOv('editProfile'); toast('Bannière retirée', ic('trash', 18)); };
A.accTab = el => { U.accTab = el.dataset.id; renderView(); };
A.openSettings = () => push('settings');
A.editProfile = () => push('editProfile');
A.removePhoto = () => { S.me.photo = null; save(); refreshOv('editProfile'); renderChrome(); };
A.meColor = el => { S.me.color = el.dataset.id; $$('[data-a="meColor"]').forEach(b => { b.classList.toggle('on', b === el); b.setAttribute('aria-pressed', b === el); }); const av = $('#pfAv .av'); if (av) av.style.background = S.me.color; save(); renderChrome(); };
A.accent = el => { S.settings.accent = el.dataset.id; applyTheme(); save(); refreshOv('settings'); };
A.sw = el => {
  const k = el.dataset.k, v = !getK(k); setK(k, v);
  if (k.indexOf('consents.') === 0) S.consents.at = Date.now();
  save();
  if (k === 'settings.orbs') applyTheme();
  if (k === 'settings.private') toast(v ? 'Compte privé : tu choisis qui te suit' : 'Compte public', ic('lock', 20));
  if (k === 'settings.shareListening') toast(v ? 'Ton écoute est visible sur la Map' : 'Mode fantôme activé', ic(v ? 'eye' : 'ghost', 20));
  el.setAttribute('aria-checked', v); const s = $('.sw', el); if (s) s.classList.toggle('on', v); haptic(5);
};
A.setOpt = el => { S.settings[el.dataset.k] = el.dataset.id; save(); refreshOv('settings'); };
A.about = () => push('about');
A.reset = () => { U.dialogFn = () => doReset(false); push('dialog', { title: 'Réinitialiser la démo ?', text: 'Tes publications, messages, likes, matchs et réglages seront effacés sur cet appareil.', ok: 'Réinitialiser', danger: true }); };
A.dialogOk = () => { const fn = U.dialogFn; U.dialogFn = null; pop(); if (fn) fn(); };
A.replayOnboarding = () => { U.ob = { step: 0, name: S.me.name === 'Toi' ? '' : S.me.name, handle: S.me.handle === 'toi' ? '' : S.me.handle, genres: S.prefs.genres.slice(), age: true, terms: true }; push('onboarding'); };
function doReset(account) {
  try { localStorage.removeItem(KEY); } catch (e) {}
  E.pause(); S = fresh(); FRIENDS = clone(D.friends);
  Object.assign(P, { trackId: null, queue: [], qi: 0, shuffle: false, repeat: 'off', lyrics: false, source: '', post: null });
  Object.assign(U, { tab: 'feed', feedMode: 'foryou', ov: [], activePost: null, typing: {}, mapT: null, sleepAt: null, sleepEnd: false });
  applyTheme(); renderAll(); startOnboarding();
  toast(account ? 'Compte supprimé' : 'Démo réinitialisée', ic('check', 20));
}
// accueil
function startOnboarding() { U.ob = { step: 0, name: '', handle: '', genres: [], age: false, terms: false }; push('onboarding'); }
A.obStep = el => { const to = +el.dataset.id; if (typeof U.ob.step === 'string') { U.ob.step = 0; U.ob.err = ''; refreshOv('onboarding'); return; } if (U.ob.step === 1 && to === 2 && !U.ob.name.trim()) { toast('Choisis un nom pour ton profil', ic('info', 20)); const i = $('#obName'); if (i) i.focus(); return; } U.ob.step = to; refreshOv('onboarding'); const s = $('.obs .ob'); if (s) s.scrollTop = 0; };
A.obGenre = el => { const g = el.dataset.id, a = U.ob.genres, i = a.indexOf(g); if (i >= 0) a.splice(i, 1); else { a.push(g); haptic(); } refreshOv('onboarding'); };
A.obCheck = el => { U.ob[el.dataset.id] = !U.ob[el.dataset.id]; haptic(); refreshOv('onboarding'); };
A.obFinish = () => {
  const o = U.ob; if (!o.age || !o.terms) return;
  if (window.MUSIO_CLOUD && typeof cloudFinish === 'function') return cloudFinish();
  S.me.name = o.name.trim().slice(0, 30);
  S.me.handle = (o.handle.trim() || o.name.trim() || 'musio').replace(/^@/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.]+/g, '.').toLowerCase().slice(0, 24) || 'musio';
  S.prefs.genres = o.genres.slice(); S.consents.at = Date.now(); S.onboarded = true; save();
  U.ov = []; renderAll(); toast(`Bienvenue sur Musio, ${S.me.name}`, avatar(user('me'), 30)); haptic(20);
};
// création
A.create = () => { const t = T(P.trackId || 't1'); U.create = { step: 1, src: 'viz', style: 'waves', photos: [], video: null, trackId: t.id, start: Math.min(30, Math.max(0, t.dur - 30)), len: 30, caption: '', texts: [], filter: 'normal', tool: 'filters', sel: null, comments: true, vis: 'Public' }; popToScreen(); push('create'); };
A.createSrc = el => { U.create.src = el.dataset.id; refreshOv('create'); };
A.createStyle = el => { U.create.style = el.dataset.id; refreshOv('create'); };
A.createNext = () => { const c = U.create; if (c.step === 1 && ((c.src === 'photos' && !c.photos.length) || (c.src === 'video' && !c.video))) return; c.step = Math.min(4, c.step + 1); if (c.step === 2 || c.step === 3) playTrack(c.trackId, { queue: [c.trackId], at: c.start, source: 'Création' }); refreshOv('create'); };
A.createPrev = () => { U.create.step = Math.max(1, U.create.step - 1); refreshOv('create'); };
A.createGo = el => { U.create.step = +el.dataset.id; refreshOv('create'); };
A.createTrack = el => { const c = U.create, t = T(el.dataset.id); c.trackId = t.id; c.start = Math.min(c.start, Math.max(0, t.dur - c.len)); c.texts.forEach(l => { if (l.style === 'track') l.track = t.id; }); playTrack(t.id, { queue: [t.id], at: c.start, source: 'Création' }); refreshOv('create'); };
A.createLen = el => { const c = U.create, t = T(c.trackId); c.len = +el.dataset.id; c.start = Math.min(c.start, Math.max(0, t.dur - c.len)); refreshOv('create'); };
A.createTool = el => {
  const c = U.create, k = el.dataset.id;
  if (k === 'text') { A.textEdit({ dataset: {} }); return; }
  if (k === 'sticker') { const ex = c.texts.find(l => l.style === 'track'); if (ex) { c.texts = c.texts.filter(l => l !== ex); c.sel = null; } else { const l = { id: uid(), style: 'track', track: c.trackId, x: 50, y: 18 }; c.texts.push(l); c.sel = l.id; c.tool = 'text'; } refreshOv('create'); return; }
  c.tool = k; refreshOv('create');
};
A.createFilter = el => { U.create.filter = el.dataset.id; refreshOv('create'); };
A.createVis = el => { U.create.vis = el.dataset.id; refreshOv('create'); };
A.photoDel = el => { U.create.photos.splice(+el.dataset.id, 1); refreshOv('create'); };
A.textEdit = el => { const c = U.create, id = el.dataset && el.dataset.id; const l = id && c.texts.find(x => x.id === id); U.te = l ? { text: l.text, style: l.style, color: l.color } : { text: '', style: 'display', color: '#FFFFFF' }; push('textEdit', { id: l ? l.id : null }); };
A.teStyle = el => { U.te.style = el.dataset.id; refreshOv('textEdit'); };
A.teColor = el => { U.te.color = el.dataset.id; refreshOv('textEdit'); };
A.teSave = () => {
  const c = U.create, o = topOv(), te = U.te, txt = (te.text || '').trim();
  if (o.id) { const l = c.texts.find(x => x.id === o.id); if (l) { if (txt) Object.assign(l, { text: txt, style: te.style, color: te.color }); else c.texts = c.texts.filter(x => x !== l); } }
  else if (txt) { const l = { id: uid(), text: txt, style: te.style, color: te.color, x: 50, y: 42 }; c.texts.push(l); c.sel = l.id; }
  c.tool = 'text'; pop(); refreshOv('create');
};
A.layerDel = el => { const c = U.create; c.texts = c.texts.filter(x => x.id !== el.dataset.id); c.sel = null; if (topOv() && topOv().type === 'textEdit') U.ov.pop(); renderOverlays(); };
A.publish = () => {
  const c = U.create;
  const p = { id: 'my' + uid(), author: 'me', trackId: c.trackId, start: c.start, len: c.len, style: c.style, video: c.src === 'video' ? c.video : null, photos: c.src === 'photos' ? c.photos.slice() : null, filter: c.filter, texts: clone(c.texts), caption: c.caption.trim() || 'Nouveau son en écoute', likes: 0, views: 0, commentsBase: 0, shares: 0, comments: [], allowComments: c.comments, vis: c.vis, at: Date.now() };
  S.posts.unshift(p); save(); U.create = null; U.ov = [];
  if (p.vis === 'Moi seulement') { U.tab = 'account'; U.accTab = 'posts'; renderAll(); toast('Publié, visible seulement par toi', ic('lock', 20)); return; }
  U.tab = 'feed'; U.feedMode = 'foryou'; U.activePost = p.id;
  renderAll(); setActivePost(p.id, true); toast('Ta publication est en ligne', ic('check', 20)); haptic(20);
  // pas de faux likes ni de fausses vues : les chiffres viendront des vrais utilisateurs
};

// ---------- formulaires & saisies ----------
FORMS.send = f => { const i = $('#chatInput'), txt = i.value.trim(); if (!txt) return; const c = conv(f.dataset.id); c.msgs.push({ from: 'me', text: txt, at: Date.now() }); i.value = ''; save(); updateMsgs(c); reply(c); };
FORMS.cpost = f => { const i = $('#cpIn'), txt = i.value.trim(); if (!txt) return; const k = comm(f.dataset.id); k.posts.push({ id: uid(), user: S.me.name, me: true, text: txt, at: Date.now(), likes: 0 }); i.value = ''; save(); updateComm(k); commReply(k); };
FORMS.comment = f => { const i = $('#cmtIn'), txt = i.value.trim(); if (!txt) return; const p = post(f.dataset.id); p.comments.unshift({ user: 'me', text: txt, likes: 0, at: Date.now() }); save(); refreshOv('comments'); updatePostDOM(p.id); };
FORMS.profile = () => {
  S.me.name = $('#pfName').value.trim() || 'Toi';
  S.me.handle = ($('#pfHandle').value.trim().replace(/^@/, '').replace(/\s+/g, '.').toLowerCase()) || 'toi';
  S.me.bio = $('#pfBio').value.trim(); save(); pop(); refreshOv('settings'); renderChrome(); toast('Profil mis à jour', ic('check', 20));
};
FORMS.prompt = () => { const v = ($('#promptIn').value || '').trim(); if (!v) return; const fn = U.promptFn; U.promptFn = null; pop(); if (fn) fn(v); };
IN.search = el => { U.search.q = el.value; const r = $('#results'); if (r) r.innerHTML = searchResults(); };
IN.followQ = el => { const o = topOv(); if (!o || o.type !== 'follows') return; o.q = el.value; const d = followData(o.id), list = o.k === 'followers' ? d.followers : d.following, q = el.value.toLowerCase(); const box = $('#followList'); if (box) box.innerHTML = followRows(list.filter(x => !q || (x.name + ' ' + (x.handle || '')).toLowerCase().includes(q))); };
IN.chatQ = el => { U.chatQ = el.value; const l = $('#chatList'); if (l) l.innerHTML = chatListHTML(); };
IN.caption = el => { if (U.create) U.create.caption = el.value; };
IN.teText = el => { U.te.text = el.value; const p = $('#tePrev .tl'); if (p) p.textContent = el.value || 'Ton texte'; };
IN.obName = el => { U.ob.name = el.value; };
IN.obHandle = el => { U.ob.handle = el.value; };
IN.blur = el => { S.settings.blur = +el.value; applyTheme(); const v = $('#blurV'); if (v) v.textContent = el.value + ' px'; save(); };
IN.volume = el => { S.settings.volume = +el.value; E.setVolume(+el.value / 100); const v = $('#volV'); if (v) v.textContent = el.value + ' %'; save(); };
IN.mfDist = el => { S.match.filters.dist = +el.value; const v = $('#mfDistV'); if (v) v.textContent = distLabel(+el.value); };
CH.video = el => { const f = el.files && el.files[0]; if (!f) return; U.create.video = URL.createObjectURL(f); U.create.videoFile = f; refreshOv('create'); toast('Vidéo importée', ic('video', 20)); };
CH.photos = async el => {
  const files = Array.from(el.files || []).slice(0, 10 - U.create.photos.length); if (!files.length) return;
  toast(`Import de ${files.length} photo${files.length > 1 ? 's' : ''}…`, ic('photos', 20));
  for (const f of files) { try { U.create.photos.push(await readImage(f, 1080, 0.82)); } catch (e) { toast('Une photo n’a pas pu être lue', ic('info', 20)); } }
  refreshOv('create');
};
// ---------- import de ta propre musique ----------
const AUDIO_EXT = /\.(mp3|m4a|aac|wav|aiff?|ogg|oga|opus|flac|webm|mp4|m4v|mov)$/i;
// lit le titre, l’artiste, l’album et la pochette inscrits dans le fichier (ID3, MP4…)
function readTags(f) {
  return new Promise(res => {
    if (!window.jsmediatags) return res({});
    let done = false; const fin = v => { if (!done) { done = true; res(v || {}); } };
    setTimeout(() => fin({}), 5000);
    try { window.jsmediatags.read(f, { onSuccess: r => fin(r && r.tags), onError: () => fin({}) }); } catch (e) { fin({}); }
  });
}
async function importAudioFile(f, forced) {
  if (!f) return null;
  if (!/^(audio|video)\//.test(f.type) && !AUDIO_EXT.test(f.name)) { toast(`« ${f.name} » n’est pas un fichier audio`, ic('info', 20)); return null; }
  if (f.size > 80 * 1024 * 1024) { toast(`« ${f.name} » est trop lourd (80 Mo max)`, ic('info', 20)); return null; }
  const url = URL.createObjectURL(f);
  const dur = await new Promise(res => { const a = document.createElement(/^video/.test(f.type) ? 'video' : 'audio'); let done = false; const fin = v => { if (!done) { done = true; res(v); } }; a.preload = 'metadata'; a.muted = true; a.onloadedmetadata = () => fin(a.duration); a.onerror = () => fin(NaN); a.src = url; setTimeout(() => fin(NaN), 8000); });
  if (!isFinite(dur) || dur < 1) { URL.revokeObjectURL(url); toast(`« ${f.name} » ne peut pas être lu ici`, ic('info', 20)); return null; }
  let title = f.name.replace(/\.[^.]+$/, '').replace(/_+/g, ' ').replace(/^\d{1,3}[\s.-]+/, '').trim() || 'Mon son', artist = S.me.name, genre = 'Import', album = '';
  const m = title.match(/^(.+?)\s+[-–]\s+(.+)$/); if (m) { artist = m[1]; title = m[2]; }
  const tags = forced ? {} : await readTags(f);
  if (tags.title) title = String(tags.title); if (tags.artist) artist = String(tags.artist); if (tags.album) album = String(tags.album);
  if (tags.genre && typeof tags.genre === 'string' && tags.genre.length < 24 && !/^\(\d+\)$/.test(tags.genre)) genre = tags.genre;
  if (forced) { title = forced; artist = S.me.name; genre = 'Son original'; }
  const ref = pick(D.tracks), id = 'up' + uid();
  const t = { id, file: true, mine: true, title: title.slice(0, 60), artist: artist.slice(0, 40), album: album.slice(0, 60), genre, bpm: 100, root: 48, dur: Math.max(1, Math.floor(dur)), color: ref.color, c2: ref.c2, shape: ref.shape, at: Date.now() };
  // pochette intégrée au fichier
  const pic = tags.picture;
  if (pic && pic.data && pic.data.length > 100) {
    try { const blob = new Blob([new Uint8Array(pic.data)], { type: pic.format && pic.format.indexOf('/') > 0 ? pic.format : 'image/jpeg' }); S.trackArt[id] = await readImage(blob, 640, 0.85, true); } catch (e) {}
  }
  AUDIO_SRC[id] = url; S.myTracks.unshift(t); save();
  IDB.put(id, f).catch(() => toast('Stockage indisponible : ce son disparaîtra à la fermeture', ic('info', 20)));
  return t;
}
async function importMany(files, opts = {}) {
  files = Array.from(files || []); if (!files.length) return [];
  if (files.length > 1) toast(`Import de ${files.length} fichiers…`, ic('upload', 20));
  const out = []; for (const f of files) { const t = await importAudioFile(f); if (t) out.push(t); }
  if (!out.length) return out;
  S.myTracks = out.concat(S.myTracks.filter(t => !out.includes(t))); save();
  if (!opts.stay) { U.accTab = 'sounds'; if (U.tab === 'account' && !hasScreen()) renderView(); }
  if (out.length === 1 && !opts.quiet) push('trackEdit', { id: out[0].id, fresh: true });
  else if (out.length > 1) toast(`${out.length} sons importés`, cover(out[0], 30, 7), () => { U.tab = 'account'; U.accTab = 'sounds'; U.ov = []; renderAll(); });
  else toast('Son importé', cover(out[0], 30, 7));
  refreshArt();
  return out;
}
CH.importAudio = async el => { const fs = Array.from(el.files || []); el.value = ''; await importMany(fs); };
A.playMine = el => { const ids = S.myTracks.map(t => t.id); if (!ids.length) return; const q = el.dataset.id === 'shuffle' ? ids.slice().sort(() => Math.random() - .5) : ids; P.shuffle = false; playTrack(q[0], { queue: q, source: 'Mes sons' }); };
// glisser-déposer des fichiers audio n’importe où dans l’app (ordinateur)
let dragN = 0;
const hasFiles = e => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
document.addEventListener('dragenter', e => { if (!hasFiles(e) || U.create) return; e.preventDefault(); dragN++; $('#app').classList.add('drop-on'); });
document.addEventListener('dragover', e => { if (!hasFiles(e) || U.create) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
document.addEventListener('dragleave', e => { if (!hasFiles(e) || U.create) return; dragN = Math.max(0, dragN - 1); if (!dragN) $('#app').classList.remove('drop-on'); });
document.addEventListener('drop', e => {
  if (!hasFiles(e) || U.create) return; e.preventDefault(); dragN = 0; $('#app').classList.remove('drop-on');
  const fs = Array.from(e.dataTransfer.files || []).filter(f => /^(audio|video)\//.test(f.type) || AUDIO_EXT.test(f.name));
  if (!fs.length) { toast('Dépose des fichiers audio (MP3, M4A, WAV…)', ic('info', 20)); return; }
  if (!S.onboarded) return; importMany(fs);
});
CH.importAudioCreate = async el => {
  const f = el.files && el.files[0]; el.value = ''; const t = await importAudioFile(f); if (!t) return;
  A.createTrack({ dataset: { id: t.id } }); toast('Son importé et ajouté à ta vidéo', cover(t, 30, 7));
};
A.origSound = async () => {
  const c = U.create; if (!c || !c.videoFile) { toast('Importe d’abord une vidéo', ic('video', 20)); return; }
  const ex = S.myTracks.find(t => t.srcName === c.videoFile.name + c.videoFile.size);
  const t = ex || await importAudioFile(c.videoFile, 'Son original'); if (!t) return;
  t.srcName = c.videoFile.name + c.videoFile.size; save();
  c.start = 0; A.createTrack({ dataset: { id: t.id } }); toast('Le son de ta vidéo est utilisé', ic('video', 20));
};
FORMS.trackEdit = f => {
  const t = T(f.dataset.id); if (!t) return;
  t.title = ($('#teTitle').value || '').trim().slice(0, 60) || t.title; t.artist = ($('#teArtist').value || '').trim().slice(0, 40) || S.me.name;
  save(); pop(); refreshArt(); toast('Son enregistré', cover(t, 30, 7));
};
A.delTrack = el => {
  const id = el.dataset.id, t = T(id); if (!t) return;
  if (P.trackId === id) { E.pause(); P.trackId = null; }
  P.queue = P.queue.filter(x => x !== id); S.likedTracks = S.likedTracks.filter(x => x !== id); S.playlists.forEach(pl => pl.tracks = pl.tracks.filter(x => x !== id));
  S.myTracks = S.myTracks.filter(x => x.id !== id); delete S.trackArt[id]; IDB.del(id).catch(() => {});
  if (AUDIO_SRC[id]) { URL.revokeObjectURL(AUDIO_SRC[id]); delete AUDIO_SRC[id]; }
  save(); U.ov = U.ov.filter(o => o.type !== 'trackEdit' && o.type !== 'playerMore' && o.type !== 'player'); renderAll(); toast('Son supprimé', ic('trash', 18));
};
A.editTrack = el => push('trackEdit', { id: el.dataset.id });
window.addEventListener('engine-missing', () => toast('Fichier introuvable sur cet appareil : réimporte ce son', ic('info', 20)));
window.addEventListener('engine-state', () => refreshPlaying(false));
// ---------- échos (republier avec un mot, une réaction ou un GIF) ----------
A.echo = el => { const id = el.dataset.id, ex = myEcho(id); U.echoDraft = { text: ex ? ex.text : '', react: ex ? ex.react : null, img: ex ? ex.img : null }; push('echo', { id }); };
IN.echoText = el => { U.echoDraft.text = el.value; };
A.echoReact = el => { const k = el.dataset.id; U.echoDraft.react = U.echoDraft.react === k ? null : k; U.echoDraft.img = null; keepEchoText(); refreshOv('echo'); };
A.echoClear = () => { U.echoDraft.react = null; U.echoDraft.img = null; keepEchoText(); refreshOv('echo'); };
const keepEchoText = () => { const i = $('#echoIn'); if (i) U.echoDraft.text = i.value; };
CH.echoImg = el => {
  const f = el.files && el.files[0]; el.value = ''; if (!f) return; keepEchoText();
  const done = src => { U.echoDraft.img = src; U.echoDraft.react = null; refreshOv('echo'); };
  if (f.type === 'image/gif') { if (f.size > 2.5 * 1024 * 1024) { toast('GIF trop lourd (2,5 Mo max)', ic('info', 20)); return; } const r = new FileReader(); r.onload = () => done(r.result); r.readAsDataURL(f); }
  else readImage(f, 480, 0.82).then(done).catch(() => toast('Impossible de lire cette image', ic('info', 20)));
};
A.echoGo = el => {
  const id = el.dataset.id, p = post(id); if (!p) return; keepEchoText(); const d = U.echoDraft, ex = myEcho(id);
  if (ex) Object.assign(ex, { text: d.text.trim(), react: d.react, img: d.img, at: Date.now() });
  else S.echoes.unshift({ id: 'e' + uid(), post: id, by: 'me', text: d.text.trim(), react: d.react, img: d.img, at: Date.now() });
  save(); pop(); updatePostDOM(id); toast(ex ? 'Écho mis à jour' : 'Tu as fait écho à cette publication', ic('echo', 20));
  if (U.tab === 'account' || (U.tab === 'feed' && !ex)) setTimeout(() => { if (!hasScreen()) renderView(); }, 300);
};
A.echoUndo = el => { const id = el.dataset.id; S.echoes = S.echoes.filter(e => !(e.post === id && e.by === 'me')); save(); pop(); updatePostDOM(id); toast('Écho retiré', ic('echo', 20)); if (U.tab === 'account') renderView(); };
CH.trackArt = async el => {
  const f = el.files && el.files[0], id = el.dataset.id; if (!f || !T(id)) return;
  try { S.trackArt[id] = await readImage(f, 640, 0.85, true); save(); } catch (e) { toast('Impossible de lire cette image', ic('info', 20)); return; }
  refreshArt(); toast('Image du titre mise à jour', cover(T(id), 30, 7));
};
A.removeArt = el => { delete S.trackArt[el.dataset.id]; save(); refreshArt(); toast('Image retirée', ic('trash', 18)); };
function refreshArt() { renderView(); renderMini(); renderSide(); ['player', 'playerMore', 'queue', 'playlist', 'profile', 'search'].forEach(refreshOv); }
CH.avatar = async el => {
  const f = el.files && el.files[0]; if (!f) return;
  try { S.me.photo = await readImage(f, 360, 0.86, true); save(); } catch (e) { toast('Impossible de lire cette image', ic('info', 20)); return; }
  const av = $('#pfAv .av'); if (av) av.innerHTML = `<img src="${S.me.photo}" alt="">`;
  renderChrome(); refreshOv('editProfile'); toast('Photo de profil mise à jour', avatar(user('me'), 30));
};
CH.searchCommit = el => { const q = el.value.trim(); if (!q) return; S.recent = [q].concat(S.recent.filter(r => r !== q)).slice(0, 6); save(); };

// ================= VISUELS ANIMÉS =================
function rgb(h) { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); }
function drawViz(cv, now) {
  const r = cv.getBoundingClientRect(); if (r.width === 0 || r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(r.width * dpr), H = Math.round(r.height * dpr);
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const x = cv.getContext('2d'), t = T(cv.dataset.track); if (!t) return;
  const [cr, cg, cb] = rgb(t.color), col = a => `rgba(${cr},${cg},${cb},${a})`;
  const lv = P.trackId === t.id ? E.levels() : null, s = now / 1000;
  const bass = lv ? (lv[1] + lv[2] + lv[3]) / 765 : 0.3 + 0.12 * Math.sin(s * 1.7);
  const mid = lv ? (lv[10] + lv[16] + lv[24]) / 765 : 0.25 + 0.1 * Math.sin(s * 1.1 + 1);
  x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
  x.fillStyle = '#07060F'; x.fillRect(0, 0, W, H);
  const glow = (cx, cy, rad, c) => { const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, c); g.addColorStop(1, 'rgba(7,6,15,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H); };
  switch (cv.dataset.viz) {
    case 'waves': {
      glow(W * 0.5, H * 0.4, Math.max(W, H) * 0.7, col(0.3 + bass * 0.3));
      for (let k = 0; k < 6; k++) {
        x.beginPath(); const amp = H * (0.03 + 0.08 * bass) * (1 + k * 0.2), yb = H * (0.28 + k * 0.08);
        for (let px = 0; px <= W; px += 8 * dpr) { const y = yb + Math.sin(px / W * Math.PI * (2 + k * 0.6) + s * (1.2 + k * 0.3)) * amp + Math.sin(px / W * 9 + s * 2) * amp * 0.3 * mid; if (px === 0) x.moveTo(px, y); else x.lineTo(px, y); }
        x.strokeStyle = k % 2 ? `rgba(255,255,255,${0.16 + 0.12 * mid})` : col(0.85 - k * 0.1); x.lineWidth = (k % 2 ? 1.5 : 4) * dpr; x.stroke();
      }
      break;
    }
    case 'orbs': {
      x.globalCompositeOperation = 'lighter';
      const cols = [[cr, cg, cb], [124, 92, 255], [46, 197, 255], [255, 92, 138]];
      cols.forEach(([a, b, c], k) => { const ox = W * (0.5 + 0.32 * Math.sin(s * 0.4 + k * 1.7)), oy = H * (0.42 + 0.26 * Math.cos(s * 0.33 + k * 2.1)); glow(ox, oy, Math.min(W, H) * (0.5 + 0.3 * bass + 0.05 * k), `rgba(${a},${b},${c},0.55)`); });
      x.globalCompositeOperation = 'source-over';
      x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 1.5 * dpr; x.beginPath(); x.arc(W / 2, H * 0.42, Math.min(W, H) * (0.2 + 0.05 * bass), 0, Math.PI * 2); x.stroke();
      break;
    }
    case 'grid': {
      const hz = H * 0.5, sr = Math.min(W, H * 0.6) * (0.27 + 0.04 * bass);
      glow(W / 2, hz, Math.max(W, H) * 0.6, col(0.25));
      x.save(); x.beginPath(); x.arc(W / 2, hz, sr, Math.PI, 0); x.closePath(); x.clip();
      x.fillStyle = col(1); x.fillRect(0, hz - sr, W, sr); x.fillStyle = '#07060F';
      for (let i = 0; i < 6; i++) { const hh = (i + 1) * 2.4 * dpr; x.fillRect(W / 2 - sr, hz - i * sr * 0.13 - hh - 2 * dpr, sr * 2, hh); }
      x.restore();
      x.strokeStyle = col(0.75); x.lineWidth = 1.5 * dpr;
      for (let i = -14; i <= 14; i++) { x.beginPath(); x.moveTo(W / 2 + i * W * 0.02, hz); x.lineTo(W / 2 + i * W * 0.28, H); x.stroke(); }
      const sp = (s * (0.5 + bass)) % 1;
      for (let j = 0; j < 12; j++) { const pp = (j + sp) / 12, yy = hz + (H - hz) * pp * pp; x.globalAlpha = pp; x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke(); }
      x.globalAlpha = 1;
      x.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 30; i++) { const sx = (hashN('s' + i) % 1000) / 1000 * W, sy = (hashN('y' + i) % 1000) / 1000 * hz * 0.9; x.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(s + i)); x.fillRect(sx, sy, 2 * dpr, 2 * dpr); }
      x.globalAlpha = 1;
      break;
    }
    case 'particles': {
      glow(W / 2, H * 0.42, Math.max(W, H) * 0.5, col(0.25 + bass * 0.25));
      if (!cv._p) cv._p = [];
      const pts = cv._p, n = 1 + Math.floor(bass * bass * 9);
      for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = (1 + Math.random() * 3 + bass * 6) * dpr; pts.push({ x: W / 2, y: H * 0.42, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, l: 1, c: Math.random() < 0.5 }); }
      const rr = Math.min(W, H) * (0.15 + 0.06 * bass);
      x.fillStyle = col(1); x.beginPath(); x.arc(W / 2, H * 0.42, rr, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#14102A'; x.beginPath(); x.arc(W / 2 + rr * 0.3, H * 0.42 + rr * 0.35, rr * 0.7, 0, Math.PI * 2); x.fill();
      for (let i = pts.length - 1; i >= 0; i--) { const q = pts[i]; q.x += q.vx; q.y += q.vy; q.l -= 0.012; if (q.l <= 0 || q.x < 0 || q.x > W || q.y < 0 || q.y > H) { pts.splice(i, 1); continue; } x.fillStyle = q.c ? col(q.l) : `rgba(255,255,255,${q.l * 0.8})`; x.beginPath(); x.arc(q.x, q.y, (1.5 + 2 * q.l) * dpr, 0, Math.PI * 2); x.fill(); }
      if (pts.length > 600) pts.splice(0, pts.length - 600);
      break;
    }
    default: {
      const cx = W / 2, cy = H * 0.42, R = Math.min(W, H) * 0.22;
      glow(cx, cy, Math.max(W, H) * 0.6, col(0.25 + bass * 0.2));
      x.lineCap = 'round'; x.lineWidth = 3 * dpr;
      for (let i = 0; i < 64; i++) { const v = lv ? lv[(i % 48) + 2] / 255 : 0.3 + 0.25 * Math.sin(s * 3 + i * 0.5) * Math.sin(s * 1.3 + i * 0.17); const a = i / 64 * Math.PI * 2 + s * 0.2, len = R * (0.15 + v * 1.1); x.strokeStyle = i % 2 ? col(0.9) : 'rgba(255,255,255,.7)'; x.beginPath(); x.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); x.lineTo(cx + Math.cos(a) * (R + len), cy + Math.sin(a) * (R + len)); x.stroke(); }
      x.save(); x.translate(cx, cy); x.rotate(s * 0.6);
      x.fillStyle = col(1); x.beginPath(); x.arc(0, 0, R * 0.92, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#14102A'; x.beginPath(); x.arc(R * 0.3, R * 0.25, R * 0.6, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#07060F'; x.beginPath(); x.arc(0, 0, R * 0.08, 0, Math.PI * 2); x.fill(); x.restore();
    }
  }
}
function updateSlides(now) {
  $$('.slides').forEach(sl => {
    const imgs = sl.children; if (imgs.length < 2) return;
    const r = sl.getBoundingClientRect(); if (r.bottom < 0 || r.top > window.innerHeight) return;
    const dur = 60 / (+sl.dataset.bpm || 100) * 8;
    const i = Math.floor(now / 1000 / dur) % imgs.length;
    if (sl.dataset.i !== String(i)) { sl.dataset.i = i; Array.from(imgs).forEach((im, k) => im.classList.toggle('on', k === i)); }
  });
}

// ================= BOUCLE =================
let lastNow = performance.now(), lastSec = -1, saveAcc = 0;
function tick(now) {
  const dt = Math.min(0.25, (now - lastNow) / 1000); lastNow = now;
  try {
    const t = T(P.trackId);
    if (t) {
      const playing = E.isPlaying(); let pos = E.pos();
      if (playing) { S.listenSec += dt; saveAcc += dt; if (saveAcc > 15) { saveAcc = 0; save(); } }
      const pp = P.post && post(P.post);
      if (playing && pp && pp.len && pos >= (pp.start || 0) + pp.len) { E.seek(pp.start || 0); pos = E.pos(); }
      if (playing && pos >= t.dur) { next(true); pos = E.pos(); }
      const pct = Math.min(100, pos / t.dur * 100) + '%';
      if (!U.scrub) { $$('[data-prog]').forEach(el => { el.style.width = pct; }); $$('[data-knob]').forEach(el => { el.style.left = pct; }); }
      if (pp) { const pr = $(`.post[data-post="${pp.id}"] .post-prog i`); if (pr) pr.style.width = clamp((pos - (pp.start || 0)) / (pp.len || t.dur), 0, 1) * 100 + '%'; }
      const sec = Math.floor(pos);
      if (sec !== lastSec && !U.scrub) { lastSec = sec; $$('[data-cur]').forEach(el => { el.textContent = fmt(pos); }); $$('.times span:last-child').forEach(el => { el.textContent = '-' + fmt(t.dur - pos); }); $$('.scrub').forEach(el => el.setAttribute('aria-valuenow', sec)); }
      const ly = $('#lyrics');
      if (ly && t.lyrics) {
        let idx = -1; t.lyrics.forEach(([st], i) => { if (pos >= st) idx = i; });
        if (idx !== U.lastLyric) { U.lastLyric = idx; Array.from(ly.children).forEach((p, i) => p.classList.toggle('cur', i === idx)); const cur = ly.children[idx]; if (cur) ly.scrollTo({ top: cur.offsetTop - ly.clientHeight / 2 + cur.clientHeight / 2, behavior: 'smooth' }); }
      }
    }
    if (U.sleepAt && Date.now() >= U.sleepAt) { U.sleepAt = null; if (E.isPlaying()) { E.pause(); refreshPlaying(false); } toast('Minuterie terminée : lecture en pause', ic('moon', 20)); }
    $$('canvas[data-viz]').forEach(cv => drawViz(cv, now));
    updateSlides(now);
  } catch (e) { console.error(e); }
  requestAnimationFrame(tick);
}

// ================= ÉVÉNEMENTS =================
document.addEventListener('click', e => {
  if (U.suppressClick && Date.now() - U.suppressClick < 350) { e.preventDefault(); e.stopPropagation(); return; }
  const el = e.target.closest('[data-a]');
  if (el) { if (el.disabled) return; const fn = A[el.dataset.a]; if (fn) { if (el.tagName !== 'LABEL') e.preventDefault(); fn(el, e); } return; }
  const p = e.target.closest('.post'); if (p) postTap(p, e);
}, true);
['pointerup', 'touchend', 'keydown'].forEach(ev => document.addEventListener(ev, () => { if (!U.unlocked) unlock(); }, { capture: true, passive: true }));
document.addEventListener('submit', e => { e.preventDefault(); const f = FORMS[e.target.dataset.form]; if (f) f(e.target); });
document.addEventListener('input', e => { const f = IN[e.target.dataset.in]; if (f) f(e.target); });
document.addEventListener('change', e => { const f = CH[e.target.dataset.ch]; if (f) f(e.target); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && U.ov.length) { pop(); return; }
  const sc = e.target.closest && e.target.closest('.scrub');
  if (sc && P.trackId && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); E.seek(E.pos() + (e.key === 'ArrowRight' ? 5 : -5)); }
  if (e.key === ' ' && !/INPUT|TEXTAREA|BUTTON/.test(e.target.tagName) && P.trackId) { e.preventDefault(); togglePlay(); }
});
// barre de progression
function scrubRatio(e) { const r = U.scrub.getBoundingClientRect(); return clamp((e.clientX - r.left) / r.width, 0, 1); }
function scrubMove(e) { const t = T(P.trackId); if (!t) return; const pct = scrubRatio(e) * 100 + '%'; const f = $('.sc-fill', U.scrub), k = $('.sc-knob', U.scrub); if (f) f.style.width = pct; if (k) k.style.left = pct; $$('[data-cur]').forEach(el => { el.textContent = fmt(scrubRatio(e) * t.dur); }); }
document.addEventListener('pointerdown', e => { const sc = e.target.closest('.scrub'); if (!sc || !P.trackId) return; U.scrub = sc; scrubMove(e); });
window.addEventListener('pointermove', e => { if (U.scrub) scrubMove(e); });
window.addEventListener('pointerup', e => { if (!U.scrub) return; const r = scrubRatio(e); U.scrub = null; E.seek(r * T(P.trackId).dur); lastSec = -1; });
// glisser pour fermer (feuilles, lecteur) et bord gauche pour revenir
let G = null;
document.addEventListener('pointerdown', e => {
  const grab = e.target.closest('.grab'), pd = e.target.closest('.pl-drag'), edge = e.target.closest('.edge');
  if (!grab && !pd && !edge) return;
  if (pd && e.target.closest('button,.scrub')) return;
  const el = grab ? grab.closest('.sheet') : e.target.closest('.screen'); if (!el) return;
  G = { el, x: !!edge, start: edge ? e.clientX : e.clientY, d: 0, t: Date.now() };
  el.classList.remove('settle', 'anim'); el.classList.add('dragging');
});
window.addEventListener('pointermove', e => {
  if (!G) return; G.d = Math.max(0, (G.x ? e.clientX : e.clientY) - G.start);
  G.el.style.transform = G.x ? `translateX(${G.d}px)` : `translateY(${G.d}px)`;
});
const endDrag = () => {
  if (!G) return; const g = G; G = null; g.el.classList.remove('dragging'); g.el.classList.add('settle');
  const v = g.d / Math.max(1, Date.now() - g.t);
  if (g.d > 6) U.suppressClick = Date.now();
  if (g.d > 120 || (v > 0.6 && g.d > 40)) { g.el.style.transform = g.x ? 'translateX(105%)' : 'translateY(110%)'; haptic(6); setTimeout(() => pop(), 280); }
  else g.el.style.transform = '';
};
window.addEventListener('pointerup', endDrag); window.addEventListener('pointercancel', endDrag);
// barre d’onglets qui se réduit au défilement
document.addEventListener('scroll', e => {
  const t = e.target; if (!t.classList || !t.classList.contains('scroll') || !t.closest('#view')) return;
  const y = t.scrollTop, last = U.lastScrollY || 0, app = $('#app');
  if (y > last + 8 && y > 90) app.classList.add('tabs-min'); else if (y < last - 8 || y < 40) app.classList.remove('tabs-min');
  U.lastScrollY = y;
}, true);
let rsT; window.addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(() => { lenses(); if (U.tab === 'map' && MAPGL.map) MAPGL.map.resize(); }, 120); });
// effet 3D sur la pochette au survol de la souris (lissé image par image, sans transition CSS)
const tilt = { el: null, tx: 0, ty: 0, x: 0, y: 0, tl: 1, l: 1, tg: 0, g: 0, gx: 50, gy: 50, raf: 0 };
function tiltStep() {
  const t = tilt, k = 0.16;
  t.x += (t.tx - t.x) * k; t.y += (t.ty - t.y) * k; t.l += (t.tl - t.l) * k; t.g += (t.tg - t.g) * k;
  const el = t.el;
  if (el && el.isConnected) {
    el.style.setProperty('--rx', t.x.toFixed(2) + 'deg'); el.style.setProperty('--ry', t.y.toFixed(2) + 'deg');
    el.style.setProperty('--lift', t.l.toFixed(4)); el.style.setProperty('--go', t.g.toFixed(3));
    el.style.setProperty('--gx', t.gx.toFixed(1) + '%'); el.style.setProperty('--gy', t.gy.toFixed(1) + '%');
  }
  const rest = Math.abs(t.tx - t.x) + Math.abs(t.ty - t.y) + Math.abs(t.tl - t.l) * 50 + Math.abs(t.tg - t.g) < 0.02;
  if (rest && t.tx === 0 && t.ty === 0 && t.tl === 1) { if (el) { el.classList.remove('tilting'); ['--rx', '--ry', '--lift', '--go'].forEach(v => el.style.removeProperty(v)); } t.el = null; t.raf = 0; return; }
  t.raf = rest ? 0 : requestAnimationFrame(tiltStep);
}
const tiltKick = () => { if (!tilt.raf) tilt.raf = requestAnimationFrame(tiltStep); };
const untilt = () => { if (!tilt.el) return; tilt.tx = tilt.ty = 0; tilt.tl = 1; tilt.tg = 0; tiltKick(); };
document.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse' || e.buttons) { untilt(); return; }
  const c = e.target.closest && e.target.closest('.bigcover');
  if (!c) { untilt(); return; }
  if (c !== tilt.el) { if (tilt.el) { tilt.el.classList.remove('tilting'); ['--rx', '--ry', '--lift', '--go'].forEach(v => tilt.el.style.removeProperty(v)); } tilt.el = c; tilt.x = tilt.y = 0; tilt.l = 1; tilt.g = 0; c.classList.add('tilting'); }
  const r = c.getBoundingClientRect(), px = clamp((e.clientX - r.left) / r.width, 0, 1), py = clamp((e.clientY - r.top) / r.height, 0, 1);
  tilt.ty = (px - .5) * 14; tilt.tx = (.5 - py) * 14; tilt.tl = 1.03; tilt.tg = 1; tilt.gx = px * 100; tilt.gy = py * 100;
  tiltKick();
}, { passive: true });
document.addEventListener('pointerleave', untilt); window.addEventListener('blur', untilt);

// ================= DÉMARRAGE =================
(S.myTracks || []).forEach(t => IDB.get(t.id).then(b => { if (b) AUDIO_SRC[t.id] = URL.createObjectURL(b); }).catch(() => {}));
if (P.trackId && T(P.trackId)) E.load(T(P.trackId), 0); else P.trackId = null;
if (isDesk() && S.settings.device === 'Ce téléphone') S.settings.device = 'Cet ordinateur';
applyTheme(); renderAll(); requestAnimationFrame(tick);
if (typeof bootAccounts === 'function') bootAccounts(); else if (!S.onboarded) startOnboarding();
window.__echo = { get S() { return S; }, U, P, A, renderAll, push, pop };

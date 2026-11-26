'use strict';
// ================= Musio — surcouches (écrans, feuilles, modales) =================
const head = (title, right, backIcon) => `<div class="sc-head"><button class="icon-btn glass strong" data-a="back" aria-label="Retour">${ic(backIcon || 'back')}</button><h2>${title}</h2>${right || '<span style="width:44px;flex:none"></span>'}</div>`;
const moreBtn = (kind, id) => `<button class="icon-btn glass strong" data-a="more" data-k="${kind}" data-id="${id}" aria-label="Plus d’options">${ic('more')}</button>`;

// ---------- LECTEUR ----------
// ---------- fond du lecteur : couleurs tirées de la pochette ----------
const ART_TONE = {};
function artTone(t) {
  const src = t && S.trackArt && S.trackArt[t.id]; if (!src) return null;
  const e = ART_TONE[t.id];
  if (e && e.src === src) return e.cols;
  ART_TONE[t.id] = { src, cols: null };
  extractTone(src).then(cols => {
    const x = ART_TONE[t.id]; if (!x || x.src !== src || !cols) return; x.cols = cols;
    if (P.trackId === t.id) { const bg = $('#overlays .pl-bg'); if (bg) { bg.style.setProperty('--tc', cols[0]); bg.style.setProperty('--tc2', cols[1]); bg.style.setProperty('--tc3', cols[2]); } }
  }).catch(() => {});
  return null;
}
function extractTone(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onerror = rej;
    img.onload = () => {
      const N = 40, cv = document.createElement('canvas'); cv.width = cv.height = N;
      const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0, N, N);
      let px; try { px = cx.getImageData(0, 0, N, N).data; } catch (e) { return rej(e); }
      const bins = new Map();
      for (let i = 0; i < px.length; i += 4) {
        const r = px[i], g = px[i + 1], b = px[i + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const l = (mx + mn) / 510, sat = mx === mn ? 0 : (mx - mn) / (255 - Math.abs(mx + mn - 255));
        let w = 1 + 1.6 * sat; if (l < 0.07 || l > 0.94) w *= 0.12;
        const k = (r >> 5) << 6 | (g >> 5) << 3 | (b >> 5), o = bins.get(k) || { w: 0, r: 0, g: 0, b: 0 };
        o.w += w; o.r += r * w; o.g += g * w; o.b += b * w; bins.set(k, o);
      }
      const list = [...bins.values()].map(o => [o.r / o.w, o.g / o.w, o.b / o.w, o.w]).sort((a, b) => b[3] - a[3]);
      const far = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > 70;
      const out = [list[0]];
      for (const c of list) { if (out.length === 3) break; if (out.every(o => far(o, c)) && c[3] > list[0][3] * 0.08) out.push(c); }
      while (out.length < 3) out.push(out[out.length - 1]);
      res(out.map(toneHex));
    };
    img.src = src;
  });
}
// garde la teinte de la pochette mais une luminosité qui reste lisible sous le texte blanc
function toneHex([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let h = 0, s = 0, l = (mx + mn) / 2;
  if (d) { s = d / (1 - Math.abs(2 * l - 1)); h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  l = Math.min(0.56, Math.max(0.3, l)); s = Math.min(0.85, s * 1.15);
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  const [R, G, B] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + [R, G, B].map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}
OV.player = {
  kind: 'screen', up: true, label: 'Lecture en cours',
  html: () => {
    const t = T(P.trackId); if (!t) return '';
    const liked = S.likedTracks.includes(t.id), rep = P.repeat;
    const tn = artTone(t) || [t.color, t.c2 || t.color, t.color];
    return `<div class="pl-bg" style="--tc:${tn[0]};--tc2:${tn[1]};--tc3:${tn[2]}" aria-hidden="true"></div><div class="pl">
      <div class="pl-drag"><div class="pl-handle" aria-hidden="true"></div>
      <div class="pl-top"><button class="icon-btn glass strong" data-a="back" aria-label="Fermer le lecteur">${ic('down')}</button><div class="pl-src"><small>EN LECTURE DEPUIS</small><b>${esc(P.source || 'Ta bibliothèque')}</b></div><button class="icon-btn glass strong" data-a="playerMore" aria-label="Plus d’options">${ic('more')}</button></div></div>
      <div class="pl-main">
      <div class="pl-art ${P.lyrics ? '' : 'pl-drag'} ${E.isPlaying() ? '' : 'paused-cover'}">${P.lyrics ? `<div class="lyrics" id="lyrics">${t.lyrics ? t.lyrics.map(([s, l]) => `<p data-a="seekTo" data-id="${s}">${esc(l)}</p>`).join('') : '<p style="color:var(--t2)">Pas de paroles : ce titre est un instrumental.</p>'}</div>` : bigCover(t)}</div>
      <div class="pl-side">
      <div class="pl-card glass strong lens">
        <div class="pl-title"><div style="min-width:0"><h2>${esc(t.title)}</h2><button class="t2" data-a="openArtist" data-id="${esc(t.artist)}">${esc(t.artist)}</button></div><button class="icon-btn glass ${liked ? 'liked-ic' : ''}" data-a="likeTrack" data-id="${t.id}" aria-pressed="${liked}" aria-label="Favori">${liked ? icf('heart', 22) : ic('heart', 22)}</button></div>
        <div class="scrub" role="slider" tabindex="0" aria-label="Position dans le titre" aria-valuemin="0" aria-valuemax="${t.dur}"><div class="sc-track"><i class="sc-fill" data-prog></i><i class="sc-knob" data-knob></i></div></div>
        <div class="times"><span data-cur>${fmt(E.pos())}</span><span>-${fmt(t.dur - E.pos())}</span></div>
        <div class="ctrls">
          <button class="icon-btn ${P.shuffle ? 'on' : 'dim'}" data-a="shuffle" aria-pressed="${P.shuffle}" aria-label="Lecture aléatoire">${ic('shuffle')}</button>
          <button class="icon-btn" style="width:54px;height:54px" data-a="prev" aria-label="Précédent">${icf('prev', 30)}</button>
          <button class="play-big" data-a="pp" data-pp="32" aria-label="Lecture / pause">${icf(E.isPlaying() ? 'pause' : 'play', 32)}</button>
          <button class="icon-btn" style="width:54px;height:54px" data-a="next" aria-label="Suivant">${icf('next', 30)}</button>
          <button class="icon-btn rep ${rep !== 'off' ? 'on' : 'dim'}" data-a="repeat" aria-label="Répéter : ${rep === 'off' ? 'désactivé' : rep === 'all' ? 'tout' : 'ce titre'}">${ic('repeat')}${rep === 'one' ? '<sup>1</sup>' : ''}</button>
        </div>
      </div>
      <div class="pl-actions glass strong lens"><button class="pill ${P.lyrics ? 'on' : ''}" data-a="lyrics" aria-pressed="${P.lyrics}">${ic('lyrics', 18)}Paroles</button><button class="pill" data-a="devices">${ic(devIcon(), 18)}${esc(S.settings.device)}</button><button class="pill" data-a="queue" aria-label="File d’attente">${ic('queue', 18)}File</button></div>
      </div></div>
    </div>`;
  },
  after: () => { U.lastLyric = -1; },
};
OV.queue = {
  kind: 'sheet', label: 'File d’attente',
  html: () => `<h2>File d’attente</h2><div class="list">${P.queue.map((id, i) => { const t = T(id); return `<div class="li ${i === P.qi ? 'sel' : ''}"><button class="grow row" data-a="jumpQ" data-id="${i}">${cover(t, 44, 12)}<span class="tt"><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></span>${i === P.qi ? eqHTML(E.isPlaying()) : ''}</button>${i !== P.qi ? `<button class="icon-btn sm" data-a="removeQ" data-id="${i}" aria-label="Retirer ${esc(t.title)}">${ic('close', 18)}</button>` : ''}</div>`; }).join('')}</div>
    <p class="result-h">Ajouter à la suite</p><div class="list">${D.tracks.filter(t => !P.queue.includes(t.id)).slice(0, 6).map(t => `<div class="li"><span class="grow row">${cover(t, 40, 12)}<span class="tt"><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></span></span><button class="icon-btn sm glass" data-a="addQ" data-id="${t.id}" aria-label="Ajouter ${esc(t.title)} à la file">${ic('plus', 18)}</button></div>`).join('')}</div>`,
};
OV.devices = {
  kind: 'sheet', label: 'Appareil',
  html: () => `<h2>Écouter sur</h2><div class="list">${[['Ce téléphone', 'phone'], ['Cet ordinateur', 'laptop'], ['Casque sans fil', 'headphones'], ['Enceinte du salon', 'speaker'], ['Voiture', 'car']].map(([n, i]) => `<button class="li ${S.settings.device === n ? 'sel' : ''}" data-a="setDevice" data-id="${n}" aria-pressed="${S.settings.device === n}">${ic(i, 22)}<span class="grow">${n}</span>${S.settings.device === n ? icf('check', 20) : ''}</button>`).join('')}</div>`,
};
OV.playerMore = {
  kind: 'sheet', label: 'Options',
  html: () => { const t = T(P.trackId); const liked = S.likedTracks.includes(t.id); const left = U.sleepAt ? Math.ceil((U.sleepAt - Date.now()) / 60000) + ' min restantes' : U.sleepEnd ? 'à la fin du titre' : '';
    return `<div class="row sh-head">${cover(t, 56, 12)}<span class="tt"><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></span></div><div class="list">
      <button class="li" data-a="likeTrack" data-id="${t.id}">${liked ? `<span class="liked-ic">${icf('heart', 22)}</span>` : ic('heart', 22)}<span class="grow">${liked ? 'Retirer des titres likés' : 'Ajouter aux titres likés'}</span></button>
      <button class="li" data-a="addToPl" data-id="${t.id}">${ic('listplus', 22)}<span class="grow">Ajouter à une playlist</span></button>
      <label class="li">${ic('image', 22)}<span class="grow">${artOf(t) ? 'Changer l’image du titre' : 'Mettre une image au titre'}</span><input type="file" accept="image/*" class="sr" data-ch="trackArt" data-id="${t.id}"></label>
      ${t.mine ? `<button class="li" data-a="editTrack" data-id="${t.id}">${ic('edit', 22)}<span class="grow">Modifier le titre et l’artiste</span></button>` : ''}
      ${artOf(t) ? `<button class="li" data-a="removeArt" data-id="${t.id}">${ic('trash', 22)}<span class="grow">Retirer l’image</span></button>` : ''}
      <button class="li" data-a="shareTrack" data-id="${t.id}">${ic('share', 22)}<span class="grow">Partager à un ami</span></button>
      <button class="li" data-a="openArtist" data-id="${esc(t.artist)}">${ic('user', 22)}<span class="grow">Voir l’artiste</span></button>
      <button class="li" data-a="sleep">${ic('moon', 22)}<span class="grow">Minuterie de sommeil${left ? `<small class="t2" style="display:block">${left}</small>` : ''}</span></button>
      <button class="li" data-a="queue">${ic('queue', 22)}<span class="grow">File d’attente</span></button>
      ${window.MUSIO_CLOUD && (t.cloud || t.cloudId) ? `<button class="li" data-a="copySoundLink" data-id="${t.id}">${ic('link', 22)}<span class="grow">Copier le lien du son</span></button>` : ''}
      ${t.cloud && window.MUSIO_CLOUD && t.ownerId !== S.uid ? `<button class="li danger" data-a="report" data-k="track" data-id="${t.id}">${ic('flag', 22)}<span class="grow">Signaler ce son</span></button>` : ''}
      ${t.cloud && window.MUSIO_CLOUD && (isCreator() || t.ownerId === S.uid) ? `<button class="li danger" data-a="unpublishCloud" data-id="${t.id}">${ic('trash', 22)}<span class="grow">Retirer ce son de Musio${t.ownerId === S.uid ? '' : '<small class="t2" style="display:block">Modération</small>'}</span></button>` : ''}</div>`; },
};
OV.sleep = {
  kind: 'sheet', label: 'Minuterie',
  html: () => `<h2>Minuterie de sommeil</h2><div class="list">${[['5', '5 minutes'], ['15', '15 minutes'], ['30', '30 minutes'], ['60', '1 heure'], ['end', 'Fin du titre'], ['off', 'Désactiver']].map(([v, l]) => `<button class="li" data-a="setSleep" data-id="${v}">${ic(v === 'off' ? 'close' : 'moon', 20)}<span class="grow">${l}</span></button>`).join('')}</div>`,
};
OV.addToPlaylist = {
  kind: 'sheet', label: 'Ajouter à une playlist',
  html: o => `<h2>Ajouter à une playlist</h2><div class="list"><button class="li" data-a="newPlaylist" data-id="${o.track}"><span class="tile-plus" style="width:44px;height:44px">${ic('plus', 20)}</span><span class="grow tt"><b>Nouvelle playlist</b></span></button>${S.playlists.map(pl => { const has = pl.tracks.includes(o.track); return `<button class="li ${has ? 'sel' : ''}" data-a="toggleInPl" data-id="${pl.id}" data-t="${o.track}" aria-pressed="${has}">${cover(pl, 44, 12)}<span class="grow tt"><b>${esc(pl.title)}</b><small>${pl.tracks.length} titre${pl.tracks.length > 1 ? 's' : ''}</small></span>${has ? icf('check', 20) : ic('plus', 20)}</button>`; }).join('')}</div>${S.playlists.length ? '' : '<p class="t2" style="font-size:14px">Tu n’as pas encore de playlist. Crée la première !</p>'}`,
};

// ---------- PARTAGE, COMMENTAIRES, SIGNALEMENT ----------
OV.share = {
  kind: 'sheet', label: 'Partager',
  html: o => { const what = o.track ? `« ${esc(T(o.track).title)} »` : 'cette publication'; const j = allComms().filter(k => k.joined); const p = o.post && post(o.post);
    return `<h2>Partager ${what}</h2><div class="stories">${FRIENDS.filter(f => !blocked(f.id)).map(f => `<button class="story" data-a="sendTo" data-id="${f.id}">${avatar(f, 56)}<span>${esc(f.name)}</span></button>`).join('')}</div>
    ${j.length ? `<p class="result-h">Dans une communauté</p><div class="list">${j.map(k => `<button class="li" data-a="sendToComm" data-id="${k.id}">${cover(k, 40, 12)}<span class="grow">${esc(k.name)}</span>${ic('send', 18)}</button>`).join('')}</div>` : ''}
    <div class="list"><button class="li" data-a="copyLink">${ic('link', 22)}<span class="grow">Copier le lien</span></button>
    ${p && p.author !== 'me' ? `<button class="li" data-a="hidePost" data-id="${p.id}">${ic('eyeoff', 22)}<span class="grow">Pas intéressé·e<small class="t2" style="display:block">Voir moins de publications comme celle-ci</small></span></button><button class="li danger" data-a="report" data-k="post" data-id="${p.id}">${ic('flag', 22)}<span class="grow">Signaler</span></button>` : ''}
    ${p && p.author === 'me' ? `<button class="li danger" data-a="deletePost" data-id="${p.id}">${ic('trash', 22)}<span class="grow">Supprimer ma publication</span></button>` : ''}</div>`; },
};
OV.comments = {
  kind: 'sheet', label: 'Commentaires',
  html: o => { const p = post(o.postId);
    return `<h2>${fmtN(p.commentsBase + p.comments.length)} commentaires</h2><div class="list">${p.comments.filter(c => !blocked(c.user)).map((c, i) => { const u = user(c.user); return `<div class="cmt">${avatar(u, 36)}<div class="grow"><b style="font-size:13px">${esc(u.name)}</b>${verified(u).replace('width="16" height="16"', 'width="14" height="14"')} <small>${c.at ? ago(c.at) : esc(c.ago)}</small><div>${esc(c.text)}</div></div><button class="cmt-like" data-a="likeCmt" data-p="${p.id}" data-id="${i}" aria-pressed="${!!c.liked}" aria-label="J’aime ce commentaire">${c.liked ? `<span class="liked-ic">${icf('heart', 18)}</span>` : ic('heart', 18)}${c.likes + (c.liked ? 1 : 0)}</button></div>`; }).join('') || '<p class="t2">Sois le premier à commenter.</p>'}</div>
    ${p.allowComments === false ? '<p class="t2">Les commentaires sont désactivés pour cette publication.</p>' : `<form class="composer glass strong" data-form="comment" data-id="${p.id}">${avatar(user('me'), 34)}<label class="sr" for="cmtIn">Ajouter un commentaire</label><input id="cmtIn" placeholder="Ajouter un commentaire…" autocomplete="off" enterkeyhint="send" maxlength="300"><button class="send" type="submit" aria-label="Publier le commentaire">${ic('send', 20)}</button></form>`}`; },
};
OV.report = {
  kind: 'sheet', label: 'Signaler',
  html: o => {
    const who = o.k === 'user' ? user(o.id).name : o.k === 'post' ? 'cette publication' : o.k === 'conv' ? 'cette conversation' : 'ce contenu';
    const uid2 = o.k === 'post' ? (post(o.id) || {}).author : o.k === 'conv' ? (conv(o.id) || {}).with : o.k === 'user' ? o.id : null;
    if (o.step === 2) return `<div class="empty" style="padding:10px 0 0">${ic('shield', 44)}<h2>Merci pour ton signalement</h2><p class="t2" style="line-height:1.45">Notre équipe va l’examiner. Tu seras informé·e de la décision. ${o.reason === 'minor' ? 'Si un enfant est en danger immédiat, appelle le 119 ou le 112.' : ''}</p></div>
      <div class="list">${uid2 && uid2 !== 'me' && !blocked(uid2) ? `<button class="li danger" data-a="block" data-id="${uid2}">${ic('block', 22)}<span class="grow">Bloquer ${esc(user(uid2).name)}<small class="t2" style="display:block">Ne plus voir ses contenus ni recevoir ses messages</small></span></button>` : ''}<button class="li" data-a="legal" data-id="safety">${ic('help', 22)}<span class="grow">Sécurité et aide</span>${ic('chevron', 18)}</button></div><button class="btn primary block" data-a="back">Terminé</button>`;
    return `<h2>Signaler ${esc(who)}</h2><p class="t2" style="font-size:14px;margin-top:-6px">Pourquoi ? Ton signalement est anonyme.</p><div class="list">${REPORT_REASONS.map(([k, l]) => `<button class="li" data-a="reportReason" data-id="${k}"><span class="grow">${l}</span>${ic('chevron', 18)}</button>`).join('')}</div>`;
  },
};
OV.more = {
  kind: 'sheet', label: 'Options',
  html: o => {
    if (o.k === 'user') { const u = user(o.id), b = blocked(o.id), fol = S.followed.includes(o.id);
      return `<div class="row">${avatar(u, 48)}<span class="tt"><b>${esc(u.name)}</b><small>${u.handle ? '@' + esc(u.handle) : ''}</small></span></div><div class="list">
        <button class="li" data-a="copyLink">${ic('link', 22)}<span class="grow">Copier le lien du profil</span></button>
        ${fol ? `<button class="li" data-a="follow" data-id="${o.id}">${ic('user', 22)}<span class="grow">Ne plus suivre</span></button>` : ''}
        <button class="li danger" data-a="report" data-k="user" data-id="${o.id}">${ic('flag', 22)}<span class="grow">Signaler</span></button>
        <button class="li danger" data-a="${b ? 'unblock' : 'block'}" data-id="${o.id}">${ic('block', 22)}<span class="grow">${b ? 'Débloquer' : 'Bloquer'}</span></button></div>`; }
    if (o.k === 'conv') { const c = conv(o.id), u = user(c.with);
      return `<div class="list"><button class="li" data-a="openProfile" data-id="${u.id}">${ic('user', 22)}<span class="grow">Voir le profil</span></button>
        <button class="li danger" data-a="report" data-k="conv" data-id="${c.id}">${ic('flag', 22)}<span class="grow">Signaler la conversation</span></button>
        <button class="li danger" data-a="block" data-id="${u.id}">${ic('block', 22)}<span class="grow">Bloquer ${esc(u.name)}</span></button>
        <button class="li danger" data-a="deleteConv" data-id="${c.id}">${ic('trash', 22)}<span class="grow">Supprimer la conversation</span></button></div>`; }
    if (o.k === 'comm') { const k = comm(o.id);
      return `<div class="list">${k.cloud ? `<button class="li" data-a="copyCommLink" data-id="${k.id}">${ic('link', 22)}<span class="grow">Copier le lien de la communauté</span></button>` : ''}<button class="li" data-a="legal" data-id="community">${ic('users', 22)}<span class="grow">Règles de la communauté</span></button>
        <button class="li danger" data-a="report" data-k="comm" data-id="${k.id}">${ic('flag', 22)}<span class="grow">Signaler la communauté</span></button>
        ${k.joined && !k.mine ? `<button class="li danger" data-a="join" data-id="${k.id}">${ic('close', 22)}<span class="grow">Quitter ${esc(k.name)}</span></button>` : ''}
        ${k.mine || (window.MUSIO_CLOUD && isCreator()) ? `<button class="li danger" data-a="deleteComm" data-id="${k.id}">${ic('trash', 22)}<span class="grow">Supprimer la communauté</span></button>` : ''}</div>`; }
    return '';
  },
};

// ---------- RECHERCHE ----------
OV.search = {
  kind: 'screen', label: 'Recherche',
  html: () => `<div class="sc-head"><button class="icon-btn glass strong" data-a="back" aria-label="Retour">${ic('back')}</button><label class="search-in glass strong">${ic('search', 20)}<span class="sr">Rechercher</span><input id="searchIn" type="search" data-in="search" data-ch="searchCommit" placeholder="Titres, artistes, personnes, #tags" value="${esc(U.search.q)}" autocomplete="off" enterkeyhint="search"></label></div>
    <div class="scroll"><div class="chips">${['Tout', 'Sons', 'Personnes', 'Tags'].map(x => `<button class="chip glass ${U.search.tab === x ? 'on' : ''}" data-a="searchTab" data-id="${x}" aria-pressed="${U.search.tab === x}">${x}</button>`).join('')}</div><div id="results" style="display:flex;flex-direction:column;gap:14px">${searchResults()}</div></div>`,
  after: (o, el, fresh) => { if (fresh) setTimeout(() => { const i = $('#searchIn'); if (i) i.focus(); }, 380); },
};
function allTags() { const m = {}; S.posts.forEach(p => (p.caption.match(/#([\wÀ-ÿ-]+)/g) || []).forEach(t => { const k = t.slice(1).toLowerCase(); m[k] = (m[k] || 0) + 1; })); return Object.entries(m).sort((a, b) => b[1] - a[1]); }
function personRow(u) { const fol = S.followed.includes(u.id); return `<div class="li"><button class="grow row" data-a="openProfile" data-id="${u.id}">${avatar(u, 44)}<span class="tt"><b style="display:flex;align-items:center">${esc(u.name)}${verified(u)}</b><small>@${esc(u.handle)}</small></span></button><button class="btn ${fol ? 'glass' : 'primary'}" style="height:36px;padding:0 14px" data-a="follow" data-id="${u.id}" aria-pressed="${fol}">${fol ? 'Abonné·e' : 'Suivre'}</button></div>`; }
function searchResults() {
  const q = U.search.q.trim().toLowerCase().replace(/^[@#]/, ''), tab = U.search.tab;
  const seen = new Set(), people = FRIENDS.concat(Object.values(window.CLOUD_PEOPLE || {}), D.others).filter(u => !blocked(u.id) && u.id !== (S && S.uid) && !seen.has(u.id) && seen.add(u.id));
  if (!q) {
    return `${S.recent.length ? `<div class="sec-h"><p class="result-h">Récent</p><button class="t2" style="font-size:13px" data-a="clearRecent">Effacer</button></div><div class="chips wrap">${S.recent.map(r => `<button class="chip glass" data-a="recent" data-id="${esc(r)}">${esc(r)}</button>`).join('')}</div>` : ''}
      <p class="result-h">Tendances</p><div class="chips wrap">${allTags().slice(0, 8).map(([t]) => `<button class="chip glass" data-a="tag" data-id="${esc(t)}">#${esc(t)}</button>`).join('')}</div>
      <p class="result-h">Personnes à suivre</p><div class="panel glass"><div class="list">${people.slice(0, 6).map(personRow).join('')}</div></div>`;
  }
  const tr = allTracks().filter(t => (t.title + ' ' + t.artist + ' ' + t.genre).toLowerCase().includes(q));
  const ppl = people.filter(u => (u.name + ' ' + u.handle).toLowerCase().includes(q));
  const tags = allTags().filter(([t]) => t.includes(q));
  let h = '';
  if ((tab === 'Tout' || tab === 'Sons') && tr.length) h += `<p class="result-h">Sons</p><div class="panel glass"><div class="tracklist">${tr.map(t => trackRow(t, tr.map(x => x.id), 'Recherche « ' + U.search.q + ' »')).join('')}</div></div>`;
  if ((tab === 'Tout' || tab === 'Personnes') && ppl.length) h += `<p class="result-h">Personnes</p><div class="panel glass"><div class="list">${ppl.map(personRow).join('')}</div></div>`;
  if ((tab === 'Tout' || tab === 'Tags') && tags.length) h += `<p class="result-h">Tags</p><div class="panel glass"><div class="list">${tags.map(([t, n]) => `<button class="li" data-a="tag" data-id="${esc(t)}"><span class="icon-btn glass sm" style="font-weight:800">#</span><span class="grow tt"><b>#${esc(t)}</b><small>${n} publication${n > 1 ? 's' : ''}</small></span>${ic('chevron', 18)}</button>`).join('')}</div></div>`;
  return h || `<div class="empty">${ic('search', 36)}<span>Aucun résultat pour « ${esc(U.search.q)} ».</span></div>`;
}
OV.tag = { kind: 'screen', label: 'Tag', html: o => { const list = S.posts.filter(p => !blocked(p.author) && p.caption.toLowerCase().includes('#' + o.tag.toLowerCase())); return head('#' + esc(o.tag)) + `<div class="scroll"><p class="t2">${list.length} publication${list.length > 1 ? 's' : ''}</p>${gridPosts(list)}</div>`; } };
OV.postView = {
  kind: 'screen', label: 'Publication', cls: 'postview',
  html: o => { const p = post(o.id); if (!p) return head('Publication') + '<div class="empty">Publication introuvable.</div>'; return `<div class="feed" style="overflow:hidden">${postHTML(p)}</div><div class="feed-top"><button class="icon-btn glass strong" data-a="back" aria-label="Retour">${ic('back')}</button></div>`; },
  after: (o, el, fresh) => { const p = post(o.id); if (!p) return; const v = $('video', el); if (v) v.play().catch(() => {}); if (fresh && U.unlocked) playTrack(p.trackId, { queue: [p.trackId], at: p.start || 0, source: 'Feed · @' + user(p.author).handle, post: p.id }); else syncFeed(); },
  onClose: () => setTimeout(syncFeed, 0),
};

// ---------- ABONNÉS / ABONNEMENTS ----------
function followData(id) {
  if (typeof cloudFollowData === 'function') { const c = cloudFollowData(id); if (c) return c; }
  // uniquement des liens réels (aucun abonné inventé)
  if (id === 'me') { const following = S.followed.map(user).filter(u => !blocked(u.id)); return { followers: [], following, followersTotal: S.me.followers || 0, followingTotal: following.length }; }
  const followers = S.followed.includes(id) ? [user('me')] : [], following = [];
  return { followers, following, followersTotal: followers.length, followingTotal: 0 };
}
OV.follows = {
  kind: 'screen', label: 'Abonnés',
  html: o => {
    const u = user(o.id), prof = D.profiles.find(p => p.id === o.id), d = followData(o.id), list = o.k === 'followers' ? d.followers : d.following, total = o.k === 'followers' ? d.followersTotal : d.followingTotal;
    let lock = '';
    if (o.id !== 'me') {
      if (prof && prof.private && !S.followed.includes(o.id)) lock = `<b style="font-size:17px">Ce compte est privé</b><span>Suis ${esc(u.name)} pour voir ses abonnés et abonnements.</span>`;
      else if (prof && prof.hideLists) lock = `<b style="font-size:17px">Liste masquée</b><span>${esc(u.name)} a choisi de ne pas montrer ses abonnés et abonnements.</span>`;
    }
    const q = (o.q || '').toLowerCase(), shown = list.filter(x => !q || (x.name + ' ' + (x.handle || '')).toLowerCase().includes(q));
    return head('@' + esc(u.handle || u.name)) + `<div class="scroll">
      ${seg('follows', [['followers', 'Abonnés · ' + fmtN(d.followersTotal)], ['following', 'Abonnements · ' + fmtN(d.followingTotal)]], o.k, 'followTab')}
      ${lock ? `<div class="empty">${ic('lock', 36)}${lock}</div>` : `
      ${o.id === 'me' && S.settings.listsVis !== 'Tout le monde' ? `<p class="t2" style="font-size:13px;display:flex;gap:6px;align-items:center">${ic('eye', 14)}Visible par : ${S.settings.listsVis === 'Abonnés' ? 'tes abonnés seulement' : 'toi seulement'}</p>` : ''}
      <label class="search-in glass">${ic('search', 18)}<span class="sr">Rechercher</span><input data-in="followQ" placeholder="Rechercher" value="${esc(o.q || '')}" autocomplete="off"></label>
      <div class="panel glass"><div class="list" id="followList">${followRows(shown)}</div></div>
      ${total > list.length ? `<p class="t3" style="text-align:center;font-size:13px">et ${fmtN(total - list.length)} autres comptes</p>` : ''}`}
    </div>`;
  },
};
function followRows(list) {
  return list.length ? list.map(x => { if (x.me) return `<div class="li">${avatar(x, 44)}<span class="grow tt"><b>${esc(x.name)}</b><small>C’est toi</small></span></div>`; const fol = S.followed.includes(x.id), req = S.requested.includes(x.id); return `<div class="li"><button class="grow row" data-a="openProfile" data-id="${x.id}">${avatar(x, 44)}<span class="tt"><b style="display:flex;align-items:center">${esc(x.name)}${verified(x)}</b><small>${x.handle ? '@' + esc(x.handle) : 'Match · ' + x.compat + ' %'}</small></span></button><button class="btn ${fol || req ? 'glass' : 'primary'}" style="height:32px;padding:0 14px;font-size:14px" data-a="follow" data-id="${x.id}">${fol ? 'Abonné·e' : req ? 'Demandé' : 'Suivre'}</button></div>`; }).join('') : `<div class="empty" style="padding:20px">${ic('users', 30)}<span>Personne ici.</span></div>`;
}

// ---------- PROFIL ----------
OV.profile = {
  kind: 'screen', label: 'Profil',
  html: o => {
    const u = user(o.id), fr = FRIENDS.find(f => f.id === o.id), prof = D.profiles.find(p => p.id === o.id);
    const isB = blocked(o.id);
    const fol = S.followed.includes(o.id), req = S.requested.includes(o.id), locked = !!(prof && prof.private) && !fol;
    const posts = isB || locked ? [] : S.posts.filter(p => p.author === o.id);
    const t = fr ? T(fr.trackId) : prof ? T(prof.anthem) : null;
    const at = u.artist ? D.tracks.filter(x => x.artist.indexOf(u.artist) === 0) : [];
    const fd = followData(o.id), followers = fd.followersTotal, following = fd.followingTotal;
    const bio = u.bio || (prof && prof.bio) || (fr && fr.place ? `Écoute surtout du ${T(fr.trackId).genre.toLowerCase()}. ${fr.place}.` : '');
    return head('@' + esc(u.handle || u.name), moreBtn('user', o.id)) + `<div class="scroll">
      <div class="prof glass strong">${avatar(u, 96)}<div><h2 style="font-size:24px">${esc(u.name)}${prof ? ', ' + prof.age : ''}${verified(u)}${prof && prof.private ? `<span class="privtag" style="margin-left:6px">${ic('lock', 12)}Privé</span>` : ''}</h2><div class="handle">${u.handle ? '@' + esc(u.handle) : prof ? prof.compat + ' % de compatibilité · à ' + distTxt(prof.dist) : ''}</div></div>${bio ? `<p class="bio">${esc(bio)}</p>` : ''}
        ${isB ? `<p class="t2">Tu as bloqué ce compte.</p><button class="btn glass" data-a="unblock" data-id="${o.id}">Débloquer</button>` : `${statsHTML(o.id, followers + (fol ? 1 : 0), following, locked)}<button class="visit-chip ${S.settings.showMyVisits ? '' : 'off'}" data-a="toggleVisits">${ic(S.settings.showMyVisits ? 'eye' : 'eyeoff', 14)}${S.settings.showMyVisits ? `${esc(u.name)} peut voir ta visite` : 'Visite discrète'}</button>
        <div class="btn-row" style="width:100%"><button class="btn ${fol || req ? 'glass' : 'primary'}" data-a="follow" data-id="${o.id}" aria-pressed="${fol}">${fol ? 'Abonné·e' : req ? 'Demande envoyée' : locked ? 'Demander à suivre' : 'Suivre'}</button><button class="btn glass" data-a="openChatWith" data-id="${o.id}">${ic('chat', 18)}Message</button></div>`}</div>
      ${locked && !isB ? `<div class="prof glass" style="gap:8px">${ic('lock', 30)}<b style="font-size:17px">Ce compte est privé</b><p class="t2" style="font-size:15px">Suis ${esc(u.name)} pour voir ses publications et ce qu’il ou elle écoute.</p></div>` : ''}
      ${!isB && !locked && t ? `<h2>${fr && fr.live ? 'Écoute en ce moment' : prof ? 'Son hymne' : 'Dernière écoute'}</h2><button class="track-card glass strong" data-a="playTrack" data-id="${t.id}" data-q="${t.id}" data-src="Profil de ${esc(u.name)}">${cover(t, 56, 14)}<span class="tt"><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></span>${fr && fr.live ? eqHTML() : icf('play', 22)}</button>` : ''}
      ${!isB && !locked && prof ? `<h2>Top artistes</h2><div class="mc-tags">${prof.top.map(a => `<span class="tagc">${esc(a)}</span>`).join('')}</div>` : ''}
      ${!isB && at.length ? `<h2>Titres</h2><div class="panel glass"><div class="tracklist">${at.map(x => trackRow(x, at.map(y => y.id), u.name)).join('')}</div></div>` : ''}
      ${isB || locked ? '' : `${seg('prof-' + o.id, [['posts', 'Publications'], ['echoes', 'Échos']], o.tab || 'posts', 'profTab')}${(o.tab || 'posts') === 'echoes' ? echoListHTML(o.id) : posts.length ? gridPosts(posts) : '<p class="t2">Aucune publication pour l’instant.</p>'}`}
    </div>`;
  },
};
OV.playlist = {
  kind: 'screen', label: 'Playlist',
  html: o => { const pl = PL(o.id); if (!pl) return head('Playlist') + '<div class="empty">Playlist introuvable.</div>'; const tr = pl.tracks.map(T).filter(Boolean); const total = tr.reduce((a, t) => a + t.dur, 0);
    return head('', pl.mine ? `<button class="icon-btn glass strong" data-a="deletePl" data-id="${pl.id}" aria-label="Supprimer la playlist">${ic('trash', 20)}</button>` : '') + `<div class="scroll"><div class="pl-head">${cover(pl, 210, 34, pl.tag ? `<span class="gtag">${pl.tag}</span>` : '')}<h1 style="font-size:28px">${esc(pl.title)}</h1><p class="t2">${esc(pl.desc || pl.sub || (pl.mine ? 'Ta playlist' : ''))}</p><small class="t3">${tr.length} titres · ${Math.round(total / 60)} min</small>
      <div class="btn-row" style="width:100%;max-width:420px"><button class="btn primary" data-a="playPl" data-id="${pl.id}" ${tr.length ? '' : 'disabled'}>${icf('play', 18)}Lecture</button><button class="btn glass" data-a="shufflePl" data-id="${pl.id}" ${tr.length ? '' : 'disabled'}>${ic('shuffle', 18)}Aléatoire</button></div></div>
      ${tr.length ? `<div class="panel glass"><div class="tracklist">${tr.map(t => pl.mine ? trackRow(t, tr.map(x => x.id), pl.title).replace(/<\/div>$/, `<button class="icon-btn sm" data-a="toggleInPl" data-id="${pl.id}" data-t="${t.id}" aria-label="Retirer de la playlist">${ic('close', 18)}</button></div>`) : trackRow(t, tr.map(x => x.id), pl.title)).join('')}</div></div>` : `<div class="empty">${ic(pl.mine ? 'listplus' : 'heart', 36)}<span>${pl.mine ? 'Ajoute des titres depuis le lecteur : ⋯ › Ajouter à une playlist.' : 'Aucun titre liké pour l’instant. Touche le cœur d’un titre pour l’ajouter ici.'}</span></div>`}</div>`; },
};

// ---------- DISCUSSION ----------
OV.chat = {
  kind: 'screen', label: 'Conversation',
  html: o => { const c = conv(o.convId), u = user(c.with), fr = FRIENDS.find(f => f.id === c.with), prof = D.profiles.find(p => p.id === c.with);
    const status = fr ? (fr.live ? 'écoute « ' + T(fr.trackId).title + ' »' : 'actif il y a ' + fr.ago) : prof ? 'Match · ' + prof.compat + ' %' : (u.verified ? 'compte certifié' : '');
    return `<header class="chat-h glass strong lens"><button class="icon-btn" data-a="back" aria-label="Retour">${ic('back')}</button><button class="ch-who" data-a="openProfile" data-id="${u.id}">${avatar(u, 40)}<span class="tt"><b style="display:flex;align-items:center">${esc(u.name)}${verified(u)}</b><small>${esc(status)}</small></span></button>${fr && fr.live ? `<button class="icon-btn" data-a="listenWith" data-id="${fr.id}" aria-label="Écouter avec ${esc(u.name)}">${ic('headphones', 20)}</button>` : ''}<button class="icon-btn" data-a="more" data-k="conv" data-id="${c.id}" aria-label="Options">${ic('more', 20)}</button></header>
    <div class="chat-body" id="chatBody"><div class="msgs" id="msgs">${msgsHTML(c)}</div></div>
    <form class="composer glass strong lens" data-form="send" data-id="${c.id}"><button type="button" class="icon-btn sm" data-a="shareNow" data-id="${c.id}" aria-label="Partager le son en cours">${ic('music', 20)}</button><label class="sr" for="chatInput">Message</label><input id="chatInput" placeholder="Message…" autocomplete="off" enterkeyhint="send" maxlength="1000"><button class="send" type="submit" aria-label="Envoyer">${ic('send', 20)}</button></form>`; },
  after: o => { const c = conv(o.convId); if (c && c.unread) { c.unread = 0; save(); renderChrome(); } const b = $('#chatBody'); if (b) b.scrollTop = b.scrollHeight; },
  onClose: () => { if (U.tab === 'chat') setTimeout(() => { if (!hasScreen()) renderView(); }, 0); },
};
OV.community = {
  kind: 'screen', label: 'Communauté',
  html: o => { const k = comm(o.id);
    return head(esc(k.name), moreBtn('comm', k.id)) +
    `<div class="chat-body" id="chatBody" style="display:flex;flex-direction:column;gap:12px"><div class="cbanner" style="background:${k.color}">${shapeHTML(k.shape)}<span class="gtag" style="font-size:13px">${fmtN(k.members)} MEMBRE${k.members > 1 ? 'S' : ''}</span></div><p class="t2" style="font-size:14px">${esc(k.desc)}</p>${k.joined ? '' : `<button class="btn primary" data-a="join" data-id="${k.id}">Rejoindre la communauté</button>`}<div id="commPosts" style="display:flex;flex-direction:column;gap:10px">${k.posts.map(p => cpostHTML(k, p)).join('')}</div></div>
    ${k.joined ? `<form class="composer glass strong lens" data-form="cpost" data-id="${k.id}"><button type="button" class="icon-btn sm" data-a="shareNowComm" data-id="${k.id}" aria-label="Partager le son en cours">${ic('music', 20)}</button><label class="sr" for="cpIn">Écrire dans la communauté</label><input id="cpIn" placeholder="Écrire à la communauté…" autocomplete="off" enterkeyhint="send" maxlength="1000"><button class="send" type="submit" aria-label="Publier">${ic('send', 20)}</button></form>` : ''}`; },
  after: () => { const b = $('#chatBody'); if (b) b.scrollTop = b.scrollHeight; },
  onClose: () => { if (U.tab === 'chat') setTimeout(() => { if (!hasScreen()) renderView(); }, 0); },
};
OV.newMsg = { kind: 'sheet', label: 'Nouveau message', html: () => { const ms = S.match.matches.map(m => D.profiles.find(p => p.id === m.id)); return `<h2>Nouveau message</h2><div class="list">${FRIENDS.concat(ms).filter(u => !blocked(u.id)).map(u => `<button class="li" data-a="openChatWith" data-id="${u.id}">${avatar(u, 44)}<span class="grow tt"><b>${esc(u.name)}</b><small>${u.handle ? '@' + esc(u.handle) : 'Match · ' + u.compat + ' %'}</small></span>${ic('chevron', 18)}</button>`).join('')}</div>`; } };
OV.friend = {
  kind: 'sheet', label: 'Ami',
  html: o => { const f = FRIENDS.find(x => x.id === o.id), t = T(f.trackId);
    return `<div class="row">${avatar(f, 58)}<span class="tt"><b style="font-size:18px">${esc(f.name)}</b><small>${f.live ? 'Écoute en ce moment' : 'Il y a ' + f.ago} · ${esc(f.place)}</small></span></div>
    <button class="track-card glass strong" data-a="playTrack" data-id="${t.id}" data-q="${t.id}" data-src="Map · ${esc(f.name)}">${cover(t, 58, 14)}<span class="tt"><b>${esc(t.title)}</b><small>${esc(t.artist)} · ${t.genre}</small></span>${f.live ? eqHTML() : icf('play', 22)}</button>
    ${f.live ? `<button class="btn primary block" data-a="listenWith" data-id="${f.id}">${ic('headphones', 18)}Écouter avec ${esc(f.name)}</button>` : ''}
    <div class="btn-row"><button class="btn glass" data-a="openChatWith" data-id="${f.id}">${ic('chat', 18)}Message</button><button class="btn glass" data-a="openProfile" data-id="${f.id}">${ic('user', 18)}Profil</button></div>`; },
};

// ---------- MATCH ----------
OV.matchModal = {
  kind: 'modal',
  html: o => { const p = D.profiles.find(x => x.id === o.id);
    return `<div class="match-modal"><span class="t2" style="font-weight:700;letter-spacing:.14em;font-size:12px">NOUVEAU MATCH</span><h1>C’est un match&nbsp;!</h1><div class="duo">${avatar(user('me'), 100)}${avatar(p, 100)}</div><p class="t2" style="line-height:1.5">Toi et ${esc(p.name)} avez ${p.compat} % de compatibilité musicale.<br>Vous aimez tous les deux ${esc(p.top[0])}.</p><button class="btn primary block" style="max-width:340px" data-a="openChatWith" data-id="${p.id}">${ic('chat', 18)}Envoyer un message</button><button class="btn glass block" style="max-width:340px" data-a="back">Continuer à swiper</button></div>`; },
};
const distLabel = d => d >= MAX_DIST ? 'Partout' : d + ' km';
OV.matchFilters = {
  kind: 'sheet', label: 'Filtres',
  html: () => { const f = S.match.filters;
    return `<h2>Filtres</h2><p class="result-h">Genres</p><div class="chips wrap">${GENRES.map(g => `<button class="chip glass ${f.genres.includes(g) ? 'on' : ''}" data-a="mfGenre" data-id="${g}" aria-pressed="${f.genres.includes(g)}">${g}</button>`).join('')}</div>
    <div class="field"><label for="mfDist" class="range-row"><span>Distance maximale</span><b id="mfDistV" style="color:#fff">${distLabel(f.dist)}</b></label><input id="mfDist" type="range" min="1" max="${MAX_DIST}" step="1" value="${f.dist}" data-in="mfDist"><div class="range-row t3" style="font-size:12px"><span>1 km</span><span>150 km</span><span>Partout</span></div></div>
    <div class="minisel">${[5, 25, 50, 100, 200, MAX_DIST].map(d => `<button class="${f.dist === d ? 'on' : ''}" data-a="mfDistSet" data-id="${d}">${distLabel(d)}</button>`).join('')}</div>
    <p class="t3" style="font-size:12.5px">${deck().length} profil${deck().length > 1 ? 's' : ''} correspondent à ces filtres.</p>
    <div class="btn-row"><button class="btn glass" data-a="mfReset">Réinitialiser</button><button class="btn primary" data-a="back">Appliquer</button></div>`; },
  onClose: () => { save(); if (U.tab === 'match') setTimeout(renderView, 0); },
};

// ---------- ACTIVITÉ ----------
OV.activity = {
  kind: 'sheet', label: 'Activité',
  html: () => `<div class="sec-h"><h2>Activité</h2>${S.activity.length ? '<button class="t2" style="font-size:13px" data-a="clearActivity">Tout effacer</button>' : ''}</div>${S.activity.length ? `<div class="list">${S.activity.filter(a => !blocked(a.user)).map(a => { const u = user(a.user); return `<button class="act ${a.read ? '' : 'new'}" data-a="${a.type === 'match' ? 'openChatWith' : 'openProfile'}" data-id="${a.user}">${avatar(u, 44)}<span class="grow"><b>${esc(u.name)}</b> ${esc(a.text)}<small>${ago(a.at)}</small></span>${a.type === 'like' ? `<span class="liked-ic">${icf('heart', 18)}</span>` : a.type === 'match' ? `<span class="liked-ic">${icf('star', 18)}</span>` : a.type === 'follow' ? ic('user', 18) : ic('chat', 18)}</button>`; }).join('')}</div>` : `<div class="empty">${ic('bell', 36)}<span>Rien de nouveau pour l’instant.</span></div>`}`,
  after: () => { if (S.activity.some(a => !a.read)) setTimeout(() => { S.activity.forEach(a => { a.read = true; }); save(); renderChrome(); $$('#view [data-a="activity"] .dot').forEach(x => x.remove()); }, 1200); },
};

// ---------- RÉGLAGES ----------
OV.settings = {
  kind: 'screen', label: 'Réglages',
  html: () => { const s = S.settings, me = user('me');
    return head('Réglages') + `<div class="scroll settings">
      <button class="prof-row glass strong" data-a="editProfile">${avatar(me, 58)}<span class="tt"><b style="font-size:17px">${esc(S.me.name)}</b><small>@${esc(S.me.handle)} · Modifier le profil et la photo</small></span>${ic('chevron', 18)}</button>
      <p class="group-t">Apparence</p>
      <div class="group glass"><div class="srow col"><span>Couleur d’accent</span><div class="swatches">${ACCENTS.map(c => `<button class="swatch ${s.accent === c ? 'on' : ''}" style="background:${c}" data-a="accent" data-id="${c}" aria-pressed="${s.accent === c}" aria-label="Accent ${c}"></button>`).join('')}</div></div>
        <div class="srow col"><label for="blurIn" class="range-row"><span>Intensité du verre</span><span class="t2" id="blurV">${s.blur} px</span></label><input id="blurIn" type="range" min="0" max="48" value="${s.blur}" data-in="blur"></div>
        ${swRow('Vagues animées', 'settings.orbs', 'Le fond bouge doucement')}</div>
      <p class="group-t">Lecture</p>
      <div class="group glass">${swRow('Lecture auto dans le feed', 'settings.autoplay', 'Le son démarre quand tu fais défiler')}
        <div class="srow col"><label for="volIn" class="range-row"><span>Volume</span><span class="t2" id="volV">${s.volume} %</span></label><input id="volIn" type="range" min="0" max="100" value="${s.volume}" data-in="volume"></div>
        <div class="srow col"><span>Qualité audio</span><div class="minisel">${['Normale', 'Haute', 'Très haute'].map(q => `<button class="${s.quality === q ? 'on' : ''}" data-a="setOpt" data-k="quality" data-id="${q}" aria-pressed="${s.quality === q}">${q}</button>`).join('')}</div></div>
        ${navRow('Appareil de lecture', 'devices', devIcon(), s.device)}</div>
      <p class="group-t">Confidentialité et sécurité</p>
      <div class="group glass">${swRow('Compte privé', 'settings.private', 'Seules les personnes que tu acceptes voient tes publications', 'lock')}
        <div class="srow col"><span class="row" style="gap:12px">${sicon('eye')}<span class="grow">Qui voit mes abonnés et abonnements</span></span><div class="minisel">${['Tout le monde', 'Abonnés', 'Personne'].map(q => `<button class="${s.listsVis === q ? 'on' : ''}" data-a="setOpt" data-k="listsVis" data-id="${q}" aria-pressed="${s.listsVis === q}">${q}</button>`).join('')}</div></div>
        ${navRow('Vues du profil', 'profileViews', 'eye', (s.profileViews ? 'Tu vois qui te regarde' : 'Historique masqué') + ' · ' + (s.showMyVisits ? 'tes visites sont visibles' : 'visites discrètes'))}${swRow('Partager mon écoute sur la Map', 'settings.shareListening', 'Tes amis voient ce que tu écoutes', 'map')}${swRow('Visible dans Match', 'settings.matchVisible', '', 'match')}
        <div class="srow col"><span class="row" style="gap:12px">${sicon('chat')}<span class="grow">Qui peut m’écrire</span></span><div class="minisel">${['Tout le monde', 'Amis', 'Personne'].map(q => `<button class="${s.whoCanWrite === q ? 'on' : ''}" data-a="setOpt" data-k="whoCanWrite" data-id="${q}" aria-pressed="${s.whoCanWrite === q}">${q}</button>`).join('')}</div></div>
        ${navRow('Comptes bloqués', 'openBlocked', 'block', S.blocked.length ? S.blocked.length + ' compte' + (S.blocked.length > 1 ? 's' : '') : 'Aucun')}
        ${navRow('Consentements et cookies', 'openConsents', 'cookie', [S.consents.reco && 'Personnalisation', S.consents.audience && 'Audience', S.consents.ads && 'Publicité'].filter(Boolean).join(', ') || 'Tout refusé')}
        ${navRow('Mes données', 'openMyData', 'download', 'Télécharger, supprimer mon compte')}
        ${navRow('Sécurité et aide', 'legal', 'help', 'Numéros utiles, bloquer, signaler', 'safety')}</div>
      <p class="group-t">Notifications</p>
      <div class="group glass">${swRow('Messages', 'notif.messages')}${swRow('Nouveaux matchs', 'notif.matchs')}${swRow('Activité des amis', 'notif.activite', 'Quand un ami lance un son ou aime ta publication')}</div>
      <p class="group-t">Informations légales</p>
      <div class="group glass">${['cgu', 'privacy', 'community', 'cookies', 'copyright', 'mentions'].map(id => navRow(LEGAL[id].title, 'legal', LEGAL[id].icon, '', id)).join('')}</div>
      <p class="group-t">Application</p>
      <div class="group glass">${navRow('À propos de Musio', 'about', 'info')}${navRow('Revoir l’accueil', 'replayOnboarding', 'refresh')}<button class="srow" data-a="reset" style="color:#FF8A94">${ic('trash', 20)}<span class="grow">Réinitialiser la démo</span></button></div>
      <p class="t3" style="text-align:center;font-size:12px">Musio · version 0.2 · prototype</p>
    </div>`; },
};
OV.editProfile = {
  kind: 'screen', label: 'Modifier le profil',
  html: () => head('Modifier le profil') + `<form class="scroll" data-form="profile">
    <label class="avatar-pick" id="pfAv" aria-label="Changer la photo de profil">${avatar(user('me'), 112)}<span class="cam glass tint">${ic('camera', 18)}</span><input type="file" accept="image/*" class="sr" data-ch="avatar"></label>
    <div class="btn-row" style="justify-content:center">${S.me.photo ? `<button type="button" class="btn glass" data-a="removePhoto">${ic('trash', 18)}Retirer la photo</button>` : '<p class="t2" style="text-align:center;font-size:13px">Touche la photo pour en choisir une.</p>'}</div>
    <div class="field"><label>Bannière</label><label class="ban-pick glass" style="${S.me.banner ? `background-image:url(${S.me.banner})` : ''}">${S.me.banner ? '' : `${ic('image', 22)}<span>Ajouter une bannière</span>`}<input type="file" accept="image/*" class="sr" data-ch="banner"></label>${S.me.banner ? `<button type="button" class="btn glass" style="height:40px;align-self:flex-start" data-a="removeBanner">${ic('trash', 16)}Retirer la bannière</button>` : '<small class="t3" style="font-size:12px;padding:0 6px">Format large conseillé (par exemple 1500 × 500).</small>'}</div>
    <div class="field"><label>Couleur de fond (sans photo)</label><div class="swatches" style="padding:0 6px">${PALETTE.map(c => `<button type="button" class="swatch ${S.me.color === c ? 'on' : ''}" style="background:${c}" data-a="meColor" data-id="${c}" aria-label="Couleur ${c}" aria-pressed="${S.me.color === c}"></button>`).join('')}</div></div>
    <div class="field"><label for="pfName">Nom</label><input id="pfName" class="glass" value="${esc(S.me.name)}" maxlength="30" autocomplete="off"></div>
    <div class="field"><label for="pfHandle">Nom d’utilisateur</label><input id="pfHandle" class="glass" value="${esc(S.me.handle)}" maxlength="24" autocomplete="off"></div>
    <div class="field"><label for="pfBio">Bio</label><textarea id="pfBio" class="glass" rows="3" maxlength="140">${esc(S.me.bio)}</textarea></div>
    <button class="btn primary block" type="submit">${ic('check', 18)}Enregistrer</button></form>`,
};
OV.legal = { kind: 'screen', label: 'Information légale', html: o => { const d = LEGAL[o.id]; return head(esc(d.title)) + `<div class="scroll"><div class="prose">${d.body}<p class="t3" style="font-size:12px">Dernière mise à jour : ${d.updated}</p></div></div>`; } };
OV.creator = {
  kind: 'sheet', label: 'Badge créateur',
  html: () => `<div style="display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;padding:6px 0 4px">
    <span class="creator-hero">${LOGO(76)}<span class="ch-b">${cBadge(34)}</span></span>
    <h2 style="font-size:24px">Créateur de Musio</h2>
    <p class="t2" style="font-size:15px;line-height:1.45;max-width:320px">Ce badge est unique : il est réservé à la personne qui a imaginé et créé l’app. Il apparaît à côté de ton nom partout dans Musio, sur ton profil, tes publications et tes commentaires.</p>
    <div class="creator-pill" style="pointer-events:none">${LOGO(18)}<span>Créateur de Musio</span></div>
    <button class="btn primary" data-a="back" style="width:100%;margin-top:6px">Trop bien</button></div>`,
};
OV.echo = {
  kind: 'sheet', label: 'Faire écho',
  html: o => { const p = post(o.id), t = T(p.trackId), u = user(p.author), d = U.echoDraft, ex = myEcho(p.id);
    return `<h2>${ex ? 'Modifier ton écho' : 'Faire écho'}</h2>
    <p class="t2" style="font-size:14px;margin-top:-6px">Relaie cette publication à tes abonnés, avec ton mot à toi.</p>
    <div class="echo-prev glass">${cover(t, 46, 10)}<span class="tt"><b>@${esc(u.handle)}</b><small>${esc(p.caption)}</small></span></div>
    <div class="field"><label for="echoIn">Ton mot <span class="t3">(facultatif)</span></label><textarea id="echoIn" class="glass" rows="2" maxlength="140" data-in="echoText" placeholder="Pourquoi tu le partages ?">${esc(d.text)}</textarea></div>
    <div class="sec-h"><p class="result-h">Ajoute une réaction</p>${d.react || d.img ? `<button class="t2" style="font-size:13px" data-a="echoClear">Retirer</button>` : ''}</div>
    ${d.img ? `<div class="echo-img"><img src="${d.img}" alt="GIF ou image choisie"></div>` : ''}
    <div class="rx-grid">${Object.keys(REACTS).map(k => `<button class="rx-pick glass ${d.react === k ? 'on' : ''}" data-a="echoReact" data-id="${k}" aria-pressed="${d.react === k}" aria-label="Réaction ${REACTS[k][0]}">${reactHTML(k)}</button>`).join('')}
      <label class="rx-pick glass rx-up" aria-label="Importer un GIF ou une image">${ic('image', 22)}<small>GIF / image</small><input type="file" accept="image/gif,image/*" class="sr" data-ch="echoImg"></label></div>
    <button class="btn primary" data-a="echoGo" data-id="${p.id}">${ic('echo', 18)}${ex ? 'Mettre à jour' : 'Faire écho'}</button>
    ${ex ? `<button class="btn glass danger-t" data-a="echoUndo" data-id="${p.id}">Retirer mon écho</button>` : ''}`; },
};
OV.trackEdit = {
  kind: 'sheet', label: 'Ton son',
  html: o => { const t = T(o.id); if (!t) return '<p class="t2">Son introuvable.</p>';
    return `<h2>${o.fresh ? 'Son importé' : 'Modifier le son'}</h2>
    <form class="te-form" data-form="trackEdit" data-id="${t.id}">
      <label class="te-art" aria-label="Choisir l’image du son">${cover(t, 112, 16)}<span class="cam glass tint">${ic('camera', 18)}</span><input type="file" accept="image/*" class="sr" data-ch="trackArt" data-id="${t.id}"></label>
      <div class="field"><label for="teTitle">Titre</label><input id="teTitle" class="glass" maxlength="60" value="${esc(t.title)}"></div>
      <div class="field"><label for="teArtist">Artiste</label><input id="teArtist" class="glass" maxlength="40" value="${esc(t.artist)}"></div>
      <p class="t3" style="font-size:12px;line-height:1.45">${fmt(t.dur)} · ${t.cloudId ? 'publié sur Musio : tout le monde peut l’écouter.' : 'gardé sur cet appareil.'} Publie uniquement des sons dont tu as les droits.</p>
      <div class="btn-row"><button type="button" class="btn glass" data-a="playTrack" data-id="${t.id}" data-q="${t.id}" data-src="Mes sons">${icf('play', 16)}Écouter</button><button type="submit" class="btn primary">Enregistrer</button></div>
      ${typeof publishBtnHTML === 'function' ? publishBtnHTML(t) : ''}
      <button type="button" class="btn glass danger-t" data-a="delTrack" data-id="${t.id}">${ic('trash', 16)}Supprimer ce son</button>
    </form>`; },
};
OV.profileViews = {
  kind: 'screen', label: 'Vues du profil',
  html: () => {
    const on = S.settings.profileViews, list = S.pviews.filter(v => !blocked(v.id) && user(v.id)).sort((a, b) => b.at - a.at);
    const day = 864e5, groups = [['Aujourd’hui', v => Date.now() - v.at < day], ['Cette semaine', v => Date.now() - v.at >= day && Date.now() - v.at < 7 * day], ['Plus ancien', v => Date.now() - v.at >= 7 * day]];
    const row = v => { const u = user(v.id), fol = S.followed.includes(v.id); return `<div class="li">${v.seen ? '' : '<i class="new-dot" aria-label="Nouveau"></i>'}<button class="grow row" data-a="openProfile" data-id="${v.id}">${avatar(u, 46)}<span class="tt"><b style="display:flex;align-items:center">${esc(u.name)}${verified(u)}</b><small>a vu ton profil · ${ago(v.at)}</small></span></button><button class="btn ${fol ? 'glass' : 'primary'}" style="height:34px;padding:0 14px" data-a="follow" data-id="${v.id}" aria-pressed="${fol}">${fol ? 'Abonné·e' : 'Suivre'}</button></div>`; };
    return head('Vues du profil') + `<div class="scroll">
      <div class="pv-hero glass strong"><span class="pv-ic">${ic('eye', 26)}</span><div><b>${on ? list.filter(v => Date.now() - v.at < 30 * day).length : '—'}</b><small>vues de ton profil ces 30 derniers jours</small></div></div>
      <div class="group glass">${swRow('Voir qui a consulté mon profil', 'settings.profileViews', 'Affiche la liste des personnes qui ont vu ton profil.', 'eye')}${swRow('Apparaître quand je regarde un profil', 'settings.showMyVisits', 'Désactivé, tu regardes les profils en toute discrétion : personne ne voit ta visite.', 'eyeoff')}</div>
      ${on ? (list.length ? groups.map(([g, f]) => { const l = list.filter(f); return l.length ? `<p class="result-h">${g}</p><div class="panel glass"><div class="list">${l.map(row).join('')}</div></div>` : ''; }).join('') : `<div class="empty">${ic('eye', 36)}<span>Personne n’a encore vu ton profil.</span></div>`)
        : `<div class="empty">${ic('eyeoff', 36)}<b>Historique désactivé</b><span>Active-le pour voir qui a consulté ton profil ces 30 derniers jours.</span></div>`}
      <p class="t3" style="font-size:12px;line-height:1.45">Les deux réglages sont indépendants. Seules les personnes qui acceptent d’apparaître sont listées ici, sur 30 jours maximum.</p></div>`;
  },
};
OV.stat = {
  kind: 'sheet', label: 'Statistiques',
  html: o => {
    const u = user(o.id), t = totals(o.id), mine = o.id === 'me', posts = S.posts.filter(p => p.author === o.id);
    const isL = o.k === 'likes';
    return `<div style="display:flex;flex-direction:column;gap:14px;text-align:center;align-items:center">
      <span class="pv-ic big">${isL ? icf('heart', 30) : icf('play', 28)}</span>
      <h2 style="font-size:28px">${fmtN(isL ? t.likes : t.views)}</h2>
      <p class="t2" style="font-size:15px;line-height:1.45">${isL ? (mine ? 'J’aime reçus au total sur tes publications.' : `J’aime reçus par ${esc(u.name)} sur ses publications.`) : (mine ? 'Vues cumulées de toutes tes publications.' : `Vues cumulées des publications de ${esc(u.name)}.`)}</p>
      ${mine && posts.length ? `<div class="panel glass" style="width:100%;text-align:left"><div class="list">${posts.map(p => `<button class="li" data-a="postView" data-id="${p.id}">${cover(T(p.trackId), 44, 10)}<span class="grow tt"><b>${esc(p.caption)}</b><small>${fmtN(postViews(p))} vues · ${fmtN(p.likes + (S.likedPosts.includes(p.id) ? 1 : 0))} J’aime</small></span>${ic('chevron', 18)}</button>`).join('')}</div></div>` : ''}
      ${mine ? `<button class="btn glass" data-a="profileViews" style="width:100%">${ic('eye', 18)}Qui a vu mon profil</button>` : ''}
      <button class="btn primary" data-a="back" style="width:100%">OK</button></div>`;
  },
};
OV.blockedList = { kind: 'screen', label: 'Comptes bloqués', html: () => head('Comptes bloqués') + `<div class="scroll">${S.blocked.length ? `<div class="panel glass"><div class="list">${S.blocked.map(id => { const u = user(id); return `<div class="li">${avatar(u, 44)}<span class="grow tt"><b>${esc(u.name)}</b><small>${u.handle ? '@' + esc(u.handle) : ''}</small></span><button class="btn glass" style="height:36px;padding:0 14px" data-a="unblock" data-id="${id}">Débloquer</button></div>`; }).join('')}</div></div>` : `<div class="empty">${ic('block', 36)}<span>Tu n’as bloqué personne.</span></div>`}<p class="t2" style="font-size:13px;line-height:1.45">Une personne bloquée ne peut plus t’écrire, voir tes publications ni te voir sur la Map. Elle n’est pas prévenue.</p></div>` };
OV.consents = {
  kind: 'screen', label: 'Consentements',
  html: () => head('Consentements') + `<div class="scroll"><p class="t2" style="font-size:14px;line-height:1.5">Choisis ce que tu acceptes. Les traceurs nécessaires au fonctionnement de l’app restent actifs. Tu peux changer d’avis à tout moment.</p>
    <div class="group glass"><div class="srow"><span class="grow">Nécessaires<small>Session, réglages, file d’attente</small></span><span class="t3" style="font-size:13px">Toujours actifs</span></div>${swRow('Personnalisation', 'consents.reco', 'Adapter le fil et les suggestions Match à tes goûts')}${swRow('Mesure d’audience', 'consents.audience', 'Statistiques anonymes et agrégées')}${swRow('Publicité personnalisée', 'consents.ads', 'Annonces adaptées à tes centres d’intérêt')}</div>
    <div class="btn-row"><button class="btn glass" data-a="consentAll" data-id="0">Tout refuser</button><button class="btn glass" data-a="consentAll" data-id="1">Tout accepter</button></div>
    ${navRow('Politique cookies et traceurs', 'legal', 'cookie', '', 'cookies').replace('class="srow"', 'class="srow glass" style="border-radius:24px"')}
    ${S.consents.at ? `<p class="t3" style="font-size:12px">Choix enregistré le ${new Date(S.consents.at).toLocaleDateString('fr-FR')}.</p>` : ''}</div>`,
};
OV.myData = {
  kind: 'screen', label: 'Mes données',
  html: () => head('Mes données') + `<div class="scroll"><div class="stat-cards"><div class="glass"><b>${S.posts.filter(p => p.author === 'me').length}</b><small>publications</small></div><div class="glass"><b>${S.convs.reduce((a, c) => a + c.msgs.filter(m => m.from === 'me').length, 0)}</b><small>messages envoyés</small></div><div class="glass"><b>${S.likedTracks.length + S.likedPosts.length}</b><small>likes</small></div></div>
    <div class="group glass"><button class="srow" data-a="exportData">${ic('copy', 20)}<span class="grow">Copier mes données<small>Format JSON, pour les conserver ou les transférer</small></span></button>${navRow('Politique de confidentialité', 'legal', 'shield', 'Ce que nous collectons et pourquoi', 'privacy')}</div>
    <p class="t2" style="font-size:13px;line-height:1.5">Dans ce prototype, tes données restent uniquement sur cet appareil. Dans l’app finale, tu pourras aussi demander une copie complète par e-mail.</p>
    <button class="btn danger block" data-a="deleteAccount">${ic('trash', 18)}Supprimer mon compte</button></div>`,
};
OV.about = { kind: 'sheet', label: 'À propos', html: () => `<div class="ob-hero" style="margin:0"><span class="logo-mark" style="width:84px;height:84px">${LOGO(84)}</span><span class="wordmark" style="font-size:34px">Musio</span></div><p class="t2" style="line-height:1.5;text-align:center">La musique, ensemble. Prototype interactif : feed vidéo et photo, Map des amis, Match musical, messages et communautés.</p><p class="t2" style="line-height:1.5;text-align:center;font-size:13px">Les morceaux sont générés en direct par ton appareil. Les personnes, titres et artistes sont fictifs. Quand c’est possible, les réponses de tes amis et des communautés sont écrites par Claude.</p><p class="t3" style="font-size:12px;text-align:center">Version 0.2 · Données enregistrées seulement sur cet appareil.</p>` };
OV.dialog = { kind: 'modal', html: o => `<div class="dialog glass strong"><h2>${esc(o.title)}</h2><p class="t2" style="line-height:1.45">${esc(o.text)}</p><div class="btns"><button class="btn glass" data-a="back">Annuler</button><button class="btn ${o.danger ? 'danger' : 'primary'}" data-a="dialogOk">${esc(o.ok)}</button></div></div>` };
OV.prompt = { kind: 'modal', html: o => `<form class="dialog glass strong" data-form="prompt"><h2>${esc(o.title)}</h2><label class="sr" for="promptIn">${esc(o.title)}</label><input id="promptIn" class="glass txt-in" style="text-align:left;font-size:16px;font-weight:600" placeholder="${esc(o.placeholder || '')}" maxlength="40" autocomplete="off"><div class="btns"><button type="button" class="btn glass" data-a="back">Annuler</button><button type="submit" class="btn primary">${esc(o.ok)}</button></div></form>`, after: () => setTimeout(() => { const i = $('#promptIn'); if (i) i.focus(); }, 80) };

// ---------- ACCUEIL (premier lancement) ----------
OV.onboarding = {
  kind: 'screen', label: 'Bienvenue', locked: true, cls: 'obs',
  html: () => { const o = U.ob, cloud = !!window.MUSIO_CLOUD, acct = typeof o.step === 'string';
    const dots = acct ? '<span></span>' : `<div class="ob-dots" aria-hidden="true">${[0, 1, 2, 3].map(i => `<i class="${i === o.step ? 'on' : ''}"></i>`).join('')}</div>`;
    const back = acct ? `<button class="icon-btn glass strong" data-a="obStep" data-id="0" aria-label="Retour">${ic('back')}</button>` : o.step && !(cloud && o.step === 1) ? `<button class="icon-btn glass strong" data-a="obStep" data-id="${o.step - 1}" aria-label="Retour">${ic('back')}</button>` : '<span></span>';
    let b = acct && typeof authStepHTML === 'function' ? authStepHTML(o) : '';
    if (o.step === 0) b = `<div class="ob-hero"><span class="logo-mark">${LOGO(110)}</span><span class="wordmark">Musio</span><p class="t2" style="font-size:17px;max-width:300px">La musique, ensemble. Partage ce que tu écoutes, découvre ce qu’écoutent tes amis.</p></div>
      <div class="ob-feats">${[['feed', 'Un feed en musique', 'Vidéos, photos et sons, en plein écran.'], ['map', 'La Map de tes amis', 'Vois en direct ce qu’ils écoutent.'], ['match', 'Des rencontres musicales', 'Trouve les personnes qui ont tes goûts.']].map(([i, t, s]) => `<div class="ob-feat glass">${ic(i, 24)}<span class="tt"><b>${t}</b><small>${s}</small></span></div>`).join('')}</div>
      <div class="grow"></div>${cloud ? `${typeof oauthHTML === 'function' ? oauthHTML(false) : ''}<button class="btn primary block" data-a="authGo" data-id="signup">${typeof OAUTH !== 'undefined' && OAUTH.list && OAUTH.list.length ? 'Continuer avec un e-mail' : 'Créer un compte'}</button><button class="btn glass block" data-a="authGo" data-id="login">J’ai déjà un compte</button>` : `<button class="btn primary block" data-a="obStep" data-id="1">Commencer</button>`}`;
    if (o.step === 1) b = `<h1>Ton profil</h1><p class="t2">Choisis une photo et un nom. Tu pourras les changer plus tard.</p>
      <label class="avatar-pick" id="pfAv" aria-label="Choisir une photo de profil">${avatar(user('me'), 120)}<span class="cam glass tint">${ic('camera', 20)}</span><input type="file" accept="image/*" class="sr" data-ch="avatar"></label>
      <div class="field"><label for="obName">Nom</label><input id="obName" class="glass" data-in="obName" value="${esc(o.name)}" placeholder="Ton prénom ou pseudo" maxlength="30" autocomplete="off"></div>
      <div class="field"><label for="obHandle">Nom d’utilisateur</label><input id="obHandle" class="glass" data-in="obHandle" value="${esc(o.handle)}" placeholder="pseudo" maxlength="24" autocomplete="off"></div>
      <div class="grow"></div><button class="btn primary block" data-a="obStep" data-id="2">Continuer</button>`;
    if (o.step === 2) b = `<h1>Tes goûts</h1><p class="t2">Choisis au moins un genre pour personnaliser ton fil et tes rencontres.</p>
      <div class="ob-genres">${GENRES.map((g, i) => { const on = o.genres.includes(g); const c = PALETTE[i]; return `<button class="ob-genre glass ${on ? 'on' : ''}" data-a="obGenre" data-id="${g}" aria-pressed="${on}" style="--gc:${c}"><span class="cover" style="width:44px;height:44px;border-radius:14px;background:${c}">${shapeHTML(['disc', 'ring', 'diamond', 'dome', 'pill', 'stripes'][i])}</span><b>${g}</b>${on ? `<span class="ob-check">${icf('check', 16)}</span>` : ''}</button>`; }).join('')}</div>
      <div class="grow"></div><button class="btn primary block" data-a="obStep" data-id="3" ${o.genres.length ? '' : 'disabled'}>Continuer</button><button class="btn glass block" data-a="obStep" data-id="3">Passer</button>`;
    if (o.step === 3) { const ok = o.age && o.terms;
      b = `<h1>${o.accepted ? 'Tes choix' : 'Avant de commencer'}</h1><p class="t2">${o.accepted ? 'Dernière étape : choisis ce que Musio peut faire avec tes données.' : 'Quelques règles simples pour que tout le monde se sente bien sur Musio.'}</p>
      ${o.accepted ? '' : `<div class="group glass" style="padding:6px 16px">
        <div class="check ${o.age ? 'on' : ''}"><button class="box" data-a="obCheck" data-id="age" role="checkbox" aria-checked="${o.age}" aria-label="J’ai 15 ans ou plus">${o.age ? icf('check', 16) : ''}</button><span>J’ai <b>15 ans ou plus</b>. Si j’ai moins de 18 ans, mes parents sont informés.</span></div>
        <div class="check ${o.terms ? 'on' : ''}"><button class="box" data-a="obCheck" data-id="terms" role="checkbox" aria-checked="${o.terms}" aria-label="J’accepte les conditions">${o.terms ? icf('check', 16) : ''}</button><span>J’accepte les <button class="lnk" data-a="legal" data-id="cgu">Conditions d’utilisation</button> et les <button class="lnk" data-a="legal" data-id="community">Règles de la communauté</button>, et j’ai lu la <button class="lnk" data-a="legal" data-id="privacy">Politique de confidentialité</button>.</span></div></div>`}
      <p class="group-t">Tes choix (facultatifs)</p>
      <div class="group glass">${swRow('Personnalisation', 'consents.reco', 'Un fil et des suggestions selon tes goûts')}${swRow('Mesure d’audience', 'consents.audience', 'Statistiques anonymes')}${swRow('Publicité personnalisée', 'consents.ads', 'Désactivée par défaut')}</div>
      <p class="t3" style="font-size:12px">Modifiable à tout moment dans Réglages › Consentements. <button class="lnk" data-a="legal" data-id="cookies">En savoir plus</button></p>
      <div class="grow"></div><button class="btn primary block" data-a="obFinish" ${ok && !o.busy ? '' : 'disabled'}>${o.busy ? 'Création du profil…' : cloud ? 'Terminer' : 'Créer mon compte'}</button>`; }
    return `<div class="ob"><div class="row" style="justify-content:space-between">${back}${dots}<span style="width:44px"></span></div>${b}</div>`; },
};

// ---------- CRÉATION & MONTAGE ----------
function waveHTML(c) {
  const t = T(c.trackId), n = 64, w0 = c.start / t.dur, w1 = (c.start + c.len) / t.dur;
  return `<div class="wave glass" data-wave aria-label="Choisir l’extrait">${Array.from({ length: n }, (_, i) => { const h = 18 + (hashN(t.id + i) % 70) * (0.55 + 0.45 * Math.abs(Math.sin(i / 5))); const pos = (i + 0.5) / n; return `<i class="${pos >= w0 && pos <= w1 ? 'in' : ''}" style="height:${Math.min(96, h)}%"></i>`; }).join('')}<span class="win" style="left:${w0 * 100}%;width:${(w1 - w0) * 100}%"></span></div>
  <div class="range-row"><span class="t2" style="font-size:13px" id="waveLbl">Extrait : ${fmt(c.start)} → ${fmt(Math.min(t.dur, c.start + c.len))}</span><div class="minisel">${[15, 30, 60].map(l => `<button class="${c.len === l ? 'on' : ''}" data-a="createLen" data-id="${l}">${l} s</button>`).join('')}</div></div>`;
}
function createMedia(c, editable) {
  const p = { photos: c.src === 'photos' ? c.photos : null, video: c.src === 'video' ? c.video : null, style: c.style, trackId: c.trackId, filter: c.filter };
  if (c.src === 'photos' && !c.photos.length) return `<div class="empty" style="position:absolute;inset:0">${ic('photos', 40)}<span>Ajoute jusqu’à 10 photos</span></div>`;
  if (c.src === 'video' && !c.video) return `<div class="empty" style="position:absolute;inset:0">${ic('video', 40)}<span>Importe une vidéo depuis ton appareil</span></div>`;
  return mediaHTML(p) + (editable !== false ? c.texts.map(l => textLayerHTML(l, editable)).join('') : '');
}
OV.create = {
  kind: 'screen', label: 'Créer', cls: 'create',
  html: () => { const c = U.create; const t = T(c.trackId);
    const steps = `<div class="steps" aria-label="Étape ${c.step} sur 4">${[1, 2, 3, 4].map(i => `<i class="${i <= c.step ? 'on' : ''}"></i>`).join('')}</div>`;
    const titles = ['', 'Ton média', 'Le son', 'Montage', 'Publier'];
    const hd = `<div class="sc-head"><button class="icon-btn glass strong" data-a="${c.step > 1 ? 'createPrev' : 'back'}" aria-label="${c.step > 1 ? 'Étape précédente' : 'Fermer'}">${ic(c.step > 1 ? 'back' : 'close')}</button><h2>${titles[c.step]}</h2>${c.step < 4 ? `<button class="chip glass tint" data-a="createNext" ${(c.step === 1 && ((c.src === 'photos' && !c.photos.length) || (c.src === 'video' && !c.video))) ? 'disabled' : ''}>Suivant</button>` : '<span style="width:44px"></span>'}</div>`;
    if (c.step === 3) {
      const sel = c.texts.find(l => l.id === c.sel);
      const tools = [['text', 'Texte', 'text'], ['sticker', 'Son', 'sticker'], ['filters', 'Filtres', 'filters'], ['trim', 'Extrait', 'scissors']];
      let panel = '';
      if (c.tool === 'filters') panel = `<div class="fstrip">${FILTERS.map(([k, l, css]) => `<button class="fthumb ${c.filter === k ? 'on' : ''}" data-a="createFilter" data-id="${k}" aria-pressed="${c.filter === k}"><span style="filter:${css};background:${t.color}">${c.src === 'photos' && c.photos[0] ? `<img src="${c.photos[0]}" alt="" style="width:100%;height:100%;object-fit:cover">` : shapeHTML(t.shape)}</span>${l}</button>`).join('')}</div>`;
      else if (c.tool === 'trim') panel = waveHTML(c);
      else panel = sel ? `<div class="row" style="justify-content:space-between"><span class="t2" style="font-size:14px">${sel.style === 'track' ? 'Sticker son sélectionné' : 'Texte sélectionné'} · glisse pour déplacer</span><div class="row" style="gap:8px">${sel.style !== 'track' ? `<button class="btn glass" style="height:40px" data-a="textEdit" data-id="${sel.id}">${ic('edit', 16)}Modifier</button>` : ''}<button class="btn glass" style="height:40px;color:#FF8A94" data-a="layerDel" data-id="${sel.id}">${ic('trash', 16)}</button></div></div>` : `<div class="row" style="justify-content:space-between"><span class="t2" style="font-size:14px">Ajoute un texte ou un sticker son, puis glisse-le où tu veux.</span><button class="btn primary" style="height:40px" data-a="textEdit">${ic('plus', 16)}Texte</button></div>`;
      return hd + `<div class="editor"><div class="steps" style="margin:0 20px 10px">${[1, 2, 3, 4].map(i => `<i class="${i <= c.step ? 'on' : ''}"></i>`).join('')}</div><div class="ed-stage" id="edStage">${createMedia(c, true)}<div class="ed-tools">${tools.map(([k, l, i]) => `<button class="ftool glass strong ${c.tool === k || (k === 'sticker' && c.texts.some(x => x.style === 'track')) ? 'on' : ''}" data-a="createTool" data-id="${k}">${ic(i, 22)}${l}</button>`).join('')}</div></div><div class="ed-panel glass strong">${panel}</div></div>`;
    }
    let body = '';
    if (c.step === 1) body = `${steps}<div class="srcs">${[['viz', 'Visuel animé', 'sparkle'], ['photos', 'Photos', 'photos'], ['video', 'Vidéo', 'video']].map(([k, l, i]) => `<button class="srcbtn glass ${c.src === k ? 'on' : ''}" data-a="createSrc" data-id="${k}" aria-pressed="${c.src === k}">${ic(i, 24)}${l}</button>`).join('')}</div>
      <div class="preview">${createMedia(c, false)}</div>
      ${c.src === 'viz' ? `<div class="styles">${VSTYLES.map(([k, l]) => `<button class="stylebtn glass ${c.style === k ? 'on' : ''}" data-a="createStyle" data-id="${k}" aria-pressed="${c.style === k}">${l}</button>`).join('')}</div>` : ''}
      ${c.src === 'photos' ? `<div class="thumbs">${c.photos.map((src, i) => `<div class="th"><img src="${src}" alt="Photo ${i + 1}"><button data-a="photoDel" data-id="${i}" aria-label="Retirer la photo ${i + 1}">${ic('close', 14)}</button></div>`).join('')}${c.photos.length < 10 ? `<label class="add glass" aria-label="Ajouter des photos">${ic('plus', 24)}<input type="file" accept="image/*" multiple class="sr" data-ch="photos"></label>` : ''}</div><p class="t3" style="font-size:12.5px">Les photos défilent au rythme du son. ${c.photos.length}/10</p>` : ''}
      ${c.src === 'video' ? `<label class="upload glass">${ic('video', 20)}${c.video ? 'Changer de vidéo' : 'Importer une vidéo'}<input type="file" accept="video/*" data-ch="video" class="sr"></label>` : ''}`;
    if (c.step === 2) body = `${steps}<div class="panel glass" style="padding:12px 14px">${waveHTML(c)}</div><div class="imp-row"><label class="btn glass">${ic('upload', 18)}Importer un son<input type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.flac" class="sr" data-ch="importAudioCreate"></label>${c.src === 'video' && c.videoFile ? `<button class="btn glass ${T(c.trackId) && T(c.trackId).genre === 'Son original' ? 'on' : ''}" data-a="origSound">${ic('video', 18)}Son original</button>` : ''}</div>
      <p class="result-h">Choisis le son</p><div class="panel glass"><div class="tracklist">${allTracks().map(x => `<div class="trow ${c.trackId === x.id ? 'cur' : ''}"><button class="trow-main" data-a="createTrack" data-id="${x.id}" aria-pressed="${c.trackId === x.id}">${cover(x, 48, 12)}<span class="tt"><b>${esc(x.title)}</b><small>${esc(x.artist)} · ${x.genre}</small></span>${c.trackId === x.id ? `<span style="color:var(--accent)">${icf('check', 22)}</span>` : ''}</button></div>`).join('')}</div></div>`;
    if (c.step === 4) body = `${steps}<div class="row" style="align-items:stretch"><div class="preview" style="width:120px;flex:none">${createMedia(c, false)}${c.texts.map(l => textLayerHTML(l, false)).join('')}</div><div class="field" style="flex:1"><label for="capIn">Légende</label><textarea id="capIn" rows="6" class="glass" data-in="caption" placeholder="Dis quelque chose… #hashtags" maxlength="200">${esc(c.caption)}</textarea></div></div>
      <div class="group glass"><div class="srow">${cover(t, 40, 12)}<span class="grow"><b>${esc(t.title)}</b><small>${esc(t.artist)} · extrait ${fmt(c.start)}, ${c.len} s</small></span><button class="chip glass" data-a="createGo" data-id="2">Changer</button></div>
        <div class="srow col"><span>Qui peut voir</span><div class="minisel">${['Public', 'Amis', 'Moi seulement'].map(v => `<button class="${c.vis === v ? 'on' : ''}" data-a="createVis" data-id="${v}" aria-pressed="${c.vis === v}">${v}</button>`).join('')}</div></div>
        ${swRow('Autoriser les commentaires', 'create.comments')}</div>
      <p class="t3" style="font-size:12px">En publiant, tu confirmes avoir les droits sur tes photos et vidéos, et l’accord des personnes qui y apparaissent. <button class="lnk" data-a="legal" data-id="community">Règles de la communauté</button></p>
      <button class="btn primary block" data-a="publish">${ic('send', 18)}Publier</button>`;
    return hd + `<div class="scroll">${body}</div>`; },
  after: (o, el) => { createAfter(el); },
};
OV.textEdit = {
  kind: 'sheet', label: 'Texte',
  html: o => { const te = U.te;
    return `<h2>${o.id ? 'Modifier le texte' : 'Ajouter un texte'}</h2>
    <div class="te-prev glass" id="tePrev"><span class="tl s-${te.style}" style="position:static;transform:none;${te.style === 'pill' ? 'background:' + te.color : 'color:' + te.color}">${esc(te.text || 'Ton texte')}</span></div>
    <label class="sr" for="teIn">Texte</label><textarea id="teIn" class="glass txt-in" rows="2" data-in="teText" maxlength="80" placeholder="Écris quelque chose">${esc(te.text)}</textarea>
    <div class="minisel">${TSTYLES.map(([k, l]) => `<button class="${te.style === k ? 'on' : ''}" data-a="teStyle" data-id="${k}" aria-pressed="${te.style === k}">${l}</button>`).join('')}</div>
    <div class="swatches">${['#FFFFFF', '#14102A'].concat(PALETTE).map(c => `<button class="swatch ${te.color === c ? 'on' : ''}" style="background:${c}" data-a="teColor" data-id="${c}" aria-label="Couleur ${c}" aria-pressed="${te.color === c}"></button>`).join('')}</div>
    <div class="btn-row">${o.id ? `<button class="btn glass" style="color:#FF8A94" data-a="layerDel" data-id="${o.id}">${ic('trash', 18)}Supprimer</button>` : ''}<button class="btn primary" data-a="teSave">${ic('check', 18)}Valider</button></div>`; },
  after: (o, el, fresh) => { if (fresh) setTimeout(() => { const i = $('#teIn'); if (i) i.focus(); }, 350); },
};
function createAfter(el) {
  const c = U.create; if (!c || !el) return;
  const wave = $('[data-wave]', el);
  if (wave) {
    const t = T(c.trackId);
    const setFrom = x => { const r = wave.getBoundingClientRect(); const ratio = clamp((x - r.left) / r.width, 0, 1); c.start = Math.round(clamp(ratio * t.dur - c.len / 2, 0, Math.max(0, t.dur - c.len))); const w0 = c.start / t.dur, w1 = (c.start + c.len) / t.dur; const win = $('.win', wave); win.style.left = w0 * 100 + '%'; win.style.width = (w1 - w0) * 100 + '%'; $$('i', wave).forEach((b, i, a) => { const pos = (i + 0.5) / a.length; b.classList.toggle('in', pos >= w0 && pos <= w1); }); const l = $('#waveLbl'); if (l) l.textContent = `Extrait : ${fmt(c.start)} → ${fmt(Math.min(t.dur, c.start + c.len))}`; };
    let on = false;
    wave.addEventListener('pointerdown', e => { on = true; try { wave.setPointerCapture(e.pointerId); } catch (er) {} setFrom(e.clientX); });
    wave.addEventListener('pointermove', e => { if (on) setFrom(e.clientX); });
    const up = () => { if (!on) return; on = false; playTrack(c.trackId, { queue: [c.trackId], at: c.start, source: 'Création' }); E.seek(c.start); };
    wave.addEventListener('pointerup', up); wave.addEventListener('pointercancel', up);
  }
  const stage = $('#edStage', el);
  if (stage) {
    let drag = null;
    stage.addEventListener('pointerdown', e => {
      const tl = e.target.closest('.tl'); if (e.target.closest('.ed-tools')) return;
      if (!tl) { if (c.sel) { c.sel = null; refreshOv('create'); } return; }
      const l = c.texts.find(x => x.id === tl.dataset.tl); if (!l) return;
      drag = { l, tl, moved: false, sx: e.clientX, sy: e.clientY }; try { stage.setPointerCapture(e.pointerId); } catch (er) {}
      $$('.tl', stage).forEach(x => x.classList.toggle('sel', x === tl));
    });
    stage.addEventListener('pointermove', e => {
      if (!drag) return; if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 4) drag.moved = true;
      const r = stage.getBoundingClientRect(); drag.l.x = clamp((e.clientX - r.left) / r.width * 100, 6, 94); drag.l.y = clamp((e.clientY - r.top) / r.height * 100, 5, 95);
      drag.tl.style.left = drag.l.x + '%'; drag.tl.style.top = drag.l.y + '%';
    });
    const up = () => { if (!drag) return; const d = drag; drag = null; const was = c.sel; c.sel = d.l.id; if (!d.moved && was === d.l.id && d.l.style !== 'track') A.textEdit({ dataset: { id: d.l.id } }); else if (c.tool !== 'text' || was !== d.l.id) { c.tool = 'text'; refreshOv('create'); } };
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
  }
}

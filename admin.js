'use strict';
// ================= Musio — panel admin (créateurs de Musio uniquement) =================
// Tableau de bord, utilisateurs (rôle, suspension), signalements, contenus, boosts.
// Les droits sont vérifiés par la base : ce panel ne fait qu'afficher et appeler.

// ---------- liens partageables ----------
const LINK_RE = /#(son|commu|post)-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
const linkFor = (kind, id) => `${APP_URL}#${kind}-${id}`;
function parseLink(s) {
  const m = String(s || '').match(LINK_RE); if (!m) return null;
  return { kind: m[1].toLowerCase(), id: m[2].toLowerCase(), type: { son: 'track', commu: 'community', post: 'post' }[m[1].toLowerCase()] };
}
async function copyText(txt, what) {
  try { await navigator.clipboard.writeText(txt); toast(`Lien ${what} copié`, ic('copy', 20)); }
  catch (e) { push('dialog', { title: 'Lien', text: txt, ok: 'OK' }); U.dialogFn = null; }
}
A.copySoundLink = el => { const t = T(el.dataset.id); const id = t && (t.cloud ? t.cloudId : t.cloudId); if (!id) { toast('Publie d’abord ce son sur Musio', ic('info', 20)); return; } copyText(linkFor('son', id), 'du son'); };
A.copyCommLink = el => { const k = comm(el.dataset.id); if (!k || !k.cloud) return; if (topOv() && topOv().type === 'more') pop(); copyText(linkFor('commu', k.id), 'de la communauté'); };
// ouvrir un lien reçu (musio…/#son-…, #commu-…)
async function openDeepLink(hash) {
  const l = parseLink(hash); if (!l || !SB || !uidMe()) return false;
  try { history.replaceState(null, '', location.pathname); } catch (e) {}
  if (l.type === 'track') {
    await loadTracks(true);
    const t = T('ct-' + l.id) || (S.myTracks || []).find(x => x.cloudId === l.id);
    if (!t) { toast('Ce son n’est plus disponible', ic('info', 20)); return true; }
    playTrack(t.id, { queue: [t.id], source: 'Lien partagé' }); popToScreen(); push('player'); return true;
  }
  if (l.type === 'community') {
    await loadComms(true);
    if (!comm(l.id)) { toast('Cette communauté n’existe plus', ic('info', 20)); return true; }
    U.tab = 'chat'; U.chatMode = 'comms'; U.ov = []; renderAll(); A.openCommunity({ dataset: { id: l.id } }); return true;
  }
  toast('Les liens de publications arrivent bientôt', ic('info', 20)); return true;
}

// ---------- boosts (lus par tout le monde, créés par les créateurs) ----------
const BOOST = { list: [], at: 0 };
async function loadBoosts(force) {
  if (!SB || !uidMe()) return;
  if (!force && Date.now() - BOOST.at < 60000) return;
  BOOST.at = Date.now();
  const { data, error } = await SB.from('boosts').select('id,target_type,target_id,label,starts_at,ends_at').gt('ends_at', new Date().toISOString()).order('ends_at', { ascending: false }).limit(200);
  if (error) { BOOST.at = 0; return; }
  BOOST.list = data || [];
}
const isBoosted = (type, id) => { const now = Date.now(); return BOOST.list.some(b => b.target_type === type && b.target_id === id && Date.parse(b.starts_at) <= now && Date.parse(b.ends_at) > now); };
const boostSort = (arr, type, key = x => x.id) => arr.slice().sort((a, b) => isBoosted(type, key(b)) - isBoosted(type, key(a)));
const boostBadge = (type, id) => isBoosted(type, id) ? `<span class="boost-tag">${ic('sparkle', 12)}Mis en avant</span>` : '';

// ---------- panel ----------
const ADM_TABS = [['dash', 'Stats'], ['users', 'Comptes'], ['reports', 'Signalés'], ['content', 'Contenus'], ['boosts', 'Boosts']];
const admOv = () => U.ov.find(o => o.type === 'admin');
const REASON = Object.fromEntries((typeof REPORT_REASONS !== 'undefined' ? REPORT_REASONS : []).map(([k, l]) => [k, l]));
const TYPE_LABEL = { user: 'Compte', post: 'Publication', conv: 'Conversation', comm: 'Communauté', cpost: 'Message', track: 'Son', community: 'Communauté' };
const DURATIONS = [['1h', 'Une heure', 3600e3], ['6h', '6 heures', 6 * 3600e3], ['24h', '24 heures', 24 * 3600e3], ['3j', '3 jours', 3 * 86400e3], ['7j', '7 jours', 7 * 86400e3], ['30j', '30 jours', 30 * 86400e3]];
function remaining(ms) {
  if (ms <= 0) return 'terminé';
  const h = Math.floor(ms / 3600e3), d = Math.floor(h / 24);
  return d >= 1 ? `encore ${d} j ${h % 24 ? (h % 24) + ' h' : ''}`.trim() : h >= 1 ? `encore ${h} h` : `encore ${Math.max(1, Math.round(ms / 60000))} min`;
}
const admErr = e => toast((e && e.message && !/fetch|network/i.test(e.message)) ? e.message : 'Connexion impossible. Réessaie.', ic('info', 20));
const statCard = (n, l, warn) => `<div class="glass${warn ? ' warn' : ''}"><b>${fmtN(n || 0)}</b><small>${l}</small></div>`;

function admBody(o) {
  const d = o.data[o.tab];
  if (d === undefined) return `<p class="t3" style="padding:20px 4px">Chargement…</p>`;
  if (d === null) return `<div class="empty">${ic('info', 32)}<span>Impossible de charger. <button class="lnk" data-a="admReload">Réessayer</button></span></div>`;
  if (o.tab === 'dash') {
    const st = d, pct = Math.min(100, Math.round((st.storage_mb || 0) / 1024 * 100));
    return `<p class="group-t">Communauté</p><div class="stat-cards adm-cards">${statCard(st.users, 'comptes')}${statCard(st.users_24h, 'nouveaux (24 h)')}${statCard(st.users_7d, 'nouveaux (7 j)')}${statCard(st.creators, 'créateurs')}${statCard(st.banned, 'suspendus', st.banned)}${statCard(st.reports_open, 'signalements ouverts', st.reports_open)}</div>
      <p class="group-t">Contenus</p><div class="stat-cards adm-cards">${statCard(st.communities, 'communautés')}${statCard(st.messages, 'messages')}${statCard(st.messages_24h, 'messages (24 h)')}${statCard(st.tracks, 'sons publiés')}${statCard(st.boosts_active, 'boosts actifs')}</div>
      <p class="group-t">Stockage des sons</p><div class="group glass" style="padding:14px 16px"><div class="range-row"><span>${(st.storage_mb || 0).toLocaleString('fr-FR')} Mo utilisés</span><span class="t2">${pct} % de 1 Go (plan gratuit)</span></div><div class="adm-bar"><i style="width:${pct}%"></i></div></div>`;
  }
  if (o.tab === 'users') {
    return `<label class="search-in glass">${ic('search', 18)}<span class="sr">Rechercher un compte</span><input data-in="admQ" placeholder="Nom ou @utilisateur" value="${esc(o.q || '')}" autocomplete="off" autocapitalize="off"></label>
      <div id="admUsers">${admUsersHTML(d)}</div>`;
  }
  if (o.tab === 'reports') {
    if (!d.length) return `<div class="empty">${ic('shield', 36)}<span>Aucun signalement en attente.</span></div>`;
    return `<div class="panel glass"><div class="list">${d.map(r => `<div class="li adm-rep"><span class="grow tt"><b>${esc(REASON[r.reason] || r.reason)}</b><small>${TYPE_LABEL[r.target_type] || r.target_type}${r.target_label ? ' · ' + esc(r.target_label) : ''} · ${ago(Date.parse(r.created_at))}${r.reporter ? ' · par @' + esc(r.reporter.handle) : ''}</small>
        <span class="adm-acts">${['comm', 'track'].includes(r.target_type) ? `<button class="btn glass" data-a="admOpen" data-k="${r.target_type}" data-id="${esc(r.target_id)}">Voir</button><button class="btn glass danger-t" data-a="admRemove" data-k="${r.target_type}" data-id="${esc(r.target_id)}" data-r="${r.id}">Supprimer le contenu</button>` : ''}<button class="btn primary" data-a="admRep" data-id="${r.id}" data-s="done">Traité</button><button class="btn glass" data-a="admRep" data-id="${r.id}" data-s="dismissed">Rejeter</button></span></span></div>`).join('')}</div></div>`;
  }
  if (o.tab === 'content') {
    const ks = d.comms || [], ts = d.tracks || [];
    return `<p class="group-t">Communautés (${ks.length})</p>${ks.length ? `<div class="panel glass"><div class="list">${ks.map(k => `<div class="li">${cover(k, 44, 12)}<span class="grow tt"><b>${esc(k.name)} ${boostBadge('community', k.id)}</b><small>${fmtN(k.members_count)} membre${k.members_count > 1 ? 's' : ''}${k.owner ? ' · @' + esc(k.owner.handle) : ''}</small></span><button class="icon-btn sm glass" data-a="admBoostPick" data-k="commu" data-id="${k.id}" aria-label="Booster">${ic('sparkle', 18)}</button><button class="icon-btn sm glass danger-t" data-a="admRemove" data-k="comm" data-id="${k.id}" aria-label="Supprimer">${ic('trash', 18)}</button></div>`).join('')}</div></div>` : '<p class="t3">Aucune communauté.</p>'}
      <p class="group-t">Sons publiés (${ts.length})</p>${ts.length ? `<div class="panel glass"><div class="list">${ts.map(r => `<div class="li">${cover({ color: r.color, shape: 'disc', art: r.cover_path ? pubUrl('covers', r.cover_path) : null }, 44, 12)}<span class="grow tt"><b>${esc(r.title)} ${boostBadge('track', r.id)}</b><small>${esc(r.artist)}${r.owner ? ' · @' + esc(r.owner.handle) : ''} · ${ago(Date.parse(r.created_at))}</small></span><button class="icon-btn sm glass" data-a="admBoostPick" data-k="son" data-id="${r.id}" aria-label="Booster">${ic('sparkle', 18)}</button><button class="icon-btn sm glass danger-t" data-a="admRemove" data-k="track" data-id="${r.id}" aria-label="Retirer">${ic('trash', 18)}</button></div>`).join('')}</div></div>` : '<p class="t3">Aucun son publié.</p>'}`;
  }
  if (o.tab === 'boosts') {
    const now = Date.now(), act = d.filter(b => Date.parse(b.ends_at) > now), old = d.filter(b => Date.parse(b.ends_at) <= now).slice(0, 10);
    return `<div class="group glass adm-boost"><p class="t2" style="font-size:14px;line-height:1.45">Colle le lien d’un son ou d’une communauté (bouton « Copier le lien »). Pendant la durée choisie, il passe en premier pour tout le monde, avec la mention « Mis en avant ».</p>
      <form class="auth-form" data-form="admBoost"><div class="field"><label for="admLink">Lien</label><input id="admLink" class="glass" placeholder="https://…/musio/#son-…" value="${esc(o.link || '')}" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
      <div class="field"><label>Durée</label><div class="chips wrap">${DURATIONS.map(([k, l]) => `<button type="button" class="chip glass ${o.dur === k ? 'on' : ''}" data-a="admDur" data-id="${k}" aria-pressed="${o.dur === k}">${l}</button>`).join('')}</div></div>
      <button type="submit" class="btn primary block" ${o.busy ? 'disabled' : ''}>${ic('sparkle', 18)}${o.busy ? 'Boost…' : 'Booster'}</button></form></div>
      <p class="group-t">En cours (${act.length})</p>${act.length ? `<div class="panel glass"><div class="list">${act.map(b => `<div class="li"><span class="sicon" style="background:#BF5AF2">${ic('sparkle', 17)}</span><span class="grow tt"><b>${esc(b.label || b.target_id)}</b><small>${TYPE_LABEL[b.target_type]} · ${remaining(Date.parse(b.ends_at) - now)}</small></span><button class="btn glass danger-t" style="height:36px;padding:0 14px" data-a="admUnboost" data-id="${b.id}">Arrêter</button></div>`).join('')}</div></div>` : '<p class="t3">Aucun boost en cours.</p>'}
      ${old.length ? `<p class="group-t">Terminés</p><div class="panel glass"><div class="list">${old.map(b => `<div class="li" style="opacity:.55"><span class="grow tt"><b>${esc(b.label || b.target_id)}</b><small>${TYPE_LABEL[b.target_type]} · fini ${ago(Date.parse(b.ends_at))}</small></span></div>`).join('')}</div></div>` : ''}`;
  }
  return '';
}
function admUsersHTML(list) {
  if (!list.length) return `<div class="empty">${ic('users', 32)}<span>Aucun compte trouvé.</span></div>`;
  const now = Date.now();
  return `<div class="panel glass"><div class="list">${list.map(u => { const banned = u.banned_until && Date.parse(u.banned_until) > now;
    return `<button class="li" data-a="admUser" data-id="${u.id}">${avatar({ name: u.name, color: u.color }, 44)}<span class="grow tt"><b>${esc(u.name)}${u.role === 'creator' ? ' <span class="adm-tag">Créateur</span>' : ''}${banned ? ' <span class="adm-tag red">Suspendu</span>' : ''}</b><small>@${esc(u.handle)}${isFinite(Date.parse(u.created_at)) ? ' · inscrit ' + ago(Date.parse(u.created_at)) : ''}</small></span>${ic('more', 18)}</button>`; }).join('')}</div></div>`;
}
OV.admin = {
  kind: 'screen', label: 'Panel admin',
  html: o => head('Panel admin') + `<div class="scroll adm">${seg('adm', ADM_TABS, o.tab, 'admTab')}<div id="admBody">${admBody(o)}</div></div>`,
};
function admRender() { const o = admOv(); if (!o) return; const b = $('#admBody'); if (b) b.innerHTML = admBody(o); else refreshOv('admin'); }
async function admLoad(tab, force) {
  const o = admOv(); if (!o) return;
  tab = tab || o.tab; if (!force && o.data[tab] !== undefined) return admRender();
  let res;
  if (tab === 'dash') { const r = await SB.rpc('admin_stats'); res = r.error ? null : r.data; if (r.error) admErr(r.error); }
  if (tab === 'users') res = await admUsers(o.q || '');
  if (tab === 'reports') { const r = await SB.from('reports').select('id,target_type,target_id,target_label,reason,status,created_at,reporter:profiles!reports_reporter_id_fkey(handle)').eq('status', 'open').order('created_at', { ascending: false }).limit(100); res = r.error ? null : r.data; }
  if (tab === 'content') {
    const [a, b] = await Promise.all([
      SB.from('communities').select('id,name,color,shape,members_count,created_at,owner:profiles(handle)').order('created_at', { ascending: false }).limit(100),
      SB.from('tracks').select('id,title,artist,color,cover_path,created_at,owner:profiles(handle)').order('created_at', { ascending: false }).limit(100),
    ]);
    await loadBoosts(true);
    res = a.error || b.error ? null : { comms: a.data, tracks: b.data };
  }
  if (tab === 'boosts') { const r = await SB.from('boosts').select('id,target_type,target_id,label,starts_at,ends_at').order('ends_at', { ascending: false }).limit(100); res = r.error ? null : r.data; }
  o.data[tab] = res; if (o.tab === tab) admRender();
}
async function admUsers(q) {
  let req = SB.from('profiles').select('id,name,handle,color,role,banned_until,created_at').order('created_at', { ascending: false }).limit(60);
  const clean = q.trim().replace(/^@/, '').replace(/[^\p{L}\p{N}._ -]/gu, '').slice(0, 30);
  if (clean) req = req.or(`handle.ilike.%${clean}%,name.ilike.%${clean}%`);
  const r = await req; return r.error ? null : r.data;
}
A.openAdmin = () => { if (!isCreator()) return; popToScreen(); push('admin', { tab: 'dash', data: {}, dur: '24h', q: '' }); admLoad('dash'); };
A.admTab = el => { const o = admOv(); o.tab = el.dataset.id; refreshOv('admin'); admLoad(o.tab); };
A.admReload = () => { const o = admOv(); o.data[o.tab] = undefined; admRender(); admLoad(o.tab, true); };
let admQT; IN.admQ = el => { const o = admOv(); o.q = el.value; clearTimeout(admQT); admQT = setTimeout(async () => { const list = await admUsers(o.q); o.data.users = list; const box = $('#admUsers'); if (box && list) box.innerHTML = admUsersHTML(list); }, 280); };

// fiche d'un compte
OV.admUser = {
  kind: 'sheet', label: 'Compte',
  html: o => { const u = o.u, now = Date.now(), banned = u.banned_until && Date.parse(u.banned_until) > now, me = u.id === uidMe();
    return `<div class="row sh-head">${avatar({ name: u.name, color: u.color }, 56)}<span class="tt"><b>${esc(u.name)}</b><small>@${esc(u.handle)}${u.role === 'creator' ? ' · Créateur' : ''}${banned ? ' · suspendu jusqu’au ' + new Date(u.banned_until).toLocaleDateString('fr-FR') : ''}</small></span></div><div class="list">
      ${me ? '' : u.role === 'creator' ? `<button class="li danger" data-a="admRole" data-make="0">${ic('close', 22)}<span class="grow">Retirer le rôle créateur</span></button>` : `<button class="li" data-a="admRole" data-make="1">${LOGO(22)}<span class="grow">Donner le rôle créateur</span></button>`}
      ${u.role === 'creator' ? '' : banned ? `<button class="li" data-a="admBan" data-days="0">${ic('check', 22)}<span class="grow">Lever la suspension</span></button>` : [[1, '24 heures'], [7, '7 jours'], [30, '30 jours'], [36500, 'définitivement']].map(([d, l]) => `<button class="li danger" data-a="admBan" data-days="${d}">${ic('block', 22)}<span class="grow">Suspendre ${l}</span></button>`).join('')}
    </div><p class="pub-note">Un compte suspendu peut toujours se connecter, mais ne peut plus créer de communauté, écrire, rejoindre ni publier de son.</p>`; },
};
A.admUser = el => { const o = admOv(); const u = (o.data.users || []).find(x => x.id === el.dataset.id); if (u) push('admUser', { u }); };
A.admRole = async el => {
  const o = topOv(); const make = el.dataset.make === '1';
  const { error } = await SB.rpc('set_creator', { target_handle: o.u.handle, make });
  if (error) return admErr(error);
  pop(); toast(make ? `@${o.u.handle} est créateur de Musio` : `Rôle retiré à @${o.u.handle}`, LOGO(24)); admLoad('users', true);
};
A.admBan = async el => {
  const o = topOv(), days = +el.dataset.days;
  const { error } = await SB.rpc('admin_ban', { target_handle: o.u.handle, days });
  if (error) return admErr(error);
  pop(); toast(days ? `@${o.u.handle} est suspendu` : `Suspension levée pour @${o.u.handle}`, ic(days ? 'block' : 'check', 20)); admLoad('users', true);
};

// signalements et contenus
A.admRep = async el => {
  const { error } = await SB.from('reports').update({ status: el.dataset.s }).eq('id', el.dataset.id);
  if (error) return admErr(error);
  const o = admOv(); o.data.reports = (o.data.reports || []).filter(r => r.id !== el.dataset.id); o.data.dash = undefined; admRender();
  toast(el.dataset.s === 'done' ? 'Signalement traité' : 'Signalement rejeté', ic('check', 20));
};
A.admOpen = async el => {
  if (el.dataset.k === 'track') return openDeepLink('#son-' + el.dataset.id);
  if (el.dataset.k === 'comm') return openDeepLink('#commu-' + el.dataset.id);
};
A.admRemove = el => {
  const k = el.dataset.k, id = el.dataset.id, rep = el.dataset.r;
  U.dialogFn = async () => {
    if (k === 'track') {
      const { data: row } = await SB.from('tracks').select('id,audio_path,cover_path').eq('id', id).maybeSingle();
      if (row && !await unpublish({ cloudId: row.id, audioPath: row.audio_path, coverPath: row.cover_path })) return;
      window.CLOUD_TRACKS = (window.CLOUD_TRACKS || []).filter(t => t.cloudId !== id);
    } else {
      const { error } = await SB.from('communities').delete().eq('id', id); if (error) return admErr(error);
      if (window.CLOUD_COMMS) window.CLOUD_COMMS = window.CLOUD_COMMS.filter(x => x.id !== id);
    }
    if (rep) await SB.from('reports').update({ status: 'done' }).eq('id', rep);
    const o = admOv(); if (o) { o.data.content = undefined; o.data.reports = undefined; o.data.dash = undefined; admLoad(o.tab, true); }
    toast('Contenu supprimé', ic('trash', 18));
  };
  push('dialog', { title: k === 'track' ? 'Retirer ce son de Musio ?' : 'Supprimer cette communauté ?', text: 'Le contenu sera supprimé pour tout le monde. Cette action est définitive.', ok: 'Supprimer', danger: true });
};

// boosts
A.admDur = el => { const o = admOv(); const i = $('#admLink'); if (i) o.link = i.value; o.dur = el.dataset.id; admRender(); };
A.admBoostPick = el => { const o = admOv(); o.link = linkFor(el.dataset.k, el.dataset.id); o.tab = 'boosts'; refreshOv('admin'); admLoad('boosts'); };
FORMS.admBoost = async () => {
  const o = admOv(); if (!o || o.busy) return;
  o.link = ($('#admLink') || {}).value || '';
  const l = parseLink(o.link);
  if (!l) { toast('Lien non reconnu : utilise « Copier le lien » sur un son ou une communauté', ic('info', 20)); return; }
  if (l.type === 'post') { toast('Les publications ne sont pas encore en ligne', ic('info', 20)); return; }
  const dur = (DURATIONS.find(d => d[0] === o.dur) || DURATIONS[2])[2];
  const table = l.type === 'track' ? 'tracks' : 'communities', col = l.type === 'track' ? 'title' : 'name';
  o.busy = true; admRender();
  const { data: target } = await SB.from(table).select(`id,${col}`).eq('id', l.id).maybeSingle();
  if (!target) { o.busy = false; admRender(); toast('Contenu introuvable (supprimé ?)', ic('info', 20)); return; }
  const now = new Date();
  const { error } = await SB.from('boosts').insert({ target_type: l.type, target_id: l.id, label: String(target[col]).slice(0, 120), starts_at: now.toISOString(), ends_at: new Date(now.getTime() + dur).toISOString() });
  o.busy = false;
  if (error) { admRender(); return admErr(error); }
  o.link = ''; toast(`« ${target[col]} » est mis en avant`, ic('sparkle', 20));
  await loadBoosts(true); o.data.dash = undefined; admLoad('boosts', true);
};
A.admUnboost = async el => {
  const { error } = await SB.from('boosts').delete().eq('id', el.dataset.id);
  if (error) return admErr(error);
  await loadBoosts(true); admLoad('boosts', true); toast('Boost arrêté', ic('check', 20));
};

// ---------- branchement ----------
function bootAdmin() {
  if (!SB) return;
  // signalements envoyés en ligne (en plus de l'appareil)
  const baseReason = A.reportReason;
  A.reportReason = el => {
    const o = topOv(); baseReason(el);
    if (!uidMe() || !o) return;
    const k = o.k, id = String(o.id || '');
    const t = k === 'track' ? T(id) : null, cm = k === 'comm' ? comm(id) : null;
    const target = t && t.cloud ? t.cloudId : cm && cm.cloud ? cm.id : id;
    const label = t ? t.title : cm ? cm.name : k === 'user' ? (user(id) || {}).name || '' : '';
    SB.from('reports').insert({ target_type: k, target_id: target.slice(0, 80), target_label: String(label).slice(0, 120), reason: el.dataset.id }).then(() => {}, () => {});
  };
  window.addEventListener('hashchange', () => { if (LINK_RE.test(location.hash)) openDeepLink(location.hash); });
}
function adminSignedIn() {
  loadBoosts(true);
  if (LINK_RE.test(location.hash)) setTimeout(() => openDeepLink(location.hash), 400);
}

'use strict';
// ================= Musio — comptes (Supabase) =================
// E-mail + mot de passe, confirmation par e-mail, mot de passe oublié, profil en ligne,
// rôle « créateur » attribué par un autre créateur, suppression du compte.
// Sans config.js rempli, l'app fonctionne comme avant, en mode local (données sur l'appareil).

const CFG = window.MUSIO_CONFIG || {};
// erreur renvoyée par Apple / Google / Supabase dans l'adresse au retour (lue avant que le client ne touche à l'URL)
const RET_ERR = (() => { const q = new URLSearchParams(location.search), h = new URLSearchParams(location.hash.slice(1)); const d = q.get('error_description') || h.get('error_description'); return d ? d.replace(/\+/g, ' ') : null; })();
const SB = (CFG.supabaseUrl && CFG.supabaseAnonKey && window.supabase && window.supabase.createClient)
  ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null;
window.MUSIO_CLOUD = !!SB;
const AUTH = { user: null, recovery: false, booted: false };
const APP_URL = location.origin + location.pathname.replace(/index\.html$/, '');

// ---------- anti-robots (Cloudflare Turnstile) ----------
// Le jeton est demandé au moment d'envoyer le formulaire. Dans la plupart des cas
// rien ne s'affiche ; si Cloudflare a un doute, une petite vérification apparaît.
const TS_KEY = CFG.turnstileSiteKey || '';
const CAP = { widget: null, done: null, fail: null, loading: null };
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!CAP.loading) CAP.loading = new Promise((res, rej) => {
    const sc = document.createElement('script');
    sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    sc.async = true; sc.onload = () => window.turnstile ? res(window.turnstile) : rej(new Error('captcha'));
    sc.onerror = () => { CAP.loading = null; rej(new Error('captcha')); };
    document.head.appendChild(sc);
  });
  return CAP.loading;
}
function captchaToken() {
  if (!TS_KEY) return Promise.resolve(undefined);
  return loadTurnstile().then(ts => new Promise((res, rej) => {
    let host = document.getElementById('captchaHost');
    if (!host) {
      host = document.createElement('div'); host.id = 'captchaHost'; host.className = 'captcha-host glass strong';
      host.innerHTML = '<b>Vérification anti-robots</b><small>Une seconde, on vérifie que tu es bien humain.</small><div id="captchaBox"></div>';
      document.body.appendChild(host);
    }
    const end = () => { clearTimeout(tm); host.classList.remove('on'); CAP.done = CAP.fail = null; };
    const tm = setTimeout(() => { if (CAP.fail) CAP.fail(); }, 90000);
    CAP.done = t => { end(); res(t); };
    CAP.fail = () => { end(); rej(new Error('captcha')); };
    if (CAP.widget == null) {
      CAP.widget = ts.render('#captchaBox', {
        sitekey: TS_KEY, theme: 'dark', language: 'fr', execution: 'execute', appearance: 'interaction-only',
        callback: t => CAP.done && CAP.done(t),
        'error-callback': () => { if (CAP.fail) CAP.fail(); return true; },
        'expired-callback': () => {},
        'before-interactive-callback': () => host.classList.add('on'),
        'after-interactive-callback': () => host.classList.remove('on'),
      });
    } else { try { ts.reset(CAP.widget); } catch (e) {} }
    ts.execute(CAP.widget);
  }));
}
// ---------- Continuer avec Apple / Google ----------
// Les boutons n'apparaissent que pour les fournisseurs activés dans Supabase (Authentication › Sign In / Providers).
const OAUTH = { list: null };
const OAUTH_NAME = { apple: 'Apple', google: 'Google' };
async function loadProviders() {
  try {
    const r = await fetch(CFG.supabaseUrl + '/auth/v1/settings', { headers: { apikey: CFG.supabaseAnonKey } });
    const ext = ((await r.json()) || {}).external || {};
    OAUTH.list = ['apple', 'google'].filter(p => ext[p]);
  } catch (e) { OAUTH.list = []; }
  if (U.ov.some(o => o.type === 'onboarding')) refreshOv('onboarding');
}
function oauthHTML(sep) {
  if (!OAUTH.list || !OAUTH.list.length) return '';
  const busy = obState().busy ? 'disabled' : '';
  return `<div class="oauth">${OAUTH.list.map(p => `<button type="button" class="btn block oauth-btn oauth-${p}" data-a="authOAuth" data-id="${p}" ${busy}>Continuer avec ${OAUTH_NAME[p]}</button>`).join('')}</div>${sep ? '<div class="or" role="separator"><span>ou</span></div>' : ''}`;
}
A.authOAuth = async el => {
  const p = el.dataset.id; if (!OAUTH_NAME[p]) return;
  obSet({ busy: true, err: '' });
  const { error } = await SB.auth.signInWithOAuth({ provider: p, options: { redirectTo: APP_URL } });
  if (error) obSet({ busy: false, err: authErr(error) });
};
function urlAuthError() { if (RET_ERR) { try { history.replaceState(null, '', location.pathname); } catch (e) {} } return RET_ERR; }
const CAPTCHA_ERR = 'La vérification anti-robots n’a pas abouti. Vérifie ta connexion puis réessaie.';

if (SB) SB.auth.onAuthStateChange((event, session) => {
  AUTH.user = session ? session.user : null;
  if (event === 'PASSWORD_RECOVERY') { AUTH.recovery = true; if (AUTH.booted) push('authNewPass'); }
});

// ---------- messages d'erreur lisibles ----------
function authErr(e) {
  const m = String((e && (e.message || e.error_description)) || e || '').toLowerCase();
  if (/captcha/.test(m)) return CAPTCHA_ERR;
  if (/provider is not enabled|unsupported provider/.test(m)) return 'Cette méthode de connexion n’est pas encore activée.';
  if (/access_denied|user denied|cancel/.test(m)) return 'Connexion annulée.';
  if (/email address not authorized|not authorized/.test(m)) return 'Les e-mails de Musio ne sont pas encore activés pour cette adresse. Réessaie plus tard ou contacte l’équipe Musio.';
  if (/invalid login credentials/.test(m)) return 'E-mail ou mot de passe incorrect.';
  if (/email not confirmed/.test(m)) return 'Confirme d’abord ton adresse e-mail : clique sur le lien reçu (regarde aussi dans les spams).';
  if (/already registered|already been registered|user already exists/.test(m)) return 'Un compte existe déjà avec cet e-mail. Connecte-toi.';
  if (/password should be|password is too short|weak password|at least/.test(m)) return 'Mot de passe trop faible : 8 caractères minimum, avec des lettres et des chiffres.';
  if (/same password|should be different/.test(m)) return 'Choisis un mot de passe différent de l’ancien.';
  if (/rate limit|too many|only request this after|security purposes/.test(m)) return 'Trop d’essais. Patiente un peu avant de réessayer.';
  if (/unable to validate email|invalid email|email address .* is invalid/.test(m)) return 'Cette adresse e-mail n’est pas valide.';
  if (/duplicate key|profiles_handle_key|23505/.test(m)) return 'Ce nom d’utilisateur est déjà pris.';
  if (/profiles_handle_check/.test(m)) return 'Nom d’utilisateur : 2 à 24 caractères, lettres minuscules, chiffres, points ou tirets bas.';
  if (/failed to fetch|network|load failed|fetch/.test(m)) return 'Connexion impossible. Vérifie ta connexion Internet.';
  return (e && e.message) || 'Une erreur est survenue. Réessaie.';
}
const okEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
const okPass = s => s.length >= 8 && /[a-zA-Z]/.test(s) && /\d/.test(s);
function cleanHandle(h, name) {
  let v = (h || name || '').trim().replace(/^@/, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9._]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 24);
  if (v.length < 2) v = (v + 'musio').slice(0, 5) + Math.floor(Math.random() * 900 + 100);
  return v;
}

// ---------- profil ----------
function applyProfile(p) {
  if (typeof cloudSignedIn === 'function') setTimeout(cloudSignedIn, 0);
  S.me.name = p.name; S.me.handle = p.handle; S.me.bio = p.bio || ''; S.me.color = p.color || S.me.color; S.me.role = p.role;
  if (Array.isArray(p.genres)) S.prefs.genres = p.genres.slice();
  S.uid = p.id; S.onboarded = true; save();
}
async function loadProfile(uid) {
  const { data, error } = await SB.from('profiles').select('id,name,handle,bio,color,genres,role').eq('id', uid).maybeSingle();
  if (error) throw error;
  return data;
}
async function cloudSaveProfile(fields) {
  if (!SB || !AUTH.user) return true;
  const { error } = await SB.from('profiles').update(fields).eq('id', AUTH.user.id);
  if (error) { toast(authErr(error), ic('info', 20)); return false; }
  return true;
}
// remet l'appareil à zéro (changement de compte, déconnexion)
function wipeLocal() {
  try { localStorage.removeItem(KEY); } catch (e) {}
  (S.myTracks || []).forEach(t => { IDB.del(t.id).catch(() => {}); });
  E.pause(); S = fresh(); FRIENDS = clone(D.friends);
  Object.assign(P, { trackId: null, queue: [], qi: 0, shuffle: false, repeat: 'off', lyrics: false, source: '', post: null });
  Object.assign(U, { tab: 'feed', ov: [], activePost: null, typing: {} });
  if (typeof GEO !== 'undefined') { GEO.pos = null; GEO.err = ''; if (typeof syncMarkers === 'function') syncMarkers(); }
  applyTheme();
}
// après une connexion réussie : profil existant → app ; sinon → création du profil
async function afterSignIn(u) {
  AUTH.user = u;
  if (S.uid && S.uid !== u.id) wipeLocal();
  let prof = null;
  try { prof = await loadProfile(u.id); }
  catch (e) { toast(authErr(e), ic('info', 20)); return; }
  if (prof) {
    applyProfile(prof); U.ov = []; renderAll();
    toast(`Content de te revoir, ${S.me.name}`, avatar(user('me'), 30));
    return;
  }
  S.uid = u.id; save();
  const md = u.user_metadata || {};
  if (!S.me.name && (md.full_name || md.name)) S.me.name = String(md.full_name || md.name).trim().slice(0, 30);
  U.ob = Object.assign(U.ob || {}, { step: 1, name: U.ob && U.ob.name || String(md.full_name || md.name || '').trim().slice(0, 30), handle: U.ob && U.ob.handle || '', genres: [], age: !!(U.ob && U.ob.age), terms: !!(U.ob && U.ob.terms), err: '', busy: false });
  if (!U.ov.some(o => o.type === 'onboarding')) { U.ov = []; push('onboarding'); } else refreshOv('onboarding');
}

// ---------- écrans d'accueil (inscription, connexion…) ----------
function authStepHTML(o) {
  const err = o.err ? `<div class="auth-err glass" role="alert">${ic('info', 18)}<span>${esc(o.err)}</span></div>` : '';
  const busy = o.busy ? 'disabled' : '';
  const email = `<div class="field"><label for="auEmail">Adresse e-mail</label><input id="auEmail" class="glass" type="email" inputmode="email" autocomplete="email" autocapitalize="off" spellcheck="false" value="${esc(o.email || '')}" placeholder="toi@exemple.fr" required></div>`;
  const pass = (id, label, ac) => `<div class="field"><label for="${id}">${label}</label><div class="pw"><input id="${id}" class="glass" type="password" autocomplete="${ac}" minlength="8" required placeholder="8 caractères minimum"><button type="button" class="pw-eye" data-a="authEye" data-id="${id}" aria-label="Afficher le mot de passe">${ic('eye', 18)}</button></div></div>`;
  if (o.step === 'signup') return `<h1>Créer ton compte</h1><p class="t2">${OAUTH.list && OAUTH.list.length ? 'En un clic, ou avec ton adresse e-mail.' : 'Ton e-mail sert à te connecter et à récupérer ton compte.'}</p>${oauthHTML(true)}
    <form class="auth-form" data-form="authSignup">${email}${pass('auPass', 'Mot de passe', 'new-password')}
      <div class="group glass" style="padding:6px 16px">
        <div class="check ${o.age ? 'on' : ''}"><button type="button" class="box" data-a="obCheck" data-id="age" role="checkbox" aria-checked="${!!o.age}" aria-label="J’ai 15 ans ou plus">${o.age ? icf('check', 16) : ''}</button><span>J’ai <b>15 ans ou plus</b>. Si j’ai moins de 18 ans, mes parents sont informés.</span></div>
        <div class="check ${o.terms ? 'on' : ''}"><button type="button" class="box" data-a="obCheck" data-id="terms" role="checkbox" aria-checked="${!!o.terms}" aria-label="J’accepte les conditions">${o.terms ? icf('check', 16) : ''}</button><span>J’accepte les <button type="button" class="lnk" data-a="legal" data-id="cgu">Conditions d’utilisation</button> et la <button type="button" class="lnk" data-a="legal" data-id="privacy">Politique de confidentialité</button>.</span></div>
      </div>${err}
      <button type="submit" class="btn primary block" ${busy || (o.age && o.terms ? '' : 'disabled')}>${o.busy ? 'Création…' : 'Créer mon compte'}</button>
      ${TS_KEY ? `<p class="t3 cap-note">${ic('shield', 14)}Protégé contre les robots par Cloudflare Turnstile.</p>` : ''}<p class="t2" style="text-align:center;font-size:14px">Déjà inscrit·e ? <button type="button" class="lnk" data-a="authGo" data-id="login">Se connecter</button></p></form>`;
  if (o.step === 'login') return `<h1>Se connecter</h1><p class="t2">Content de te revoir.</p>${oauthHTML(true)}
    <form class="auth-form" data-form="authLogin">${email}${pass('auPass', 'Mot de passe', 'current-password')}
      <button type="button" class="lnk" style="align-self:flex-end;font-size:14px" data-a="authGo" data-id="forgot">Mot de passe oublié ?</button>${err}
      <button type="submit" class="btn primary block" ${busy}>${o.busy ? 'Connexion…' : 'Se connecter'}</button>
      <p class="t2" style="text-align:center;font-size:14px">Pas encore de compte ? <button type="button" class="lnk" data-a="authGo" data-id="signup">Créer un compte</button></p></form>`;
  if (o.step === 'forgot') return `<h1>Mot de passe oublié</h1><p class="t2">Indique ton adresse : tu recevras un lien pour choisir un nouveau mot de passe.</p>
    <form class="auth-form" data-form="authForgot">${email}${err}<button type="submit" class="btn primary block" ${busy}>${o.busy ? 'Envoi…' : 'Envoyer le lien'}</button></form>`;
  if (o.step === 'check') return `<div class="ob-hero" style="margin-top:20px">${ic('mail', 56)}<h1 style="text-align:center">Regarde tes e-mails</h1><p class="t2" style="text-align:center;max-width:320px">${o.mailFor === 'reset' ? 'Nous avons envoyé un lien pour changer ton mot de passe à' : 'Nous avons envoyé un lien de confirmation à'} <b style="color:#fff">${esc(o.email || '')}</b>. Ouvre-le sur cet appareil pour continuer.</p><p class="t3" style="text-align:center;font-size:13px">Rien reçu ? Regarde dans les spams ou les promotions.</p></div>
    ${err}<div class="grow"></div>${o.mailFor === 'reset' ? '' : `<button class="btn glass block" data-a="authResend" ${busy}>Renvoyer l’e-mail</button>`}<button class="btn primary block" data-a="authGo" data-id="login">J’ai confirmé, me connecter</button>`;
  return '';
}
const obState = () => U.ob || (U.ob = { step: 0, name: '', handle: '', genres: [], age: false, terms: false });
function obSet(d) { const pw = $('#auPass'), v = pw ? pw.value : ''; Object.assign(obState(), d); refreshOv('onboarding'); const p2 = $('#auPass'); if (p2 && v && !p2.value) p2.value = v; }
function keepEmail() { const i = $('#auEmail'); if (i) obState().email = i.value.trim(); }

A.authGo = el => { if (TS_KEY) loadTurnstile().catch(() => {}); keepEmail(); obSet({ step: el.dataset.id, err: '', busy: false }); const s = $('.obs .ob'); if (s) s.scrollTop = 0; setTimeout(() => { const i = $('#auEmail'); if (i && !i.value) i.focus(); else { const p = $('#auPass'); if (p) p.focus(); } }, 120); };
A.authEye = el => { const i = $('#' + el.dataset.id); if (!i) return; i.type = i.type === 'password' ? 'text' : 'password'; el.setAttribute('aria-label', i.type === 'password' ? 'Afficher le mot de passe' : 'Masquer le mot de passe'); };

FORMS.authSignup = async () => {
  const o = obState(); if (o.busy) return;
  const email = $('#auEmail').value.trim(), pw = $('#auPass').value;
  o.email = email;
  if (!okEmail(email)) return obSet({ err: 'Cette adresse e-mail n’est pas valide.' });
  if (!okPass(pw)) return obSet({ err: 'Mot de passe trop faible : 8 caractères minimum, avec des lettres et des chiffres.' });
  if (!o.age || !o.terms) return obSet({ err: 'Coche les deux cases pour continuer.' });
  obSet({ busy: true, err: '' });
  let captcha; try { captcha = await captchaToken(); } catch (e) { return obSet({ busy: false, err: CAPTCHA_ERR }); }
  const { data, error } = await SB.auth.signUp({ email, password: pw, options: { emailRedirectTo: APP_URL, captchaToken: captcha } });
  if (error) return obSet({ busy: false, err: authErr(error) });
  S.consents.at = Date.now(); o.accepted = true; save();
  if (data.session) { obSet({ busy: false }); return afterSignIn(data.session.user); }
  obSet({ step: 'check', mailFor: 'signup', busy: false });
};
FORMS.authLogin = async () => {
  const o = obState(); if (o.busy) return;
  const email = $('#auEmail').value.trim(), pw = $('#auPass').value;
  o.email = email;
  if (!okEmail(email) || !pw) return obSet({ err: 'Indique ton e-mail et ton mot de passe.' });
  obSet({ busy: true, err: '' });
  let captcha; try { captcha = await captchaToken(); } catch (e) { return obSet({ busy: false, err: CAPTCHA_ERR }); }
  const { data, error } = await SB.auth.signInWithPassword({ email, password: pw, options: { captchaToken: captcha } });
  if (error) return obSet({ busy: false, err: authErr(error) });
  obSet({ busy: false });
  afterSignIn(data.user);
};
FORMS.authForgot = async () => {
  const o = obState(); if (o.busy) return;
  const email = $('#auEmail').value.trim(); o.email = email;
  if (!okEmail(email)) return obSet({ err: 'Cette adresse e-mail n’est pas valide.' });
  obSet({ busy: true, err: '' });
  let captcha; try { captcha = await captchaToken(); } catch (e) { return obSet({ busy: false, err: CAPTCHA_ERR }); }
  const { error } = await SB.auth.resetPasswordForEmail(email, { redirectTo: APP_URL, captchaToken: captcha });
  if (error) return obSet({ busy: false, err: authErr(error) });
  obSet({ step: 'check', mailFor: 'reset', busy: false });
};
A.authResend = async () => {
  const o = obState(); if (o.busy || !o.email) return;
  obSet({ busy: true, err: '' });
  let captcha; try { captcha = await captchaToken(); } catch (e) { return obSet({ busy: false, err: CAPTCHA_ERR }); }
  const { error } = await SB.auth.resend({ type: 'signup', email: o.email, options: { emailRedirectTo: APP_URL, captchaToken: captcha } });
  obSet({ busy: false, err: error ? authErr(error) : '' });
  if (!error) toast('E-mail renvoyé', ic('check', 20));
};

// fin de l'accueil en ligne : création du profil
async function cloudFinish() {
  const o = obState(); if (o.busy) return;
  if (!AUTH.user) { obSet({ step: 'login', err: 'Ta session a expiré : reconnecte-toi.' }); return; }
  const name = o.name.trim().slice(0, 30), handle = cleanHandle(o.handle, o.name);
  obSet({ busy: true });
  const { data: free, error: e1 } = await SB.rpc('handle_available', { h: handle });
  if (e1) { obSet({ busy: false }); toast(authErr(e1), ic('info', 20)); return; }
  if (!free) { obSet({ busy: false, step: 1, handle }); toast(`@${handle} est déjà pris : choisis un autre nom d’utilisateur`, ic('info', 20)); return; }
  const row = { id: AUTH.user.id, name, handle, color: S.me.color, genres: o.genres.slice() };
  const { error } = await SB.from('profiles').insert(row);
  if (error) { obSet({ busy: false, step: /handle/.test(error.message) || error.code === '23505' ? 1 : o.step }); toast(authErr(error), ic('info', 20)); return; }
  S.consents.at = S.consents.at || Date.now();
  applyProfile(Object.assign({ bio: '', role: 'user' }, row));
  U.ov = []; renderAll(); toast(`Bienvenue sur Musio, ${S.me.name}`, avatar(user('me'), 30)); haptic(20);
}

// ---------- nouveau mot de passe (après le lien reçu par e-mail) ----------
OV.authNewPass = {
  kind: 'sheet', label: 'Nouveau mot de passe', locked: false,
  html: o => `<h2>${o.change ? 'Changer le mot de passe' : 'Nouveau mot de passe'}</h2>
    <form class="auth-form" data-form="authNewPass"><div class="field"><label for="auNew">Nouveau mot de passe</label><div class="pw"><input id="auNew" class="glass" type="password" autocomplete="new-password" minlength="8" required placeholder="8 caractères minimum"><button type="button" class="pw-eye" data-a="authEye" data-id="auNew" aria-label="Afficher le mot de passe">${ic('eye', 18)}</button></div></div>
    ${o.err ? `<div class="auth-err glass" role="alert">${ic('info', 18)}<span>${esc(o.err)}</span></div>` : ''}
    <button type="submit" class="btn primary block" ${o.busy ? 'disabled' : ''}>${o.busy ? 'Enregistrement…' : 'Enregistrer'}</button></form>`,
};
FORMS.authNewPass = async () => {
  const o = U.ov.find(x => x.type === 'authNewPass'); if (!o || o.busy) return;
  const pw = $('#auNew').value;
  if (!okPass(pw)) { o.err = 'Mot de passe trop faible : 8 caractères minimum, avec des lettres et des chiffres.'; refreshOv('authNewPass'); return; }
  o.busy = true; o.err = ''; refreshOv('authNewPass');
  const { error } = await SB.auth.updateUser({ password: pw });
  if (error) { o.busy = false; o.err = authErr(error); refreshOv('authNewPass'); return; }
  AUTH.recovery = false; U.ov = U.ov.filter(x => x.type !== 'authNewPass'); renderOverlays();
  toast('Mot de passe enregistré', ic('check', 20));
  if (!S.onboarded && AUTH.user) afterSignIn(AUTH.user);
};

// ---------- gestion des créateurs ----------
OV.creators = {
  kind: 'screen', label: 'Créateurs de Musio',
  html: o => head('Créateurs de Musio') + `<div class="scroll">
    <p class="t2" style="font-size:14px;line-height:1.5">Les créateurs ont le badge « Créateur de Musio » sur leur profil. Chacun garde son propre compte et son mot de passe : pour ajouter quelqu’un, il crée d’abord son compte, puis tu lui donnes le rôle ici.</p>
    ${o.list ? `<div class="panel glass"><div class="list">${o.list.map(p => `<div class="li">${avatar({ name: p.name, color: p.color }, 44)}<span class="grow tt"><b>${esc(p.name)}${p.id === S.uid ? ' (toi)' : ''}</b><small>@${esc(p.handle)}</small></span>${p.id === S.uid ? '' : `<button class="btn glass danger-t" style="height:36px;padding:0 14px" data-a="creatorRemove" data-id="${esc(p.handle)}">Retirer</button>`}</div>`).join('')}</div></div>` : '<p class="t3">Chargement…</p>'}
    <form class="auth-form" data-form="creatorAdd"><div class="field"><label for="crHandle">Ajouter un créateur</label><input id="crHandle" class="glass" placeholder="@nom.utilisateur" autocomplete="off" autocapitalize="off" spellcheck="false"></div>
    <button type="submit" class="btn primary block" ${o.busy ? 'disabled' : ''}>${LOGO(20)}Donner le rôle créateur</button></form></div>`,
};
async function creatorsLoad() {
  const { data, error } = await SB.from('profiles').select('id,name,handle,color').eq('role', 'creator').order('created_at');
  const o = U.ov.find(x => x.type === 'creators'); if (!o) return;
  if (error) { toast(authErr(error), ic('info', 20)); return; }
  o.list = data; refreshOv('creators');
}
async function creatorSet(handle, make) {
  const o = U.ov.find(x => x.type === 'creators'); if (o) { o.busy = true; refreshOv('creators'); }
  const { error } = await SB.rpc('set_creator', { target_handle: handle, make });
  if (o) o.busy = false;
  if (error) { toast(error.message && !/fetch/i.test(error.message) ? error.message : authErr(error), ic('info', 20)); refreshOv('creators'); return; }
  toast(make ? `@${handle.replace(/^@/, '')} est maintenant créateur de Musio` : `Rôle retiré à @${handle}`, LOGO(24));
  creatorsLoad();
}
A.openCreators = () => { push('creators', { list: null }); creatorsLoad(); };
FORMS.creatorAdd = () => { const v = ($('#crHandle').value || '').trim().replace(/^@/, '').toLowerCase(); if (!v) return; creatorSet(v, true); };
A.creatorRemove = el => { const h = el.dataset.id; U.dialogFn = () => creatorSet(h, false); push('dialog', { title: `Retirer le rôle à @${h} ?`, text: 'Son compte reste actif, seul le badge « Créateur de Musio » disparaît.', ok: 'Retirer', danger: true }); };

// ---------- compte dans les réglages ----------
function accountGroupHTML() {
  const email = AUTH.user && AUTH.user.email || '';
  return `<p class="group-t">Compte</p><div class="group glass">
    <div class="srow"><span class="row" style="gap:12px">${sicon('mail')}<span class="grow tt"><span>E-mail</span><small>${esc(email)}</small></span></span></div>
    ${navRow('Changer le mot de passe', 'authChangePass', 'lock')}
    ${isCreator() ? navRow('Panel admin', 'openAdmin', 'shield', 'Statistiques, comptes, signalements, boosts') + navRow('Créateurs de Musio', 'openCreators', 'sparkle', 'Donner ou retirer le rôle créateur') : ''}
    <button class="srow" data-a="authLogout">${ic('logout', 20)}<span class="grow">Se déconnecter</span></button></div>`;
}
A.authChangePass = () => push('authNewPass', { change: true });
A.authLogout = () => { U.dialogFn = async () => { await SB.auth.signOut().catch(() => {}); wipeLocal(); renderAll(); startOnboarding(); toast('Tu es déconnecté·e', ic('check', 20)); }; push('dialog', { title: 'Se déconnecter ?', text: 'Les sons importés et les réglages de cet appareil seront effacés. Ton compte et ton profil restent en ligne.', ok: 'Se déconnecter' }); };

// ---------- démarrage ----------
async function bootAccounts() {
  if (!SB) { if (!S.onboarded) startOnboarding(); return; }
  if (typeof bootCloud === 'function') bootCloud();
  if (typeof bootAdmin === 'function') bootAdmin();

  // cocher une case ne doit pas effacer l'e-mail et le mot de passe saisis
  const baseCheck = A.obCheck;
  A.obCheck = el => { if (typeof obState().step !== 'string') return baseCheck(el); keepEmail(); const o = obState(); o[el.dataset.id] = !o[el.dataset.id]; haptic(); obSet({}); };
  // icônes utilisées par les écrans de compte
  if (!I.mail) I.mail = '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M4 7l8 6 8-6"/>';
  if (!I.logout) I.logout = '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 16l-4-4 4-4"/><path d="M6 12h10"/>';

  // les réglages, le profil et la suppression passent par le serveur
  const baseSettings = OV.settings.html;
  OV.settings.html = o => baseSettings(o)
    .replace('<p class="group-t">Apparence</p>', accountGroupHTML() + '<p class="group-t">Apparence</p>')
    .replace(/<button class="srow" data-a="reset"[\s\S]*?<\/button>/, '')
    .replace(/<button class="srow" data-a="replayOnboarding"[\s\S]*?<\/button>/, '')
    .replace(navRow('Revoir l’accueil', 'replayOnboarding', 'refresh'), '')
    .replace('version 0.2 · prototype', 'version 1.0');
  const baseProfile = FORMS.profile;
  FORMS.profile = async f => {
    const before = { name: S.me.name, handle: S.me.handle, bio: S.me.bio };
    const handle = cleanHandle($('#pfHandle').value, $('#pfName').value);
    $('#pfHandle').value = handle;
    baseProfile(f);
    S.me.handle = handle; save();
    const ok = await cloudSaveProfile({ name: S.me.name, handle: S.me.handle, bio: S.me.bio });
    if (!ok) { Object.assign(S.me, before); save(); renderAll(); }
  };
  const baseColor = A.meColor;
  if (baseColor) A.meColor = el => { baseColor(el); cloudSaveProfile({ color: S.me.color }); };
  A.deleteAccount = () => {
    U.dialogFn = async () => {
      const { error } = await SB.rpc('delete_my_account');
      if (error) { toast(error.message && !/fetch/i.test(error.message) ? error.message : authErr(error), ic('info', 20)); return; }
      await SB.auth.signOut().catch(() => {});
      wipeLocal(); renderAll(); startOnboarding(); toast('Compte supprimé', ic('check', 20));
    };
    push('dialog', { title: 'Supprimer ton compte ?', text: 'Ton compte, ton profil et toutes les données de cet appareil seront effacés. Cette action est définitive.', ok: 'Supprimer', danger: true });
  };

  loadProviders();
  const retErr = urlAuthError();
  let session = null;
  try { session = (await SB.auth.getSession()).data.session; } catch (e) {}
  AUTH.booted = true;
  if (!session) {
    if (S.onboarded) { S.onboarded = false; save(); renderAll(); }
    startOnboarding();
  } else {
    AUTH.user = session.user;
    if (S.onboarded && S.uid === session.user.id) {
      // déjà prêt : on rafraîchit le profil en arrière-plan (rôle, nom…)
      loadProfile(session.user.id).then(p => { if (p) { applyProfile(p); renderAll(); } else { S.onboarded = false; save(); afterSignIn(session.user); } }).catch(() => {});
    } else {
      await afterSignIn(session.user);
    }
  }
  if (AUTH.recovery) push('authNewPass');
  if (retErr && !session) { obSet({ err: authErr(retErr) }); toast(authErr(retErr), ic('info', 20)); }
}

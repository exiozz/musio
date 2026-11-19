'use strict';
// ================= Musio — noyau (état, fragments, rendu) =================
const D = window.DATA, E = window.Engine;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = s => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const fmtN = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace('.0', '').replace('.', ',') + ' M' : n >= 1e4 ? Math.round(n / 1e3) + ' k' : n >= 1e3 ? (n / 1e3).toFixed(1).replace('.0', '').replace('.', ',') + ' k' : String(n);
const clone = o => JSON.parse(JSON.stringify(o));
const uid = () => Math.random().toString(36).slice(2, 9);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = a => a[Math.floor(Math.random() * a.length)];
const wait = ms => new Promise(r => setTimeout(r, ms));
const ago = ts => { const m = Math.round((Date.now() - ts) / 60000); if (m < 1) return 'à l’instant'; if (m < 60) return m + ' min'; const h = Math.round(m / 60); if (h < 24) return h + ' h'; return Math.round(h / 24) + ' j'; };
const postViews = p => p.views || 0;
const hashN = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const haptic = (ms = 8) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} };
const isDesk = () => window.matchMedia('(min-width: 900px)').matches;

// ---------- icônes ----------
const I = {
  feed: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M10 8.5v7l6-3.5z"/>',
  map: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  match: '<rect x="7" y="3" width="12" height="16" rx="3"/><path d="M4 7v10a4 4 0 0 0 4 4h8"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.9A8 8 0 1 1 21 12z"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.2.6 3.5 2.8 3.5 6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  heart: '<path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z"/>',
  comment: '<path d="M20 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/>',
  share: '<path d="M14 4l7 7-7 7"/><path d="M21 11H10a7 7 0 0 0-7 7v1"/>',
  down: '<path d="M6 9l6 6 6-6"/>', up: '<path d="M6 15l6-6 6 6"/>', back: '<path d="M15 6l-6 6 6 6"/>', chevron: '<path d="M9 6l6 6-6 6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  shuffle: '<path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/>',
  repeat: '<path d="M17 2l4 4-4 4"/><path d="M3 11V10a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  lyrics: '<path d="M4 6h16M4 12h11M4 18h7"/>',
  headphones: '<path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/><path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>',
  queue: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  send: '<path d="M4 12l16-8-6 16-3-7z"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
  locate: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="7.5"/>',
  echo: '<circle cx="6.5" cy="12" r="2.6"/><path d="M11.5 7.6a6.2 6.2 0 0 1 0 8.8"/><path d="M15.2 4.4a10.8 10.8 0 0 1 0 15.2"/>',
  upload: '<path d="M12 15V4"/><path d="M7 9l5-5 5 5"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  photos: '<rect x="3" y="6" width="14" height="14" rx="3"/><path d="M7 3h11a3 3 0 0 1 3 3v11"/><circle cx="8.5" cy="11" r="1.5"/><path d="M17 17l-4-4-7 7"/>',
  video: '<rect x="3" y="6" width="13" height="12" rx="3"/><path d="M16 10l5-3v10l-5-3z"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  speaker: '<rect x="6" y="3" width="12" height="18" rx="3"/><circle cx="12" cy="14" r="3"/><path d="M12 7h.01"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2.5"/><path d="M11 18h2"/>',
  laptop: '<rect x="4" y="5" width="16" height="11" rx="2"/><path d="M2 19h20"/>',
  car: '<path d="M5 16l1.5-5a2 2 0 0 1 1.9-1.4h7.2a2 2 0 0 1 1.9 1.4L19 16"/><rect x="3" y="16" width="18" height="4" rx="1.5"/><path d="M6.5 20v1.5M17.5 20v1.5"/>',
  volume: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M3 3l18 18"/><path d="M10.6 6.1A10 10 0 0 1 12 6c6.5 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.3 7.6C3.6 9.4 2 12 2 12s3.5 6 10 6a9.6 9.6 0 0 0 4.2-1"/>',
  ghost: '<path d="M5 21V10a7 7 0 0 1 14 0v11l-2.5-2-2.3 2-2.2-2-2.2 2-2.3-2z"/><path d="M9.5 10h.01M14.5 10h.01"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 19a2 2 0 0 0 4 0"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  block: '<circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  text: '<path d="M5 7V5h14v2M12 5v14M9 19h6"/>',
  filters: '<circle cx="9" cy="9" r="5"/><circle cx="15" cy="9" r="5"/><circle cx="12" cy="15" r="5"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1L20 20M8.1 15.9L20 4"/>',
  sticker: '<path d="M14 3H7a4 4 0 0 0-4 4v10a4 4 0 0 0 4 4h7l7-7V7a4 4 0 0 0-4-4z"/><path d="M14 21v-3a4 4 0 0 1 4-4h3"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  cookie: '<path d="M12 3a9 9 0 1 0 9 9 4 4 0 0 1-5-5 4 4 0 0 1-4-4z"/><path d="M8.5 11h.01M12 15.5h.01M15.5 13h.01M9 16h.01"/>',
  scale: '<path d="M12 4v16M7 20h10M5 8h14M5 8l-3 6a3 3 0 0 0 6 0zM19 8l-3 6a3 3 0 0 0 6 0z"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  listplus: '<path d="M4 6h12M4 12h12M4 18h8M17 15v6M14 18h6"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.7M12 17h.01"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
};
const F = {
  play: '<path d="M8 5.6v12.8a.8.8 0 0 0 1.2.7l10-6.4a.8.8 0 0 0 0-1.4l-10-6.4a.8.8 0 0 0-1.2.7z"/>',
  pause: '<rect x="6.5" y="5" width="4" height="14" rx="1.2"/><rect x="13.5" y="5" width="4" height="14" rx="1.2"/>',
  prev: '<path d="M18 6.5v11a.6.6 0 0 1-.9.5L9 12.5a.6.6 0 0 1 0-1l8.1-5.5a.6.6 0 0 1 .9.5z"/><rect x="5" y="6" width="2.2" height="12" rx="1.1"/>',
  next: '<path d="M6 6.5v11a.6.6 0 0 0 .9.5L15 12.5a.6.6 0 0 0 0-1L6.9 6a.6.6 0 0 0-.9.5z"/><rect x="16.8" y="6" width="2.2" height="12" rx="1.1"/>',
  heart: '<path d="M12 20.5s-7.5-4.6-7.5-10.5A4.3 4.3 0 0 1 12 7.1 4.3 4.3 0 0 1 19.5 10c0 5.9-7.5 10.5-7.5 10.5z"/>',
  star: '<path d="M12 2.8l2.9 5.9 6.4.9-4.6 4.5 1.1 6.4L12 17.5l-5.8 3 1.1-6.4-4.6-4.5 6.4-.9z"/>',
  check: '<path d="M9.5 16.2L5.3 12l-1.4 1.4 5.6 5.6L21 7.5l-1.4-1.4z"/>',
};
const ic = (n, s = 22) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ''}</svg>`;
const icf = (n, s = 22) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${F[n] || ''}</svg>`;

// badge certifié : rosette festonnée + coche
const ROSETTE = (() => { let d = ''; const n = 12; for (let k = 0; k <= n; k++) { const av = ((k * 360 / n) - 90 + 15) * Math.PI / 180, ap = ((k * 360 / n) - 90) * Math.PI / 180; const vx = (12 + Math.cos(av) * 9.4).toFixed(2), vy = (12 + Math.sin(av) * 9.4).toFixed(2), px = (12 + Math.cos(ap) * 12.2).toFixed(2), py = (12 + Math.sin(ap) * 12.2).toFixed(2); if (k === 0) { const v0 = (((-1) * 360 / n) - 90 + 15) * Math.PI / 180; d += `M${(12 + Math.cos(v0) * 9.4).toFixed(2)} ${(12 + Math.sin(v0) * 9.4).toFixed(2)}`; } if (k < n) d += `Q${px} ${py} ${vx} ${vy}`; } return d + 'Z'; })();
const vBadge = (s = 16) => `<svg class="vbadge" width="${s}" height="${s}" viewBox="0 0 24 24" role="img" aria-label="Compte certifié"><path d="${ROSETTE}" fill="url(#vgrad)"/><path d="${ROSETTE}" fill="url(#vshine)"/><path d="M7.4 12.3l3 3 6.2-6.4" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const LOGO_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="mz-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B4A57"/><stop offset="1" stop-color="#161D25"/></linearGradient><linearGradient id="mz-teal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7DF0F2"/><stop offset=".5" stop-color="#3CC4CB"/><stop offset="1" stop-color="#2A98A6"/></linearGradient><linearGradient id="mz-navy" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5B86D6"/><stop offset=".55" stop-color="#3A5C9E"/><stop offset="1" stop-color="#27406F"/></linearGradient><clipPath id="mz-clip"><rect x="3" y="3" width="58" height="58" rx="17"/></clipPath><filter id="mz-puff" x="-15%" y="-15%" width="130%" height="140%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="h"/><feDiffuseLighting in="h" surfaceScale="5" diffuseConstant="1.18" lighting-color="#fff" result="d"><feDistantLight azimuth="250" elevation="52"/></feDiffuseLighting><feGaussianBlur in="d" stdDeviation=".45" result="d"/><feComposite in="SourceGraphic" in2="d" operator="arithmetic" k1="1.12" result="lit"/><feSpecularLighting in="h" surfaceScale="5" specularConstant="1.1" specularExponent="26" lighting-color="#fff" result="s"><fePointLight x="16" y="-8" z="34"/></feSpecularLighting><feGaussianBlur in="s" stdDeviation=".45" result="s"/><feComposite in="lit" in2="s" operator="arithmetic" k2="1" k3=".75" result="shine"/><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="4" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .14 0" result="grain"/><feBlend in="grain" in2="shine" mode="overlay" result="rubber"/><feComposite in="rubber" in2="SourceAlpha" operator="in" result="body"/><feGaussianBlur in="SourceAlpha" stdDeviation="1.5" result="sb"/><feOffset in="sb" dy="1.6" result="so"/><feFlood flood-color="#05080C" flood-opacity=".55"/><feComposite in2="so" operator="in" result="shadow"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="body"/></feMerge></filter><filter id="mz-pad" x="-10%" y="-10%" width="120%" height="125%" color-interpolation-filters="sRGB"><feGaussianBlur in="SourceAlpha" stdDeviation="3.2" result="h"/><feSpecularLighting in="h" surfaceScale="3" specularConstant=".7" specularExponent="18" lighting-color="#cfefff" result="s"><fePointLight x="18" y="-14" z="40"/></feSpecularLighting><feGaussianBlur in="s" stdDeviation=".6" result="s"/><feComposite in="SourceGraphic" in2="s" operator="arithmetic" k2="1" k3=".5" result="lit"/><feTurbulence type="fractalNoise" baseFrequency="1.4" numOctaves="2" seed="9" result="n"/><feColorMatrix in="n" type="matrix" values="0 0 0 0 .5 0 0 0 0 .5 0 0 0 0 .5 0 0 0 .18 0" result="grain"/><feBlend in="grain" in2="lit" mode="overlay" result="rubber"/><feComposite in="rubber" in2="SourceAlpha" operator="in"/></filter></defs><rect x="3" y="3" width="58" height="58" rx="17" fill="url(#mz-bg)" filter="url(#mz-pad)"/><g filter="url(#mz-puff)"><g clip-path="url(#mz-clip)"><path fill="url(#mz-teal)" d="M0 32C5 20 12 14.5 18.5 22 22.5 26.5 25 34 31 35.5 37 37 40 26.5 45 20 50 13.5 56.5 16.5 64 27V64H0Z"/></g></g><g filter="url(#mz-puff)"><g clip-path="url(#mz-clip)"><path fill="url(#mz-navy)" d="M0 44C5 34.5 11.5 31 18 36.5 22 40 25 46 31 47 37 48 40 40.5 45 35.5 50 30.5 56.5 32 64 40V64H0Z"/></g></g></svg>';
const LOGO = (s = 64) => LOGO_SVG.replace('<svg ', `<svg width="${s}" height="${s}" aria-hidden="true" class="logo-svg" `);
const ORBS = '<div class="waves" aria-hidden="true"><div class="wl w1"><div class="wv"></div></div><div class="wl w2"><div class="wv"></div></div><div class="wl w3"><div class="wv"></div></div><div class="wl w4"><div class="wv"></div></div></div>';
const ACCENTS = ['#3D8BFF', '#FF5C8A', '#9B85FF', '#2EC5FF', '#B8FF5C', '#FFC24B', '#FF8A3D'];
const PALETTE = ['#FF5C8A', '#9B85FF', '#2EC5FF', '#B8FF5C', '#FFC24B', '#FF8A3D', '#7C5CFF'];
const VSTYLES = [['waves', 'Vagues'], ['orbs', 'Orbes'], ['grid', 'Rétro'], ['particles', 'Étincelles'], ['bars', 'Spectre']];
const GENRES = ['Électro', 'Lo-fi', 'Rap', 'Indie', 'Chill', 'Jazz'];
const FILTERS = [['normal', 'Normal', 'none'], ['vif', 'Vif', 'saturate(1.45) contrast(1.08)'], ['nb', 'N&B', 'grayscale(1) contrast(1.12)'], ['retro', 'Rétro', 'sepia(.45) saturate(1.3) hue-rotate(-12deg) contrast(.95)'], ['froid', 'Froid', 'hue-rotate(18deg) saturate(1.15) brightness(1.04)'], ['chaud', 'Chaud', 'sepia(.28) saturate(1.35) brightness(1.03)'], ['nuit', 'Nuit', 'brightness(.8) contrast(1.3) saturate(.9)'], ['reve', 'Rêve', 'saturate(1.25) brightness(1.08) contrast(.9)']];
const filterCSS = k => (FILTERS.find(f => f[0] === k) || FILTERS[0])[2];
const TSTYLES = [['classic', 'Classique'], ['display', 'Affiche'], ['pill', 'Étiquette'], ['neon', 'Néon']];
const MAX_DIST = 300;

// ---------- état ----------
const KEY = 'musio-v1';
function fresh() {
  const now = Date.now();
  return {
    onboarded: false,
    me: { name: '', handle: '', bio: '', color: '#FF5C8A', followers: 0, photo: null, banner: null },
    settings: { profileViews: true, showMyVisits: true, accent: '#3D8BFF', blur: 24, orbs: true, autoplay: true, quality: 'Haute', volume: 80, device: 'Ce téléphone', shareListening: true, matchVisible: true, whoCanWrite: 'Tout le monde', private: false, listsVis: 'Tout le monde', notif: { messages: true, matchs: true, activite: true } },
    consents: { reco: true, audience: false, ads: false, at: null },
    prefs: { genres: [] },
    likedTracks: [], likedPosts: [], followed: [],
    blocked: [], hiddenPosts: [], reports: [], playlists: [], requested: [], trackArt: {}, myTracks: [],
    echoes: [],
    pviews: [],
    posts: clone(D.posts),
    convs: clone(D.convs).map(c => Object.assign(c, { msgs: c.msgs.map(m => Object.assign(m, { at: now - m.ago * 60000 })) })),
    communities: clone(D.communities).map(k => Object.assign(k, { posts: k.posts.map(p => Object.assign(p, { id: uid(), at: now - p.ago * 60000 })) })),
    match: { liked: [], passed: [], matches: [], newCount: 0, filters: { genres: [], dist: 100 } },
    activity: [],
    recent: [], listenSec: 0, player: null,
  };
}
function loadState() {
  let d = null; try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  const f = fresh(); if (!d || typeof d !== 'object') return f;
  const s = Object.assign(f, d), g = fresh();
  s.settings = Object.assign(g.settings, d.settings || {}); s.settings.notif = Object.assign(g.settings.notif, (d.settings || {}).notif || {});
  s.me = Object.assign(g.me, d.me || {}); s.consents = Object.assign(g.consents, d.consents || {}); s.prefs = Object.assign(g.prefs, d.prefs || {});
  s.match = Object.assign(g.match, d.match || {}); s.match.filters = Object.assign(g.match.filters, (d.match || {}).filters || {});
  return s;
}
let S = loadState();
let FRIENDS = clone(D.friends);
const P = Object.assign({ trackId: null, queue: [], qi: 0, shuffle: false, repeat: 'off', lyrics: false, source: '', post: null }, S.player || {});
P.post = null;
const U = { tab: 'feed', feedMode: 'foryou', mapMode: 'live', mapPanel: false, chatMode: 'msgs', chatQ: '', matchMode: 'discover', accTab: 'posts', genre: 'Tout', ov: [], typing: {}, search: { q: '', tab: 'Tout' }, unlocked: false, activePost: null, mapT: null, lastLyric: -1 };
let saveT, warnedQuota = false;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    const pack = strip => JSON.stringify(Object.assign({}, S, {
      posts: S.posts.map(p => { const q = Object.assign({}, p); if (q.video) { q.video = null; } if (strip && q.photos) { q.photos = null; } return q; }),
      trackArt: strip === 2 ? {} : S.trackArt,
      me: strip === 2 ? Object.assign({}, S.me, { banner: null }) : S.me,
      echoes: strip ? S.echoes.map(e => Object.assign({}, e, { img: null })) : S.echoes,
      player: { trackId: P.trackId, queue: P.queue, qi: P.qi, shuffle: P.shuffle, repeat: P.repeat, source: P.source },
    }));
    try { localStorage.setItem(KEY, pack(false)); }
    catch (e) { try { try { localStorage.setItem(KEY, pack(true)); } catch (e3) { localStorage.setItem(KEY, pack(2)); } if (!warnedQuota) { warnedQuota = true; toast('Stockage plein : les photos des publications ne seront pas gardées après fermeture', ic('info', 20)); } } catch (e2) {} }
  }, 300);
}

// ---------- recherches ----------
const T = id => D.tracks.find(t => t.id === id) || (S && S.myTracks || []).find(t => t.id === id);
const allTracks = () => (S.myTracks || []).concat(D.tracks);
// Les fichiers audio importés sont gardés dans IndexedDB (trop lourds pour localStorage)
window.AUDIO_SRC = {};
const IDB = (() => {
  let dbp = null;
  const db = () => dbp || (dbp = new Promise((res, rej) => { try { const r = indexedDB.open('musio-audio', 1); r.onupgradeneeded = () => r.result.createObjectStore('a'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); } catch (e) { rej(e); } }));
  const tx = (mode, fn) => db().then(d => new Promise((res, rej) => { const t = d.transaction('a', mode), st = t.objectStore('a'); const q = fn(st); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); }));
  return { put: (k, v) => tx('readwrite', st => st.put(v, k)), get: k => tx('readonly', st => st.get(k)), del: k => tx('readwrite', st => st.delete(k)) };
})();
const blocked = id => S.blocked.includes(id);
function totals(id) {
  const mine = S.posts.filter(p => p.author === id);
  let likes = mine.reduce((a, p) => a + p.likes + (S.likedPosts.includes(p.id) ? 1 : 0), 0), views = mine.reduce((a, p) => a + postViews(p), 0);
  return { likes, views };
}
function user(id) {
  if (id === 'me') return { id: 'me', name: S.me.name, handle: S.me.handle, color: S.me.color, bio: S.me.bio, photo: S.me.photo, me: true };
  return FRIENDS.find(f => f.id === id) || D.others.find(u => u.id === id) || D.profiles.find(p => p.id === id) || { id, name: String(id), handle: String(id), color: '#9B85FF' };
}
function nameUser(name, mine) { if (mine) return user('me'); return FRIENDS.find(f => f.name === name) || D.profiles.find(p => p.name === name) || { name, color: PALETTE[hashN(name) % PALETTE.length] }; }
function PL(id) {
  if (id === 'liked') return { id: 'liked', title: 'Titres likés', desc: 'Tes coups de cœur, au même endroit.', color: '#FF5C8A', shape: 'disc', tracks: S.likedTracks.slice().reverse() };
  return S.playlists.find(p => p.id === id) || D.playlists.find(p => p.id === id) || D.mixes.find(m => m.id === id);
}
const conv = id => S.convs.find(c => c.id === id);
const comm = id => S.communities.find(k => k.id === id);
const post = id => S.posts.find(p => p.id === id);

// ---------- fragments ----------
const initial = n => esc(String(n || '?').trim().charAt(0).toUpperCase());
const avatar = (u, s = 40) => `<span class="av" style="width:${s}px;height:${s}px;background:${u.color};font-size:${Math.round(s * 0.42)}px">${u.photo ? `<img src="${u.photo}" alt="">` : initial(u.name)}</span>`;
function shapeHTML(shape, ink = '#14102A') {
  switch (shape) {
    case 'disc': return `<i style="width:78%;aspect-ratio:1;right:-16%;bottom:-20%;border-radius:50%;background:${ink}"></i>`;
    case 'ring': return `<i style="left:18%;width:64%;aspect-ratio:1;top:50%;transform:translateY(-50%);border-radius:50%;background:radial-gradient(closest-side,transparent 58%,${ink} 60% 97%,transparent 100%)"></i>`;
    case 'dome': return `<i style="left:0;right:0;bottom:0;aspect-ratio:2/1;border-radius:50% 50% 0 0/100% 100% 0 0;background:${ink}"></i>`;
    case 'pill': return `<i style="left:25%;width:50%;aspect-ratio:50/72;top:50%;transform:translateY(-50%);border-radius:999px;background:${ink}"></i>`;
    case 'diamond': return `<i style="left:27%;width:46%;aspect-ratio:1;top:50%;transform:translateY(-50%) rotate(45deg);background:${ink}"></i>`;
    case 'stripes': return `<i style="left:0;right:0;top:50%;transform:translateY(-50%);aspect-ratio:5/3;max-height:60%;background:repeating-linear-gradient(180deg,${ink} 0 9%,transparent 9% 18%)"></i>`;
  }
  return '';
}
const ring2 = c => c ? `<i style="width:46%;aspect-ratio:1;right:4%;bottom:6%;border-radius:50%;box-shadow:inset 0 0 0 2px ${c}"></i>` : '';
const REACTS = { fire: ['🔥', 'pulse'], cry: ['😭', 'wobble'], casque: ['🎧', 'float'], cent: ['💯', 'pop'], coeur: ['💜', 'beat'], danse: ['🕺', 'sway'], wow: ['WOW', 'bounce', 1], mdr: ['MDR', 'shake', 1], pepite: ['PÉPITE', 'glow', 1], replay: ['EN BOUCLE', 'spin', 1] };
const reactHTML = (k, big) => { const r = REACTS[k]; return r ? `<span class="rx rx-${r[1]} ${r[2] ? 'rx-word' : ''} ${big ? 'big' : ''}" aria-hidden="true"><span>${r[0]}</span></span>` : ''; };
const echoCount = p => Math.round(p.shares * 0.6) + 3 + S.echoes.filter(e => e.post === p.id).length;
const myEcho = id => S.echoes.find(e => e.post === id && e.by === 'me');
const artOf = o => o && o.id && S.trackArt && S.trackArt[o.id];
const cover = (o, s = 48, r = 12, inner = '') => { const a = artOf(o); return `<span class="cover${a ? ' has-art' : ''}" style="width:${s}px;height:${s}px;border-radius:${r}px;background:${o.color}" aria-hidden="true">${a ? `<img class="art" src="${a}" alt="">` : shapeHTML(o.shape) + ring2(o.c2)}${inner}</span>`; };
const eqHTML = (on = true) => `<span class="eq ${on ? '' : 'off'}" aria-hidden="true"><i></i><i></i><i></i></span>`;
// badge « Créateur de Musio » : uniquement pour les comptes qui ont le rôle « creator »
const isCreator = () => !!(S && S.me && S.me.role === 'creator');
const cBadge = (s = 16) => `<svg class="vbadge cbadge" width="${s}" height="${s}" viewBox="0 0 24 24" role="img" aria-label="Créateur de Musio"><path d="${ROSETTE}" fill="url(#cgrad)"/><path d="M5.6 13.4c1.5-3.2 3-3.2 4.3 0s2.9 3.2 4.3 0 2.9-3.2 4.2 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"/><path d="M12 4.6l.9 1.8 2 .3-1.45 1.4.35 2-1.8-.95-1.8.95.35-2L9.1 6.7l2-.3z" fill="#fff"/></svg>`;
const verified = u => u && (u.id === 'me' || u.me) ? (isCreator() ? cBadge(16) : '') : u && u.verified ? vBadge(16) : '';
const devIcon = () => ({ 'Ce téléphone': 'phone', 'Cet ordinateur': 'laptop', 'Casque sans fil': 'headphones', 'Enceinte du salon': 'speaker', 'Voiture': 'car' }[S.settings.device] || 'phone');
function getK(key) { const [root, k] = key.split('.'); const o = { settings: S.settings, notif: S.settings.notif, consents: S.consents, create: U.create, ob: U.ob }[root]; return o ? o[k] : undefined; }
function setK(key, v) { const [root, k] = key.split('.'); const o = { settings: S.settings, notif: S.settings.notif, consents: S.consents, create: U.create, ob: U.ob }[root]; if (o) o[k] = v; }
const ICOL = { map: '#30D158', match: '#FF375F', block: '#FF453A', cookie: '#FF9F0A', download: '#0A84FF', help: '#0A84FF', doc: '#8E8E93', shield: '#0A84FF', users: '#30D158', music: '#FF375F', scale: '#8E8E93', info: '#8E8E93', refresh: '#8E8E93', phone: '#0A84FF', laptop: '#0A84FF', headphones: '#0A84FF', speaker: '#0A84FF', car: '#0A84FF', lock: '#5E5CE6', eye: '#5E5CE6', user: '#8E8E93', bell: '#FF453A', trash: '#FF453A', chat: '#30D158', sparkle: '#BF5AF2', volume: '#FF375F' };
const sicon = n => `<span class="sicon" style="background:${ICOL[n] || '#8E8E93'}">${ic(n, 17)}</span>`;
function swRow(label, key, sub, iconName) {
  const v = !!getK(key);
  return `<button class="srow" data-a="sw" data-k="${key}" role="switch" aria-checked="${v}">${iconName ? sicon(iconName) : ''}<span class="grow">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="sw ${v ? 'on' : ''}"></span></button>`;
}
const navRow = (label, action, iconName, sub, id) => `<button class="srow" data-a="${action}" ${id ? `data-id="${id}"` : ''}>${iconName ? sicon(iconName) : ''}<span class="grow">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</span>${ic('chevron', 18)}</button>`;
function seg(key, items, cur, action) {
  return `<div class="seg glass" role="tablist" data-lens="${key}"><i class="seg-lens" aria-hidden="true"></i>${items.map(([k, l]) => `<button class="${cur === k ? 'on' : ''}" data-a="${action}" data-id="${k}" role="tab" aria-selected="${cur === k}">${l}</button>`).join('')}</div>`;
}
function trackRow(t, q, src) {
  const cur = P.trackId === t.id, liked = S.likedTracks.includes(t.id);
  return `<div class="trow ${cur ? 'cur' : ''}"><button class="trow-main" data-a="playTrack" data-id="${t.id}" data-q="${q.join(',')}" data-src="${esc(src)}">${cover(t, 48, 12)}<span class="tt"><b>${esc(t.title)}</b><small>${esc(t.artist)} · ${t.genre} · ${fmt(t.dur)}</small></span>${cur ? eqHTML(E.isPlaying()) : ''}</button><button class="icon-btn sm ${liked ? 'liked-ic' : ''}" data-a="likeTrack" data-id="${t.id}" aria-pressed="${liked}" aria-label="${liked ? 'Retirer des titres likés' : 'Ajouter aux titres likés'}">${liked ? icf('heart', 20) : ic('heart', 20)}</button></div>`;
}
function gridPosts(list, echoed) {
  return `<div class="grid3">${list.map(p => { const t = T(p.trackId); return `<button class="gcell${echoed && echoed.includes(p.id) ? ' is-echo' : ''}" data-a="postView" data-id="${p.id}" style="background:${t.color}" aria-label="Publication : ${esc(p.caption)}">${p.photos && p.photos.length ? `<img src="${p.photos[0]}" alt="" style="filter:${filterCSS(p.filter)}">` : p.video ? `<span style="position:absolute;inset:0;display:grid;place-items:center">${ic('video', 28)}</span>` : shapeHTML(t.shape)}<span class="cnt">${icf('play', 12)}${fmtN(postViews(p))}</span>${echoed && echoed.includes(p.id) ? `<span class="gecho">${ic('echo', 13)}Écho</span>` : ''}</button>`; }).join('')}</div>`;
}
const captionHTML = s => esc(s).replace(/#([\wÀ-ÿ-]+)/g, (m, tag) => `<button class="tag" data-a="tag" data-id="${tag}">#${tag}</button>`);
const bigCover = t => artOf(t) ? `<div class="bigcover has-art" style="background:${t.color}"><img class="art" src="${artOf(t)}" alt="Pochette de ${esc(t.title)}"></div>` : `<div class="bigcover" style="background:${t.color}">${shapeHTML(t.shape)}${ring2(t.c2)}<span class="bc-t">${esc(t.title.toUpperCase())}</span><span class="bc-a">${esc(t.artist.toUpperCase())}</span></div>`;
function textLayerHTML(l, editable) {
  if (l.style === 'track') { const t = T(l.track); if (!t) return ''; return `<div class="tl s-track glass strong ${editable && U.create && U.create.sel === l.id ? 'sel' : ''}" data-tl="${l.id}" style="left:${l.x}%;top:${l.y}%">${cover(t, 36, 10)}<span><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></span></div>`; }
  const pill = l.style === 'pill' ? `background:${l.color};` : `color:${l.color};`;
  return `<div class="tl s-${l.style} ${editable && U.create && U.create.sel === l.id ? 'sel' : ''}" data-tl="${l.id}" style="left:${l.x}%;top:${l.y}%;${pill}">${esc(l.text)}</div>`;
}
function mediaHTML(p) {
  let m;
  if (p.photos && p.photos.length) m = `<div class="slides" data-bpm="${T(p.trackId).bpm}">${p.photos.map((src, i) => `<img src="${src}" alt="" class="${i === 0 ? 'on' : ''}">`).join('')}</div>`;
  else if (p.video) m = `<video src="${p.video}" muted loop playsinline preload="auto" autoplay></video>`;
  else m = `<canvas data-viz="${p.style || 'waves'}" data-track="${p.trackId}" aria-hidden="true"></canvas>`;
  return `<div class="media" style="filter:${filterCSS(p.filter)}">${m}</div>`;
}

// ---------- toasts & thème ----------
function toast(msg, iconHTML = '', onClick) {
  const host = $('#toasts'); if (!host) return;
  const el = document.createElement(onClick ? 'button' : 'div');
  el.className = 'toast glass strong'; el.innerHTML = `${iconHTML}<span>${esc(msg)}</span>`;
  el.setAttribute('role', 'status');
  if (onClick) el.addEventListener('click', () => { el.remove(); onClick(); });
  host.appendChild(el); while (host.children.length > 3) host.firstChild.remove();
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 380); }, 3400);
}
function lum(hex) { const h = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; }
function applyTheme() {
  const r = document.documentElement.style;
  r.setProperty('--accent', S.settings.accent);
  r.setProperty('--on-accent', lum(S.settings.accent) > 0.45 ? '#0B0A14' : '#FFFFFF');
  r.setProperty('--blur', S.settings.blur + 'px');
  $('#app').classList.toggle('still', !S.settings.orbs);
  const ua = navigator.userAgent;
  $('#app').classList.toggle('refract', !!window.chrome && /Chrome\//.test(ua) && !/iPhone|iPad|iPod|Edg\/|OPR\//.test(ua));
}

// ---------- audio ----------
function unlock() {
  if (U.unlocked) return; E.unlock(); E.setVolume(S.settings.volume / 100); U.unlocked = true; U.justUnlocked = Date.now();
  const u = $('.unlock'); if (u) u.remove();
  if (U.tab === 'feed' && U.feedMode !== 'music' && U.activePost && !hasScreen()) setTimeout(() => setActivePost(U.activePost, true), 0);
}
function playTrack(id, o = {}) {
  const t = T(id); if (!t) return;
  if (!U.unlocked) unlock();
  if (o.queue) { P.queue = o.queue.slice(); P.qi = Math.max(0, P.queue.indexOf(id)); }
  else if (!P.queue.includes(id)) { P.queue = [id]; P.qi = 0; } else P.qi = P.queue.indexOf(id);
  if (o.source) P.source = o.source;
  if (P.trackId === id && E.current() === t && (o.post === undefined || o.post === P.post)) { if (!E.isPlaying()) E.play(); refreshPlaying(false); return; }
  P.trackId = id; P.post = o.post || null;
  E.load(t, o.at || 0); E.play(); U.lastLyric = -1; save();
  refreshPlaying(true);
}
function togglePlay() {
  if (!P.trackId) return;
  if (E.isPlaying()) E.pause();
  else { unlock(); if (E.current() !== T(P.trackId)) E.load(T(P.trackId), 0); E.play(); }
  refreshPlaying(false);
}
function startIdx(i) { P.qi = i; const id = P.queue[i]; P.trackId = id; P.post = null; E.load(T(id), 0); E.play(); U.lastLyric = -1; save(); refreshPlaying(true); }
function next(auto) {
  if (!P.trackId) return;
  if (auto && U.sleepEnd) { U.sleepEnd = false; E.pause(); E.seek(0); refreshPlaying(false); toast('Minuterie : fin du titre, lecture en pause', ic('moon', 20)); return; }
  if (auto && P.repeat === 'one') { E.seek(0); return; }
  if (auto && P.post) { const p = post(P.post); E.seek(p ? p.start || 0 : 0); return; }
  const q = P.queue.length ? P.queue : [P.trackId];
  if (!P.queue.length) P.queue = q;
  if (P.shuffle && q.length > 1) { let j; do { j = Math.floor(Math.random() * q.length); } while (j === P.qi); startIdx(j); }
  else if (P.qi + 1 < q.length) startIdx(P.qi + 1);
  else if (P.repeat === 'all' || !auto) startIdx(0);
  else { E.pause(); E.seek(0); refreshPlaying(false); }
}
function prev() { if (E.pos() > 3 || P.qi === 0) { E.seek(0); return; } startIdx(P.qi - 1); }
function refreshPlaying(changed) {
  renderMini(); renderSide(); syncFeed();
  $$('[data-pp]').forEach(b => { b.innerHTML = icf(E.isPlaying() ? 'pause' : 'play', +b.dataset.pp); b.setAttribute('aria-label', E.isPlaying() ? 'Pause' : 'Lecture'); });
  $$('.trow.cur .eq').forEach(e => e.classList.toggle('off', !E.isPlaying()));
  const pa = $('.pl-art'); if (pa) pa.classList.toggle('paused-cover', !E.isPlaying());
  if (changed) {
    ['player', 'queue', 'playlist', 'profile'].forEach(refreshOv);
    if (!hasScreen() && (U.tab === 'account' || (U.tab === 'feed' && U.feedMode === 'music'))) renderView();
  } else refreshOv('queue');
}

// ---------- rendu ----------
const VIEWS = {}, AFTER = {}, OV = {}, A = {}, FORMS = {}, IN = {}, CH = {};
function renderAll() { renderView(); renderChrome(); renderOverlays(); }
function renderView() {
  const v = $('#view'); const key = U.tab + ':' + U.feedMode + ':' + U.chatMode + ':' + U.matchMode + ':' + U.accTab;
  const sc = $('.scroll', v); const prevTop = v.dataset.key === key && sc ? sc.scrollTop : 0;
  v.innerHTML = VIEWS[U.tab]();
  v.dataset.key = key;
  const sc2 = $('.scroll', v); if (sc2 && prevTop) sc2.scrollTop = prevTop;
  if (!prevTop) { $('#app').classList.remove('tabs-min'); U.lastScrollY = 0; }
  if (AFTER[U.tab]) AFTER[U.tab]();
  lenses(v);
}
const TABS = [['feed', 'Feed', 'feed'], ['map', 'Map', 'map'], ['create', 'Créer', 'plus'], ['match', 'Match', 'match'], ['chat', 'Discussion', 'chat'], ['account', 'Compte', 'user']];
function badgeFor(id) {
  if (id === 'chat') return S.convs.filter(c => !blocked(c.with)).reduce((a, c) => a + (c.unread || 0), 0);
  if (id === 'match') return S.match.newCount;
  if (id === 'account') return S.activity.filter(a => !a.read).length;
  return 0;
}
function renderChrome() {
  $('#app').classList.toggle('pre-ob', !S.onboarded); // pas de navigation ni de compte avant l’inscription
  const me = user('me');
  const tabs = TABS.filter(t => t[0] !== 'account');
  $('#tabs').innerHTML = `<div class="tabbar glass strong lens" data-lens="tabs"><i class="tab-lens" aria-hidden="true"></i>${tabs.map(([id, l, icn]) => {
    if (id === 'create') return `<button class="tab tab-create" data-a="create" aria-label="Créer une publication"><span class="glass tint">${ic('plus', 24)}</span></button>`;
    const n = badgeFor(id);
    return `<button class="tab ${U.tab === id ? 'on' : ''}" data-a="tab" data-id="${id}" ${U.tab === id ? 'aria-current="page"' : ''}>${ic(icn)}<span class="lbl">${l}</span>${n ? `<span class="badge" aria-label="${n} nouveaux">${n}</span>` : ''}</button>`;
  }).join('')}</div><button class="me-btn glass strong lens ${U.tab === 'account' ? 'on' : ''}" data-a="tab" data-id="account" aria-label="Compte" ${U.tab === 'account' ? 'aria-current="page"' : ''}>${avatar(me, 46)}${badgeFor('account') ? '<i class="dot"></i>' : ''}</button>`;
  renderMini(); renderSide(); lenses($('#tabs'));
}
function renderSide() {
  const side = $('#side'); if (!side) return;
  const me = user('me'), t = T(P.trackId);
  side.innerHTML = `<div class="side-logo"><span class="logo-sm">${LOGO(30)}</span><span class="wordmark-sm">Musio</span></div>
    <button class="side-search glass" data-a="search">${ic('search', 18)}<span>Rechercher</span></button>
    <nav class="side-nav" data-lens="side" aria-label="Navigation principale"><i class="side-lens" aria-hidden="true"></i>${TABS.filter(x => x[0] !== 'create').map(([id, l, icn]) => { const n = badgeFor(id); return `<button class="side-item ${U.tab === id ? 'on' : ''}" data-a="tab" data-id="${id}" ${U.tab === id ? 'aria-current="page"' : ''}>${id === 'account' ? avatar(me, 26) : ic(icn)}<span>${id === 'account' ? esc(S.me.name) : l}</span>${n ? `<span class="badge">${n}</span>` : ''}</button>`; }).join('')}</nav>
    <button class="btn primary block" data-a="create">${ic('plus', 20)}Créer</button>
    <div class="side-grow"></div>
    ${t ? `<div class="side-player glass strong"><button class="sp-top" data-a="openPlayer" aria-label="Ouvrir le lecteur">${cover(t, 52, 14)}<span class="tt"><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></span></button>
      <div class="sp-prog"><i data-prog></i></div>
      <div class="sp-ctrls"><button class="icon-btn sm" data-a="prev" aria-label="Précédent">${icf('prev', 20)}</button><button class="mini-play" data-a="pp" data-pp="20" aria-label="Lecture / pause">${icf(E.isPlaying() ? 'pause' : 'play', 20)}</button><button class="icon-btn sm" data-a="next" aria-label="Suivant">${icf('next', 20)}</button><button class="icon-btn sm ${S.likedTracks.includes(t.id) ? 'liked-ic' : ''}" data-a="likeTrack" data-id="${t.id}" aria-label="Favori">${S.likedTracks.includes(t.id) ? icf('heart', 18) : ic('heart', 18)}</button></div></div>` : `<div class="side-player glass empty-sp"><span class="t2">Rien en lecture</span><button class="chip glass" data-a="openPlaylist" data-id="pl1">${icf('play', 14)}Lancer un mix</button></div>`}
    <div class="side-legal"><button data-a="legal" data-id="cgu">CGU</button> · <button data-a="legal" data-id="privacy">Confidentialité</button> · <button data-a="legal" data-id="mentions">Mentions légales</button></div>`;
  lenses(side);
}
function renderMini() {
  const m = $('#mini'), t = T(P.trackId);
  const hide = !t || (U.tab === 'feed' && U.feedMode !== 'music');
  m.classList.toggle('hide', hide);
  $('#app').classList.toggle('has-mini', !hide);
  if (!t) { m.innerHTML = ''; return; }
  const liked = S.likedTracks.includes(t.id);
  m.innerHTML = `<button class="mini-main" data-a="openPlayer" aria-label="Ouvrir le lecteur : ${esc(t.title)}">${cover(t, 44, 22)}<span class="tt"><b>${esc(t.title)}</b><small>${esc(t.artist)}</small></span></button><button class="icon-btn sm ${liked ? 'liked-ic' : ''}" data-a="likeTrack" data-id="${t.id}" aria-pressed="${liked}" aria-label="Favori">${liked ? icf('heart', 20) : ic('heart', 20)}</button><button class="icon-btn sm" data-a="next" aria-label="Suivant">${icf('next', 20)}</button><button class="mini-play" data-a="pp" data-pp="20" aria-label="Lecture / pause">${icf(E.isPlaying() ? 'pause' : 'play', 20)}</button><span class="mini-prog" aria-hidden="true"><i data-prog></i></span>`;
}
const hasScreen = () => U.ov.some(o => OV[o.type].kind === 'screen');
const topOv = () => U.ov[U.ov.length - 1];
function ovHTML(o) {
  const d = OV[o.type]; const body = d.html(o);
  if (d.kind === 'screen') return `<section class="screen ${d.up ? 'up' : ''} ${d.cls || ''} ${o.fresh ? 'anim' : ''}" data-ov="${o.uid}" role="dialog" aria-modal="true" aria-label="${esc(d.label || '')}">${ORBS}${!d.up && !d.locked ? '<div class="edge" aria-hidden="true"></div>' : ''}${body}</section>`;
  if (d.kind === 'sheet') return `<div class="sheet-wrap" data-ov="${o.uid}"><div class="backdrop" data-a="back"></div><div class="sheet ${o.fresh ? 'anim' : ''}" role="dialog" aria-modal="true" aria-label="${esc(d.label || '')}"><div class="grab" aria-hidden="true"></div>${body}</div></div>`;
  return `<div class="modal-wrap" data-ov="${o.uid}" role="dialog" aria-modal="true">${body}</div>`;
}
function renderOverlays() {
  const host = $('#overlays'); let start = 0;
  U.ov.forEach((o, i) => { if (OV[o.type].kind === 'screen') start = i; });
  const vis = U.ov.slice(start);
  host.innerHTML = vis.map(ovHTML).join('');
  vis.forEach(o => { const d = OV[o.type]; const el = host.querySelector(`[data-ov="${o.uid}"]`); if (d.after) d.after(o, el, o.fresh); });
  U.ov.forEach(o => { o.fresh = false; });
  lenses(host);
}
function refreshOv(type) {
  const host = $('#overlays');
  U.ov.forEach(o => {
    if (o.type !== type) return;
    const el = host.querySelector(`[data-ov="${o.uid}"]`); if (!el) return;
    const tops = $$('.scroll,.chat-body,.sheet,.pl', el).map(x => x.scrollTop);
    const tmp = document.createElement('div'); tmp.innerHTML = ovHTML(o); const nw = tmp.firstElementChild;
    el.replaceWith(nw);
    $$('.scroll,.chat-body,.sheet,.pl', nw).forEach((x, i) => { if (tops[i]) x.scrollTop = tops[i]; });
    if (OV[type].after) OV[type].after(o, nw, false);
    lenses(nw);
  });
}
function push(type, data) { U.ov.push(Object.assign({ type, uid: uid(), fresh: true }, data || {})); renderOverlays(); }
function pop(force) {
  const o = topOv(); if (!o) return;
  if (OV[o.type].locked && !force) return;
  U.ov.pop();
  if (OV[o.type].onClose) OV[o.type].onClose(o);
  renderOverlays();
  if (OV[o.type].kind === 'screen' && !hasScreen()) { renderView(); renderChrome(); }
}
function popToScreen() { while (U.ov.length && OV[topOv().type].kind !== 'screen') { const o = U.ov.pop(); if (OV[o.type].onClose) OV[o.type].onClose(o); } }

// ---------- lentilles qui glissent (onglets, segments) ----------
const LENS = {};
function lenses(root) {
  $$('[data-lens]', root || document).forEach(box => {
    const lens = box.querySelector(':scope > .seg-lens, :scope > .tab-lens, :scope > .side-lens'); const on = box.querySelector(':scope > .on');
    if (!lens) return;
    if (!on || !box.offsetParent) { lens.style.opacity = on ? '' : '0'; return; }
    const vert = lens.classList.contains('side-lens');
    const pos = vert ? { a: on.offsetTop, b: on.offsetHeight } : { a: on.offsetLeft, b: on.offsetWidth };
    const prevPos = LENS[box.dataset.lens];
    const set = p => { if (vert) { lens.style.top = p.a + 'px'; lens.style.height = p.b + 'px'; } else { lens.style.left = p.a + 'px'; lens.style.width = p.b + 'px'; } };
    if (prevPos && (prevPos.a !== pos.a || prevPos.b !== pos.b)) { lens.style.transition = 'none'; set(prevPos); void lens.offsetWidth; lens.style.transition = ''; requestAnimationFrame(() => set(pos)); }
    else set(pos);
    lens.style.opacity = '';
    LENS[box.dataset.lens] = pos;
  });
}

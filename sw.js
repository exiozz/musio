// Musio — service worker : l'app s'ouvre même sans connexion.
// Change VERSION à chaque mise en ligne pour forcer le rafraîchissement du cache.
const VERSION = 'musio-v13';
const SHELL = [
  './', 'index.html', 'styles.css',
  'data.js', 'audio.js', 'legal.js', 'core.js', 'views.js', 'overlays.js', 'actions.js',
  'vendor/jsmediatags.min.js', 'vendor/supabase.min.js', 'config.js', 'auth.js', 'cloud.js', 'admin.js', 'logo.svg', 'logo-180.png', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-192.png', 'icons/maskable-512.png',
];

self.addEventListener('install', e => {
  // cache: 'reload' : on ignore le cache HTTP du navigateur pour ne pas remettre d'anciens fichiers
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!sameOrigin && !isFont) return;

  // Pages : réseau d'abord (pour avoir la dernière version), cache si hors ligne
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(VERSION).then(c => c.put('index.html', copy));
      return res;
    }).catch(() => caches.match('index.html')));
    return;
  }

  // Code de l'appli (js, css, html, manifeste) : réseau d'abord pour toujours avoir la dernière version,
  // cache seulement hors ligne. Images et polices : cache d'abord.
  const isCode = sameOrigin && /\.(js|css|html|webmanifest)$|\/$/.test(url.pathname) && !/\/vendor\//.test(url.pathname);
  if (isCode) {
    e.respondWith(fetch(new Request(req, { cache: 'no-cache' })).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req)));
    return;
  }
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(req);
    const net = fetch(req).then(res => {
      if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});

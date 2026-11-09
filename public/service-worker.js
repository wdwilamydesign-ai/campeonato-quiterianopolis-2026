const CACHE = 'quiterianopolis-campeonato-2026-v3';
const STATIC = [
  '/assets/css/app.css',
  '/assets/js/app.js',
  '/assets/js/cronometro.js',
  '/assets/icons/app-192.png',
  '/assets/icons/app-512.png',
  '/manifest.webmanifest',
  '/admin-manifest.webmanifest',
  '/dirigente-manifest.webmanifest',
  '/assets/branding/escudo-campeonato-2026.png',
  '/assets/branding/logo-prefeitura.svg'
];
const STATIC_PATHS = new Set(STATIC);

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(STATIC).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !STATIC_PATHS.has(url.pathname)) return;
  event.respondWith(
    fetch(event.request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(event.request, copy)).catch(() => {});
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});

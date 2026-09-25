// Vaanam service worker: cache-first app shell, network-first API with
// last-good fallback. A farmer in a low-signal field still opens the app.
const SHELL = 'vaanam-shell-v1';
const DATA = 'vaanam-data-v1';
const SHELL_ASSETS = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => ![SHELL, DATA].includes(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;

  if (url.pathname.startsWith('/api/')) {
    // network first, last-good cache fallback
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(DATA).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(e.request).then(
            (cached) =>
              cached ||
              new Response(JSON.stringify({ error: 'offline', detail: 'no saved data' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              })
          )
        )
    );
    return;
  }

  // cache-first for shell + build assets
  e.respondWith(
    caches.match(e.request).then(
      (cached) =>
        cached ||
        fetch(e.request).then((res) => {
          if (res.ok && url.origin === self.location.origin) {
            const clone = res.clone();
            caches.open(SHELL).then((c) => c.put(e.request, clone));
          }
          return res;
        })
    )
  );
});

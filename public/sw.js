const SHELL_CACHE = 'sun-seat-shell-v1';
const ROUTES_CACHE = 'sun-seat-routes-v1';
const WEATHER_CACHE = 'sun-seat-weather-v1';
const MAX_ROUTE_ENTRIES = 50;

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/data/places.json',
  '/data/vehicles/microbus-14.json',
  '/data/vehicles/bus-49.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key !== SHELL_CACHE &&
                key !== ROUTES_CACHE &&
                key !== WEATHER_CACHE
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    const deleteCount = keys.length - maxItems;
    for (let i = 0; i < deleteCount; i++) {
      await cache.delete(keys[i]);
    }
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. Open-Meteo Weather API: Network-First with 1.5s timeout fallback to cache
  if (url.hostname.includes('open-meteo.com')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(WEATHER_CACHE);
        try {
          const response = await fetch(request);
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cached = await cache.match(request);
          return (
            cached ||
            new Response(JSON.stringify({ error: 'offline' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            })
          );
        }
      })()
    );
    return;
  }

  // 2. Route Polylines & 3D GLB Models: Stale-While-Revalidate + 50-entry cap
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/data/routes/') || url.pathname.startsWith('/models/'))
  ) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(ROUTES_CACHE);
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then(async (networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              await cache.put(request, networkResponse.clone());
              await trimCache(ROUTES_CACHE, MAX_ROUTE_ENTRIES);
            }
            return networkResponse;
          })
          .catch(() => null);

        if (cached) {
          return cached;
        }
        const net = await networkPromise;
        if (net) return net;
        return new Response(JSON.stringify({ error: 'offline-route' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })()
    );
    return;
  }

  // 3. App Shell & Static Assets: Cache-First with Network fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;

        try {
          const response = await fetch(request);
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          if (request.mode === 'navigate') {
            const indexFallback = await cache.match('/index.html');
            if (indexFallback) return indexFallback;
          }
          return new Response('Offline', { status: 503 });
        }
      })()
    );
  }
});

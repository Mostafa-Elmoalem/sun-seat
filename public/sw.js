/* Service worker for "اقعد فين؟".
 *
 * BUILD_ID and PRECACHE are filled in by the Vite build (see vite.config.ts),
 * so every deploy produces a byte-different sw.js with fresh cache names. That is
 * what lets browsers pick up new versions instead of serving the first one forever.
 *
 * Strategy:
 *   page navigations        network first (3 s), cached shell when offline
 *   /assets/* (hashed)      cache first, they never change
 *   /data/* (routes, places) stale while revalidate
 *   Open-Meteo              network first, cached answer when offline
 */
const BUILD_ID = '__BUILD_ID__';
const PRECACHE = __PRECACHE__;

const SHELL_CACHE = `shell-${BUILD_ID}`;
const DATA_CACHE = 'data-v2';
const WEATHER_CACHE = 'weather-v2';
const KEEP = new Set([SHELL_CACHE, DATA_CACHE, WEATHER_CACHE]);
const MAX_DATA_ENTRIES = 80;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
}

async function networkFirstPage(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await Promise.race([fetch(request), timeout(3000)]);
    if (response && response.ok) cache.put('/index.html', response.clone());
    return response;
  } catch {
    return (await cache.match('/index.html')) || (await cache.match('/')) || new Response('Offline', { status: 503 });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(event) {
  const cache = await caches.open(DATA_CACHE);
  const hit = await cache.match(event.request);
  const refresh = fetch(event.request)
    .then(async (response) => {
      if (response && response.ok) {
        await cache.put(event.request, response.clone());
        await trim(DATA_CACHE, MAX_DATA_ENTRIES);
      }
      return response;
    })
    .catch(() => null);
  if (hit) {
    event.waitUntil(refresh);
    return hit;
  }
  return (await refresh) || new Response('{"error":"offline"}', { status: 503, headers: { 'Content-Type': 'application/json' } });
}

async function weather(request) {
  const cache = await caches.open(WEATHER_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || new Response('{"error":"offline"}', { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (url.hostname === 'api.open-meteo.com') {
    event.respondWith(weather(request));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
  } else if (url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
  } else if (url.pathname.startsWith('/data/')) {
    event.respondWith(staleWhileRevalidate(event));
  } else {
    event.respondWith(cacheFirst(request));
  }
});

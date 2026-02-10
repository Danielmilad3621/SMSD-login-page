/* ============================================================
   Scout PWA — Service Worker
   Network-first for HTML/JS/CSS (always get latest code),
   cache-first for static assets, offline fallback
   ============================================================ */

const CACHE_NAME = 'scout-v6';

// App shell — essential assets to pre-cache on install
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './assets/scout-logo.svg',
  './offline.html'
];

// Critical resources that should always try network first
// to prevent serving stale broken code
const NETWORK_FIRST = [
  'index.html',
  'app.js',
  'styles.css',
  'service-worker.js'
];

/* ── Install: pre-cache the app shell ─────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(APP_SHELL);
    })
  );
  // Activate immediately (skip waiting for old SW to die)
  self.skipWaiting();
});

/* ── Activate: clean up old caches ────────────────────────── */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      )
    )
  );
  // Take control of all clients immediately
  self.clients.claim();
});

/* ── Fetch handler ────────────────────────────────────────── */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Don't cache Supabase API calls — always go to network
  if (request.url.includes('supabase.co')) return;

  // Don't cache the Supabase CDN library — always go to network
  if (request.url.includes('cdn.jsdelivr.net')) return;

  // Check if this is a critical resource that needs network-first
  const isNetworkFirst = NETWORK_FIRST.some(file => request.url.endsWith(file))
    || request.mode === 'navigate';

  if (isNetworkFirst) {
    // Network-first: try network, fall back to cache
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Cache the fresh response for offline use
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Network failed — try cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            // If it's a navigation request, show offline page
            if (request.mode === 'navigate') {
              return caches.match('./offline.html');
            }
            return new Response('', { status: 408, statusText: 'Offline' });
          });
        })
    );
  } else {
    // Cache-first for static assets (images, fonts, etc.)
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            return new Response('', { status: 408, statusText: 'Offline' });
          });
      })
    );
  }
});

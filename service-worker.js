/* ============================================================
   Scout PWA — Service Worker
   Cache-first strategy for static assets, offline fallback
   ============================================================ */

const CACHE_NAME = 'scout-v4';

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

/* ── Fetch: cache-first for static, offline fallback for nav */
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Don't cache Supabase API calls — always go to network
  if (request.url.includes('supabase.co')) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((networkResponse) => {
          // Cache successful responses for future use
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If the request is a navigation (HTML page), serve offline fallback
          if (request.mode === 'navigate') {
            return caches.match('./offline.html');
          }
          // For other requests (images, etc.) just fail silently
          return new Response('', {
            status: 408,
            statusText: 'Offline'
          });
        });
    })
  );
});


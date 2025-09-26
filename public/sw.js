// Minimal service worker to cache heavy static assets like Pyodide and wheels
const CACHE_NAME = 'phyloinsight-static-v1';
const PRECACHE_URLS = [
  '/',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      )
    ).then(() => self.clients.claim())
  );
});

// Network-first for all requests (simplified approach)
self.addEventListener('fetch', (event) => {
  // Skip caching HEAD requests (not supported by Cache API)
  if (event.request.method === 'HEAD') {
    event.respondWith(fetch(event.request));
    return;
  }

  // For all other requests, try network first, then cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});



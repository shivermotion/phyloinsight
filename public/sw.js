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

// Cache-first for Pyodide and Python packages, network-first for others
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const isPyodide = url.pathname.startsWith('/pyodide/') || url.pathname.startsWith('/python-packages/');

  if (isPyodide) {
    event.respondWith(
      caches.match(event.request).then((cached) =>
        cached || fetch(event.request).then((response) => {
          const respClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, respClone));
          return response;
        })
      )
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});



/**
 * Service worker: offline shell.
 * Static files are fetched network-first and cached as they are used, so the app still opens
 * offline. API calls are never cached (the app keeps its own copy of the last plan).
 */
const CACHE = 'cac-v4';
const SHELL = ['/', '/styles.css', '/js/main.js', '/icon.svg', '/manifest.json']; // other modules are cached on first use

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

/** Only same-origin GET requests for pages and assets are handled here. */
function isCacheable(request) {
  const url = new URL(request.url);
  return request.method === 'GET' && url.origin === location.origin && !url.pathname.startsWith('/api/');
}

self.addEventListener('fetch', (event) => {
  if (!isCacheable(event.request)) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});

const CACHE_NAME = 'groceries-v1';
const PRECACHE_URLS = [
  "./",
  "index.html",
  "manifest.json",
  "favicon.ico",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS).catch(() =>
      Promise.all(PRECACHE_URLS.map((url) => cache.add(url).catch(() => {})))
    ))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// The page itself is network-first so edits show up right away;
// the cached copy is used only when offline (e.g. no signal in the shop).
const isHtmlRequest = (request) =>
  request.mode === 'navigate' ||
  (request.headers.get('accept') || '').includes('text/html');

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (isHtmlRequest(event.request)) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('index.html')))
    );
    return;
  }

  // Icons and manifest: cache-first.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response && response.status === 200 && response.type === 'basic') {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
      }
      return response;
    }))
  );
});

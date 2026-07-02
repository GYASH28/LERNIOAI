const CACHE_NAME = 'lernio-v4';
const STATIC_ASSETS = ['/', '/dashboard', '/learn', '/materials', '/manifest.webmanifest'];

// Network-first with 3-second timeout for navigation requests.
// If the network doesn't respond in 3s, fall back to cache.
// This prevents the "stuck on loading" issue when the server is slow.
const NAVIGATION_TIMEOUT = 3000;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;

  if (event.request.mode === 'navigate') {
    // Network-first with timeout — don't let users wait forever
    event.respondWith(
      Promise.race([
        fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        }),
        new Promise((resolve) => {
          setTimeout(() => {
            caches.match(event.request).then(cached => resolve(cached || caches.match('/')))
          }, NAVIGATION_TIMEOUT)
        })
      ]).catch(() => caches.match(event.request).then(cached => cached || caches.match('/')))
    );
  } else if (event.request.url.includes('/lesson-notes/')) {
    // Cache-first for PDFs (large files, don't change often)
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }))
    );
  } else {
    // Stale-while-revalidate for other assets
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});

// Service Worker — temporarily disabled to fix blank page issues.
// The previous service worker was caching stale JavaScript that didn't
// match new HTML deploys, causing React hydration failures (blank page).
//
// This file unregisters ALL existing service workers and clears ALL caches.
// Once the site is stable, we can re-enable a simpler caching strategy.

const CACHE_NAME = 'lernio-v7-clear';

// On install: skip waiting so this SW activates immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// On activate: delete ALL caches and claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Delete ALL caches (lernio-v1 through v5 and any others)
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));

      // Unregister this service worker so it doesn't intercept future requests
      await self.registration.unregister();

      // Take control of all clients
      await self.clients.claim();

      // Notify all open tabs to reload
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.navigate(client.url);
      }
    })()
  );
});

// Don't intercept any fetches — let the browser handle everything normally
self.addEventListener('fetch', (event) => {
  // Do nothing — pass through to the network
});

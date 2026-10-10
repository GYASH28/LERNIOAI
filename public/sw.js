// Legacy offline workers caused stale Next.js bundles and reload loops.
// This worker exists only to retire installations from older releases.
// Do NOT cache HTML, RSC, auth endpoints, or JavaScript here.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      // Retire this worker. Crucially, do not navigate or reload open tabs:
      // the application must never re-register/reload in an endless loop.
      await self.registration.unregister();
      await self.clients.claim();
    })()
  );
});
// Deliberately no fetch handler — everything is served from the network.

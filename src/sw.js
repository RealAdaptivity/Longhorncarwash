const CACHE_NAME = 'longhorn-timeclock-v1';
const urlsToCache = [
  './',
  './index.html',
  './index.css',
  './renderer.js',
  './supabaseConfig.js',
  './manifest.json',
  './app_icon_longhorn_1777337011552.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Do not attempt to cache Supabase API calls
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  // Stale-While-Revalidate Strategy
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // Update the cache with the fresh network response
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, networkResponse.clone());
        });
        return networkResponse;
      }).catch(() => {
        // Network failed (e.g. offline)
        return cachedResponse;
      });

      // Return cached response immediately if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});

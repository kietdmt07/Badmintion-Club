const CACHE_NAME = 'aron-badminton-cache-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.jpg',
  './icon-512.jpg',
  './badminton_banner.jpg'
];

// Install Event
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event (Network First, fallback to cache for offline availability)
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || e.request.url.includes('supabase.co') || e.request.url.includes('vietqr.io')) {
    return;
  }
  
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, resClone);
        });
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

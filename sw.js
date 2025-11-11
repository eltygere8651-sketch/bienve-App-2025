const CACHE_NAME = 'bm-contigo-cache-v1';
const DATA_CACHE_NAME = 'bm-contigo-data-cache-v1';
const APP_SHELL_URLS = [
    '/',
    'index.html',
    'assets/icon.svg',
    'index.tsx'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Add core app shell files. Other assets will be cached on demand.
        return cache.addAll(APP_SHELL_URLS);
      })
  );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    
    // Let all API calls to Supabase go directly to the network.
    // The application's own IndexedDB cache (via dbService) is responsible for offline data.
    if (url.hostname.includes('supabase.co')) {
        return; // Do nothing, let the browser handle the network request.
    }
    
    // "Cache first" strategy for app shell and other assets
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return networkResponse;
            });
        })
    );
});

// Clean up old caches on activation
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, DATA_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
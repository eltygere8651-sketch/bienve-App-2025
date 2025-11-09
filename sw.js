const CACHE_NAME = 'bm-contigo-cache-v1';
const APP_SHELL_URLS = [
    '/',
    '/index.html',
    '/assets/icon.svg',
    '/index.tsx'
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
    // Don't cache requests to Supabase API to avoid stale data
    if (event.request.url.includes('supabase.co')) {
        return; // Let the browser handle it (network only)
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }

                // Not in cache - fetch from network, cache it, and return
                return fetch(event.request).then(
                    (networkResponse) => {
                        // Check if we received a valid response. 
                        // We don't cache non-GET requests or opaque responses.
                        if (!networkResponse || networkResponse.status !== 200 || event.request.method !== 'GET') {
                            return networkResponse;
                        }

                        // IMPORTANT: Clone the response. A response is a stream
                        // and because we want the browser to consume the response
                        // as well as the cache consuming the response, we need
                        // to clone it so we have two streams.
                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    }
                ).catch(error => {
                    console.error('Fetching failed:', error);
                    // This could be a place to return a generic offline page if needed
                    throw error;
                });
            })
    );
});

// Clean up old caches on activation
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
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

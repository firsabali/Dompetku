const CACHE_NAME = 'dompetku-pro-v17';

const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './register.html',
    './dashboard.html',
    './transaksi.html',
    './aktivitas.html',
    './wishlist.html',
    './habit.html',
    './profile.html',
    './manifest.json',
    './assets/icon.svg',
    './css/style.css',
    './css/habit.css',
    './js/storage.js',
    './js/auth.js',
    './js/dashboard.js',
    './js/transaksi.js',
    './js/aktivitas.js',
    './js/wishlist.js',
    './js/habit.js',
    './js/profile.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => Promise.allSettled(ASSETS_TO_CACHE.map((url) => cache.add(url))))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && !networkResponse.redirected) {
                    const copy = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                }
                return networkResponse;
            }).catch(async () => {
                const cached = await caches.match(event.request, { ignoreSearch: true }) || await caches.match('./');
                if (!cached) return Response.error();
                return new Response(cached.body, {
                    status: cached.status,
                    statusText: cached.statusText,
                    headers: cached.headers
                });
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            return fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && !networkResponse.redirected) {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
                }
                return networkResponse;
            });
        })
    );
});
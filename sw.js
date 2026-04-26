const CACHE_NAME = 'gohappy-cache-v2.2.0';
const TILE_CACHE = 'gohappy-tiles-v1.2.9';
const ASSETS = [
    './',
    'index.html',
    'css/main.css',
    'js/app.js',
    'js/config.js',
    'js/services/data.js',
    'js/services/points.js',
    'js/services/ai_content.js',
    'js/services/auth.js',
    'js/services/quests.js',
    'js/services/safety.js',
    'js/pages/map_v11.js',
    'js/pages/news_events.js',
    'js/pages/today.js',
    'js/pages/tribu.js',
    'js/pages/ranking.js',
    'js/pages/profile.js',
    'js/pages/chat.js',
    'js/pages/quests.js',
    'js/pages/safe.js',
    'js/pages/memories.js',
    'js/pages/legal.js',
    'js/lib/qrcode.min.js',
    'assets/logo_gohappy_official.svg',
    'assets/logo.png',
    'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css',
    'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            // Force takeover
            clients.claim(),
            // Clean up old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME && cacheName !== TILE_CACHE) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        ])
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // OpenFreeMap Tiles Strategy: Cache-First with Network Update (Stale-While-Revalidate)
    if (url.hostname.includes('openfreemap.org')) {
        event.respondWith(
            caches.open(TILE_CACHE).then((cache) => {
                return cache.match(event.request).then((response) => {
                    const fetchPromise = fetch(event.request).then((networkResponse) => {
                        if (networkResponse.ok) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    });
                    return response || fetchPromise;
                });
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request);
        })
    );
});

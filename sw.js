const CACHE_NAME = 'gohappy-cache-v2.0.6';
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
    'assets/map-marker.png',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
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

    // Map Tiles Strategy: Network-First with Cache Fallback
    if (url.hostname.includes('google.com') && url.pathname.includes('vt')) {
        event.respondWith(
            fetch(event.request)
                .then((networkResponse) => {
                    // Only cache successful requests
                    if (networkResponse.ok) {
                        const responseClone = networkResponse.clone();
                        caches.open(TILE_CACHE).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // If network fails, try cache
                    return caches.match(event.request);
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

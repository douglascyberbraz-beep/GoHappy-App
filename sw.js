const CACHE_NAME = 'gohappy-cache-v3.3.0';
const TILE_CACHE = 'gohappy-tiles-v1.3.0';

const ASSETS = [
    './',
    'index.html',
    'manifest.json',
    'css/main.css',
    'css/premium.css',
    'js/app.js',
    'js/config.js',
    'js/lib/qrcode.min.js',
    // Services
    'js/services/security.js',
    'js/services/toast.js',
    'js/services/sound.js',
    'js/services/data.js',
    'js/services/points.js',
    'js/services/ai_content.js',
    'js/services/auth.js',
    'js/services/quests.js',
    'js/services/safety.js',
    'js/services/families.js',
    'js/services/notifications.js',
    // Pages
    'js/pages/map_v11.js',
    'js/pages/today.js',
    'js/pages/quests.js',
    'js/pages/ranking.js',
    'js/pages/news_events.js',
    'js/pages/safe.js',
    'js/pages/profile.js',
    'js/pages/tribu.js',
    'js/pages/memories.js',
    'js/pages/legal.js',
    'js/pages/family_onboarding.js',
    // Assets
    'assets/logo.png',
    'assets/ESLOGAN.png',
    'assets/logo_gohappy_official.svg',
    'assets/map-marker.png',
    // External CDN (cache for offline)
    'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css',
    'https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            // Cache assets individually so one failure doesn't block all
            return Promise.allSettled(
                ASSETS.map(asset => cache.add(asset).catch(e => console.warn('[SW] No se pudo cachear:', asset, e)))
            );
        })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        Promise.all([
            clients.claim(),
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((name) => {
                        if (name !== CACHE_NAME && name !== TILE_CACHE) {
                            console.log('[SW] Limpiando caché antigua:', name);
                            return caches.delete(name);
                        }
                    })
                );
            })
        ])
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Mapa de tiles: Stale-While-Revalidate
    if (url.hostname.includes('openfreemap.org') || url.hostname.includes('demotiles.maplibre.org')) {
        event.respondWith(
            caches.open(TILE_CACHE).then((cache) => {
                return cache.match(event.request).then((cached) => {
                    const fetchPromise = fetch(event.request).then((networkResponse) => {
                        if (networkResponse && networkResponse.ok) {
                            cache.put(event.request, networkResponse.clone());
                        }
                        return networkResponse;
                    }).catch(() => cached);
                    return cached || fetchPromise;
                });
            })
        );
        return;
    }

    // Firebase / Gemini API: siempre red (datos en tiempo real)
    if (url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('generativelanguage.googleapis.com') ||
        url.hostname.includes('identitytoolkit.googleapis.com') ||
        url.hostname.includes('firestore.googleapis.com')) {
        event.respondWith(fetch(event.request).catch(() => new Response('{}', { headers: { 'Content-Type': 'application/json' } })));
        return;
    }

    // Resto: Cache First con fallback a red
    event.respondWith(
        caches.match(event.request).then((cached) => {
            return cached || fetch(event.request).then((response) => {
                if (response && response.ok && response.type !== 'opaque') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                }
                return response;
            });
        }).catch(() => {
            // Offline fallback para páginas HTML
            if (event.request.destination === 'document') {
                return caches.match('index.html');
            }
        })
    );
});

// ════════════════════════════════════════════════════════════════
// GoHappy Map — v4.0 (MAPLIBRE 4.7 · 3D NAVEGADOR PREMIUM)
//
// Estilo Google Maps 2026: pitch 60°, edificios 3D extruidos,
// gradient cobalt por altura, agua turquesa, parques verde-cyan.
//
// Features:
//  • Doble-click / long-press → modal de reseña en esa ubicación
//  • Buscador IA con Gemini + fallback Photon
//  • Marcadores premium para POI comunitarios + IA
//  • User marker pulsante con dirección
//  • Filtros chip (parks/museums/theaters/kidzones/food)
//  • Self-hosted MapLibre, CSP wide-open, sin dependencias CDN
// ════════════════════════════════════════════════════════════════
window.GoHappyMap = {
    instance:        null,
    isInitialized:   false,
    markers:         [],
    currentFilter:   'all',
    _activeFilters:  new Set(['all']),   // multi-select
    _routeLayer:     null,                // walking polyline activa
    _familyMarkers:  new Map(),           // miembros familia → marker
    _familyUnsub:    null,                // listener Firestore
    userMarker:      null,
    lastKnownCoords: "41.6520, -4.7286",
    _gpsWatchId:     null,
    _chipSearchToken: 0,
    _followMode:     false,    // modo seguir al usuario
    _is3D:           true,     // estado 2D/3D
    _clusterZoom:    13,       // bajo este zoom → clusters
    _searchCache:    new Map(),

    // ─── CACHE de búsquedas IA (localStorage 24h) ────────────────
    _CACHE_KEY: 'GoHappy_map_search_cache_v1',
    _CACHE_TTL: 24 * 60 * 60 * 1000,
    _loadSearchCache: () => {
        try {
            const raw = localStorage.getItem(window.GoHappyMap._CACHE_KEY);
            if (!raw) return;
            const obj = JSON.parse(raw);
            const now = Date.now();
            Object.entries(obj).forEach(([k, v]) => {
                if (v?.ts && (now - v.ts) < window.GoHappyMap._CACHE_TTL) {
                    window.GoHappyMap._searchCache.set(k, v);
                }
            });
        } catch (e) {}
    },
    _saveSearchCache: () => {
        try {
            const obj = {};
            window.GoHappyMap._searchCache.forEach((v, k) => obj[k] = v);
            localStorage.setItem(window.GoHappyMap._CACHE_KEY, JSON.stringify(obj));
        } catch (e) {}
    },
    _cacheKey: (query, coords) => {
        const [lat, lng] = String(coords || '').split(',').map(s => parseFloat(s.trim()));
        const roundedLat = Math.round((lat || 0) * 100) / 100; // bucket de ~1km
        const roundedLng = Math.round((lng || 0) * 100) / 100;
        return `${query.toLowerCase().trim()}|${roundedLat},${roundedLng}`;
    },

    // ─── FAVORITOS persistidos en localStorage ────────────────────
    _FAVKEY: 'GoHappy_map_favorites_v1',
    _favorites: new Set(),
    _loadFavorites: () => {
        try {
            const raw = localStorage.getItem(window.GoHappyMap._FAVKEY) || '[]';
            window.GoHappyMap._favorites = new Set(JSON.parse(raw));
        } catch (e) { window.GoHappyMap._favorites = new Set(); }
    },
    _saveFavorites: () => {
        try {
            localStorage.setItem(window.GoHappyMap._FAVKEY,
                JSON.stringify([...window.GoHappyMap._favorites]));
        } catch (e) {}
    },
    _favKey: (loc) => `${(loc.name || '').toLowerCase()}|${loc.lat?.toFixed(4)},${loc.lng?.toFixed(4)}`,
    toggleFavorite: (loc) => {
        const k = window.GoHappyMap._favKey(loc);
        if (window.GoHappyMap._favorites.has(k)) {
            window.GoHappyMap._favorites.delete(k);
        } else {
            window.GoHappyMap._favorites.add(k);
        }
        window.GoHappyMap._saveFavorites();
        return window.GoHappyMap._favorites.has(k);
    },
    isFavorite: (loc) => window.GoHappyMap._favorites.has(window.GoHappyMap._favKey(loc)),

    // ─── DISTANCIA Haversine entre 2 puntos lat/lng ───────────────
    _distanceTo: (lat, lng) => {
        const u = window.GoHappyMap.userMarker?.getLngLat();
        if (!u) return null;
        const R = 6371; // km
        const dLat = (lat - u.lat) * Math.PI / 180;
        const dLng = (lng - u.lng) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(u.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) * Math.sin(dLng/2)**2;
        const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        if (km < 1) return Math.round(km * 1000) + ' m';
        return km.toFixed(1) + ' km';
    },

    // ─── MODO NOCTURNO automático según hora local ───────────────
    _isNightMode: () => {
        const h = new Date().getHours();
        return h >= 21 || h < 7;
    },
    _applyNightMode: () => {
        // NUNCA aplicar filter CSS sobre #map-canvas — rompe el compositing
        // WebGL y deja el mapa BLANCO en muchos navegadores. En su lugar
        // usamos un overlay <div> encima del canvas con mix-blend-mode.
        const viewport = document.getElementById('map-viewport-v11');
        if (!viewport) return;
        let overlay = document.getElementById('gh-night-overlay');
        if (window.GoHappyMap._isNightMode()) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'gh-night-overlay';
                overlay.style.cssText = `
                    position:absolute; inset:0; z-index:2; pointer-events:none;
                    background:linear-gradient(180deg, rgba(11,30,60,0.32), rgba(5,20,45,0.40));
                    mix-blend-mode:multiply;
                `;
                viewport.appendChild(overlay);
            }
        } else if (overlay) {
            overlay.remove();
        }
    },

    // ─── AUTO-CARGA de POIs alrededor del usuario (Overpass API) ──
    // Overpass = API gratuita de OpenStreetMap, sin key, real-time.
    // Devuelve sitios REALES con coords reales (sin alucinación).
    _OVERPASS_ENDPOINTS: [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass.openstreetmap.fr/api/interpreter'
    ],
    _nearbyLoadedAt: null,   // {lat,lng} de la última carga
    _nearbyLoading:  false,
    _nearbyRadiusM:  1500,   // metros radio de búsqueda

    // Tags OSM → type interno de GoHappy
    _OSM_TAGS: {
        'leisure=park':          { type: 'park',    icon: '🌳' },
        'leisure=playground':    { type: 'kidzone', icon: '🏰' },
        'leisure=garden':        { type: 'park',    icon: '🌿' },
        'tourism=museum':        { type: 'museum',  icon: '🎓' },
        'tourism=zoo':           { type: 'kidzone', icon: '🦁' },
        'tourism=theme_park':    { type: 'kidzone', icon: '🎢' },
        'tourism=aquarium':      { type: 'kidzone', icon: '🐠' },
        'tourism=attraction':    { type: 'museum',  icon: '🏛️' },
        'amenity=theatre':       { type: 'theater', icon: '🎭' },
        'amenity=cinema':        { type: 'theater', icon: '🎬' },
        'amenity=cafe':          { type: 'food',    icon: '☕' },
        'amenity=ice_cream':     { type: 'food',    icon: '🍦' },
        'amenity=restaurant':    { type: 'food',    icon: '🍽️' },
        'amenity=fast_food':     { type: 'food',    icon: '🍔' },
        'amenity=library':       { type: 'school',  icon: '📚' },
        'amenity=kindergarten':  { type: 'school',  icon: '🧸' },
        'shop=toys':             { type: 'kidzone', icon: '🧸' }
    },

    loadNearbyPOIs: async (lat, lng, force = false) => {
        if (window.GoHappyMap._nearbyLoading) return;
        // No re-cargar si estamos a < 800m del último load (evita spam)
        if (!force && window.GoHappyMap._nearbyLoadedAt) {
            const dLat = (lat - window.GoHappyMap._nearbyLoadedAt.lat) * 111;
            const dLng = (lng - window.GoHappyMap._nearbyLoadedAt.lng) * 111 * Math.cos(lat * Math.PI / 180);
            const dKm = Math.sqrt(dLat*dLat + dLng*dLng);
            if (dKm < 0.8) return;
        }

        window.GoHappyMap._nearbyLoading = true;
        const r = window.GoHappyMap._nearbyRadiusM;

        // Cache localStorage por bucket de 1km
        const bucketKey = `gh_nearby_${lat.toFixed(2)},${lng.toFixed(2)}`;
        try {
            const cached = JSON.parse(localStorage.getItem(bucketKey) || 'null');
            if (cached && (Date.now() - cached.ts) < 6 * 60 * 60 * 1000) { // 6h TTL
                console.info('[Overpass] HIT cache', cached.data.length, 'POIs');
                window.GoHappyMap._addNearbyPOIs(cached.data);
                window.GoHappyMap._nearbyLoadedAt = { lat, lng };
                window.GoHappyMap._nearbyLoading = false;
                return;
            }
        } catch (e) {}

        // Construir query Overpass
        const tags = Object.keys(window.GoHappyMap._OSM_TAGS);
        const queryParts = tags.map(t => {
            const [k, v] = t.split('=');
            return `node["${k}"="${v}"](around:${r},${lat},${lng});\n  way["${k}"="${v}"](around:${r},${lat},${lng});`;
        }).join('\n  ');
        const query = `[out:json][timeout:15];\n(\n  ${queryParts}\n);\nout center tags 60;`;

        // Probar endpoints (fallback automático)
        let data = null;
        for (const ep of window.GoHappyMap._OVERPASS_ENDPOINTS) {
            try {
                const resp = await fetch(ep, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain' },
                    body: query,
                    signal: AbortSignal.timeout(12000)
                });
                if (resp.ok) { data = await resp.json(); break; }
            } catch (e) { console.warn('[Overpass]', ep, 'failed:', e?.message); }
        }
        if (!data?.elements) {
            window.GoHappyMap._nearbyLoading = false;
            return;
        }

        // Parsear elementos
        const pois = [];
        const seen = new Set();
        data.elements.forEach(el => {
            const elLat = el.lat ?? el.center?.lat;
            const elLng = el.lon ?? el.center?.lon;
            if (!elLat || !elLng) return;
            const name = el.tags?.name || el.tags?.['name:en'] || el.tags?.['name:es'];
            if (!name) return;
            // Dedupe por nombre + cercanía
            const key = `${name.toLowerCase()}|${elLat.toFixed(3)},${elLng.toFixed(3)}`;
            if (seen.has(key)) return;
            seen.add(key);
            // Identificar type por tags OSM (lookup directo, sin loop)
            let typeMeta = null;
            if (el.tags) {
                for (const k in el.tags) {
                    const candidate = window.GoHappyMap._OSM_TAGS[`${k}=${el.tags[k]}`];
                    if (candidate) { typeMeta = candidate; break; }
                }
            }
            if (!typeMeta) typeMeta = { type: 'generic', icon: '📍' };
            pois.push({
                id: 'osm-' + (el.id || Math.random().toString(36).slice(2, 8)),
                name,
                type: typeMeta.type,
                lat: elLat,
                lng: elLng,
                rating: 4.5,
                _osm: true,
                _icon: typeMeta.icon
            });
        });

        console.info('[Overpass] loaded', pois.length, 'real POIs around', lat.toFixed(4), lng.toFixed(4));
        try { localStorage.setItem(bucketKey, JSON.stringify({ ts: Date.now(), data: pois })); } catch (e) {}

        window.GoHappyMap._addNearbyPOIs(pois);
        window.GoHappyMap._nearbyLoadedAt = { lat, lng };
        window.GoHappyMap._nearbyLoading = false;

        // Comprobar si hay favoritos cerca → notificar
        window.GoHappyMap._checkProximityFavorites(lat, lng);
    },

    _addNearbyPOIs: (pois) => {
        const existing = new Set(window.GoHappyMap.markers.map(m => `${m.data?.lat?.toFixed(4)},${m.data?.lng?.toFixed(4)}`));
        pois.forEach((loc, idx) => {
            const key = `${loc.lat.toFixed(4)},${loc.lng.toFixed(4)}`;
            if (existing.has(key)) return;
            existing.add(key);
            // Spawn escalonado para no bloquear el thread
            setTimeout(() => window.GoHappyMap.createMarker(loc), idx * 12);
        });
    },

    // ─── PROXIMIDAD: notificar si hay favoritos a < 500m ─────────
    _proximityNotified: new Set(),
    _checkProximityFavorites: (lat, lng) => {
        if (!window.GoHappyMap._favorites.size) return;
        const lang = window.GoHappyI18n?.lang || 'es';
        window.GoHappyMap.markers.forEach(m => {
            if (!m.data || !window.GoHappyMap.isFavorite(m.data)) return;
            const dLat = (m.data.lat - lat) * 111;
            const dLng = (m.data.lng - lng) * 111 * Math.cos(lat * Math.PI / 180);
            const distM = Math.sqrt(dLat*dLat + dLng*dLng) * 1000;
            if (distM < 500) {
                const k = window.GoHappyMap._favKey(m.data);
                if (window.GoHappyMap._proximityNotified.has(k)) return;
                window.GoHappyMap._proximityNotified.add(k);
                window.GoHappyToast && window.GoHappyToast.points(
                    lang === 'en'
                        ? `★ ${m.data.name} is ${Math.round(distM)}m away!`
                        : `★ ${m.data.name} a solo ${Math.round(distM)}m!`,
                    4000
                );
            }
        });
    },

    // ─── RENDER ───────────────────────────────────────────────────
    render: async (container) => {
        console.log('[Map] Render v4.0 MapLibre 3D');
        container.style.display = 'block';

        if (!window.GoHappyMap.isInitialized) {
            const lang = window.GoHappyI18n?.lang || 'es';
            const loaderMsg = lang === 'en' ? 'Loading 3D map…' : 'Invocando mapa 3D…';
            container.innerHTML = `
                <div id="map-canvas" style="position:absolute; inset:0; z-index:1; background:#DFEEFF;"></div>
                <div id="map-loader" style="position:absolute; inset:0; background:linear-gradient(180deg,#eaf2fd 0%,#d6e6f9 100%); z-index:10; pointer-events:none;">
                    <div style="position:absolute; inset:0; background-image: linear-gradient(rgba(11,76,143,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(11,76,143,0.06) 1px, transparent 1px); background-size:60px 60px;"></div>
                    <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-60%); display:flex; flex-direction:column; align-items:center; gap:14px;">
                        <div style="width:54px; height:54px; border-radius:50% 50% 50% 0; background:var(--primary-cobalt,#0B4C8F); transform:rotate(-45deg); box-shadow:0 8px 22px rgba(11,76,143,0.35); animation:mapPinBounce 1.2s ease-in-out infinite;"></div>
                        <p style="font-weight:700; color:var(--primary-cobalt,#0B4C8F); font-size:13px; margin:0;">${loaderMsg}</p>
                    </div>
                    <style>@keyframes mapPinBounce {0%,100%{transform:rotate(-45deg) translateY(0)} 50%{transform:rotate(-45deg) translateY(-8px)}}</style>
                </div>
            `;
            await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
            try {
                await window.GoHappyMap.init(container);
            } catch (e) {
                console.error('[Map] init failed:', e);
                const loader = document.getElementById('map-loader');
                if (loader) {
                    loader.innerHTML = `
                        <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:30px; text-align:center;">
                            <div style="font-size:48px; margin-bottom:14px;">⚠️</div>
                            <p style="color:var(--primary-cobalt,#0B4C8F); font-weight:700; margin:0 0 12px;">${lang === 'en' ? 'Could not load map' : 'No se pudo cargar el mapa'}</p>
                            <p style="color:#64748b; font-size:12px; margin:0 0 18px;">${(e?.message || 'Unknown error').slice(0, 120)}</p>
                            <button onclick="window.location.reload()" style="background:var(--primary-cobalt,#0B4C8F); color:white; border:none; padding:12px 24px; border-radius:999px; font-weight:800; cursor:pointer;">🔄 ${lang === 'en' ? 'Retry' : 'Reintentar'}</button>
                        </div>`;
                }
            }
        } else {
            const loader = document.getElementById('map-loader');
            if (loader) loader.style.display = 'none';
            // El IntersectionObserver dispara resize al hacerse visible.
            // Refuerzo inmediato por si el canvas ya estaba "visible" en el DOM.
            try {
                window.GoHappyMap.instance.resize();
                window.GoHappyMap.instance.triggerRepaint();
            } catch (e) {}
            setTimeout(() => { try { window.GoHappyMap.instance.resize(); } catch (e) {} }, 150);
            if (window._navContext) {
                window.GoHappyMap.handleNavContext(window._navContext);
                window._navContext = null;
            }
        }
    },

    // ─── KICK REPAINT ──────────────────────────────────────────────
    // Replica el ciclo display:none→reflow→display que arregla el
    // "mapa blanco". Lo usan: evento load, splash observer, rama else.
    _kickRepaint: () => {
        const inst = window.GoHappyMap.instance;
        if (!inst) return;
        try {
            const viewport = document.getElementById('map-viewport-v11');
            if (viewport && viewport.style.display !== 'none') {
                const prev = viewport.style.display || 'flex';
                viewport.style.display = 'none';
                void viewport.offsetHeight;   // reflow síncrono forzado
                viewport.style.display = prev;
            }
            inst.resize();
            inst.triggerRepaint();
        } catch (e) {}
    },

    // ─── INIT (3D PREMIUM) ────────────────────────────────────────
    init: async (container) => {
        if (window.GoHappyMap.isInitialized && window.GoHappyMap.instance) return;

        // GUARD 1: MapLibre disponible
        if (typeof window.maplibregl === 'undefined') {
            throw new Error('MapLibre no cargado — recarga la página');
        }

        // GUARD 2: WebGL
        try {
            const c = document.createElement('canvas');
            const gl = c.getContext('webgl2') || c.getContext('webgl');
            if (!gl) throw new Error('WebGL not supported');
        } catch (e) {
            throw new Error('Tu navegador no soporta WebGL');
        }

        const mapDiv = document.getElementById('map-canvas') || container;

        // ══ FIX RAÍZ del mapa blanco ══
        // El bug clásico: MapLibre pinta un primer frame VACÍO si se crea
        // mientras el splash (z-index 9999) está encima, o mientras el
        // viewport está en transición. Ese frame vacío queda "pegado" hasta
        // que un reflow externo (navegar fuera y volver) fuerza recompositing.
        //
        // SOLUCIÓN: no crear el mapa hasta que (a) el splash haya desaparecido
        // y (b) el div tenga dimensiones reales estables.
        const splashEl = document.getElementById('splash-screen');
        for (let i = 0; i < 120; i++) {           // hasta ~2s máx
            const r = mapDiv.getBoundingClientRect();
            const splashGone = !splashEl ||
                splashEl.style.display === 'none' ||
                splashEl.offsetParent === null ||
                parseFloat(getComputedStyle(splashEl).opacity || '1') < 0.05;
            const hasSize = r.width >= 10 && r.height >= 10;
            if (splashGone && hasSize) break;
            if (i === 20 && !hasSize) {
                // tras ~330ms sin dimensiones, forzarlas
                mapDiv.style.cssText = 'position:absolute; inset:0; width:100vw; height:100vh; z-index:1; background:#DFEEFF;';
            }
            await new Promise(r => requestAnimationFrame(r));
        }
        const rect = mapDiv.getBoundingClientRect();
        console.info('[Map] MapLibre', maplibregl.version || '?', '· canvas', Math.round(rect.width) + 'x' + Math.round(rect.height));

        // Crear mapa — configuración estable. pitch directo (sin easeTo
        // posterior que dejaba el canvas en estado intermedio), antialias
        // on (más estable en GPUs móviles que el toggle false→repaint).
        window.GoHappyMap.instance = new maplibregl.Map({
            container: mapDiv,
            style: 'https://tiles.openfreemap.org/styles/liberty',
            center: [-4.7286, 41.6520],
            zoom: 14,
            pitch: 50,                 // 3D directo desde el arranque
            bearing: -10,
            antialias: true,
            attributionControl: false,
            maxPitch: 60,
            renderWorldCopies: false,
            fadeDuration: 0,           // sin fade → primer frame inmediato
            trackResize: true          // MapLibre auto-resize en window resize
        });

        // ══ FIX BLANK MAP — mecanismo ÚNICO y robusto ══
        // Reemplaza los 6 mecanismos anteriores (timers, visibility,
        // MutationObserver, display-toggle) que se pisaban entre sí.
        //
        // IntersectionObserver detecta cuándo el canvas es REALMENTE
        // visible en pantalla (no ocluido por splash, no display:none).
        // Ese es el momento exacto en que MapLibre debe recalcular su
        // tamaño y repintar — lo que arregla el "blanco hasta navegar".
        const kick = () => {
            try {
                window.GoHappyMap.instance.resize();
                window.GoHappyMap.instance.triggerRepaint();
            } catch (e) {}
        };
        if (window.IntersectionObserver && !window.GoHappyMap._intersectObs) {
            window.GoHappyMap._intersectObs = new IntersectionObserver((entries) => {
                entries.forEach(e => {
                    if (e.isIntersecting && e.intersectionRatio > 0) {
                        // El canvas acaba de hacerse visible → resize + repaint
                        kick();
                        requestAnimationFrame(kick);
                        setTimeout(kick, 200);
                    }
                });
            }, { threshold: [0, 0.01, 0.5] });
            window.GoHappyMap._intersectObs.observe(mapDiv);
        }
        // ResizeObserver para cambios de tamaño (rotación, split-screen)
        if (window.ResizeObserver && !window.GoHappyMap._resizeObs) {
            window.GoHappyMap._resizeObs = new ResizeObserver(kick);
            window.GoHappyMap._resizeObs.observe(mapDiv);
        }
        // Red de seguridad: 2 resize tras crear (cubre el caso raro donde
        // el IntersectionObserver no dispara porque el canvas ya era visible)
        setTimeout(kick, 400);
        setTimeout(kick, 1200);

        // ⚡ UI INMEDIATA — barra de búsqueda + filtros + FABs ⚡
        // CRÍTICO: inyectar la UI AHORA, no en el evento 'load'. Si los tiles
        // tardan o el mapa queda blanco, la UI (botones/búsqueda) debe existir
        // igual — es HTML overlay, no necesita WebGL pintado.
        window.GoHappyMap.injectUI(container);
        window.GoHappyMap._loadSearchCache();
        window.GoHappyMap.startGPSWatch();

        // Solicitar ubicación al instante (GPS preciso → centra mapa al user)
        window.GoHappyMap.locateUser(true);

        // ── Failsafe: ocultar loader a los 3s si tiles tardan
        const hideLoader = () => {
            const ld = document.getElementById('map-loader');
            if (ld && ld.style.display !== 'none') {
                ld.style.transition = 'opacity 0.4s';
                ld.style.opacity = '0';
                setTimeout(() => ld.style.display = 'none', 400);
                window.GoHappyMap.isInitialized = true;
            }
        };
        const failsafeHide = setTimeout(hideLoader, 3000);

        // ── Idle = primer render completo ─
        window.GoHappyMap.instance.on('idle', () => {
            hideLoader();
            clearTimeout(failsafeHide);
            // Refuerzo: idle = todo renderizado, pero forzamos repaint extra
            try { window.GoHappyMap.instance.triggerRepaint?.(); } catch (e) {}
        });

        // ── ERROR catcher
        window.GoHappyMap.instance.on('error', (e) => {
            console.warn('[Map] runtime error:', e?.error?.message || e);
        });

        // ── LOAD: estilo premium navegador
        window.GoHappyMap.instance.on('load', async () => {
            clearTimeout(failsafeHide);
            window.GoHappyMap.isInitialized = true;
            const ld = document.getElementById('map-loader');
            if (ld) {
                ld.style.opacity = '0';
                ld.style.transition = 'opacity 0.4s';
                setTimeout(() => ld.style.display = 'none', 400);
            }

            // Resize + repaint al cargar (el IntersectionObserver cubre el
            // resto de casos de visibilidad). El mapa ya nace con pitch 50.
            try {
                window.GoHappyMap.instance.resize();
                window.GoHappyMap.instance.triggerRepaint();
            } catch (e) {}

            // ───── COLORES NAVEGADOR PREMIUM (estilo Waze/Google 2026) ─────
            const layersColor = [
                { id:'water',                color:'#7CC6EE', opacity:1 },
                { id:'water-pattern',        color:'#7CC6EE', opacity:0.9 },
                { id:'landuse-natural',      color:'#D8EAF6', opacity:1 },
                { id:'landuse-park',         color:'#A6E8C9', opacity:1 },
                { id:'land',                 color:'#E8F1FB', opacity:1 },
                { id:'landuse-residential',  color:'#DCE7F4', opacity:1 },
                { id:'landuse-commercial',   color:'#D8E0F0', opacity:1 },
                { id:'landcover-grass',      color:'#B8E5D0', opacity:1 },
                { id:'landcover-wood',       color:'#A8D8C0', opacity:1 },
                { id:'landuse-industrial',   color:'#CFD9EA', opacity:1 },
                { id:'landuse-cemetery',     color:'#C9E5D8', opacity:1 },
                { id:'landuse-school',       color:'#DCE7F4', opacity:1 },
                { id:'landuse-hospital',     color:'#E6DEEF', opacity:1 },
                { id:'aeroway-area',         color:'#DCE7F4', opacity:1 }
            ];
            layersColor.forEach(l => {
                try {
                    if (window.GoHappyMap.instance.getLayer(l.id)) {
                        window.GoHappyMap.instance.setPaintProperty(l.id, 'fill-color', l.color);
                        window.GoHappyMap.instance.setPaintProperty(l.id, 'fill-opacity', l.opacity);
                    }
                } catch (e) {}
            });

            // ───── EDIFICIOS 3D EXTRUIDOS (gradient cobalt por altura) ─────
            try {
                const buildLayer = window.GoHappyMap.instance.getLayer('building');
                if (buildLayer) {
                    // Capa base 2D plana cobalto suave
                    window.GoHappyMap.instance.setPaintProperty('building', 'fill-color', '#9FBEDD');
                    window.GoHappyMap.instance.setPaintProperty('building', 'fill-opacity', 0.5);

                    // Capa 3D extrusión con TRANSPARENCIA (estilo Google 2026)
                    window.GoHappyMap.instance.addLayer({
                        id: 'gohappy-3d-buildings',
                        source: buildLayer.source,
                        'source-layer': buildLayer.sourceLayer,
                        type: 'fill-extrusion',
                        minzoom: 12,
                        paint: {
                            'fill-extrusion-color': [
                                'interpolate', ['linear'],
                                ['coalesce', ['get', 'render_height'], 10],
                                0,   '#B8E0FA',
                                20,  '#7DC4F0',
                                50,  '#3A9CE0',
                                100, '#0B71FC',
                                200, '#0B4C8F'
                            ],
                            'fill-extrusion-height': [
                                'interpolate', ['linear'], ['zoom'],
                                12, 0,
                                13.5, ['*', ['coalesce', ['get', 'render_height'], 18], 0.4],
                                15, ['coalesce', ['get', 'render_height'], 18]
                            ],
                            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
                            'fill-extrusion-opacity': [
                                'interpolate', ['linear'], ['zoom'],
                                12, 0.35,
                                14, 0.55,
                                16, 0.65,
                                18, 0.72
                            ],
                            'fill-extrusion-vertical-gradient': true
                        }
                    });
                }
            } catch (e) { console.warn('[Map] 3D buildings:', e?.message); }

            // ───── TINT cobalto sutil global ─────
            try {
                window.GoHappyMap.instance.addLayer({
                    id: 'gh-brand-tint',
                    type: 'background',
                    paint: {
                        'background-color': '#7DA8D4',
                        'background-opacity': [
                            'interpolate', ['linear'], ['zoom'],
                            0,  0.18, 6, 0.12, 10, 0.05, 14, 0.02, 18, 0
                        ]
                    }
                }, 'water');
            } catch (e) {}

            // ───── CARRETERAS estilo Waze (blancas con casing) ─────
            try {
                const allLayers = window.GoHappyMap.instance.getStyle().layers;
                const roadLayers = allLayers.filter(l => /road|street|way|bridge|tunnel|highway/i.test(l.id)).map(l => l.id);
                roadLayers.forEach(layer => {
                    try {
                        const lyr = window.GoHappyMap.instance.getLayer(layer);
                        if (!lyr || lyr.type !== 'line') return;
                        const isCasing  = /casing|outline|border/i.test(layer);
                        const isPrimary = /primary|motorway|trunk|main/i.test(layer);
                        if (isCasing)        window.GoHappyMap.instance.setPaintProperty(layer, 'line-color', '#D8E4F0');
                        else if (isPrimary)  window.GoHappyMap.instance.setPaintProperty(layer, 'line-color', '#FFFFFF');
                        else                 window.GoHappyMap.instance.setPaintProperty(layer, 'line-color', '#F4F8FC');
                        window.GoHappyMap.instance.setPaintProperty(layer, 'line-opacity', 1);
                    } catch (e) {}
                });
            } catch (e) {}

            // ───── ILUMINACIÓN ambiental sol Waze ─────
            try {
                window.GoHappyMap.instance.setLight({
                    anchor: 'viewport',
                    color: '#FFF5E6',
                    intensity: 0.35,
                    position: [1.5, 90, 80]
                });
            } catch (e) {}

            // ───── CLUSTERING NATIVO MapLibre ─────
            // Source GeoJSON con cluster:true → MapLibre agrupa puntos cercanos
            try {
                window.GoHappyMap.instance.addSource('gh-poi-cluster', {
                    type: 'geojson',
                    data: { type: 'FeatureCollection', features: [] },
                    cluster: true,
                    clusterMaxZoom: window.GoHappyMap._clusterZoom,
                    clusterRadius: 50
                });

                // Círculos de cluster: cobalt con gradiente por cantidad
                window.GoHappyMap.instance.addLayer({
                    id: 'gh-clusters',
                    type: 'circle',
                    source: 'gh-poi-cluster',
                    filter: ['has', 'point_count'],
                    paint: {
                        'circle-color': [
                            'step', ['get', 'point_count'],
                            '#17C8D4',    // 2-9: cyan
                            10, '#0B71FC',// 10-29: cobalt-bright
                            30, '#0B4C8F' // 30+: cobalt dark
                        ],
                        'circle-radius': [
                            'step', ['get', 'point_count'],
                            22, 10, 30, 30, 38
                        ],
                        'circle-stroke-width': 4,
                        'circle-stroke-color': 'rgba(255,255,255,0.85)',
                        'circle-opacity': 0.92
                    }
                });

                // Número de POIs dentro del cluster
                window.GoHappyMap.instance.addLayer({
                    id: 'gh-cluster-count',
                    type: 'symbol',
                    source: 'gh-poi-cluster',
                    filter: ['has', 'point_count'],
                    layout: {
                        'text-field': '{point_count_abbreviated}',
                        'text-size': 14,
                        'text-font': ['Noto Sans Bold']
                    },
                    paint: { 'text-color': '#ffffff' }
                });

                // Click en cluster → zoom in
                window.GoHappyMap.instance.on('click', 'gh-clusters', (e) => {
                    const features = window.GoHappyMap.instance.queryRenderedFeatures(e.point, { layers: ['gh-clusters'] });
                    const clusterId = features[0]?.properties?.cluster_id;
                    if (clusterId == null) return;
                    window.GoHappyMap.instance.getSource('gh-poi-cluster').getClusterExpansionZoom(clusterId, (err, zoom) => {
                        if (err) return;
                        window.GoHappyMap.instance.easeTo({
                            center: features[0].geometry.coordinates,
                            zoom: zoom + 0.5,
                            duration: 1000
                        });
                    });
                });
                window.GoHappyMap.instance.on('mouseenter', 'gh-clusters', () => {
                    window.GoHappyMap.instance.getCanvas().style.cursor = 'pointer';
                });
                window.GoHappyMap.instance.on('mouseleave', 'gh-clusters', () => {
                    window.GoHappyMap.instance.getCanvas().style.cursor = '';
                });

                // Sync visibilidad markers HTML vs clusters según zoom
                const syncMarkerVisibility = () => {
                    const z = window.GoHappyMap.instance.getZoom();
                    const showHTML = z >= window.GoHappyMap._clusterZoom;
                    window.GoHappyMap.markers.forEach(m => {
                        const el = m.instance.getElement();
                        if (el) el.style.display = showHTML ? '' : 'none';
                    });
                };
                window.GoHappyMap.instance.on('zoomend', syncMarkerVisibility);
                window.GoHappyMap.instance.on('moveend', syncMarkerVisibility);

                // AUTO-REFRESH POIs si el usuario se mueve mucho (>1km del último load)
                let panTimer = null;
                window.GoHappyMap.instance.on('moveend', () => {
                    if (panTimer) clearTimeout(panTimer);
                    panTimer = setTimeout(() => {
                        const c = window.GoHappyMap.instance.getCenter();
                        const z = window.GoHappyMap.instance.getZoom();
                        if (z >= 12) {
                            window.GoHappyMap.loadNearbyPOIs(c.lat, c.lng);
                        }
                    }, 1200);
                });
            } catch (e) { console.warn('[Map] cluster setup:', e?.message); }

            // Cargar marcadores reales (los markers necesitan estilo cargado
            // para el clustering; la UI ya se inyectó fuera del 'load')
            try { await window.GoHappyMap.loadMarkers(); } catch (e) { console.warn('[Map] loadMarkers:', e?.message); }

            // SMART NAV (al volver a la pestaña con contexto)
            if (window._navContext) {
                window.GoHappyMap.handleNavContext(window._navContext);
                window._navContext = null;
            }
        });

        // ───── INTERACCIÓN: doble-click + long-press → reseña ─────
        try { window.GoHappyMap.instance.doubleClickZoom.disable(); } catch (e) {}

        // Doble-click (desktop): añadir reseña
        window.GoHappyMap.instance.on('dblclick', (e) => {
            if (e?.preventDefault) e.preventDefault();
            if (e?.originalEvent?.preventDefault) e.originalEvent.preventDefault();
            window.GoHappyMap.showAddSiteModal(e.lngLat.lat, e.lngLat.lng);
        });

        // Long-press 600ms (móvil): añadir reseña
        let pressTimer = null;
        let pressCoords = null;
        let didMove = false;
        const cancelPress = () => {
            if (pressTimer) clearTimeout(pressTimer);
            pressTimer = null;
            pressCoords = null;
        };
        window.GoHappyMap.instance.on('touchstart', (e) => {
            if (e?.originalEvent?.touches && e.originalEvent.touches.length > 1) {
                cancelPress();
                return;
            }
            pressCoords = e.lngLat;
            didMove = false;
            pressTimer = setTimeout(() => {
                if (!didMove && pressCoords) {
                    if (navigator.vibrate) navigator.vibrate(60);
                    try {
                        if (window.Capacitor?.isNativePlatform?.()) {
                            const { Haptics } = window.Capacitor.Plugins;
                            if (Haptics) Haptics.impact({ style: 'MEDIUM' });
                        }
                    } catch (err) {}
                    window.GoHappyMap.showAddSiteModal(pressCoords.lat, pressCoords.lng);
                }
                pressTimer = null;
            }, 600);
        });
        window.GoHappyMap.instance.on('touchend', cancelPress);
        window.GoHappyMap.instance.on('touchcancel', cancelPress);
        window.GoHappyMap.instance.on('move', () => { if (pressTimer) didMove = true; });
    },

    // ─── handleNavContext (deep-link desde otras pages) ──────────
    handleNavContext: (context) => {
        if (!window.GoHappyMap.instance) return;
        let target = null;
        if (context.coords) target = [context.coords.lng, context.coords.lat];
        else if (context.focus) {
            const m = window.GoHappyMap.markers.find(m => m.data && m.data.name === context.focus);
            if (m) target = [m.data.lng, m.data.lat];
        }
        if (target) {
            window.GoHappyMap.instance.flyTo({
                center: target, zoom: context.zoom || 17,
                speed: 1.5, curve: 1.42, essential: true
            });
            const marker = window.GoHappyMap.markers.find(m =>
                m.data && (m.data.name === context.focus || (m.data.lat === target[1] && m.data.lng === target[0]))
            );
            if (marker?.instance) setTimeout(() => marker.instance.togglePopup(), 1200);
        }
    },

    // ─── injectUI (búsqueda IA + filtros + FABs) ─────────────────
    injectUI: (container) => {
        if (document.querySelector('.map-search-container')) return;
        container.style.position = 'relative';

        const T = window.t || (k => k);
        const lang = window.GoHappyI18n?.lang || 'es';
        const overlay = document.createElement('div');
        overlay.className = 'map-search-container';
        overlay.style.zIndex = '5';
        overlay.innerHTML = `
            <div class="map-search-bar" style="display:flex; align-items:center; background:rgba(255,255,255,0.7); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border-radius:30px; padding:2px 8px 2px 20px; box-shadow:0 10px 30px rgba(0,210,211,0.1); flex:1; width:100%; border:1px solid rgba(255,255,255,0.5);">
                <span class="gemini-sparkle" style="margin-right:8px; font-size:1.2rem;">✨</span>
                <input type="text" id="map-search-input" class="map-search-input" placeholder="${T('map.search.placeholder')}" style="background:transparent; border:none; color:var(--text-dark); flex:1; outline:none; padding:12px 0; font-size:0.95rem;">
                <button id="gh-voice-search" title="${lang === 'en' ? 'Voice search' : 'Búsqueda por voz'}" style="background:rgba(11,113,252,0.10); border:none; width:38px; height:38px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:18px; color:var(--cobalt,#0B4C8F); flex-shrink:0; transition:all 0.2s;">🎤</button>
            </div>
            <div class="map-filters">
                <div class="filter-chip active" data-type="all" data-label="${T('map.filter.all')}" title="${T('map.filter.all')}">🌐</div>
                <div class="filter-chip" data-type="park" data-label="${T('map.filter.parks')}" title="${T('map.filter.parks')}">🌳</div>
                <div class="filter-chip" data-type="school" data-label="${T('map.filter.schools')}" title="${T('map.filter.schools')}">🎓</div>
                <div class="filter-chip" data-type="theater" data-label="${T('map.filter.theaters')}" title="${T('map.filter.theaters')}">🎭</div>
                <div class="filter-chip" data-type="kidzone" data-label="${T('map.filter.kidzones')}" title="${T('map.filter.kidzones')}">🏰</div>
                <div class="filter-chip" data-type="food" data-label="${T('map.filter.food')}" title="${T('map.filter.food')}">🍎</div>
                <div class="filter-chip" data-type="fav" data-label="${lang === 'en' ? 'Favourites' : 'Favoritos'}" title="${lang === 'en' ? 'Favourites' : 'Favoritos'}">★</div>
            </div>
        `;
        container.appendChild(overlay);

        // ════════ STACK PREMIUM de FABs (derecha inferior) ════════
        const fabStack = document.createElement('div');
        fabStack.className = 'gh-map-fab-stack';
        // bottom = altura de la barra de navegación + margen → la reseña (+) nunca se corta
        fabStack.style.cssText = `
            position:absolute; right:14px; bottom:calc(var(--nav-total, 110px) + 18px); z-index:6;
            display:flex; flex-direction:column; gap:10px; align-items:center;
        `;
        container.appendChild(fabStack);

        const makeFab = (id, icon, title, big = false) => {
            const b = document.createElement('button');
            b.id = id;
            b.title = title;
            b.style.cssText = `
                width:${big ? 56 : 46}px; height:${big ? 56 : 46}px;
                border-radius:50%; border:none;
                background:rgba(255,255,255,0.95);
                backdrop-filter:blur(20px) saturate(180%);
                -webkit-backdrop-filter:blur(20px) saturate(180%);
                box-shadow:0 8px 22px rgba(11,76,143,0.18), inset 0 1px 0 rgba(255,255,255,0.95);
                font-size:${big ? 28 : 20}px; color:var(--cobalt,#0B4C8F);
                display:flex; align-items:center; justify-content:center;
                cursor:pointer; transition:transform 0.18s cubic-bezier(0.34,1.56,0.64,1), background 0.2s;
            `;
            b.innerHTML = icon;
            b.addEventListener('pointerdown', () => b.style.transform = 'scale(0.92)');
            b.addEventListener('pointerup',   () => b.style.transform = '');
            b.addEventListener('pointerleave',() => b.style.transform = '');
            return b;
        };

        // 🌡️ Heatmap toggle
        const heatBtn = makeFab('gh-fab-heat', '🌡️', lang === 'en' ? 'Heatmap' : 'Mapa de calor');
        heatBtn.addEventListener('click', async () => {
            const on = await window.GoHappyMap.toggleHeatmap();
            heatBtn.style.background = on ? 'linear-gradient(135deg,#F59E0B,#EF4444)' : 'rgba(255,255,255,0.95)';
            heatBtn.style.color = on ? 'white' : 'var(--cobalt,#0B4C8F)';
        });

        // 👨‍👩‍👧 Familia activa toggle
        const familyBtn = makeFab('gh-fab-family', '👨‍👩‍👧', lang === 'en' ? 'Family live' : 'Familia activa');
        familyBtn.addEventListener('click', async () => {
            const on = await window.GoHappyMap.toggleFamilyMode();
            familyBtn.style.background = on ? 'linear-gradient(135deg,#F59E0B,#FFD700)' : 'rgba(255,255,255,0.95)';
            familyBtn.style.color = on ? 'white' : 'var(--cobalt,#0B4C8F)';
            window.GoHappyToast && window.GoHappyToast.info(
                on ? (lang === 'en' ? '👨‍👩‍👧 Family live ON' : '👨‍👩‍👧 Familia activa') : (lang === 'en' ? 'Family live OFF' : 'Familia desactivada'),
                2200
            );
        });

        // 🧭 Compass (resetea bearing a 0)
        const compassBtn = makeFab('gh-fab-compass', '🧭', lang === 'en' ? 'Reset orientation' : 'Resetear orientación');
        compassBtn.id = 'gh-fab-compass';
        compassBtn.addEventListener('click', () => {
            window.GoHappyMap.instance.easeTo({ bearing: 0, pitch: window.GoHappyMap._is3D ? 55 : 0, duration: 800 });
        });
        // Rotar el icono en función del bearing actual
        window.GoHappyMap.instance.on('rotate', () => {
            const b = window.GoHappyMap.instance.getBearing();
            const inner = compassBtn.firstChild;
            if (inner) compassBtn.style.transform = `rotate(${-b}deg)`;
        });

        // 🎲 2D / 3D toggle
        const toggle3D = makeFab('gh-fab-3d', '🎲', lang === 'en' ? 'Toggle 2D/3D' : 'Cambiar 2D/3D');
        toggle3D.addEventListener('click', () => {
            window.GoHappyMap._is3D = !window.GoHappyMap._is3D;
            window.GoHappyMap.instance.easeTo({
                pitch: window.GoHappyMap._is3D ? 55 : 0,
                duration: 1000
            });
            toggle3D.innerHTML = window.GoHappyMap._is3D ? '🎲' : '🗺️';
        });

        // 🚶 Follow mode (sigue al usuario al caminar)
        const followBtn = makeFab('gh-fab-follow', '🚶', lang === 'en' ? 'Follow me' : 'Sígueme');
        followBtn.addEventListener('click', () => {
            window.GoHappyMap._followMode = !window.GoHappyMap._followMode;
            if (window.GoHappyMap._followMode) {
                followBtn.style.background = 'linear-gradient(135deg,#0B71FC,#17C8D4)';
                followBtn.style.color = 'white';
                if (window.GoHappyMap.userMarker) {
                    const ll = window.GoHappyMap.userMarker.getLngLat();
                    window.GoHappyMap.instance.easeTo({ center: ll, zoom: 17, pitch: 60, duration: 1200 });
                }
                window.GoHappyToast && window.GoHappyToast.info(lang === 'en' ? '🚶 Following you' : '🚶 Siguiéndote', 2000);
            } else {
                followBtn.style.background = 'rgba(255,255,255,0.95)';
                followBtn.style.color = 'var(--cobalt,#0B4C8F)';
                window.GoHappyToast && window.GoHappyToast.info(lang === 'en' ? 'Follow off' : 'Modo libre', 1500);
            }
        });

        // 🎯 Locate (centra al usuario una vez)
        const locateBtn = makeFab('locate-me-btn', '🎯', lang === 'en' ? 'Locate me' : 'Ubícame');

        // ➕ Añadir reseña (más grande, destacado)
        const addBtn = makeFab('add-review-fab', '<span style="font-size:28px;line-height:1;font-weight:300;">+</span>',
                               window.GoHappyI18n ? window.GoHappyI18n.t('map.review') : 'Añadir reseña', true);
        addBtn.style.background = 'linear-gradient(135deg,#0B71FC,#17C8D4)';
        addBtn.style.color = 'white';
        addBtn.style.boxShadow = '0 10px 28px rgba(11,113,252,0.4), inset 0 1px 0 rgba(255,255,255,0.4)';

        // ── LIMPIO: solo 3 FABs visibles; el resto en un grupo plegable ──
        // Grupo plegable de herramientas secundarias (oculto por defecto)
        const toolsWrap = document.createElement('div');
        toolsWrap.id = 'gh-fab-tools';
        toolsWrap.style.cssText = `
            display:none; flex-direction:column; gap:10px; align-items:center;
            animation:gh-tools-in 0.28s cubic-bezier(0.16,1,0.3,1);
        `;
        if (!document.getElementById('gh-tools-style')) {
            const s = document.createElement('style');
            s.id = 'gh-tools-style';
            s.textContent = `@keyframes gh-tools-in { from{opacity:0; transform:translateY(12px) scale(0.9);} to{opacity:1; transform:none;} }`;
            document.head.appendChild(s);
        }
        toolsWrap.appendChild(familyBtn);
        toolsWrap.appendChild(heatBtn);
        toolsWrap.appendChild(toggle3D);
        toolsWrap.appendChild(followBtn);
        toolsWrap.appendChild(compassBtn);

        // Botón que despliega/oculta las herramientas
        const toolsToggle = makeFab('gh-fab-tools-toggle', '🧰', lang === 'en' ? 'More tools' : 'Más herramientas');
        let toolsOpen = false;
        toolsToggle.addEventListener('click', () => {
            toolsOpen = !toolsOpen;
            toolsWrap.style.display = toolsOpen ? 'flex' : 'none';
            toolsToggle.innerHTML = toolsOpen ? '✕' : '🧰';
            toolsToggle.style.background = toolsOpen ? 'rgba(11,76,143,0.10)' : 'rgba(255,255,255,0.95)';
        });

        // Orden visual (arriba → abajo): [herramientas plegables], 🧰, 🎯, ➕
        fabStack.appendChild(toolsWrap);
        fabStack.appendChild(toolsToggle);
        fabStack.appendChild(locateBtn);
        fabStack.appendChild(addBtn);

        addBtn.addEventListener('click', () => {
            let lat, lng;
            if (window.GoHappyMap.userMarker) {
                const ll = window.GoHappyMap.userMarker.getLngLat();
                lat = ll.lat; lng = ll.lng;
            } else if (window.GoHappyMap.instance) {
                const c = window.GoHappyMap.instance.getCenter();
                lat = c.lat; lng = c.lng;
            } else return;
            window.GoHappyMap.showAddSiteModal(lat, lng);
        });

        // Hint primera vez
        if (!localStorage.getItem('GoHappy_map_hint_seen')) {
            setTimeout(() => {
                if (window.GoHappyToast) {
                    const tip = window.GoHappyI18n?.lang === 'en'
                        ? '💡 Double-tap or hold any place to add a review'
                        : '💡 Doble toca o mantén pulsado un sitio para reseñarlo';
                    window.GoHappyToast.info(tip, 4500);
                }
                localStorage.setItem('GoHappy_map_hint_seen', '1');
            }, 2500);
        }

        // Buscador IA (keydown cubre teclados móviles donde keypress no dispara)
        const input = document.getElementById('map-search-input');
        const fireSearch = () => {
            const q = (input.value || '').trim();
            if (!q) return;
            console.info('[Map] search →', q);
            window.GoHappyMap.handleSearch(q);
        };
        input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); fireSearch(); } });
        // Clic en el sparkle ✨ también dispara búsqueda
        const sparkle = overlay.querySelector('.gemini-sparkle');
        if (sparkle) {
            sparkle.style.cursor = 'pointer';
            sparkle.addEventListener('click', fireSearch);
        }

        // ── VOICE SEARCH (Web Speech API) ──
        const voiceBtn = document.getElementById('gh-voice-search');
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (voiceBtn && !SR) {
            // Navegador sin Web Speech API (ej. Safari iOS) → ocultar el botón
            // en vez de dejar un control muerto. La barra de texto sigue ahí.
            voiceBtn.style.display = 'none';
        } else if (voiceBtn && SR) {
            // Inyectar keyframe una sola vez
            if (!document.getElementById('gh-voice-style')) {
                const s = document.createElement('style');
                s.id = 'gh-voice-style';
                s.textContent = '@keyframes gh-voice-pulse {0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.15);opacity:0.7}}';
                document.head.appendChild(s);
            }
            const restoreVoice = () => {
                voiceBtn.style.background = 'rgba(11,113,252,0.10)';
                voiceBtn.style.color = 'var(--cobalt,#0B4C8F)';
                voiceBtn.innerText = '🎤';
                voiceBtn.style.animation = '';
            };
            voiceBtn.addEventListener('click', async () => {
                // 1) Pedir permiso de micrófono explícito (algunos navegadores
                //    no lo piden con SR.start() sin un getUserMedia previo)
                if (navigator.mediaDevices?.getUserMedia) {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        stream.getTracks().forEach(t => t.stop()); // cerrar enseguida
                    } catch (permErr) {
                        console.warn('[Voice] mic permission:', permErr?.message);
                        window.GoHappyToast && window.GoHappyToast.warning(
                            window.L('Habilita el micrófono para usar la búsqueda por voz', 'Enable microphone to use voice search'), 3500
                        );
                        return;
                    }
                }
                const rec = new SR();
                rec.lang = lang === 'en' ? 'en-GB' : 'es-ES';
                rec.interimResults = false;
                rec.maxAlternatives = 1;
                voiceBtn.style.background = 'linear-gradient(135deg,#0B71FC,#17C8D4)';
                voiceBtn.style.color = 'white';
                voiceBtn.innerText = '●';
                voiceBtn.style.animation = 'gh-voice-pulse 1s infinite';
                rec.onresult = (e) => {
                    const text = e.results[0][0].transcript;
                    input.value = text;
                    restoreVoice();
                    window.GoHappyMap.handleSearch(text);
                };
                rec.onerror = (e) => {
                    console.warn('[Voice] error:', e.error);
                    restoreVoice();
                    if (!window.GoHappyToast) return;
                    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
                        window.GoHappyToast.warning(
                            window.L('Permiso de micrófono denegado. Habilítalo en ajustes del navegador.', 'Microphone permission denied. Enable it in browser settings.'), 4000
                        );
                    } else if (e.error === 'no-speech') {
                        window.GoHappyToast.info(window.L('No oí nada — intenta de nuevo', 'I didn\'t hear anything — try again'), 2500);
                    } else if (e.error === 'network') {
                        window.GoHappyToast.error(window.L('Sin conexión para reconocimiento de voz', 'No connection for voice recognition'), 3000);
                    }
                };
                rec.onend = restoreVoice;
                try { rec.start(); } catch (e) {
                    console.warn('[Voice] start failed:', e?.message);
                    restoreVoice();
                }
            });
        }

        // ── Cargar favoritos + aplicar modo nocturno
        window.GoHappyMap._loadFavorites();
        window.GoHappyMap._applyNightMode();
        // Re-check night mode cada hora
        setInterval(() => window.GoHappyMap._applyNightMode(), 60 * 60 * 1000);

        locateBtn.addEventListener('click', () => {
            if (window.GoHappyMap.userMarker) {
                const ll = window.GoHappyMap.userMarker.getLngLat();
                window.GoHappyMap.instance.easeTo({ center: ll, zoom: 17, pitch: 55, speed: 1.2 });
            } else {
                window.GoHappyMap.locateUser();
            }
        });

        // ── Filtros chip MULTI-SELECT ──
        const chips = document.querySelectorAll('.filter-chip');
        const refreshChipsUI = () => {
            chips.forEach(c => {
                if (window.GoHappyMap._activeFilters.has(c.dataset.type)) c.classList.add('active');
                else c.classList.remove('active');
            });
        };
        // Label sin emoji para los queries a IA: '🎭 Teatros' → 'Teatros'
        // La etiqueta de búsqueda vive en data-label (los chips ya solo muestran icono)
        const cleanLabel = (chip) => (chip.dataset.label || chip.innerText || '').replace(/[^\p{L}\s]/gu, '').trim();

        chips.forEach(chip => {
            chip.addEventListener('click', async () => {
                const type = chip.dataset.type;
                const filters = window.GoHappyMap._activeFilters;

                // 'all' es exclusivo (deselecciona los demás)
                if (type === 'all') {
                    filters.clear();
                    filters.add('all');
                } else {
                    filters.delete('all');
                    if (filters.has(type)) filters.delete(type);
                    else filters.add(type);
                    if (filters.size === 0) filters.add('all');
                }
                refreshChipsUI();
                window.GoHappyMap.currentFilter = [...filters].join(',');

                // Filtros locales SIN IA: 'all' o solo 'fav'
                if (filters.has('all') || (filters.size === 1 && filters.has('fav'))) {
                    window.GoHappyMap.filterMarkers();
                    if (filters.has('fav') && window.GoHappyToast) {
                        const favCount = window.GoHappyMap.markers.filter(m => m.data && window.GoHappyMap.isFavorite(m.data)).length;
                        window.GoHappyToast.info(window.L(
                            favCount > 0 ? `★ ${favCount} favoritos` : 'Sin favoritos aún — toca ☆ en cualquier sitio',
                            favCount > 0 ? `★ ${favCount} favourites` : 'No favourites yet — tap ☆ on any place'
                        ), 2500);
                    }
                    return;
                }

                window.GoHappyMap.filterMarkers();
                // ¿Algún tipo seleccionado tiene <5 markers? → expandir con IA
                const typesToExpand = [...filters].filter(t => t !== 'all' && t !== 'fav');
                const needsAI = typesToExpand.find(t => window.GoHappyMap.markers.filter(m => m.type === t).length < 5);
                if (!needsAI) return;

                const label = cleanLabel(chip);
                const myToken = ++window.GoHappyMap._chipSearchToken;
                chip.classList.add('loading');
                const beforeIds = new Set(window.GoHappyMap.markers.map(m => m.data?.id));
                try {
                    await Promise.race([
                        window.GoHappyMap.handleSearch(`mejores ${label} para ir con niños`),
                        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000))
                    ]);
                } catch (e) {}
                if (myToken !== window.GoHappyMap._chipSearchToken) return;
                chip.classList.remove('loading');

                // Fuerza el type esperado a los markers nuevos que la IA devolvió
                // como 'generic' u otro — así el filtro los muestra correctamente.
                let forced = 0;
                window.GoHappyMap.markers.forEach(m => {
                    if (!beforeIds.has(m.data?.id) && m.type !== needsAI) {
                        m.type = needsAI;
                        if (m.data) m.data.type = needsAI;
                        forced++;
                    }
                });
                if (forced > 0) window.GoHappyMap.filterMarkers();

                const newCount = window.GoHappyMap.markers.filter(m => m.type === needsAI).length;
                if (newCount > 0 && window.GoHappyToast) {
                    window.GoHappyToast.success(T('map.community.found', { n: newCount, label: label.toLowerCase() }), 2500);
                }
            });
        });
    },

    // ─── loadMarkers ─────────────────────────────────────────────
    loadMarkers: async () => {
        const coords = window.lastKnownCoords || "41.6520, -4.7286";
        let locations = [];
        try {
            if (window.GoHappyData?.getLocations) {
                locations = await window.GoHappyData.getLocations(coords);
            }
        } catch (e) { console.warn('[Map] getLocations:', e?.message); }
        window.GoHappyMap.clearMarkers();
        (locations || []).forEach(loc => window.GoHappyMap.createMarker(loc));
    },

    // ─── createMarker (pin premium con icono) ─────────────────────
    createMarker: (loc) => {
        if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return;

        // FIX: 'lang' se usaba más abajo (tFav/tShare) sin declararse → ReferenceError
        // que hacía fallar TODA búsqueda con resultados ("Búsqueda falló", 0 marcadores).
        const lang = window.GoHappyI18n?.lang || 'es';

        const hasReview = loc.isCommunity || (loc.rating || 0) >= 4.7;

        let icon = '📍';
        if (loc.type === 'park') icon = '🌳';
        else if (loc.type === 'museum' || loc.type === 'school') icon = '🎓';
        else if (loc.type === 'food') icon = '🍎';
        else if (loc.type === 'theater') icon = '🎭';
        else if (loc.type === 'kidzone') icon = '🏰';

        const isFav = window.GoHappyMap.isFavorite(loc);
        const el = document.createElement('div');
        el.className = `gohappy-marker-wrap ${hasReview ? 'has-badge' : ''}`;
        el.style.animation = 'gh-marker-spawn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
        if (!document.getElementById('gh-marker-style')) {
            const s = document.createElement('style');
            s.id = 'gh-marker-style';
            s.textContent = `
                @keyframes gh-marker-spawn {
                    0% { transform: scale(0) translateY(-30px); opacity: 0; }
                    60% { transform: scale(1.15) translateY(2px); opacity: 1; }
                    100% { transform: scale(1) translateY(0); opacity: 1; }
                }
                .gohappy-marker-wrap:hover .marker-pin-premium {
                    transform: rotate(-45deg) scale(1.12) translateY(-3px);
                    box-shadow: 0 8px 22px rgba(11,76,143,0.35) !important;
                }
                .marker-pin-premium { transition: transform 0.2s, box-shadow 0.2s; }
            `;
            document.head.appendChild(s);
        }
        el.innerHTML = `
            <div class="marker-pin-premium" style="
                background:white; width:40px; height:40px;
                border-radius:50% 50% 50% 0;
                transform:rotate(-45deg);
                display:flex; align-items:center; justify-content:center;
                box-shadow:0 4px 10px rgba(0,0,0,0.2);
                border:3px solid ${isFav ? '#F59E0B' : 'var(--primary-cobalt,#0B4C8F)'};
                position:relative;
            ">
                <div style="transform:rotate(45deg); font-size:20px;">${icon}</div>
                ${isFav ? `<div style="position:absolute; top:-8px; left:-8px; background:#F59E0B; color:white; width:18px; height:18px; border-radius:50%; display:flex; align-items:center; justify-content:center; transform:rotate(45deg); font-size:11px; border:2px solid white;">★</div>` : ''}
                ${hasReview ? `<div class="tribe-insignia" style="position:absolute; top:-10px; right:-10px; background:#F39C12; color:white; font-size:9px; padding:2px 6px; border-radius:10px; font-weight:900; border:2px solid white; transform:rotate(45deg); white-space:nowrap;">⭐</div>` : ''}
            </div>
        `;

        const sec = window.GoHappySecurity;
        const safeName = sec ? sec.safe(loc.name) : String(loc.name || 'Sitio').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
        const safeType = sec ? sec.safe(loc.type || '') : String(loc.type || '');
        const safeImage = (loc.image && /^https?:\/\//.test(loc.image)) ? loc.image : '';

        const tRoute  = window.GoHappyI18n ? window.GoHappyI18n.t('map.route')  : '🗺️ Cómo llegar';
        const tReview = window.GoHappyI18n ? window.GoHappyI18n.t('map.review') : '📝 Escribir reseña';

        const distance = window.GoHappyMap._distanceTo(loc.lat, loc.lng);
        const distBadge = distance
            ? `<span style="background:rgba(11,113,252,0.10); color:var(--cobalt,#0B4C8F); padding:2px 8px; border-radius:999px; font-size:10.5px; font-weight:800; margin-left:6px;">📍 ${distance}</span>`
            : '';
        const tFav   = lang === 'en' ? (isFav ? 'Saved'    : 'Save')      : (isFav ? 'Guardado' : 'Guardar');
        const tShare = lang === 'en' ? 'Share' : 'Compartir';

        const popupHTML = `
            <div class="popup-premium" style="min-width:240px; max-width:280px; border-radius:20px; overflow:hidden;">
                <div class="popup-img-container" style="position:relative; height:110px; background:#eee;">
                    ${safeImage ? `<img src="${safeImage}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#0B71FC,#17C8D4); color:white; font-size:2.2rem;">🌟</div>`}
                    <button class="popup-fav-btn" data-name="${safeName}" data-lat="${loc.lat}" data-lng="${loc.lng}" title="${tFav}" style="position:absolute; top:8px; right:8px; width:36px; height:36px; border-radius:50%; border:none; background:rgba(255,255,255,0.92); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; font-size:18px; cursor:pointer; box-shadow:0 4px 12px rgba(0,0,0,0.15); color:${isFav ? '#F59E0B' : '#666'};">${isFav ? '★' : '☆'}</button>
                </div>
                <div class="popup-body" style="padding:12px 14px; background:white;">
                    <h3 style="margin:0 0 4px 0; font-size:1rem; font-weight:800; color:var(--cobalt,#0B4C8F); line-height:1.25;">${safeName}</h3>
                    <div style="font-size:11.5px; color:#666; margin-bottom:12px; display:flex; align-items:center; flex-wrap:wrap; gap:2px;">
                        <span>⭐ ${parseFloat(loc.rating) || 4.5}</span>
                        <span style="margin:0 6px; opacity:0.5;">·</span>
                        <span>${safeType}</span>
                        ${distBadge}
                    </div>
                    <button class="popup-route-btn" data-lat="${loc.lat}" data-lng="${loc.lng}" style="padding:11px; border-radius:12px; font-size:12px; font-weight:800; width:100%; border:none; color:white; cursor:pointer; background:linear-gradient(135deg,#0B71FC,#17C8D4); margin-bottom:8px; box-shadow:0 6px 16px rgba(11,113,252,0.28);">${tRoute}</button>
                    <div style="display:flex; gap:6px;">
                        <button class="popup-review-btn" data-lat="${loc.lat}" data-lng="${loc.lng}" style="flex:1; padding:9px; border-radius:12px; font-size:11.5px; font-weight:700; border:0.5px solid rgba(11,76,143,0.15); color:var(--cobalt,#0B4C8F); cursor:pointer; background:rgba(11,76,143,0.06);">${tReview}</button>
                        <button class="popup-share-btn" data-name="${safeName}" data-lat="${loc.lat}" data-lng="${loc.lng}" style="flex:1; padding:9px; border-radius:12px; font-size:11.5px; font-weight:700; border:0.5px solid rgba(11,76,143,0.15); color:var(--cobalt,#0B4C8F); cursor:pointer; background:rgba(11,76,143,0.06);">📤 ${tShare}</button>
                    </div>
                </div>
            </div>
        `;

        const popup = new maplibregl.Popup({ offset: 40, className: 'premium-popup-3d' }).setHTML(popupHTML);
        popup.on('open', () => {
            setTimeout(() => {
                const routeBtn = document.querySelector('.maplibregl-popup-content .popup-route-btn');
                const revBtn   = document.querySelector('.maplibregl-popup-content .popup-review-btn');
                const favBtn   = document.querySelector('.maplibregl-popup-content .popup-fav-btn');
                const shareBtn = document.querySelector('.maplibregl-popup-content .popup-share-btn');
                if (revBtn) {
                    revBtn.onclick = () => window.GoHappyMap.showAddSiteModal(parseFloat(revBtn.dataset.lat), parseFloat(revBtn.dataset.lng), loc.name);
                }
                if (routeBtn) {
                    routeBtn.onclick = () => {
                        const la = parseFloat(routeBtn.dataset.lat);
                        const ln = parseFloat(routeBtn.dataset.lng);
                        if (window.GoHappyNav?.openRoute) {
                            window.GoHappyNav.openRoute(la, ln, loc.name);
                        } else {
                            // Fallback universal: Google Maps directions
                            window.open(`https://www.google.com/maps/dir/?api=1&destination=${la},${ln}&destination_place_id=&travelmode=walking`, '_blank');
                        }
                    };
                }
                if (favBtn) {
                    favBtn.onclick = () => {
                        const nowFav = window.GoHappyMap.toggleFavorite(loc);
                        favBtn.innerText = nowFav ? '★' : '☆';
                        favBtn.style.color = nowFav ? '#F59E0B' : '#666';
                        window.GoHappyToast && window.GoHappyToast.success(
                            nowFav
                                ? (lang === 'en' ? '★ Saved to favourites' : '★ Guardado en favoritos')
                                : (lang === 'en' ? 'Removed from favourites' : 'Quitado de favoritos'),
                            1800
                        );
                        // Re-render para que el marker refleje el cambio
                        setTimeout(() => {
                            const idx = window.GoHappyMap.markers.findIndex(m => m.data === loc);
                            if (idx >= 0) {
                                window.GoHappyMap.markers[idx].instance.remove();
                                window.GoHappyMap.markers.splice(idx, 1);
                                window.GoHappyMap.createMarker(loc);
                            }
                        }, 400);
                    };
                }
                if (shareBtn) {
                    shareBtn.onclick = async () => {
                        const la = parseFloat(shareBtn.dataset.lat);
                        const ln = parseFloat(shareBtn.dataset.lng);
                        const url = `https://www.google.com/maps?q=${la},${ln}`;
                        const txt = lang === 'en'
                            ? `Check out ${loc.name} on GoHappy! ${url}`
                            : `¡Mira ${loc.name} en GoHappy! ${url}`;
                        try {
                            if (navigator.share) {
                                await navigator.share({ title: loc.name, text: txt, url });
                            } else {
                                await navigator.clipboard.writeText(txt);
                                window.GoHappyToast && window.GoHappyToast.success(lang === 'en' ? 'Copied to clipboard' : 'Copiado al portapapeles', 2000);
                            }
                        } catch (e) {}
                    };
                }
            }, 50);
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -10] })
            .setLngLat([loc.lng, loc.lat])
            .addTo(window.GoHappyMap.instance);

        // Click en marker → BOTTOM SHEET premium (en vez de popup pequeño)
        el.addEventListener('click', (ev) => {
            ev.stopPropagation();
            window.GoHappyMap.showPOISheet(loc);
        });

        window.GoHappyMap.markers.push({ instance: marker, type: loc.type, data: loc });
        // Alimentar source clustering
        window.GoHappyMap._syncClusterSource();
    },

    // ─── BOTTOM SHEET PREMIUM (slide-up con info POI) ─────────────
    showPOISheet: (loc) => {
        // Cerrar sheet anterior si existe
        const old = document.getElementById('gh-poi-sheet');
        if (old) old.remove();

        const lang = window.GoHappyI18n?.lang || 'es';
        const sec = window.GoHappySecurity;
        const safeName = sec ? sec.safe(loc.name) : String(loc.name || '').replace(/[<>]/g, '');
        const safeImage = (loc.image && /^https?:\/\//.test(loc.image)) ? loc.image : '';
        const distance = window.GoHappyMap._distanceTo(loc.lat, loc.lng);
        const isFav = window.GoHappyMap.isFavorite(loc);
        const iconMap = { park:'🌳', museum:'🎓', school:'🎓', food:'🍎', theater:'🎭', kidzone:'🏰' };
        const icon = loc._icon || iconMap[loc.type] || '📍';

        const tRoute   = lang === 'en' ? 'Get directions' : 'Cómo llegar';
        const tReview  = lang === 'en' ? 'Write review'   : 'Reseñar';
        const tShare   = lang === 'en' ? 'Share'          : 'Compartir';
        const tFav     = lang === 'en' ? (isFav ? 'Saved' : 'Save') : (isFav ? 'Guardado' : 'Guardar');
        const tClose   = lang === 'en' ? 'Close' : 'Cerrar';

        const sheet = document.createElement('div');
        sheet.id = 'gh-poi-sheet';
        sheet.style.cssText = `
            position:fixed; left:0; right:0; bottom:0; z-index:1000;
            background:rgba(255,255,255,0.96); backdrop-filter:blur(30px) saturate(180%);
            -webkit-backdrop-filter:blur(30px) saturate(180%);
            border-radius:28px 28px 0 0;
            box-shadow:0 -20px 50px rgba(11,76,143,0.25);
            transform:translateY(100%); transition:transform 0.42s cubic-bezier(0.32, 0.72, 0, 1);
            max-height:78vh; overflow-y:auto;
            padding-bottom:calc(20px + env(safe-area-inset-bottom));
        `;
        sheet.innerHTML = `
            <!-- Drag handle -->
            <div style="display:flex; justify-content:center; padding:10px 0 6px;">
                <div style="width:44px; height:5px; background:rgba(11,76,143,0.20); border-radius:999px;"></div>
            </div>

            <!-- Hero image / icon -->
            <div style="position:relative; height:160px; margin:0 16px 0; border-radius:22px; overflow:hidden; ${safeImage ? `background:url('${safeImage}') center/cover` : 'background:linear-gradient(135deg,#0B71FC,#17C8D4)'};">
                ${!safeImage ? `<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:80px; opacity:0.55;">${icon}</div>` : ''}
                <button id="gh-sheet-fav" title="${tFav}" style="position:absolute; top:12px; right:12px; width:44px; height:44px; border-radius:50%; border:none; background:rgba(255,255,255,0.95); backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center; font-size:22px; cursor:pointer; box-shadow:0 6px 18px rgba(0,0,0,0.18); color:${isFav ? '#F59E0B' : '#666'};">${isFav ? '★' : '☆'}</button>
                ${distance ? `<div style="position:absolute; bottom:12px; left:12px; background:rgba(255,255,255,0.95); backdrop-filter:blur(10px); padding:6px 12px; border-radius:999px; font-size:12px; font-weight:800; color:var(--cobalt,#0B4C8F); box-shadow:0 4px 12px rgba(0,0,0,0.12);">📍 ${distance}</div>` : ''}
            </div>

            <!-- Body -->
            <div style="padding:18px 20px 8px;">
                <h2 style="font-family:'Poppins',sans-serif; font-weight:900; font-size:1.45rem; color:var(--cobalt,#0B4C8F); margin:0 0 4px; line-height:1.2;">${safeName}</h2>
                <div style="display:flex; align-items:center; gap:6px; font-size:13px; color:#666; margin-bottom:14px;">
                    <span>⭐ ${parseFloat(loc.rating) || 4.5}</span>
                    <span style="opacity:0.4;">·</span>
                    <span style="text-transform:capitalize;">${loc.type || 'sitio'}</span>
                    ${loc._osm ? '<span style="opacity:0.4;">·</span><span style="font-size:10px; padding:2px 7px; background:rgba(11,113,252,0.10); color:var(--cobalt,#0B4C8F); border-radius:999px; font-weight:700;">OSM</span>' : ''}
                    ${loc.isCommunity ? '<span style="opacity:0.4;">·</span><span style="font-size:10px; padding:2px 7px; background:rgba(245,158,11,0.15); color:#92400E; border-radius:999px; font-weight:700;">⭐ Comunidad</span>' : ''}
                </div>

                <!-- Primary CTA -->
                <button id="gh-sheet-route" style="width:100%; padding:14px; border:none; border-radius:16px; background:linear-gradient(135deg,#0B71FC,#17C8D4); color:white; font-weight:800; font-size:15px; cursor:pointer; box-shadow:0 10px 26px rgba(11,113,252,0.35); margin-bottom:10px; display:flex; align-items:center; justify-content:center; gap:8px;">
                    <span style="font-size:18px;">🚗</span> ${tRoute}
                </button>

                <!-- Secondary actions row -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:6px;">
                    <button id="gh-sheet-review" style="padding:12px; border:0.5px solid rgba(11,76,143,0.18); border-radius:14px; background:rgba(11,76,143,0.05); color:var(--cobalt,#0B4C8F); font-weight:800; font-size:12.5px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                        📝 ${tReview}
                    </button>
                    <button id="gh-sheet-share" style="padding:12px; border:0.5px solid rgba(11,76,143,0.18); border-radius:14px; background:rgba(11,76,143,0.05); color:var(--cobalt,#0B4C8F); font-weight:800; font-size:12.5px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                        📤 ${tShare}
                    </button>
                </div>

                <!-- Close button -->
                <button id="gh-sheet-close" style="width:100%; margin-top:10px; padding:10px; border:none; background:transparent; color:#94a3b8; font-weight:700; font-size:13px; cursor:pointer;">${tClose}</button>
            </div>
        `;
        document.body.appendChild(sheet);

        // Animar entrada
        requestAnimationFrame(() => { sheet.style.transform = 'translateY(0)'; });

        // Backdrop scrim
        const backdrop = document.createElement('div');
        backdrop.id = 'gh-poi-backdrop';
        backdrop.style.cssText = `
            position:fixed; inset:0; background:rgba(11,76,143,0.20); z-index:999;
            opacity:0; transition:opacity 0.3s;
        `;
        document.body.appendChild(backdrop);
        requestAnimationFrame(() => { backdrop.style.opacity = '1'; });

        const closeSheet = () => {
            sheet.style.transform = 'translateY(100%)';
            backdrop.style.opacity = '0';
            setTimeout(() => { sheet.remove(); backdrop.remove(); }, 420);
        };

        backdrop.onclick = closeSheet;
        document.getElementById('gh-sheet-close').onclick = closeSheet;

        // Swipe-down para cerrar
        let touchStartY = 0;
        sheet.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY; }, { passive: true });
        sheet.addEventListener('touchmove', (e) => {
            const dy = e.touches[0].clientY - touchStartY;
            if (dy > 0) sheet.style.transform = `translateY(${dy}px)`;
        }, { passive: true });
        sheet.addEventListener('touchend', (e) => {
            const dy = e.changedTouches[0].clientY - touchStartY;
            if (dy > 80) closeSheet();
            else sheet.style.transform = 'translateY(0)';
        });

        // Acciones
        document.getElementById('gh-sheet-route').onclick = () => {
            closeSheet();
            // Dibujar ruta walking en el mapa con polyline
            window.GoHappyMap.showWalkingRoute(loc.lat, loc.lng, loc.name);
        };
        document.getElementById('gh-sheet-review').onclick = () => {
            closeSheet();
            setTimeout(() => window.GoHappyMap.showAddSiteModal(loc.lat, loc.lng, loc.name), 200);
        };
        document.getElementById('gh-sheet-share').onclick = async () => {
            const url = `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
            const txt = lang === 'en' ? `Check out ${loc.name} on GoHappy! ${url}` : `¡Mira ${loc.name} en GoHappy! ${url}`;
            try {
                if (navigator.share) await navigator.share({ title: loc.name, text: txt, url });
                else {
                    await navigator.clipboard.writeText(txt);
                    window.GoHappyToast && window.GoHappyToast.success(lang === 'en' ? 'Copied' : 'Copiado', 1500);
                }
            } catch (e) {}
        };
        document.getElementById('gh-sheet-fav').onclick = () => {
            const nowFav = window.GoHappyMap.toggleFavorite(loc);
            const btn = document.getElementById('gh-sheet-fav');
            btn.innerText = nowFav ? '★' : '☆';
            btn.style.color = nowFav ? '#F59E0B' : '#666';
            window.GoHappyToast && window.GoHappyToast.success(
                nowFav ? (lang === 'en' ? '★ Saved' : '★ Guardado') : (lang === 'en' ? 'Removed' : 'Quitado'),
                1500
            );
            setTimeout(() => {
                const idx = window.GoHappyMap.markers.findIndex(m => m.data === loc);
                if (idx >= 0) {
                    window.GoHappyMap.markers[idx].instance.remove();
                    window.GoHappyMap.markers.splice(idx, 1);
                    window.GoHappyMap.createMarker(loc);
                }
            }, 300);
        };

        // Acercar el mapa al POI (para que no quede tapado por sheet)
        try {
            window.GoHappyMap.instance.flyTo({
                center: [loc.lng, loc.lat],
                zoom: Math.max(15, window.GoHappyMap.instance.getZoom()),
                offset: [0, -window.innerHeight * 0.18],   // desplazar arriba 18%
                speed: 1.4
            });
        } catch (e) {}
    },

    // Sincronizar GeoJSON source con array de markers (para clustering)
    _syncClusterSource: () => {
        try {
            const src = window.GoHappyMap.instance.getSource('gh-poi-cluster');
            if (!src) return;
            const features = window.GoHappyMap.markers
                .filter(m => m.data && typeof m.data.lat === 'number' && typeof m.data.lng === 'number')
                .map(m => ({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [m.data.lng, m.data.lat] },
                    properties: { name: m.data.name, type: m.type || 'generic' }
                }));
            src.setData({ type: 'FeatureCollection', features });
        } catch (e) {}
    },

    clearMarkers: () => {
        window.GoHappyMap.markers.forEach(m => { try { m.instance.remove(); } catch (e) {} });
        window.GoHappyMap.markers = [];
        window.GoHappyMap._syncClusterSource();
    },

    filterMarkers: (typeOrNull) => {
        // Modo multi-select: usa _activeFilters Set
        // Si pasa un type concreto, se sigue soportando para compat
        const filters = window.GoHappyMap._activeFilters;
        const matchesFilters = (m) => {
            if (filters.has('all')) return true;
            if (filters.has('fav') && m.data && window.GoHappyMap.isFavorite(m.data)) return true;
            return filters.has(m.type);
        };

        let hasVisible = false;
        const bounds = new maplibregl.LngLatBounds();
        window.GoHappyMap.markers.forEach(m => {
            if (matchesFilters(m)) {
                m.instance.addTo(window.GoHappyMap.instance);
                bounds.extend(m.instance.getLngLat());
                hasVisible = true;
            } else {
                m.instance.remove();
            }
        });
        if (hasVisible && window.GoHappyMap.instance) {
            if (window.GoHappyMap.userMarker) bounds.extend(window.GoHappyMap.userMarker.getLngLat());
            try {
                window.GoHappyMap.instance.fitBounds(bounds, {
                    padding: { top:100, bottom:100, left:50, right:50 },
                    maxZoom: 15, pitch: 0, speed: 1.0
                });
            } catch (e) {}
        }
    },

    // ─── handleSearch (IA Gemini + fallback Photon) ──────────────
    handleSearch: async (query) => {
        if (!query) return;
        const input = document.getElementById('map-search-input');
        const lang = window.GoHappyI18n?.lang || 'es';
        if (input) {
            input.placeholder = lang === 'en' ? '✨ AI searching…' : '✨ IA buscando…';
            input.disabled = true;
        }

        let added = 0;
        try {
            const coords = window.lastKnownCoords || window.GoHappyMap.lastKnownCoords;

            // ── CACHE check (búsquedas idénticas instantáneas, TTL 24h)
            const cacheKey = window.GoHappyMap._cacheKey(query, coords);
            let results = null;
            const cached = window.GoHappyMap._searchCache.get(cacheKey);
            if (cached && (Date.now() - cached.ts) < window.GoHappyMap._CACHE_TTL) {
                results = cached.data;
                console.info(`[Map] cache HIT "${query}" → ${results.length} results`);
            } else if (window.GoHappyData?.searchLocations) {
                results = await window.GoHappyData.searchLocations(query, coords);
                // Guardar en caché
                if (results && results.length > 0) {
                    window.GoHappyMap._searchCache.set(cacheKey, { ts: Date.now(), data: results });
                    window.GoHappyMap._saveSearchCache();
                }
            }

            console.info(`[Map] search "${query}" → ${results?.length || 0} results`);

            if (results && results.length > 0) {
                const existingNames = new Set(window.GoHappyMap.markers.map(m => (m.data?.name || '').toLowerCase()));
                const bounds = new maplibregl.LngLatBounds();
                results.forEach(loc => {
                    if (!loc.lat || !loc.lng) return;
                    const nameLower = (loc.name || '').toLowerCase();
                    if (existingNames.has(nameLower)) return;
                    existingNames.add(nameLower);
                    window.GoHappyMap.createMarker(loc);
                    bounds.extend([loc.lng, loc.lat]);
                    added++;
                });
                if (added > 0) {
                    if (window.GoHappyMap.userMarker) bounds.extend(window.GoHappyMap.userMarker.getLngLat());
                    try {
                        window.GoHappyMap.instance.fitBounds(bounds, {
                            padding: { top: 140, bottom: 180, left: 50, right: 50 },
                            maxZoom: 16, pitch: 30, speed: 1.2, essential: true
                        });
                    } catch (e) {}
                    window.GoHappyToast && window.GoHappyToast.success(
                        lang === 'en' ? `Found ${added} places ✨` : `Encontrados ${added} sitios ✨`,
                        2500
                    );
                }
            } else {
                // Fallback geocoding Photon (un solo punto)
                const coordsArr = String(coords || '').split(',').map(s => parseFloat(s.trim()));
                const u = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1&lat=${coordsArr[0]}&lon=${coordsArr[1]}`;
                try {
                    const resp = await fetch(u, { signal: AbortSignal.timeout(5000) });
                    const data = await resp.json();
                    if (data?.features?.length > 0) {
                        const c = data.features[0].geometry.coordinates;
                        window.GoHappyMap.instance.flyTo({ center: c, zoom: 16, pitch: 30, speed: 1.5 });
                    } else {
                        window.GoHappyToast && window.GoHappyToast.info(
                            lang === 'en' ? `No results for "${query}"` : `Sin resultados para "${query}"`,
                            3000
                        );
                    }
                } catch (e) {
                    window.GoHappyToast && window.GoHappyToast.warning(
                        lang === 'en' ? 'Search timeout — try again' : 'Búsqueda lenta — reintenta',
                        2500
                    );
                }
            }
        } catch (e) {
            console.warn('[Map] search error:', e?.message);
            window.GoHappyToast && window.GoHappyToast.error(
                lang === 'en' ? 'Search failed' : 'Búsqueda falló', 2500
            );
        }

        if (input) {
            input.placeholder = lang === 'en' ? 'Ask Gemini…' : 'Pregunta a Gemini…';
            input.disabled = false;
            input.value = '';
        }
        return added;
    },

    // ─── GPS watch (track user + sync coords) ────────────────────
    startGPSWatch: () => {
        if (!navigator.geolocation) return;
        if (window.GoHappyMap._gpsWatchId != null) {
            navigator.geolocation.clearWatch(window.GoHappyMap._gpsWatchId);
        }
        let lastLat = null, lastLng = null;
        window.GoHappyMap._gpsWatchId = navigator.geolocation.watchPosition((pos) => {
            const lat = pos.coords.latitude, lng = pos.coords.longitude;
            const newCoords = `${lat}, ${lng}`;
            if (window.lastKnownCoords !== newCoords) {
                window.lastKnownCoords = newCoords;
                window.dispatchEvent(new CustomEvent('GoHappy-location-sync', { detail: newCoords }));
            }
            let heading = pos.coords.heading;
            if (heading === null && lastLat !== null && lastLng !== null) {
                if (Math.abs(lat - lastLat) > 0.00001 || Math.abs(lng - lastLng) > 0.00001) {
                    const deltaLng = (lng - lastLng) * Math.cos(lastLat * Math.PI / 180);
                    const deltaLat = lat - lastLat;
                    heading = (Math.atan2(deltaLng, deltaLat) * 180 / Math.PI + 360) % 360;
                }
            }
            lastLat = lat; lastLng = lng;
            window.GoHappyMap.updateUserIcon(lat, lng, heading);

            // FOLLOW MODE: mover el mapa con el usuario + rotar al heading
            if (window.GoHappyMap._followMode && window.GoHappyMap.instance) {
                try {
                    const opts = { center: [lng, lat], duration: 800, essential: true };
                    if (heading !== null && !isNaN(heading)) opts.bearing = heading;
                    window.GoHappyMap.instance.easeTo(opts);
                } catch (e) {}
            }
        }, null, { enableHighAccuracy: true });
    },

    updateUserIcon: (lat, lng, heading = 0) => {
        if (!window.GoHappyMap.userMarker) {
            const el = document.createElement('div');
            el.innerHTML = `
                <div class="user-orb-container" style="position:relative; width:60px; height:60px; display:flex; align-items:center; justify-content:center;">
                    <div class="user-orb-glow" style="position:absolute; width:100%; height:100%; background:radial-gradient(circle, rgba(11,76,143,0.4) 0%, transparent 70%); animation:pulse 2s infinite;"></div>
                    <div class="user-orb-core" style="
                        width:24px; height:24px;
                        background:white;
                        border:4px solid var(--primary-cobalt,#0B4C8F);
                        border-radius:50%;
                        box-shadow:0 0 15px rgba(11,76,143,0.5);
                        z-index:2;
                    "></div>
                    <div class="user-direction-cone" style="
                        position:absolute;
                        width:0; height:0;
                        border-left:10px solid transparent;
                        border-right:10px solid transparent;
                        border-bottom:25px solid var(--primary-cobalt,#0B4C8F);
                        top:-15px; opacity:0.8;
                        transform-origin:center 45px;
                        transform:rotate(${heading}deg);
                    "></div>
                </div>
                <style>@keyframes pulse {0%,100%{transform:scale(1); opacity:1} 50%{transform:scale(1.3); opacity:0.4}}</style>
            `;
            window.GoHappyMap.userMarker = new maplibregl.Marker({ element: el, pitchAlignment: 'map', rotationAlignment: 'map' })
                .setLngLat([lng, lat])
                .addTo(window.GoHappyMap.instance);
        } else {
            window.GoHappyMap.userMarker.setLngLat([lng, lat]);
            const cone = window.GoHappyMap.userMarker.getElement().querySelector('.user-direction-cone');
            if (cone) cone.style.transform = `rotate(${heading}deg)`;
        }
    },

    locateUser: (animate = false) => {
        if (!navigator.geolocation) return;
        // Primera llamada RÁPIDA con caché (resultado en <1s)
        // Después una SEGUNDA llamada de alta precisión que mejora si la primera era imprecisa
        const onPos = (pos, isPrecise = false) => {
            const lat = pos.coords.latitude, lng = pos.coords.longitude;
            const acc = pos.coords.accuracy;
            console.info('[Map] GPS', isPrecise ? '(precise)' : '(quick)', lat.toFixed(5), lng.toFixed(5), '±' + Math.round(acc) + 'm');
            const opts = animate
                ? { center: [lng, lat], zoom: 16, pitch: 0, duration: 1800 }
                : { center: [lng, lat] };
            if (animate) window.GoHappyMap.instance.flyTo(opts);
            else window.GoHappyMap.instance.setCenter([lng, lat]);
            window.GoHappyMap.updateUserIcon(lat, lng);
            // ⚡ AUTO-CARGAR POIs reales alrededor en background (no bloquea)
            requestIdleCallback
                ? requestIdleCallback(() => window.GoHappyMap.loadNearbyPOIs(lat, lng), { timeout: 2000 })
                : setTimeout(() => window.GoHappyMap.loadNearbyPOIs(lat, lng), 500);
            // 🤖 Sugerencia contextual (clima + hora + favoritos)
            setTimeout(() => window.GoHappyMap.showContextualSuggestion(), 3500);
        };

        // 1) Llamada rápida con caché de 60s (resultado instantáneo si hay caché)
        navigator.geolocation.getCurrentPosition(
            (pos) => onPos(pos, false),
            (err) => console.warn('[Map] geo quick denied:', err?.message),
            { enableHighAccuracy: false, timeout: 3000, maximumAge: 60000 }
        );

        // 2) Llamada precisa en background (GPS real, sin caché)
        setTimeout(() => {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    if (pos.coords.accuracy < 100) onPos(pos, true);
                },
                (err) => {
                    console.warn('[Map] geo precise denied:', err?.message);
                    if (!window.GoHappyMap.isInitialized) {
                        const ld = document.getElementById('map-loader');
                        if (ld) ld.style.display = 'none';
                    }
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        }, 500);
    },

    // ═══════════════════════════════════════════════════════════
    // WALKING TURN-BY-TURN — polyline ruta a pie en el mapa
    // OSRM público (free, sin key) — https://router.project-osrm.org
    // ═══════════════════════════════════════════════════════════
    showWalkingRoute: async (destLat, destLng, destName = '') => {
        const userPos = window.GoHappyMap.userMarker?.getLngLat();
        if (!userPos) {
            window.GoHappyToast && window.GoHappyToast.warning(
                window.L ? window.L('Activa la ubicación primero', 'Enable location first') : 'No GPS'
            );
            return;
        }
        const lang = window.GoHappyI18n?.lang || 'es';
        const url = `https://router.project-osrm.org/route/v1/foot/${userPos.lng},${userPos.lat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
        try {
            const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
            const data = await r.json();
            const route = data?.routes?.[0];
            if (!route?.geometry) {
                window.GoHappyToast && window.GoHappyToast.warning(lang === 'en' ? 'No walking route found' : 'Sin ruta a pie disponible');
                return;
            }
            window.GoHappyMap.clearRoute();
            window.GoHappyMap._addRouteLayer(route.geometry);
            // Stats
            const minutes = Math.round(route.duration / 60);
            const meters  = Math.round(route.distance);
            const distTxt = meters < 1000 ? `${meters} m` : `${(meters/1000).toFixed(1)} km`;
            window.GoHappyMap._showRouteStatsBar(destName, minutes, distTxt);
            // Fit bounds suavemente
            try {
                const bounds = new maplibregl.LngLatBounds();
                route.geometry.coordinates.forEach(c => bounds.extend(c));
                window.GoHappyMap.instance.fitBounds(bounds, { padding: { top: 120, bottom: 280, left: 40, right: 40 }, maxZoom: 17, duration: 1500 });
            } catch (e) {}
        } catch (e) {
            console.warn('[Map] route error:', e?.message);
            window.GoHappyToast && window.GoHappyToast.warning(lang === 'en' ? 'Route service unavailable' : 'Servicio de rutas no disponible');
        }
    },
    _addRouteLayer: (geojson) => {
        const m = window.GoHappyMap.instance;
        if (m.getLayer('gh-route-glow'))   m.removeLayer('gh-route-glow');
        if (m.getLayer('gh-route-line'))   m.removeLayer('gh-route-line');
        if (m.getLayer('gh-route-arrows')) m.removeLayer('gh-route-arrows');
        if (m.getSource('gh-route'))       m.removeSource('gh-route');

        m.addSource('gh-route', { type: 'geojson', data: { type: 'Feature', geometry: geojson, properties: {} } });
        // Glow exterior
        m.addLayer({
            id: 'gh-route-glow', type: 'line', source: 'gh-route',
            paint: {
                'line-color': '#17C8D4',
                'line-width': ['interpolate', ['linear'], ['zoom'], 12, 10, 18, 24],
                'line-opacity': 0.35,
                'line-blur': 6
            },
            layout: { 'line-cap': 'round', 'line-join': 'round' }
        });
        // Línea principal
        m.addLayer({
            id: 'gh-route-line', type: 'line', source: 'gh-route',
            paint: {
                'line-color': '#0B71FC',
                'line-width': ['interpolate', ['linear'], ['zoom'], 12, 5, 18, 11],
                'line-opacity': 1
            },
            layout: { 'line-cap': 'round', 'line-join': 'round' }
        });
        window.GoHappyMap._routeLayer = true;
    },
    clearRoute: () => {
        const m = window.GoHappyMap.instance;
        try {
            ['gh-route-glow', 'gh-route-line'].forEach(id => { if (m.getLayer(id)) m.removeLayer(id); });
            if (m.getSource('gh-route')) m.removeSource('gh-route');
        } catch (e) {}
        const bar = document.getElementById('gh-route-bar');
        if (bar) bar.remove();
        window.GoHappyMap._routeLayer = null;
    },
    _showRouteStatsBar: (destName, minutes, distTxt) => {
        const old = document.getElementById('gh-route-bar');
        if (old) old.remove();
        const lang = window.GoHappyI18n?.lang || 'es';
        const bar = document.createElement('div');
        bar.id = 'gh-route-bar';
        bar.style.cssText = `
            position:absolute; left:14px; right:14px; bottom:14px; z-index:8;
            background:rgba(255,255,255,0.96); backdrop-filter:blur(24px) saturate(180%);
            border-radius:22px; padding:14px 16px; box-shadow:0 16px 40px rgba(11,76,143,0.22);
            display:flex; align-items:center; gap:12px; max-width:520px; margin:0 auto;
            animation:gh-route-bar-in 0.45s cubic-bezier(0.34,1.56,0.64,1);
        `;
        if (!document.getElementById('gh-route-bar-style')) {
            const s = document.createElement('style');
            s.id = 'gh-route-bar-style';
            s.textContent = '@keyframes gh-route-bar-in {0%{transform:translateY(40px); opacity:0} 100%{transform:translateY(0); opacity:1}}';
            document.head.appendChild(s);
        }
        bar.innerHTML = `
            <div style="font-size:30px;">🚶</div>
            <div style="flex:1; min-width:0;">
                <div style="font-weight:900; font-size:14px; color:var(--cobalt,#0B4C8F); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${destName || (lang === 'en' ? 'Destination' : 'Destino')}</div>
                <div style="font-size:12px; color:#64748b; margin-top:2px;">⏱️ ${minutes} min · 📏 ${distTxt}</div>
            </div>
            <button id="gh-route-close" style="background:rgba(11,76,143,0.08); color:var(--cobalt,#0B4C8F); border:none; width:36px; height:36px; border-radius:50%; cursor:pointer; font-size:16px; font-weight:800;">✕</button>
        `;
        document.querySelector('#map-viewport-v11')?.appendChild(bar) || document.body.appendChild(bar);
        document.getElementById('gh-route-close').onclick = () => window.GoHappyMap.clearRoute();
    },

    // ═══════════════════════════════════════════════════════════
    // HEATMAP — zonas calientes según reseñas comunidad (Firestore)
    // ═══════════════════════════════════════════════════════════
    _heatmapVisible: false,
    toggleHeatmap: async () => {
        const m = window.GoHappyMap.instance;
        const exists = m.getSource('gh-heat');
        if (window.GoHappyMap._heatmapVisible && exists) {
            // Toggle off
            ['gh-heat-layer'].forEach(id => { if (m.getLayer(id)) m.removeLayer(id); });
            m.removeSource('gh-heat');
            window.GoHappyMap._heatmapVisible = false;
            return false;
        }
        // Cargar reviews comunidad
        let features = [];
        try {
            const snap = await window.GoHappyDB.collection('reviews').limit(500).get();
            features = snap.docs.map(d => {
                const r = d.data();
                if (typeof r.lat !== 'number' || typeof r.lng !== 'number') return null;
                return {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
                    properties: { weight: (r.rating || 4) / 5 }
                };
            }).filter(Boolean);
        } catch (e) { console.warn('[Heatmap] firestore error:', e?.message); }

        m.addSource('gh-heat', { type: 'geojson', data: { type: 'FeatureCollection', features } });
        m.addLayer({
            id: 'gh-heat-layer', type: 'heatmap', source: 'gh-heat',
            maxzoom: 17,
            paint: {
                'heatmap-weight': ['get', 'weight'],
                'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 8, 0.6, 17, 2.5],
                'heatmap-color': [
                    'interpolate', ['linear'], ['heatmap-density'],
                    0, 'rgba(11,113,252,0)',
                    0.2, 'rgba(23,200,212,0.35)',
                    0.4, 'rgba(11,113,252,0.55)',
                    0.6, 'rgba(245,158,11,0.7)',
                    0.85, 'rgba(239,68,68,0.85)',
                    1, 'rgba(217,70,239,0.9)'
                ],
                'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 12, 17, 60],
                'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0.85, 17, 0]
            }
        }, m.getLayer('gh-clusters') ? 'gh-clusters' : undefined);
        window.GoHappyMap._heatmapVisible = true;
        return true;
    },

    // ═══════════════════════════════════════════════════════════
    // MODO FAMILIA ACTIVA — posiciones live de miembros via Firestore
    // ═══════════════════════════════════════════════════════════
    _familyActive: false,
    _familyPublishTimer: null,
    toggleFamilyMode: async () => {
        const user = window.GoHappyAuth?.checkAuth?.();
        if (!user?.familyId) {
            const lang = window.GoHappyI18n?.lang || 'es';
            window.GoHappyToast && window.GoHappyToast.warning(lang === 'en' ? 'Join a family first' : 'Únete a una familia primero');
            return false;
        }
        if (window.GoHappyMap._familyActive) {
            // OFF
            window.GoHappyMap._familyActive = false;
            if (window.GoHappyMap._familyUnsub) { try { window.GoHappyMap._familyUnsub(); } catch (e) {} }
            if (window.GoHappyMap._familyPublishTimer) clearInterval(window.GoHappyMap._familyPublishTimer);
            window.GoHappyMap._familyMarkers.forEach(m => { try { m.remove(); } catch (e) {} });
            window.GoHappyMap._familyMarkers.clear();
            return false;
        }
        // ON
        window.GoHappyMap._familyActive = true;
        // Publicar mi ubicación cada 30s
        const publishMyLoc = async () => {
            if (!window.GoHappyMap.userMarker) return;
            const ll = window.GoHappyMap.userMarker.getLngLat();
            try {
                await window.GoHappyDB.collection('families').doc(user.familyId)
                    .collection('positions').doc(user.uid).set({
                        lat: ll.lat, lng: ll.lng,
                        nickname: user.nickname || 'Familia',
                        photo: (user.photo && !user.photo.startsWith('data:')) ? user.photo : '👤',
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
            } catch (e) { console.warn('[Family] publish:', e?.message); }
        };
        publishMyLoc();
        window.GoHappyMap._familyPublishTimer = setInterval(publishMyLoc, 30000);

        // Escuchar posiciones de la familia
        window.GoHappyMap._familyUnsub = window.GoHappyDB.collection('families').doc(user.familyId)
            .collection('positions').onSnapshot(snap => {
                snap.docs.forEach(d => {
                    if (d.id === user.uid) return; // skip self
                    const p = d.data();
                    if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return;
                    let marker = window.GoHappyMap._familyMarkers.get(d.id);
                    if (!marker) {
                        const el = document.createElement('div');
                        el.style.cssText = 'width:42px; height:42px; position:relative;';
                        el.innerHTML = `
                            <div style="position:absolute; inset:0; background:radial-gradient(circle, rgba(245,158,11,0.45) 0%, transparent 70%); animation:pulse 2s infinite;"></div>
                            <div style="position:absolute; inset:4px; background:white; border:3px solid #F59E0B; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:18px; box-shadow:0 4px 12px rgba(245,158,11,0.5);">${p.photo && p.photo.startsWith('http') ? `<img src="${p.photo}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">` : (p.photo || '👤')}</div>
                            <div style="position:absolute; top:-22px; left:50%; transform:translateX(-50%); background:#F59E0B; color:white; padding:2px 8px; border-radius:999px; font-size:10px; font-weight:800; white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,0.18);">${(p.nickname || 'Tribu').slice(0,12)}</div>
                        `;
                        marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([p.lng, p.lat]).addTo(window.GoHappyMap.instance);
                        window.GoHappyMap._familyMarkers.set(d.id, marker);
                    } else {
                        marker.setLngLat([p.lng, p.lat]);
                    }
                });
                // Limpiar miembros que ya no están
                const presentIds = new Set(snap.docs.map(d => d.id));
                window.GoHappyMap._familyMarkers.forEach((mk, uid) => {
                    if (!presentIds.has(uid)) {
                        try { mk.remove(); } catch (e) {}
                        window.GoHappyMap._familyMarkers.delete(uid);
                    }
                });
            });
        return true;
    },

    // ═══════════════════════════════════════════════════════════
    // SUGERENCIAS CONTEXTUALES — banner inteligente arriba del mapa
    // según hora, día, clima (Open-Meteo) y favoritos cercanos
    // ═══════════════════════════════════════════════════════════
    _suggestionShown: false,
    showContextualSuggestion: async () => {
        if (window.GoHappyMap._suggestionShown) return;
        if (document.getElementById('gh-context-banner')) return;
        const userPos = window.GoHappyMap.userMarker?.getLngLat();
        if (!userPos) return;

        const lang = window.GoHappyI18n?.lang || 'es';
        const now = new Date();
        const hour = now.getHours();
        const dow = now.getDay();
        const isWeekend = (dow === 0 || dow === 6);

        // Fetch clima Open-Meteo (gratis sin key)
        let weather = null;
        try {
            const u = `https://api.open-meteo.com/v1/forecast?latitude=${userPos.lat}&longitude=${userPos.lng}&current=temperature_2m,precipitation,weather_code&hourly=precipitation_probability&forecast_days=1`;
            const r = await fetch(u, { signal: AbortSignal.timeout(5000) });
            weather = await r.json();
        } catch (e) {}

        const temp = weather?.current?.temperature_2m;
        const wcode = weather?.current?.weather_code;
        const rainProb = weather?.hourly?.precipitation_probability?.slice(hour, hour+3)?.reduce((a,b) => Math.max(a,b), 0);
        const willRain = rainProb > 50 || (wcode >= 51 && wcode <= 67) || (wcode >= 80 && wcode <= 99);

        let icon, title, body, suggestedFilter;
        if (willRain) {
            icon = '☔'; suggestedFilter = ['museum', 'theater', 'kidzone'];
            title = lang === 'en' ? 'Rain expected — head indoors' : 'Lluvia prevista — mejor a cubierto';
            body  = lang === 'en' ? `${rainProb}% chance · museums and play centres nearby` : `${rainProb}% prob · museos y kid zones cerca`;
        } else if (isWeekend && hour < 12) {
            icon = '🌳'; suggestedFilter = ['park', 'kidzone'];
            title = lang === 'en' ? 'Weekend morning — perfect for parks' : 'Mañana de finde — perfecto para parques';
            body  = lang === 'en' ? `${temp ? Math.round(temp)+'°C' : ''} · outdoor plans nearby` : `${temp ? Math.round(temp)+'°C' : ''} · planes al aire libre cerca`;
        } else if (hour >= 13 && hour <= 16) {
            icon = '🍽️'; suggestedFilter = ['food'];
            title = lang === 'en' ? 'Lunchtime — family-friendly nearby' : 'Hora de comer — sitios familiares cerca';
            body  = lang === 'en' ? 'Cafés, ice cream and restaurants' : 'Cafés, helados y restaurantes';
        } else if (hour >= 18 && hour < 21) {
            icon = '🎭'; suggestedFilter = ['theater', 'kidzone'];
            title = lang === 'en' ? 'Evening plans' : 'Planes de tarde';
            body  = lang === 'en' ? 'Theatre, cinema or play centre' : 'Teatro, cine o ludoteca';
        } else {
            return; // sin sugerencia
        }

        const banner = document.createElement('div');
        banner.id = 'gh-context-banner';
        banner.style.cssText = `
            position:absolute; top:120px; left:14px; right:14px; z-index:7;
            background:linear-gradient(135deg, rgba(11,113,252,0.96), rgba(23,200,212,0.96));
            color:white;
            border-radius:18px; padding:12px 14px;
            box-shadow:0 14px 32px rgba(11,76,143,0.28);
            display:flex; align-items:center; gap:12px;
            max-width:520px; margin:0 auto;
            animation:gh-context-in 0.5s cubic-bezier(0.34,1.56,0.64,1);
        `;
        if (!document.getElementById('gh-context-style')) {
            const s = document.createElement('style');
            s.id = 'gh-context-style';
            s.textContent = '@keyframes gh-context-in {0%{transform:translateY(-30px); opacity:0} 100%{transform:translateY(0); opacity:1}}';
            document.head.appendChild(s);
        }
        banner.innerHTML = `
            <div style="font-size:28px;">${icon}</div>
            <div style="flex:1; min-width:0;">
                <div style="font-weight:900; font-size:13px; line-height:1.2;">${title}</div>
                <div style="font-size:11.5px; opacity:0.92; margin-top:2px;">${body}</div>
            </div>
            <button id="gh-ctx-apply" style="background:white; color:var(--cobalt,#0B4C8F); border:none; padding:8px 13px; border-radius:999px; font-weight:800; font-size:11.5px; cursor:pointer; box-shadow:0 3px 10px rgba(0,0,0,0.12); flex-shrink:0;">${lang === 'en' ? 'Show' : 'Ver'}</button>
            <button id="gh-ctx-close" style="background:transparent; color:white; border:none; padding:0 4px; font-size:20px; cursor:pointer; opacity:0.85; flex-shrink:0;">×</button>
        `;
        const viewport = document.querySelector('#map-viewport-v11') || document.body;
        viewport.appendChild(banner);
        document.getElementById('gh-ctx-apply').onclick = () => {
            window.GoHappyMap._activeFilters.clear();
            suggestedFilter.forEach(t => window.GoHappyMap._activeFilters.add(t));
            // Refresh chips UI
            document.querySelectorAll('.filter-chip').forEach(c => {
                c.classList.toggle('active', window.GoHappyMap._activeFilters.has(c.dataset.type));
            });
            window.GoHappyMap.filterMarkers();
            banner.remove();
            window.GoHappyMap._suggestionShown = true;
        };
        document.getElementById('gh-ctx-close').onclick = () => {
            banner.remove();
            window.GoHappyMap._suggestionShown = true;
        };
        // Auto-close 12s
        setTimeout(() => { if (banner.parentNode) banner.remove(); }, 12000);
    },

    // ─── Modal añadir reseña ──────────────────────────────────────
    showAddSiteModal: (lat, lng, name = '') => {
        const user = window.GoHappyAuth.checkAuth();
        if (!user) {
            window.GoHappyToast && window.GoHappyToast.warning(window.L ? window.L('Inicia sesión para contribuir', 'Sign in to contribute') : 'Login required');
            window.GoHappyAuth.renderAuthModal && window.GoHappyAuth.renderAuthModal();
            return;
        }
        const T = window.t || (k => k);
        const lang = window.GoHappyI18n?.lang || 'es';
        const modal = document.createElement('div');
        modal.className = 'modal entry-anim';
        modal.innerHTML = `
            <div class="auth-container" style="padding:20px;">
                <div class="auth-card premium-glass" style="max-height:85vh; overflow-y:auto; border-radius:30px; border:1px solid rgba(255,255,255,0.4); padding:25px;">
                    <div style="text-align:center; margin-bottom:20px;">
                        <span style="font-size:40px; display:block; margin-bottom:10px;">🌟</span>
                        <h3 style="color:var(--primary-cobalt); font-weight:900; font-size:1.5rem; margin:0;">${name ? T('map.review.review', { name }) : T('map.review.modal.title')}</h3>
                        <p style="font-size:13px; color:#64748b; margin-top:5px;">${T('map.review.help')}</p>
                    </div>
                    ${name ? '' : `<div style="margin-bottom:15px;"><label style="font-size:11px; font-weight:700; color:var(--primary-cobalt); text-transform:uppercase; margin-bottom:5px; display:block;">${lang === 'en' ? 'Place name' : 'Nombre del lugar'}</label><input type="text" id="new-site-name" placeholder="${lang === 'en' ? 'E.g. Park Hills' : 'Ej: Parque Los Pinos'}" class="review-input" style="width:100%; padding:14px; border-radius:12px; border:1px solid #eee; background:#f8fafc; box-sizing:border-box;"></div>`}
                    <div style="text-align:center; margin-bottom:20px;">
                        <label style="font-size:11px; font-weight:700; color:var(--primary-cobalt); text-transform:uppercase; margin-bottom:5px; display:block;">${T('map.review.rating')}</label>
                        <div class="star-rating" style="font-size:2.5rem; color:#ddd; cursor:pointer;">
                            <span class="star" data-val="1">★</span><span class="star" data-val="2">★</span><span class="star" data-val="3">★</span><span class="star" data-val="4">★</span><span class="star" data-val="5">★</span>
                        </div>
                    </div>
                    <div style="margin-bottom:20px;">
                        <label style="font-size:11px; font-weight:700; color:var(--primary-cobalt); text-transform:uppercase; margin-bottom:5px; display:block;">${T('map.review.opinion')}</label>
                        <textarea id="review-text" class="review-input" placeholder="${T('map.review.placeholder')}" style="width:100%; height:100px; padding:14px; border-radius:12px; border:1px solid #eee; background:#f8fafc; font-size:14px; resize:none; box-sizing:border-box;"></textarea>
                    </div>
                    <button id="post-review-btn" class="btn-primary-gradient" style="width:100%; height:55px; border-radius:16px; font-size:1.1rem; font-weight:800; border:none; box-shadow:0 10px 20px rgba(11,113,252,0.2);">${T('map.review.publish')}</button>
                    <button class="btn-text full-width" style="margin-top:15px; color:#888; font-size:13px; text-decoration:underline;" onclick="this.closest('.modal').remove()">${T('map.review.skip')}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        let rating = 0;
        modal.querySelectorAll('.star').forEach(s => {
            s.onclick = () => {
                rating = s.dataset.val;
                modal.querySelectorAll('.star').forEach(x => x.style.color = x.dataset.val <= rating ? '#FFD700' : '#ccc');
            };
        });

        document.getElementById('post-review-btn').onclick = async () => {
            const finalName = name || document.getElementById('new-site-name').value;
            const reviewText = document.getElementById('review-text').value;
            if (!finalName || rating === 0) {
                window.GoHappyToast && window.GoHappyToast.warning(lang === 'en' ? 'Pick a name and rating ⭐' : 'Completa nombre y nota ⭐');
                return;
            }
            try {
                await window.GoHappyDB.collection('reviews').add({
                    userId: user.uid,
                    userName: user.nickname || 'Usuario',
                    siteName: finalName,
                    comment: reviewText || '',
                    rating: parseInt(rating),
                    lat, lng,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                if (window.GoHappyPoints?.addPoints) await window.GoHappyPoints.addPoints('REVIEW');
                if (window.GoHappyContext?.addActivity) {
                    window.GoHappyContext.addActivity('place_reviewed', { place: String(finalName).slice(0, 80), rating: parseInt(rating) });
                }
                window.GoHappyMap.createMarker({ name: finalName, lat, lng, rating: parseInt(rating), type: 'new', isCommunity: true });
                window.GoHappySound && window.GoHappySound.play('success');
                window.GoHappyToast && window.GoHappyToast.points(lang === 'en' ? '¡Review posted! +30 pts ✨' : '¡Reseña publicada! +30 pts ✨');
                modal.remove();
            } catch (e) {
                console.error('[Map] review save:', e);
                window.GoHappyToast && window.GoHappyToast.error((lang === 'en' ? 'Save error: ' : 'Error: ') + (e?.message || 'unknown'));
            }
        };
    }
};

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
    userMarker:      null,
    lastKnownCoords: "41.6520, -4.7286",
    _gpsWatchId:     null,
    _chipSearchToken: 0,

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
            try { window.GoHappyMap.instance.resize(); } catch (e) {}
            if (window._navContext) {
                window.GoHappyMap.handleNavContext(window._navContext);
                window._navContext = null;
            }
        }
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
        const rect = mapDiv.getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) {
            mapDiv.style.cssText = 'position:absolute; inset:0; width:100vw; height:100vh; z-index:1; background:#DFEEFF;';
        }
        console.info('[Map] MapLibre', maplibregl.version || '?', '· canvas', rect.width + 'x' + rect.height);

        // Crear mapa — pitch 0 inicial (tiles cargan ~2x más rápido)
        // Después animamos a 55° cuando los tiles están listos
        window.GoHappyMap.instance = new maplibregl.Map({
            container: mapDiv,
            style: 'https://tiles.openfreemap.org/styles/liberty',
            center: [-4.7286, 41.6520],
            zoom: 14,
            pitch: 0,           // arranque rápido en 2D
            bearing: 0,
            antialias: false,   // off al inicio, render más rápido
            attributionControl: false,
            maxPitch: 60,
            renderWorldCopies: false,  // evita renderizar el mundo en bucle
            fadeDuration: 100          // transiciones más rápidas
        });

        // Solicitar ubicación al instante (GPS preciso → centra mapa al user)
        window.GoHappyMap.locateUser(true);

        // ── Failsafe: ocultar loader a los 8s si tiles tardan
        const failsafeHide = setTimeout(() => {
            const ld = document.getElementById('map-loader');
            if (ld && ld.style.display !== 'none') {
                ld.style.transition = 'opacity 0.4s';
                ld.style.opacity = '0';
                setTimeout(() => ld.style.display = 'none', 400);
                window.GoHappyMap.isInitialized = true;
            }
        }, 8000);

        // ── Idle = primer render completo ─
        window.GoHappyMap.instance.on('idle', () => {
            const ld = document.getElementById('map-loader');
            if (ld && ld.style.display !== 'none') {
                ld.style.transition = 'opacity 0.4s';
                ld.style.opacity = '0';
                setTimeout(() => ld.style.display = 'none', 400);
                window.GoHappyMap.isInitialized = true;
                clearTimeout(failsafeHide);
            }
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

            // ANIMAR a pitch 3D 55° después de cargar (suave, no bloquea)
            setTimeout(() => {
                try {
                    window.GoHappyMap.instance.easeTo({
                        pitch: 55, bearing: -10, duration: 1500, easing: t => t * (2 - t)
                    });
                } catch (e) {}
            }, 300);

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

            // UI overlay (search + filtros + FABs)
            window.GoHappyMap.injectUI(container);

            // Cargar marcadores reales + GPS watch
            try { await window.GoHappyMap.loadMarkers(); } catch (e) { console.warn('[Map] loadMarkers:', e?.message); }
            window.GoHappyMap.startGPSWatch();

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
        const overlay = document.createElement('div');
        overlay.className = 'map-search-container';
        overlay.style.zIndex = '5';
        overlay.innerHTML = `
            <div class="map-search-bar" style="display:flex; align-items:center; background:rgba(255,255,255,0.7); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border-radius:30px; padding:2px 20px; box-shadow:0 10px 30px rgba(0,210,211,0.1); flex:1; width:100%; border:1px solid rgba(255,255,255,0.5);">
                <span class="gemini-sparkle" style="margin-right:8px; font-size:1.2rem;">✨</span>
                <input type="text" id="map-search-input" class="map-search-input" placeholder="${T('map.search.placeholder')}" style="background:transparent; border:none; color:var(--text-dark); flex:1; outline:none; padding:12px 0; font-size:0.95rem;">
            </div>
            <div class="map-filters">
                <div class="filter-chip active" data-type="all">${T('map.filter.all')}</div>
                <div class="filter-chip" data-type="park">${T('map.filter.parks')}</div>
                <div class="filter-chip" data-type="school">${T('map.filter.schools')}</div>
                <div class="filter-chip" data-type="theater">${T('map.filter.theaters')}</div>
                <div class="filter-chip" data-type="kidzone">${T('map.filter.kidzones')}</div>
                <div class="filter-chip" data-type="food">${T('map.filter.food')}</div>
            </div>
        `;
        container.appendChild(overlay);

        // FAB locate
        const locateBtn = document.createElement('button');
        locateBtn.id = 'locate-me-btn';
        locateBtn.className = 'fab-btn locate-fab';
        locateBtn.innerHTML = '🎯';
        container.appendChild(locateBtn);

        // FAB añadir reseña
        const addBtn = document.createElement('button');
        addBtn.id = 'add-review-fab';
        addBtn.className = 'fab-btn add-review-fab';
        addBtn.innerHTML = '<span style="font-size:24px; line-height:1;">+</span>';
        addBtn.title = window.GoHappyI18n ? window.GoHappyI18n.t('map.review') : 'Añadir reseña';
        container.appendChild(addBtn);

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

        // Buscador IA
        const input = document.getElementById('map-search-input');
        input.addEventListener('keypress', e => {
            if (e.key === 'Enter') window.GoHappyMap.handleSearch(input.value);
        });

        locateBtn.addEventListener('click', () => {
            if (window.GoHappyMap.userMarker) {
                const ll = window.GoHappyMap.userMarker.getLngLat();
                window.GoHappyMap.instance.easeTo({ center: ll, zoom: 17, pitch: 55, speed: 1.2 });
            } else {
                window.GoHappyMap.locateUser();
            }
        });

        // Filtros chip
        const chips = document.querySelectorAll('.filter-chip');
        chips.forEach(chip => {
            chip.addEventListener('click', async () => {
                chips.forEach(c => c.classList.remove('active', 'loading'));
                chip.classList.add('active');
                const type = chip.dataset.type;
                const label = chip.innerText.trim();
                window.GoHappyMap.currentFilter = type;
                const T2 = window.t || (k => k);

                if (type === 'all') { window.GoHappyMap.filterMarkers('all'); return; }

                window.GoHappyMap.filterMarkers(type);
                const localOfType = window.GoHappyMap.markers.filter(m => m.type === type);
                if (localOfType.length >= 6) {
                    window.GoHappyToast && window.GoHappyToast.info(T2('map.community.found', { n: localOfType.length, label: label.toLowerCase() }), 2500);
                    return;
                }

                const myToken = ++window.GoHappyMap._chipSearchToken;
                chip.classList.add('loading');
                const before = window.GoHappyMap.markers.length;
                try {
                    await Promise.race([
                        window.GoHappyMap.handleSearch(`mejores ${label} para ir con niños`),
                        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000))
                    ]);
                } catch (e) {}
                if (myToken !== window.GoHappyMap._chipSearchToken) return;
                chip.classList.remove('loading');
                const after = window.GoHappyMap.markers.length;
                if (after > before) {
                    window.GoHappyMap.filterMarkers(type);
                    const newCount = window.GoHappyMap.markers.filter(m => m.type === type).length;
                    window.GoHappyToast && window.GoHappyToast.success(T2('map.community.found', { n: newCount, label: label.toLowerCase() }), 2500);
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

        const hasReview = loc.isCommunity || (loc.rating || 0) >= 4.7;

        let icon = '📍';
        if (loc.type === 'park') icon = '🌳';
        else if (loc.type === 'museum' || loc.type === 'school') icon = '🎓';
        else if (loc.type === 'food') icon = '🍎';
        else if (loc.type === 'theater') icon = '🎭';
        else if (loc.type === 'kidzone') icon = '🏰';

        const el = document.createElement('div');
        el.className = `gohappy-marker-wrap ${hasReview ? 'has-badge' : ''}`;
        el.innerHTML = `
            <div class="marker-pin-premium" style="
                background:white; width:40px; height:40px;
                border-radius:50% 50% 50% 0;
                transform:rotate(-45deg);
                display:flex; align-items:center; justify-content:center;
                box-shadow:0 4px 10px rgba(0,0,0,0.2);
                border:3px solid var(--primary-cobalt,#0B4C8F);
                position:relative;
            ">
                <div style="transform:rotate(45deg); font-size:20px;">${icon}</div>
                ${hasReview ? `<div class="tribe-insignia" style="position:absolute; top:-10px; right:-10px; background:#F39C12; color:white; font-size:9px; padding:2px 6px; border-radius:10px; font-weight:900; border:2px solid white; transform:rotate(45deg); white-space:nowrap;">⭐</div>` : ''}
            </div>
        `;

        const sec = window.GoHappySecurity;
        const safeName = sec ? sec.safe(loc.name) : String(loc.name || 'Sitio').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
        const safeType = sec ? sec.safe(loc.type || '') : String(loc.type || '');
        const safeImage = (loc.image && /^https?:\/\//.test(loc.image)) ? loc.image : '';

        const tRoute  = window.GoHappyI18n ? window.GoHappyI18n.t('map.route')  : '🗺️ Cómo llegar';
        const tReview = window.GoHappyI18n ? window.GoHappyI18n.t('map.review') : '📝 Escribir reseña';

        const popupHTML = `
            <div class="popup-premium" style="min-width:230px; border-radius:20px; overflow:hidden;">
                <div class="popup-img-container" style="position:relative; height:100px; background:#eee;">
                    ${safeImage ? `<img src="${safeImage}" style="width:100%; height:100%; object-fit:cover;">` : `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:linear-gradient(135deg,#0B71FC,#17C8D4); color:white; font-size:2rem;">🌟</div>`}
                </div>
                <div class="popup-body" style="padding:12px; background:white;">
                    <h3 style="margin:0 0 4px 0; font-size:1rem; font-weight:800; color:var(--cobalt,#0B4C8F);">${safeName}</h3>
                    <div style="font-size:0.78rem; color:#666; margin-bottom:10px;">⭐ ${parseFloat(loc.rating) || 4.5} · ${safeType}</div>
                    <button class="popup-route-btn" data-lat="${loc.lat}" data-lng="${loc.lng}" style="padding:10px; border-radius:12px; font-size:12px; font-weight:800; width:100%; border:none; color:white; cursor:pointer; background:linear-gradient(135deg,#0B71FC,#17C8D4); margin-bottom:8px; box-shadow:0 6px 16px rgba(11,113,252,0.28);">${tRoute}</button>
                    <button class="popup-review-btn" data-lat="${loc.lat}" data-lng="${loc.lng}" style="padding:9px; border-radius:12px; font-size:12px; font-weight:700; width:100%; border:0.5px solid rgba(11,76,143,0.15); color:var(--cobalt,#0B4C8F); cursor:pointer; background:rgba(11,76,143,0.06);">${tReview}</button>
                </div>
            </div>
        `;

        const popup = new maplibregl.Popup({ offset: 40, className: 'premium-popup-3d' }).setHTML(popupHTML);
        popup.on('open', () => {
            setTimeout(() => {
                const routeBtn = document.querySelector('.maplibregl-popup-content .popup-route-btn');
                const revBtn   = document.querySelector('.maplibregl-popup-content .popup-review-btn');
                if (revBtn) {
                    revBtn.onclick = () => window.GoHappyMap.showAddSiteModal(parseFloat(revBtn.dataset.lat), parseFloat(revBtn.dataset.lng), loc.name);
                }
                if (routeBtn && window.GoHappyNav) {
                    routeBtn.onclick = () => window.GoHappyNav.openRoute(parseFloat(routeBtn.dataset.lat), parseFloat(routeBtn.dataset.lng), loc.name);
                }
            }, 50);
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -10] })
            .setLngLat([loc.lng, loc.lat])
            .setPopup(popup)
            .addTo(window.GoHappyMap.instance);

        window.GoHappyMap.markers.push({ instance: marker, type: loc.type, data: loc });
    },

    clearMarkers: () => {
        window.GoHappyMap.markers.forEach(m => { try { m.instance.remove(); } catch (e) {} });
        window.GoHappyMap.markers = [];
    },

    filterMarkers: (type) => {
        let hasVisible = false;
        const bounds = new maplibregl.LngLatBounds();
        window.GoHappyMap.markers.forEach(m => {
            if (type === 'all' || m.type === type) {
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
            const results = window.GoHappyData?.searchLocations
                ? await window.GoHappyData.searchLocations(query, coords)
                : null;

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

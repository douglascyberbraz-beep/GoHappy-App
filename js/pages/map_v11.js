// Definitive GoHappy 3D Map Engine - v2.1.0 (MapLibre GL / Premium)
window.GoHappyMap = {
    instance: null,
    isInitialized: false,
    markers: [],
    currentFilter: 'all',
    userMarker: null,
    lastKnownCoords: "41.6520, -4.7286",

    render: async (container) => {
        console.log("Rendering GoHappy 3D Map v2.1.2...");
        container.style.display = 'block';

        if (!window.GoHappyMap.isInitialized) {
            const lang = window.GoHappyI18n?.lang || 'es';
            const loaderMsg = lang === 'en' ? 'Loading 3D map...' : 'Invocando mapa 3D...';

            // ✅ Container tiene 2 hijos: canvas del mapa Y overlay loader
            container.innerHTML = `
                <div id="map-canvas" style="position:absolute; inset:0; z-index:1;"></div>
                <div id="map-loader" style="position: absolute; inset: 0; background: linear-gradient(180deg, #eaf2fd 0%, #d6e6f9 100%); z-index: 10; overflow: hidden;">
                    <div style="position:absolute; inset:0; background-image:
                        linear-gradient(rgba(11,76,143,0.06) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(11,76,143,0.06) 1px, transparent 1px);
                        background-size: 60px 60px;"></div>
                    <div style="position:absolute; top:50%; left:50%; transform: translate(-50%, -60%); display:flex; flex-direction:column; align-items:center; gap:14px;">
                        <div style="width:54px; height:54px; border-radius:50% 50% 50% 0; background:var(--primary-cobalt, #0B4C8F); transform: rotate(-45deg); box-shadow:0 8px 22px rgba(11,76,143,0.35); animation:mapPinBounce 1.2s ease-in-out infinite;"></div>
                        <p style="font-weight:700; color:var(--primary-cobalt, #0B4C8F); font-size:13px; margin:0;">${loaderMsg}</p>
                    </div>
                    <style>
                        @keyframes mapPinBounce {
                            0%, 100% { transform: rotate(-45deg) translateY(0); }
                            50%      { transform: rotate(-45deg) translateY(-8px); }
                        }
                    </style>
                </div>
            `;
            // Esperar a que el DOM aplique antes de iniciar mapa
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
                            <p style="color:var(--primary-cobalt, #0B4C8F); font-weight:700; margin:0 0 18px;">${lang === 'en' ? 'Could not load map' : 'No se pudo cargar el mapa'}</p>
                            <button onclick="window.location.reload()" style="background:var(--primary-cobalt, #0B4C8F); color:white; border:none; padding:12px 24px; border-radius:999px; font-weight:800; cursor:pointer;">${lang === 'en' ? '🔄 Retry' : '🔄 Reintentar'}</button>
                        </div>`;
                }
            }
        } else {
            const loader = document.getElementById('map-loader');
            if (loader) loader.style.display = 'none';
            window.GoHappyMap.instance.resize();
            
            // --- SMART NAV CHECK ---
            if (window._navContext) {
                window.GoHappyMap.handleNavContext(window._navContext);
                window._navContext = null;
            }
        }
    },

    handleNavContext: (context) => {
        if (!window.GoHappyMap.instance) return;
        
        console.log("[Map] Manejando contexto de navegación:", context);
        
        let targetCoords = null;
        if (context.coords) {
            targetCoords = [context.coords.lng, context.coords.lat];
        } else if (context.focus) {
            // Futuro: buscar por nombre si no hay coordenadas, 
            // por ahora intentamos encontrar un marcador con ese nombre
            const m = window.GoHappyMap.markers.find(m => m.data && m.data.name === context.focus);
            if (m) targetCoords = [m.data.lng, m.data.lat];
        }

        if (targetCoords) {
            window.GoHappyMap.instance.flyTo({
                center: targetCoords,
                zoom: context.zoom || 17,
                speed: 1.5,
                curve: 1.42,
                essential: true
            });

            // Abrir popup si existe el marcador
            const marker = window.GoHappyMap.markers.find(m => 
                m.data && (m.data.name === context.focus || (m.data.lat === targetCoords[1] && m.data.lng === targetCoords[0]))
            );
            if (marker && marker.instance) {
                setTimeout(() => marker.instance.togglePopup(), 1200);
            }
        }
    },

    init: async (container) => {
        if (window.GoHappyMap.isInitialized && window.GoHappyMap.instance) return;

        // Usar #map-canvas si existe (división dedicada), si no el container
        const mapDiv = document.getElementById('map-canvas') || container;

        try {
            window.GoHappyMap.instance = new maplibregl.Map({
                container: mapDiv,
                style: 'https://tiles.openfreemap.org/styles/liberty',
                center: [-4.7286, 41.6520],
                zoom: 16,
                pitch: 60,
                bearing: 0,
                antialias: true
            });

            // Pedir ubicación inmediatamente para centrar
            window.GoHappyMap.locateUser(true); // true = animate flyTo

            window.GoHappyMap.instance.on('error', (e) => {
                console.warn("Mapbox/MapLibre error:", e);
                const loader = document.getElementById('map-loader');
                if (loader) {
                    loader.innerHTML = `
                        <div style="padding:20px;">
                            <p style="color:#64748b; font-size:14px;">El servidor de mapas está tardando más de lo habitual.</p>
                            <button onclick="location.reload()" class="btn-primary-gradient" style="margin-top:15px; padding:10px 20px; border-radius:12px; border:none; color:white;">Reintentar</button>
                        </div>
                    `;
                }
            });

            // FAIL-SAFE: si el evento 'load' no se dispara en 10s, esconder
            // el loader igualmente. El mapa puede estar utilizable aunque
            // algunos sprites/tiles tarden más.
            const hideLoaderFailsafe = setTimeout(() => {
                const loader = document.getElementById('map-loader');
                if (loader && loader.style.display !== 'none') {
                    console.warn('[Map] Loader hidden by failsafe (10s) — tiles aún cargando');
                    loader.style.opacity = '0';
                    loader.style.transition = 'opacity 0.5s';
                    setTimeout(() => loader.style.display = 'none', 500);
                    window.GoHappyMap.isInitialized = true;
                }
            }, 10000);

            // Fallback adicional: cuando el mapa renderice por primera vez (idle),
            // si el 'load' no llegó, también esconde el loader
            window.GoHappyMap.instance.on('idle', () => {
                const loader = document.getElementById('map-loader');
                if (loader && loader.style.display !== 'none') {
                    loader.style.opacity = '0';
                    loader.style.transition = 'opacity 0.4s';
                    setTimeout(() => loader.style.display = 'none', 400);
                    window.GoHappyMap.isInitialized = true;
                    clearTimeout(hideLoaderFailsafe);
                }
            });

            window.GoHappyMap.instance.on('load', async () => {
                clearTimeout(hideLoaderFailsafe);
                window.GoHappyMap.isInitialized = true;
                const loader = document.getElementById('map-loader');
                if (loader) {
                    loader.style.opacity = '0';
                    loader.style.transition = 'opacity 0.4s';
                    setTimeout(() => loader.style.display = 'none', 400);
                }
                
                // --- SMART NAV CHECK (Initial Load) ---
                if (window._navContext) {
                    window.GoHappyMap.handleNavContext(window._navContext);
                    window._navContext = null;
                }
                
                // ── WAZE-STYLE COLORS — paleta brand cobalt/cyan en todos los zooms ──
                const layersToColor = [
                    { id: 'water',           color: '#7CC6EE', opacity: 1 },     // azul cobalto-claro saturado
                    { id: 'landuse-natural', color: '#D8EAF6', opacity: 1 },     // tinte cobalto suave
                    { id: 'landuse-park',    color: '#A6E8C9', opacity: 1 },     // verde-cyan saturado (brand)
                    { id: 'land',            color: '#E8F1FB', opacity: 1 },     // fondo base CON tinte cobalto
                    { id: 'landuse-residential', color: '#DCE7F4', opacity: 1 },  // cobalto pastel
                    { id: 'landuse-commercial',  color: '#D8E0F0', opacity: 1 },  // cobalto pastel (no lavanda)
                    { id: 'landcover-grass',     color: '#B8E5D0', opacity: 1 },  // verde-cyan
                    { id: 'landcover-wood',      color: '#A8D8C0', opacity: 1 },
                    { id: 'landuse-industrial',  color: '#CFD9EA', opacity: 1 },
                    { id: 'landuse-cemetery',    color: '#C9E5D8', opacity: 1 },
                    { id: 'landuse-school',      color: '#DCE7F4', opacity: 1 },
                    { id: 'landuse-hospital',    color: '#E6DEEF', opacity: 1 },
                    { id: 'water-pattern',       color: '#7CC6EE', opacity: 0.9 },
                    { id: 'aeroway-area',        color: '#DCE7F4', opacity: 1 }
                ];

                layersToColor.forEach(l => {
                    try {
                        if (window.GoHappyMap.instance.getLayer(l.id)) {
                            window.GoHappyMap.instance.setPaintProperty(l.id, 'fill-color', l.color);
                            window.GoHappyMap.instance.setPaintProperty(l.id, 'fill-opacity', l.opacity);
                        }
                    } catch (e) {}
                });

                // ── 3D BUILDINGS — gradiente cobalto vivo, visible desde zoom 12 ──
                try {
                    const buildingLayer = window.GoHappyMap.instance.getLayer('building');
                    if (buildingLayer) {
                        // Capa 2D plana cobalto para zooms bajos (cuando 3D no aparece)
                        window.GoHappyMap.instance.setPaintProperty('building', 'fill-color', '#9FBEDD');
                        window.GoHappyMap.instance.setPaintProperty('building', 'fill-opacity', 0.6);

                        // Capa 3D extrusión por encima — fade-in suave desde zoom 12
                        window.GoHappyMap.instance.addLayer({
                            'id': 'waze-3d-buildings',
                            'source': buildingLayer.source,
                            'source-layer': buildingLayer.sourceLayer,
                            'type': 'fill-extrusion',
                            'minzoom': 12,
                            'paint': {
                                // Color por altura: edificios bajos cyan claro, altos cobalt
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
                                    12, 0.3,
                                    14, 0.6,
                                    16, 0.7
                                ],
                                'fill-extrusion-vertical-gradient': true
                            }
                        });
                    }
                } catch (e) {
                    console.warn("3D buildings injection skipped:", e);
                }

                // ── TINT OVERLAY — capa cobalto sutil sobre todo para mantener identidad brand
                // Visible en cualquier zoom (especialmente al hacer zoom out)
                try {
                    window.GoHappyMap.instance.addLayer({
                        'id': 'brand-tint-overlay',
                        'type': 'background',
                        'paint': {
                            'background-color': '#7DA8D4',  // cobalto medio
                            'background-opacity': [
                                'interpolate', ['linear'], ['zoom'],
                                0,  0.18,   // muy ampliado: tinte fuerte
                                6,  0.12,
                                10, 0.05,   // medio: tinte sutil
                                14, 0.02,   // detalle: casi sin tinte
                                18, 0
                            ]
                        }
                    }, 'water'); // debajo de water para no oscurecer ríos/mar
                } catch (e) {
                    console.warn("Brand tint overlay skipped:", e);
                }

                // ── ROADS estilo Waze — blancos limpios con casing ──
                const allLayers = window.GoHappyMap.instance.getStyle().layers;
                const roadLayers = allLayers
                    .filter(l => /road|street|way|bridge|tunnel|highway/i.test(l.id))
                    .map(l => l.id);

                roadLayers.forEach(layer => {
                    try {
                        const lyr = window.GoHappyMap.instance.getLayer(layer);
                        if (!lyr || lyr.type !== 'line') return;
                        const isPrimary = /primary|motorway|trunk|main/i.test(layer);
                        const isCasing  = /casing|outline|border/i.test(layer);

                        if (isCasing) {
                            window.GoHappyMap.instance.setPaintProperty(layer, 'line-color', '#D8E4F0');
                        } else if (isPrimary) {
                            window.GoHappyMap.instance.setPaintProperty(layer, 'line-color', '#FFFFFF');
                        } else {
                            window.GoHappyMap.instance.setPaintProperty(layer, 'line-color', '#F4F8FC');
                        }
                        window.GoHappyMap.instance.setPaintProperty(layer, 'line-opacity', 1);
                    } catch (e) {}
                });

                // Iluminación de luz ambiental (efecto sol Waze)
                try {
                    window.GoHappyMap.instance.setLight({
                        anchor: 'viewport',
                        color: '#FFF5E6',
                        intensity: 0.35,
                        position: [1.5, 90, 80]
                    });
                } catch (e) {}

                window.GoHappyMap.injectUI(container);
                
                // Cargar marcadores rápidos en lugar de usar IA pesada
                await window.GoHappyMap.loadMarkers();
                window.GoHappyMap.startGPSWatch();
            });

            // ─── AÑADIR RESEÑA: doble clic (desktop) + long press (móvil) ───

            // 1. Desactivar zoom on doubleclick (interfería con nuestro handler)
            try { window.GoHappyMap.instance.doubleClickZoom.disable(); } catch (e) {}

            // 2. Doble clic en desktop
            window.GoHappyMap.instance.on('dblclick', (e) => {
                if (e?.preventDefault) e.preventDefault();
                if (e?.originalEvent?.preventDefault) e.originalEvent.preventDefault();
                window.GoHappyMap.showAddSiteModal(e.lngLat.lat, e.lngLat.lng);
            });

            // 3. Long press 600ms para móvil
            let pressTimer = null;
            let pressCoords = null;
            let didMove = false;

            const cancelLongPress = () => {
                if (pressTimer) {
                    clearTimeout(pressTimer);
                    pressTimer = null;
                }
                pressCoords = null;
            };

            window.GoHappyMap.instance.on('touchstart', (e) => {
                // Ignorar multi-touch (pinch zoom)
                if (e?.originalEvent?.touches && e.originalEvent.touches.length > 1) {
                    cancelLongPress();
                    return;
                }
                pressCoords = e.lngLat;
                didMove = false;
                pressTimer = setTimeout(() => {
                    if (!didMove && pressCoords) {
                        // Feedback háptico si disponible
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

            window.GoHappyMap.instance.on('touchend', cancelLongPress);
            window.GoHappyMap.instance.on('touchcancel', cancelLongPress);

            // Si el mapa se mueve durante el press, cancelar (era un drag)
            window.GoHappyMap.instance.on('move', () => {
                if (pressTimer) didMove = true;
            });

        } catch (e) {
            console.error("GoHappyMap Init Failed:", e);
            container.innerHTML = `<div class="p-20 center-text"><h3>Cargando Mapa...</h3></div>`;
        }
    },

    injectUI: (container) => {
        if (document.querySelector('.map-search-container')) return;

        container.style.position = 'relative';

        const overlay = document.createElement('div');
        overlay.className = 'map-search-container';
        overlay.style.zIndex = '5';
        const T = window.t || (k => k);
        overlay.innerHTML = `
            <div class="map-search-bar" style="display:flex; align-items:center; background: rgba(255,255,255,0.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 30px; padding: 2px 20px; box-shadow: 0 10px 30px rgba(0, 210, 211, 0.1); flex:1; width: 100%; border: 1px solid rgba(255,255,255,0.5);">
                <span class="gemini-sparkle" style="margin-right:8px; font-size:1.2rem;">✨</span>
                <input type="text" id="map-search-input" class="map-search-input" placeholder="${T('map.search.placeholder')}" style="background:transparent; border:none; color:var(--text-dark); flex:1; outline:none; padding:12px 0; font-size: 0.95rem;">
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

        const locateBtn = document.createElement('button');
        locateBtn.id = 'locate-me-btn';
        locateBtn.className = 'fab-btn locate-fab';
        locateBtn.innerHTML = '🎯';
        container.appendChild(locateBtn);

        // FAB para añadir reseña en tu ubicación actual (más visible que long-press)
        const addReviewBtn = document.createElement('button');
        addReviewBtn.id = 'add-review-fab';
        addReviewBtn.className = 'fab-btn add-review-fab';
        addReviewBtn.innerHTML = '<span style="font-size:24px; line-height:1;">+</span>';
        addReviewBtn.title = window.GoHappyI18n ? window.GoHappyI18n.t('map.review') : 'Añadir reseña';
        container.appendChild(addReviewBtn);

        addReviewBtn.addEventListener('click', () => {
            // Coordenadas: prefiere ubicación del usuario, si no, centro del mapa
            let lat, lng;
            if (window.GoHappyMap.userMarker) {
                const ll = window.GoHappyMap.userMarker.getLngLat();
                lat = ll.lat;
                lng = ll.lng;
            } else if (window.GoHappyMap.instance) {
                const c = window.GoHappyMap.instance.getCenter();
                lat = c.lat;
                lng = c.lng;
            } else {
                return;
            }
            window.GoHappyMap.showAddSiteModal(lat, lng);
        });

        // Hint inicial al usuario (solo primera vez)
        if (!localStorage.getItem('GoHappy_map_hint_seen')) {
            setTimeout(() => {
                if (window.GoHappyToast) {
                    const tip = window.GoHappyI18n?.lang === 'en'
                        ? '💡 Tap "+" or hold any place to add a review'
                        : '💡 Toca el "+" o mantén pulsado un sitio para reseñarlo';
                    window.GoHappyToast.info(tip, 4500);
                }
                localStorage.setItem('GoHappy_map_hint_seen', '1');
            }, 2500);
        }

        // Brujula eliminada por peticion del usuario

        const input = document.getElementById('map-search-input');
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.GoHappyMap.handleSearch(input.value);
        });

        document.getElementById('locate-me-btn').addEventListener('click', () => {
            if (window.GoHappyMap.userMarker) {
                const lngLat = window.GoHappyMap.userMarker.getLngLat();
                window.GoHappyMap.instance.easeTo({ center: lngLat, zoom: 18, pitch: 0, speed: 1.2 });
            } else {
                window.GoHappyMap.locateUser();
            }
        });

        const chips = document.querySelectorAll('.filter-chip');
        // Token para cancelar búsquedas anteriores cuando el usuario cambia de chip
        window.GoHappyMap._chipSearchToken = 0;

        chips.forEach(chip => {
            chip.addEventListener('click', async () => {
                chips.forEach(c => c.classList.remove('active', 'loading'));
                chip.classList.add('active');
                window.GoHappyMap.currentFilter = chip.dataset.type;

                const type = chip.dataset.type;
                const label = chip.innerText.trim();
                const T = window.t || (k => k);

                if (type === 'all') {
                    window.GoHappyMap.filterMarkers('all');
                    return;
                }

                // PASO 1: filtrar inmediato lo local
                window.GoHappyMap.filterMarkers(type);
                const localOfType = window.GoHappyMap.markers.filter(m => m.type === type);

                // Si ya hay suficientes locales, ni siquiera llamamos IA
                if (localOfType.length >= 6) {
                    window.GoHappyToast && window.GoHappyToast.info(
                        T('map.community.found', { n: localOfType.length, label: label.toLowerCase() }), 2500
                    );
                    return;
                }

                // PASO 2: expandir con IA — con cancelación + timeout
                const myToken = ++window.GoHappyMap._chipSearchToken;
                chip.classList.add('loading');
                window.GoHappyToast && window.GoHappyToast.info(
                    T('map.searching', { label: label.toLowerCase() }), 1800
                );

                const before = window.GoHappyMap.markers.length;
                try {
                    // Timeout duro de 12s para no dejar al usuario esperando
                    await Promise.race([
                        window.GoHappyMap.handleSearch(`mejores ${label} para ir con niños`),
                        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000))
                    ]);
                } catch (e) {
                    // timeout o error de IA — silencioso, ya hay locales filtrados
                    console.warn('[Map] chip IA expand timeout/error:', e?.message);
                }

                // Si el usuario cambió de chip durante la espera, ignorar este resultado
                if (myToken !== window.GoHappyMap._chipSearchToken) return;

                chip.classList.remove('loading');
                const after = window.GoHappyMap.markers.length;

                if (after > before) {
                    window.GoHappyMap.filterMarkers(type);
                    const newCount = window.GoHappyMap.markers.filter(m => m.type === type).length;
                    window.GoHappyToast && window.GoHappyToast.success(
                        T('map.community.found', { n: newCount, label: label.toLowerCase() }), 2500
                    );
                } else if (localOfType.length === 0) {
                    // No había locales y la IA no devolvió → feedback honesto
                    window.GoHappyToast && window.GoHappyToast.info(
                        (window.GoHappyI18n?.lang === 'en'
                            ? `No ${label.toLowerCase()} nearby. Try moving the map.`
                            : `Sin ${label.toLowerCase()} cerca. Mueve el mapa para explorar.`), 2800
                    );
                } else {
                    // Había algunos locales pero IA no añadió más
                    window.GoHappyToast && window.GoHappyToast.info(
                        T('map.community.found', { n: localOfType.length, label: label.toLowerCase() }), 2200
                    );
                }
            });
        });
    },

    loadMarkers: async () => {
        let coords = window.lastKnownCoords || "41.6520, -4.7286";
        const locations = await window.GoHappyData.getLocations(coords);
        window.GoHappyMap.clearMarkers();

        locations.forEach(loc => {
            window.GoHappyMap.createMarker(loc);
        });
    },

    createMarker: (loc) => {
        const hasReview = loc.isCommunity || loc.rating >= 4.7;
        const el = document.createElement('div');
        el.className = `gohappy-marker-wrap ${hasReview ? 'has-badge' : ''}`;
        
        // Determinar icono por tipo
        let icon = "📍";
        if (loc.type === 'park') icon = "🌳";
        if (loc.type === 'museum' || loc.type === 'school') icon = "🎓";
        if (loc.type === 'food') icon = "🍎";
        if (loc.type === 'theater') icon = "🎭";
        if (loc.type === 'kidzone') icon = "🏰";

        el.innerHTML = `
            <div class="marker-pin-premium" style="
                background: white; 
                width: 40px; height: 40px; 
                border-radius: 50% 50% 50% 0; 
                transform: rotate(-45deg); 
                display: flex; align-items: center; justify-content: center;
                box-shadow: 0 4px 10px rgba(0,0,0,0.2);
                border: 3px solid var(--primary-cobalt);
            ">
                <div style="transform: rotate(45deg); font-size: 20px;">${icon}</div>
                ${hasReview ? `<div class="tribe-insignia" style="position: absolute; top: -10px; right: -10px; background: #F39C12; color: white; font-size: 9px; padding: 2px 6px; border-radius: 10px; font-weight: 900; border: 2px solid white; white-space:nowrap;">⭐ reseñado</div>` : ''}
            </div>
        `;

        // Sanitizar contenido contra XSS antes de inyectar en HTML
        const safeName = window.GoHappySecurity ? window.GoHappySecurity.safe(loc.name) : String(loc.name).replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
        const safeType = window.GoHappySecurity ? window.GoHappySecurity.safe(loc.type) : String(loc.type || '').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
        const safeImage = (loc.image && /^https?:\/\//.test(loc.image)) ? loc.image : '';

        const tRoute   = window.GoHappyI18n ? window.GoHappyI18n.t('map.route')  : '🗺️ Cómo llegar';
        const tReview  = window.GoHappyI18n ? window.GoHappyI18n.t('map.review') : '📝 Escribir Reseña';

        const popupHTML = `
            <div class="popup-premium" style="min-width: 230px; border-radius: 20px; overflow: hidden;">
                <div class="popup-img-container" style="position: relative; height: 100px; background: #eee;">
                    ${safeImage ? `<img src="${safeImage}" style="width: 100%; height: 100%; object-fit: cover;">` : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg,#0B71FC,#17C8D4); color: white; font-size: 2rem;">🌟</div>`}
                </div>
                <div class="popup-body" style="padding: 12px; background: white;">
                    <h3 style="margin: 0 0 4px 0; font-size: 1rem; font-weight: 800; color: var(--cobalt);">${safeName}</h3>
                    <div style="font-size: 0.78rem; color: #666; margin-bottom: 10px;">⭐ ${parseFloat(loc.rating) || 4.5} · ${safeType}</div>
                    <button class="popup-route-btn" style="padding:10px; border-radius:12px; font-size:12px; font-weight:800; width:100%; border:none; color:white; cursor:pointer; background:linear-gradient(135deg,#0B71FC,#17C8D4); margin-bottom:8px; box-shadow: 0 6px 16px rgba(11,113,252,0.28);" data-lat="${parseFloat(loc.lat)}" data-lng="${parseFloat(loc.lng)}">
                        ${tRoute}
                    </button>
                    <button class="popup-review-btn" style="padding:9px; border-radius:12px; font-size:12px; font-weight:700; width:100%; border:0.5px solid rgba(11,76,143,0.15); color:var(--cobalt); cursor:pointer; background:rgba(11,76,143,0.06);" data-lat="${parseFloat(loc.lat)}" data-lng="${parseFloat(loc.lng)}">
                        ${tReview}
                    </button>
                </div>
            </div>
        `;

        const popup = new maplibregl.Popup({ offset: 40, className: 'premium-popup-3d' }).setHTML(popupHTML);
        // Bind sin onclick inline (evita XSS y CSP issues)
        popup.on('open', () => {
            const reviewBtn = document.querySelector('.maplibregl-popup-content .popup-review-btn');
            const routeBtn  = document.querySelector('.maplibregl-popup-content .popup-route-btn');
            if (reviewBtn) {
                reviewBtn.onclick = () => window.GoHappyMap.showAddSiteModal(
                    parseFloat(reviewBtn.dataset.lat),
                    parseFloat(reviewBtn.dataset.lng),
                    loc.name
                );
            }
            if (routeBtn && window.GoHappyNav) {
                routeBtn.onclick = () => window.GoHappyNav.openRoute(
                    parseFloat(routeBtn.dataset.lat),
                    parseFloat(routeBtn.dataset.lng),
                    loc.name
                );
            }
        });

        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom', offset: [0, -10] })
            .setLngLat([loc.lng, loc.lat])
            .setPopup(popup)
            .addTo(window.GoHappyMap.instance);

        window.GoHappyMap.markers.push({ instance: marker, type: loc.type, data: loc });
    },

    clearMarkers: () => {
        window.GoHappyMap.markers.forEach(m => m.instance.remove());
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
            if (window.GoHappyMap.userMarker) {
                bounds.extend(window.GoHappyMap.userMarker.getLngLat());
            }
            window.GoHappyMap.instance.fitBounds(bounds, {
                padding: {top: 100, bottom: 100, left: 50, right: 50},
                maxZoom: 15,
                pitch: 0,
                speed: 1.0
            });
        }
    },

    handleSearch: async (query) => {
        if (!query) return;
        const input = document.getElementById('map-search-input');
        if (input) {
            input.placeholder = "✨ IA buscando...";
            input.disabled = true;
        }

        try {
            const coords = window.lastKnownCoords || window.GoHappyMap.lastKnownCoords;
            const results = await window.GoHappyData.searchLocations(query, coords);

            if (results && results.length > 0) {
                // Añadir nuevos sin borrar — el usuario quiere ver más opciones
                const existingNames = new Set(window.GoHappyMap.markers.map(m => m.data?.name));
                const bounds = new maplibregl.LngLatBounds();
                let added = 0;

                results.forEach(loc => {
                    if (!loc.lat || !loc.lng || existingNames.has(loc.name)) return;
                    window.GoHappyMap.createMarker(loc);
                    bounds.extend([loc.lng, loc.lat]);
                    added++;
                });

                if (added > 0) {
                    if (window.GoHappyMap.userMarker) {
                        bounds.extend(window.GoHappyMap.userMarker.getLngLat());
                    }
                    try {
                        window.GoHappyMap.instance.fitBounds(bounds, {
                            padding: { top: 100, bottom: 140, left: 40, right: 40 },
                            maxZoom: 15,
                            pitch: 0,
                            speed: 1.2
                        });
                    } catch (e) {}
                }
            } else {
                // Geocoding fallback (Photon)
                try {
                    const resp = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`);
                    const data = await resp.json();
                    if (data?.features?.length > 0) {
                        const c = data.features[0].geometry.coordinates;
                        window.GoHappyMap.instance.flyTo({ center: c, zoom: 17, pitch: 0 });
                    } else {
                        window.GoHappyToast && window.GoHappyToast.info(`Sin resultados para "${query}"`, 3000);
                    }
                } catch (e) {
                    console.warn('Geocoding fallback error:', e);
                }
            }
        } catch (e) {
            console.warn("Search error:", e);
            window.GoHappyToast && window.GoHappyToast.error(window.t ? window.t('map.error') : 'Error en la búsqueda. Intenta de nuevo.');
        }

        if (input) {
            input.placeholder = "Pregunta a Gemini...";
            input.disabled = false;
            input.value = "";
        }
    },

    startGPSWatch: () => {
        if (!navigator.geolocation) return;

        // Evitar memory leak: limpiar watch anterior si existe
        if (window.GoHappyMap._gpsWatchId !== null && window.GoHappyMap._gpsWatchId !== undefined) {
            navigator.geolocation.clearWatch(window.GoHappyMap._gpsWatchId);
        }

        let lastLat = null;
        let lastLng = null;

        window.GoHappyMap._gpsWatchId = navigator.geolocation.watchPosition((pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const newCoords = `${lat}, ${lng}`;

            if (window.lastKnownCoords !== newCoords) {
                window.lastKnownCoords = newCoords;
                window.dispatchEvent(new CustomEvent('GoHappy-location-sync', { detail: newCoords }));
            }

            let heading = pos.coords.heading;

            // Calculate heading from movement if device doesn't provide compass heading
            if (heading === null && lastLat !== null && lastLng !== null) {
                if (Math.abs(lat - lastLat) > 0.00001 || Math.abs(lng - lastLng) > 0.00001) {
                    const deltaLng = (lng - lastLng) * Math.cos(lastLat * Math.PI / 180);
                    const deltaLat = lat - lastLat;
                    heading = (Math.atan2(deltaLng, deltaLat) * 180 / Math.PI + 360) % 360;
                }
            }

            lastLat = lat;
            lastLng = lng;

            window.GoHappyMap.updateUserIcon(lat, lng, heading); // Pass the updated heading to the marker physically
            
            // Removido easeTo continuo para que no pelee con los resultados de búsqueda.
            // Si el usuario quiere centrarse, usa el botón flotante (locate-me-btn).
        }, null, { enableHighAccuracy: true });
    },

    updateUserIcon: (lat, lng, heading = 0) => {
        if (!window.GoHappyMap.userMarker) {
            const el = document.createElement('div');
            el.innerHTML = `
                <div class="user-orb-container" style="position: relative; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center;">
                    <div class="user-orb-glow" style="position: absolute; width: 100%; height: 100%; background: radial-gradient(circle, rgba(11, 76, 143, 0.4) 0%, transparent 70%); animation: pulse 2s infinite;"></div>
                    <div class="user-orb-core" style="
                        width: 24px; height: 24px; 
                        background: white; 
                        border: 4px solid var(--primary-cobalt); 
                        border-radius: 50%; 
                        box-shadow: 0 0 15px rgba(11, 76, 143, 0.5);
                        z-index: 2;
                    "></div>
                    <div class="user-direction-cone" style="
                        position: absolute; 
                        width: 0; height: 0; 
                        border-left: 10px solid transparent; 
                        border-right: 10px solid transparent; 
                        border-bottom: 25px solid var(--primary-cobalt); 
                        top: -15px; 
                        opacity: 0.8;
                        transform-origin: center 45px;
                        transform: rotate(${heading}deg);
                    "></div>
                </div>
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

    updateUserHeading: (heading) => {
        const arrow = document.querySelector('.user-gps-arrow');
        if (arrow && heading !== null) {
            arrow.style.transform = `rotate(${heading}deg)`;
        }
    },

    locateUser: (animate = false) => {
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const options = animate ? { center: [lng, lat], zoom: 17, pitch: 45, duration: 3000 } : { center: [lng, lat] };
            
            if (animate) window.GoHappyMap.instance.flyTo(options);
            else window.GoHappyMap.instance.setCenter([lng, lat]);
            
            window.GoHappyMap.updateUserIcon(lat, lng);
        }, (err) => {
            console.warn("Location denied or timeout:", err);
            // Fallback to defaults if it fails
            if (!window.GoHappyMap.isInitialized) {
                 const loader = document.getElementById('map-loader');
                 if (loader) loader.style.display = 'none';
            }
        }, { enableHighAccuracy: true, timeout: 5000 });
    },

    showAddSiteModal: (lat, lng, name = "") => {
        const user = window.GoHappyAuth.checkAuth();
        if (!user) {
            window.GoHappyToast.warning(window.t ? window.t('err.session') : 'Inicia sesión para contribuir con la Tribu.');
            window.GoHappyAuth.renderAuthModal();
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal entry-anim';
        const T = window.t || (k => k);
        const lang = window.GoHappyI18n?.lang || 'es';
        const namePlaceholder = lang === 'en' ? 'E.g.: Park Hills' : 'Ej: Parque Los Pinos';
        const namelabel = lang === 'en' ? 'Place name' : 'Nombre del lugar';
        modal.innerHTML = `
            <div class="auth-container" style="padding: 20px;">
                <div class="auth-card premium-glass" style="max-height: 85vh; overflow-y: auto; border-radius: 30px; border: 1px solid rgba(255,255,255,0.4); padding: 25px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <span style="font-size: 40px; display: block; margin-bottom: 10px;">🌟</span>
                        <h3 style="color:var(--primary-cobalt); font-weight: 900; font-size: 1.5rem; margin: 0;">${name ? T('map.review.review', { name }) : T('map.review.modal.title')}</h3>
                        <p style="font-size:13px; color:#64748b; margin-top: 5px;">${T('map.review.help')}</p>
                    </div>

                    ${name ? '' : `<div style="margin-bottom: 15px;"><label style="font-size: 11px; font-weight: 700; color: var(--primary-cobalt); text-transform: uppercase; margin-bottom: 5px; display: block;">${namelabel}</label><input type="text" id="new-site-name" placeholder="${namePlaceholder}" class="review-input" style="width: 100%; padding: 14px; border-radius: 12px; border: 1px solid #eee; background: #f8fafc;"></div>`}

                    <div style="text-align: center; margin-bottom: 20px;">
                        <label style="font-size: 11px; font-weight: 700; color: var(--primary-cobalt); text-transform: uppercase; margin-bottom: 5px; display: block;">${T('map.review.rating')}</label>
                        <div class="star-rating" style="font-size: 2.5rem; color: #ddd; cursor: pointer;">
                            <span class="star" data-val="1">★</span><span class="star" data-val="2">★</span><span class="star" data-val="3">★</span><span class="star" data-val="4">★</span><span class="star" data-val="5">★</span>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="font-size: 11px; font-weight: 700; color: var(--primary-cobalt); text-transform: uppercase; margin-bottom: 5px; display: block;">${T('map.review.opinion')}</label>
                        <textarea id="review-text" class="review-input" placeholder="${T('map.review.placeholder')}" style="width: 100%; height:100px; padding: 14px; border-radius: 12px; border: 1px solid #eee; background: #f8fafc; font-size: 14px; resize: none;"></textarea>
                    </div>

                    <button id="post-review-btn" class="btn-primary-gradient" style="width: 100%; height: 55px; border-radius: 16px; font-size: 1.1rem; font-weight: 800; border: none; box-shadow: 0 10px 20px rgba(11, 113, 252, 0.2);">${T('map.review.publish')}</button>
                    <button class="btn-text full-width" style="margin-top:15px; color: #888; font-size: 13px; text-decoration: underline;" onclick="this.closest('.modal').remove()">${T('map.review.skip')}</button>
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
            if (!finalName || rating === 0) return window.GoHappyToast.warning(window.t ? window.t('map.review.err') : 'Completa el nombre y la nota. ⭐');

            try {
                // Save to Firestore
                await window.GoHappyDB.collection('reviews').add({
                    userId: user.uid,
                    userName: user.nickname || 'Usuario',
                    siteName: finalName,
                    comment: reviewText || '',
                    rating: parseInt(rating),
                    lat: lat,
                    lng: lng,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Add points
                const pts = window.GoHappyPoints.REWARDS.REVIEW || 30;
                await window.GoHappyPoints.addPoints('REVIEW');

                // Sprint 2: registrar en family_context (memoria compartida)
                try {
                    if (window.GoHappyContext) {
                        window.GoHappyContext.addActivity('place_reviewed', {
                            place: String(finalName).slice(0, 80),
                            rating: parseInt(rating)
                        });
                    }
                } catch (e) { /* ignore */ }

                // Flujo C: feedback explícito si rating alto → influirá en Today
                if (parseInt(rating) >= 4) {
                    const lang = window.GoHappyI18n?.lang || 'es';
                    setTimeout(() => {
                        window.GoHappyToast.info(
                            lang === 'en'
                                ? '✨ Saved as favorite — Today will prioritise it'
                                : '✨ Guardado como favorito — Today lo priorizará',
                            3500
                        );
                    }, 1800);
                }

                // Visual feedback on map — marca el sitio como reseñado
                window.GoHappyMap.createMarker({ name: finalName, lat, lng, rating: parseInt(rating), type: 'new', isCommunity: true });

                window.GoHappySound && window.GoHappySound.play('success');
                window.GoHappyToast.points(window.t ? window.t('map.review.success', { n: pts }) : `¡Reseña publicada! +${pts} pts. ¡Gracias por ayudar a la comunidad! ✨`);
                modal.remove();
            } catch (e) {
                console.error("Error saving review:", e);
                window.GoHappyToast.error(window.t ? window.t('map.review.fail') : 'Error al guardar la reseña. Inténtalo de nuevo.');
            }
        };
    },

    highlightParksOnLoad: async () => {
        const coords = window.lastKnownCoords || "41.6520, -4.7286";
        try {
            // Use Gemini to find real local parks/playgrounds if they aren't in fixed data
            const query = "parques infantiles y áreas de juego";
            const parks = await window.GoHappyData.searchLocations(query, coords);
            if (parks && parks.length > 0) {
                parks.forEach(park => {
                    // Force type to 'park' for consistent coloring
                    park.type = 'park';
                    window.GoHappyMap.createMarker(park);
                });
            }
        } catch (e) {
            console.warn("Auto-park highlight failed:", e);
        }
    }
};


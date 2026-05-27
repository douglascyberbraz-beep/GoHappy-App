// ════════════════════════════════════════════════════════════════
// GoHappy Map — v3.0 (LEAFLET ENGINE)
// Reescrito desde 0 con Leaflet: motor 2D sin WebGL ni workers,
// funciona en TODO navegador. Misma estética premium (CartoDB Voyager
// tiles), mismos marcadores, misma UI (search + filtros).
// ════════════════════════════════════════════════════════════════
window.GoHappyMap = {
    instance:       null,
    isInitialized:  false,
    markers:        [],
    currentFilter:  'all',
    userMarker:     null,
    lastKnownCoords:"41.6520, -4.7286",
    _gpsWatchId:    null,
    _chipSearchToken: 0,

    // ─── RENDER ───
    render: async (container) => {
        console.log("[Map] Render v3.0 Leaflet");
        container.style.display = 'block';

        if (!window.GoHappyMap.isInitialized) {
            const lang = window.GoHappyI18n?.lang || 'es';
            const loaderMsg = lang === 'en' ? 'Loading map…' : 'Cargando mapa…';

            container.innerHTML = `
                <div id="map-canvas" style="position:absolute; inset:0; z-index:1; background:#DFEEFF;"></div>
                <div id="map-loader" style="position:absolute; inset:0; background:linear-gradient(180deg,#eaf2fd 0%,#d6e6f9 100%); z-index:10; overflow:hidden; pointer-events:none;">
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
                            <p style="color:var(--primary-cobalt,#0B4C8F); font-weight:700; margin:0 0 18px;">${lang === 'en' ? 'Could not load map' : 'No se pudo cargar el mapa'}</p>
                            <p style="color:#64748b; font-size:12px; margin:0 0 16px;">${(e?.message || 'Unknown error').slice(0, 120)}</p>
                            <button onclick="window.location.reload()" style="background:var(--primary-cobalt,#0B4C8F); color:white; border:none; padding:12px 24px; border-radius:999px; font-weight:800; cursor:pointer;">🔄 ${lang === 'en' ? 'Retry' : 'Reintentar'}</button>
                        </div>`;
                }
            }
        } else {
            // Ya inicializado — solo redimensionar (caso pestaña vuelve a estar activa)
            const loader = document.getElementById('map-loader');
            if (loader) loader.style.display = 'none';
            try { window.GoHappyMap.instance.invalidateSize(); } catch (e) {}
            if (window._navContext) {
                window.GoHappyMap.handleNavContext(window._navContext);
                window._navContext = null;
            }
        }
    },

    // ─── INIT ───
    init: async (container) => {
        if (window.GoHappyMap.isInitialized && window.GoHappyMap.instance) return;

        // GUARD 1: ¿Leaflet cargado?
        if (typeof window.L === 'undefined') {
            throw new Error(window.L === undefined && typeof L === 'undefined'
                ? 'Leaflet no disponible — recarga la página'
                : 'Leaflet missing');
        }

        const mapDiv = document.getElementById('map-canvas') || container;

        // GUARD 2: dimensiones reales
        const rect = mapDiv.getBoundingClientRect();
        if (rect.width < 10 || rect.height < 10) {
            console.warn('[Map] container sin dimensiones', rect.width, 'x', rect.height, '→ forzando');
            mapDiv.style.cssText = 'position:absolute; inset:0; width:100vw; height:100vh; z-index:1; background:#DFEEFF;';
        }

        console.info('[Map] Init Leaflet · canvas', rect.width + 'x' + rect.height);

        // Crear mapa Leaflet
        window.GoHappyMap.instance = L.map(mapDiv, {
            center:   [41.6520, -4.7286],
            zoom:     14,
            zoomControl: false,
            attributionControl: false,
            preferCanvas: true   // mejor rendimiento mobile
        });

        // Tile layer: CartoDB Voyager (premium look, gratis sin API key)
        // Fallback: OpenStreetMap raster (siempre disponible)
        const tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
        const tileFallback = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

        const tileLayer = L.tileLayer(tileUrl, {
            maxZoom: 19,
            minZoom: 3,
            subdomains: 'abcd',
            crossOrigin: true,
            attribution: '© OpenStreetMap, © CartoDB'
        });

        let tileFallbackTriggered = false;
        tileLayer.on('tileerror', (err) => {
            if (tileFallbackTriggered) return;
            tileFallbackTriggered = true;
            console.warn('[Map] CartoDB tiles fallaron — fallback a OSM');
            tileLayer.setUrl(tileFallback);
        });

        tileLayer.addTo(window.GoHappyMap.instance);

        // Atribución pequeñita
        L.control.attribution({ position: 'bottomright', prefix: false }).addAttribution('© OpenStreetMap').addTo(window.GoHappyMap.instance);

        // Pedir ubicación + centrar
        window.GoHappyMap.locateUser(true);

        // FAIL-SAFE: ocultar loader tras 6s si tiles tardan
        const hideLoader = () => {
            const loader = document.getElementById('map-loader');
            if (loader && loader.style.display !== 'none') {
                loader.style.transition = 'opacity 0.4s';
                loader.style.opacity = '0';
                setTimeout(() => { loader.style.display = 'none'; }, 400);
                window.GoHappyMap.isInitialized = true;
            }
        };
        const failsafeTimeout = setTimeout(hideLoader, 6000);

        // Esconder loader cuando el primer tile cargue
        tileLayer.on('load', () => { clearTimeout(failsafeTimeout); hideLoader(); });

        // Click en mapa: long-press / dblclick → añadir reseña
        let pressTimer = null;
        let pressLatLng = null;
        let didMove = false;

        const cancelPress = () => { if (pressTimer) clearTimeout(pressTimer); pressTimer = null; pressLatLng = null; };

        window.GoHappyMap.instance.on('dblclick', (e) => {
            window.GoHappyMap.showAddSiteModal(e.latlng.lat, e.latlng.lng);
        });
        window.GoHappyMap.instance.doubleClickZoom.disable();

        // Long-press móvil (mousedown / touchstart)
        mapDiv.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) { cancelPress(); return; }
            didMove = false;
            const touch = e.touches[0];
            const containerPoint = window.GoHappyMap.instance.mouseEventToContainerPoint({
                clientX: touch.clientX, clientY: touch.clientY
            });
            pressLatLng = window.GoHappyMap.instance.containerPointToLatLng(containerPoint);
            pressTimer = setTimeout(() => {
                if (!didMove && pressLatLng) {
                    if (navigator.vibrate) navigator.vibrate(60);
                    window.GoHappyMap.showAddSiteModal(pressLatLng.lat, pressLatLng.lng);
                }
                pressTimer = null;
            }, 600);
        }, { passive: true });
        mapDiv.addEventListener('touchmove', () => { didMove = true; cancelPress(); }, { passive: true });
        mapDiv.addEventListener('touchend', cancelPress, { passive: true });
        mapDiv.addEventListener('touchcancel', cancelPress, { passive: true });

        // UI overlay (search + filtros + FABs)
        window.GoHappyMap.injectUI(container);

        // Cargar marcadores comunitarios + GPS
        try { await window.GoHappyMap.loadMarkers(); } catch (e) { console.warn('[Map] loadMarkers:', e?.message); }
        window.GoHappyMap.startGPSWatch();
    },

    // ─── handleNavContext (compat con resto del app) ───
    handleNavContext: (context) => {
        if (!window.GoHappyMap.instance) return;
        let target = null;
        if (context.coords) target = [context.coords.lat, context.coords.lng];
        else if (context.focus) {
            const m = window.GoHappyMap.markers.find(m => m.data && m.data.name === context.focus);
            if (m) target = [m.data.lat, m.data.lng];
        }
        if (target) {
            window.GoHappyMap.instance.flyTo(target, context.zoom || 17, { duration: 1.5 });
            const marker = window.GoHappyMap.markers.find(m => m.data && (m.data.name === context.focus || (m.data.lat === target[0] && m.data.lng === target[1])));
            if (marker?.instance) setTimeout(() => marker.instance.openPopup(), 1200);
        }
    },

    // ─── injectUI ───
    injectUI: (container) => {
        if (document.querySelector('.map-search-container')) return;
        container.style.position = 'relative';

        const T = window.t || (k => k);
        const overlay = document.createElement('div');
        overlay.className = 'map-search-container';
        overlay.style.zIndex = '500';
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

        // FAB localizar
        const locateBtn = document.createElement('button');
        locateBtn.id = 'locate-me-btn';
        locateBtn.className = 'fab-btn locate-fab';
        locateBtn.innerHTML = '🎯';
        locateBtn.style.zIndex = '500';
        container.appendChild(locateBtn);

        // FAB añadir reseña
        const addBtn = document.createElement('button');
        addBtn.id = 'add-review-fab';
        addBtn.className = 'fab-btn add-review-fab';
        addBtn.innerHTML = '<span style="font-size:24px; line-height:1;">+</span>';
        addBtn.style.zIndex = '500';
        container.appendChild(addBtn);

        addBtn.addEventListener('click', () => {
            let lat, lng;
            if (window.GoHappyMap.userMarker) {
                const ll = window.GoHappyMap.userMarker.getLatLng();
                lat = ll.lat; lng = ll.lng;
            } else if (window.GoHappyMap.instance) {
                const c = window.GoHappyMap.instance.getCenter();
                lat = c.lat; lng = c.lng;
            } else return;
            window.GoHappyMap.showAddSiteModal(lat, lng);
        });

        locateBtn.addEventListener('click', () => {
            if (window.GoHappyMap.userMarker) {
                const ll = window.GoHappyMap.userMarker.getLatLng();
                window.GoHappyMap.instance.flyTo(ll, 17, { duration: 1.2 });
            } else {
                window.GoHappyMap.locateUser();
            }
        });

        const input = document.getElementById('map-search-input');
        input.addEventListener('keypress', e => {
            if (e.key === 'Enter') window.GoHappyMap.handleSearch(input.value);
        });

        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.addEventListener('click', async () => {
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active', 'loading'));
                chip.classList.add('active');
                const type = chip.dataset.type;
                window.GoHappyMap.currentFilter = type;

                if (type === 'all') {
                    window.GoHappyMap.filterMarkers('all');
                    return;
                }
                window.GoHappyMap.filterMarkers(type);
                const localOfType = window.GoHappyMap.markers.filter(m => m.type === type);
                if (localOfType.length >= 6) return;

                const myToken = ++window.GoHappyMap._chipSearchToken;
                chip.classList.add('loading');
                const before = window.GoHappyMap.markers.length;
                try {
                    await Promise.race([
                        window.GoHappyMap.handleSearch(`${chip.innerText.trim()} para niños`),
                        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000))
                    ]);
                } catch (e) {}
                if (myToken !== window.GoHappyMap._chipSearchToken) return;
                chip.classList.remove('loading');
                window.GoHappyMap.filterMarkers(type);
            });
        });

        // Hint primera vez
        if (!localStorage.getItem('GoHappy_map_hint_seen')) {
            setTimeout(() => {
                const tip = window.GoHappyI18n?.lang === 'en'
                    ? '💡 Tap "+" or hold any place to add a review'
                    : '💡 Toca el "+" o mantén pulsado un sitio para reseñarlo';
                window.GoHappyToast && window.GoHappyToast.info(tip, 4500);
                localStorage.setItem('GoHappy_map_hint_seen', '1');
            }, 2500);
        }
    },

    // ─── loadMarkers (reseñas comunidad + IA fallback) ───
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

    // ─── createMarker ───
    createMarker: (loc) => {
        if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return;
        const hasReview = loc.isCommunity || (loc.rating || 0) >= 4.7;

        let icon = '📍';
        if (loc.type === 'park') icon = '🌳';
        else if (loc.type === 'museum' || loc.type === 'school') icon = '🎓';
        else if (loc.type === 'food') icon = '🍎';
        else if (loc.type === 'theater') icon = '🎭';
        else if (loc.type === 'kidzone') icon = '🏰';

        // Marcador HTML personalizado (estética premium)
        const markerEl = document.createElement('div');
        markerEl.className = 'gohappy-marker-leaflet';
        markerEl.innerHTML = `
            <div style="
                background:white; width:40px; height:40px;
                border-radius:50% 50% 50% 0; transform:rotate(-45deg);
                display:flex; align-items:center; justify-content:center;
                box-shadow:0 4px 10px rgba(0,0,0,0.2);
                border:3px solid var(--primary-cobalt,#0B4C8F);
                position:relative;
            ">
                <div style="transform:rotate(45deg); font-size:20px;">${icon}</div>
                ${hasReview ? `<div style="position:absolute; top:-10px; right:-10px; background:#F39C12; color:white; font-size:9px; padding:2px 6px; border-radius:10px; font-weight:900; border:2px solid white; transform:rotate(45deg); white-space:nowrap;">⭐</div>` : ''}
            </div>
        `;
        const divIcon = L.divIcon({
            html: markerEl.innerHTML,
            className: 'gh-marker-wrapper',
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        });

        // Sanitizar
        const sec = window.GoHappySecurity;
        const safeName = sec ? sec.safe(loc.name || 'Sitio') : String(loc.name || 'Sitio').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
        const safeType = sec ? sec.safe(loc.type || '') : String(loc.type || '');
        const safeImage = (loc.image && /^https?:\/\//.test(loc.image)) ? loc.image : '';

        const tRoute  = window.GoHappyI18n ? window.GoHappyI18n.t('map.route')  : '🗺️ Cómo llegar';
        const tReview = window.GoHappyI18n ? window.GoHappyI18n.t('map.review') : '📝 Escribir reseña';

        const popupHtml = `
            <div class="popup-premium" style="min-width:230px; border-radius:20px; overflow:hidden; margin:-12px;">
                <div style="height:100px; background:${safeImage ? `url('${safeImage}') center/cover` : 'linear-gradient(135deg,#0B71FC,#17C8D4)'}; display:flex; align-items:center; justify-content:center; color:white; font-size:2rem;">${safeImage ? '' : '🌟'}</div>
                <div style="padding:12px; background:white;">
                    <h3 style="margin:0 0 4px; font-size:1rem; font-weight:800; color:var(--cobalt,#0B4C8F);">${safeName}</h3>
                    <div style="font-size:0.78rem; color:#666; margin-bottom:10px;">⭐ ${parseFloat(loc.rating) || 4.5} · ${safeType}</div>
                    <button class="popup-route-btn" data-lat="${loc.lat}" data-lng="${loc.lng}" style="padding:10px; border-radius:12px; font-size:12px; font-weight:800; width:100%; border:none; color:white; cursor:pointer; background:linear-gradient(135deg,#0B71FC,#17C8D4); margin-bottom:8px; box-shadow:0 6px 16px rgba(11,113,252,0.28);">${tRoute}</button>
                    <button class="popup-review-btn" data-lat="${loc.lat}" data-lng="${loc.lng}" data-name="${safeName}" style="padding:9px; border-radius:12px; font-size:12px; font-weight:700; width:100%; border:0.5px solid rgba(11,76,143,0.15); color:var(--cobalt,#0B4C8F); cursor:pointer; background:rgba(11,76,143,0.06);">${tReview}</button>
                </div>
            </div>
        `;

        const marker = L.marker([loc.lat, loc.lng], { icon: divIcon })
            .addTo(window.GoHappyMap.instance)
            .bindPopup(popupHtml, { closeButton: true, maxWidth: 280, className: 'gh-popup' });

        marker.on('popupopen', () => {
            setTimeout(() => {
                const routeBtn = document.querySelector('.leaflet-popup-content .popup-route-btn');
                const revBtn   = document.querySelector('.leaflet-popup-content .popup-review-btn');
                if (routeBtn && window.GoHappyNav) {
                    routeBtn.onclick = () => window.GoHappyNav.openRoute(parseFloat(routeBtn.dataset.lat), parseFloat(routeBtn.dataset.lng), loc.name);
                }
                if (revBtn) {
                    revBtn.onclick = () => window.GoHappyMap.showAddSiteModal(parseFloat(revBtn.dataset.lat), parseFloat(revBtn.dataset.lng), revBtn.dataset.name);
                }
            }, 50);
        });

        window.GoHappyMap.markers.push({ instance: marker, type: loc.type, data: loc });
    },

    clearMarkers: () => {
        window.GoHappyMap.markers.forEach(m => { try { m.instance.remove(); } catch (e) {} });
        window.GoHappyMap.markers = [];
    },

    filterMarkers: (type) => {
        const bounds = L.latLngBounds([]);
        let hasVisible = false;
        window.GoHappyMap.markers.forEach(m => {
            if (type === 'all' || m.type === type) {
                m.instance.addTo(window.GoHappyMap.instance);
                bounds.extend(m.instance.getLatLng());
                hasVisible = true;
            } else {
                m.instance.remove();
            }
        });
        if (hasVisible) {
            if (window.GoHappyMap.userMarker) bounds.extend(window.GoHappyMap.userMarker.getLatLng());
            try { window.GoHappyMap.instance.fitBounds(bounds, { padding: [60, 40], maxZoom: 15 }); } catch (e) {}
        }
    },

    // ─── handleSearch (IA + geocoding fallback) ───
    handleSearch: async (query) => {
        if (!query) return;
        const input = document.getElementById('map-search-input');
        if (input) { input.placeholder = '✨ IA buscando…'; input.disabled = true; }

        try {
            const coords = window.lastKnownCoords || window.GoHappyMap.lastKnownCoords;
            const results = (window.GoHappyData?.searchLocations) ? await window.GoHappyData.searchLocations(query, coords) : null;

            if (results && results.length > 0) {
                const existingNames = new Set(window.GoHappyMap.markers.map(m => m.data?.name));
                const bounds = L.latLngBounds([]);
                let added = 0;
                results.forEach(loc => {
                    if (!loc.lat || !loc.lng || existingNames.has(loc.name)) return;
                    window.GoHappyMap.createMarker(loc);
                    bounds.extend([loc.lat, loc.lng]);
                    added++;
                });
                if (added > 0) {
                    if (window.GoHappyMap.userMarker) bounds.extend(window.GoHappyMap.userMarker.getLatLng());
                    try { window.GoHappyMap.instance.fitBounds(bounds, { padding: [60, 40], maxZoom: 15 }); } catch (e) {}
                }
            } else {
                // Fallback Photon
                try {
                    const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`);
                    const data = await r.json();
                    if (data?.features?.length) {
                        const c = data.features[0].geometry.coordinates;
                        window.GoHappyMap.instance.flyTo([c[1], c[0]], 17, { duration: 1.5 });
                    } else {
                        window.GoHappyToast && window.GoHappyToast.info(`Sin resultados para "${query}"`, 3000);
                    }
                } catch (e) {}
            }
        } catch (e) {
            console.warn('[Map] search:', e?.message);
        }

        if (input) { input.placeholder = 'Pregunta a Gemini…'; input.disabled = false; input.value = ''; }
    },

    // ─── GPS ───
    startGPSWatch: () => {
        if (!navigator.geolocation) return;
        if (window.GoHappyMap._gpsWatchId != null) {
            navigator.geolocation.clearWatch(window.GoHappyMap._gpsWatchId);
        }
        window.GoHappyMap._gpsWatchId = navigator.geolocation.watchPosition((pos) => {
            const lat = pos.coords.latitude, lng = pos.coords.longitude;
            const newCoords = `${lat}, ${lng}`;
            if (window.lastKnownCoords !== newCoords) {
                window.lastKnownCoords = newCoords;
                window.dispatchEvent(new CustomEvent('GoHappy-location-sync', { detail: newCoords }));
            }
            window.GoHappyMap.updateUserIcon(lat, lng);
        }, null, { enableHighAccuracy: true });
    },

    updateUserIcon: (lat, lng) => {
        if (!window.GoHappyMap.userMarker) {
            const userIcon = L.divIcon({
                html: `
                    <div style="position:relative; width:30px; height:30px;">
                        <div style="position:absolute; inset:-15px; background:radial-gradient(circle, rgba(11,76,143,0.4) 0%, transparent 70%); animation:pulse 2s infinite;"></div>
                        <div style="position:absolute; inset:0; background:white; border:4px solid var(--primary-cobalt,#0B4C8F); border-radius:50%; box-shadow:0 0 15px rgba(11,76,143,0.5);"></div>
                    </div>
                    <style>@keyframes pulse {0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.3);opacity:0.4}}</style>
                `,
                className: 'gh-user-marker',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });
            window.GoHappyMap.userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(window.GoHappyMap.instance);
        } else {
            window.GoHappyMap.userMarker.setLatLng([lat, lng]);
        }
    },

    locateUser: (animate = false) => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude, lng = pos.coords.longitude;
            if (animate) {
                window.GoHappyMap.instance.flyTo([lat, lng], 16, { duration: 2.5 });
            } else {
                window.GoHappyMap.instance.setView([lat, lng], 14);
            }
            window.GoHappyMap.updateUserIcon(lat, lng);
        }, (err) => {
            console.warn('[Map] geolocation denied:', err?.message);
            if (!window.GoHappyMap.isInitialized) {
                const loader = document.getElementById('map-loader');
                if (loader) loader.style.display = 'none';
            }
        }, { enableHighAccuracy: true, timeout: 5000 });
    },

    // ─── Modal añadir reseña (reutiliza estética premium) ───
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
                window.GoHappyToast && window.GoHappyToast.warning(lang === 'en' ? 'Pick a name and rating ⭐' : 'Completa el nombre y la nota ⭐');
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
                window.GoHappyToast && window.GoHappyToast.points(lang === 'en' ? `¡Reseña publicada! +30 pts ✨` : `¡Reseña publicada! +30 pts ✨`);
                modal.remove();
            } catch (e) {
                console.error('[Map] review save:', e);
                window.GoHappyToast && window.GoHappyToast.error((lang === 'en' ? 'Save error: ' : 'Error: ') + (e?.message || 'unknown'));
            }
        };
    }
};

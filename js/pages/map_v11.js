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
            // Mostrar loader inicial
            container.innerHTML = `
                <div id="map-loader" class="center-text" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #eef2f7; z-index: 10;">
                    <div class="magic-loader">✨</div>
                    <p style="margin-top: 15px; color: var(--primary-cobalt); font-weight: 700;">Invocando mapa 3D...</p>
                </div>
            `;
            await window.GoHappyMap.init(container);
        } else {
            const loader = document.getElementById('map-loader');
            if (loader) loader.style.display = 'none';
            window.GoHappyMap.instance.resize();
        }
    },

    init: async (container) => {
        if (window.GoHappyMap.isInitialized && window.GoHappyMap.instance) return;

        try {
            window.GoHappyMap.instance = new maplibregl.Map({
                container: container,
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

            window.GoHappyMap.instance.on('load', async () => {
                window.GoHappyMap.isInitialized = true;
                const loader = document.getElementById('map-loader');
                if (loader) loader.style.display = 'none';
                
                // Waze Style Colors - More Premium and Clean
                const layersToColor = [
                    { id: 'water', color: '#B3E5FC', opacity: 0.8 },
                    { id: 'landuse-natural', color: '#E8F5E9', opacity: 1 },
                    { id: 'landuse-park', color: '#C8E6C9', opacity: 1 },
                    { id: 'land', color: '#F5F5F5', opacity: 1 }
                ];

                layersToColor.forEach(l => {
                    if (window.GoHappyMap.instance.getLayer(l.id)) {
                        window.GoHappyMap.instance.setPaintProperty(l.id, 'fill-color', l.color);
                        window.GoHappyMap.instance.setPaintProperty(l.id, 'fill-opacity', l.opacity);
                    }
                });

                // Waze-Style 3D Buildings - Transparent Cobalt
                try {
                    const buildingLayer = window.GoHappyMap.instance.getLayer('building');
                    if (buildingLayer) {
                        // Hide original 2D flat building layer
                        window.GoHappyMap.instance.setPaintProperty('building', 'fill-opacity', 0);
                        
                        // Inject true 3D extrusion layer using the same data source
                        window.GoHappyMap.instance.addLayer({
                            'id': 'waze-3d-buildings',
                            'source': buildingLayer.source,
                            'source-layer': buildingLayer.sourceLayer,
                            'type': 'fill-extrusion',
                            'minzoom': 15,
                            'paint': {
                                'fill-extrusion-color': '#0B4C8F',
                                'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 20],
                                'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
                                'fill-extrusion-opacity': 0.4
                            }
                        });
                    }
                } catch (e) {
                    console.warn("Could not inject 3D buildings:", e);
                }

                // Waze-Style Roads (Clean & Premium)
                const roadLayers = window.GoHappyMap.instance.getStyle().layers
                    .filter(l => l.id.includes('road') || l.id.includes('street') || l.id.includes('way') || l.id.includes('bridge') || l.id.includes('tunnel'))
                    .map(l => l.id);

                roadLayers.forEach(layer => {
                    if (window.GoHappyMap.instance.getLayer(layer)) {
                        try {
                            const isPrimary = layer.includes('primary') || layer.includes('motorway') || layer.includes('trunk');
                            window.GoHappyMap.instance.setPaintProperty(layer, 'line-color', isPrimary ? '#ffffff' : '#f0f0f0');
                            window.GoHappyMap.instance.setPaintProperty(layer, 'line-opacity', 1);
                        } catch(e){}
                    }
                });

                window.GoHappyMap.injectUI(container);
                // Markers disabled as per user request
                // await window.GoHappyMap.loadMarkers();
                window.GoHappyMap.startGPSWatch();

                // Auto-highlight parks near the initial view
                window.GoHappyMap.highlightParksOnLoad();
            });

            window.GoHappyMap.instance.on('dblclick', (e) => {
                window.GoHappyMap.showAddSiteModal(e.lngLat.lat, e.lngLat.lng);
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
        overlay.innerHTML = `
            <div class="map-search-bar" style="display:flex; align-items:center; background: rgba(255,255,255,0.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border-radius: 30px; padding: 2px 20px; box-shadow: 0 10px 30px rgba(0, 210, 211, 0.1); flex:1; width: 100%; border: 1px solid rgba(255,255,255,0.5);">
                <span class="gemini-sparkle" style="margin-right:8px; font-size:1.2rem;">✨</span>
                <input type="text" id="map-search-input" class="map-search-input" placeholder="Pregunta a Gemini o busca un lugar..." style="background:transparent; border:none; color:var(--text-dark); flex:1; outline:none; padding:12px 0; font-size: 0.95rem;">
            </div>
            <div class="map-filters">
                <div class="filter-chip active" data-type="all">Todos</div>
                <div class="filter-chip" data-type="park">Parques 🌳</div>
                <div class="filter-chip" data-type="school">Escuelas 🎓</div>
                <div class="filter-chip" data-type="theater">Cine/Teatro 🎭</div>
                <div class="filter-chip" data-type="kidzone">Ludotecas 🏰</div>
                <div class="filter-chip" data-type="food">Comida 🍏</div>
            </div>
        `;
        container.appendChild(overlay);

        const locateBtn = document.createElement('button');
        locateBtn.id = 'locate-me-btn';
        locateBtn.className = 'fab-btn locate-fab';
        locateBtn.innerHTML = '🎯';
        container.appendChild(locateBtn);

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
        chips.forEach(chip => {
            chip.addEventListener('click', async () => {
                chips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                
                const type = chip.dataset.type;
                const label = chip.innerText;
                
                if (type === 'all') {
                    window.GoHappyMap.filterMarkers('all');
                } else {
                    // IA Search for category if not enough local markers
                    input.value = `Buscar ${label}...`;
                    await window.GoHappyMap.handleSearch(`mejores ${label} para ir con niños`);
                    input.value = "";
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
                ${hasReview ? `<div class="tribe-insignia" style="position: absolute; top: -10px; right: -10px; background: var(--accent-pink); color: white; font-size: 10px; padding: 2px 6px; border-radius: 10px; transform: rotate(45deg); font-weight: 800; border: 2px solid white;">TRIBU</div>` : ''}
            </div>
        `;

        const popupHTML = `
            <div class="popup-premium" style="min-width: 220px; border-radius: 20px; overflow: hidden;">
                <div class="popup-img-container" style="position: relative; height: 100px; background: #eee;">
                    ${loc.image ? `<img src="${loc.image}" style="width: 100%; height: 100%; object-fit: cover;">` : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--primary-blue); color: white; font-size: 2rem;">🌟</div>`}
                </div>
                <div class="popup-body" style="padding: 12px; background: white;">
                    <h3 style="margin: 0 0 5px 0; font-size: 1rem; font-weight: 800; color: var(--primary-navy);">${loc.name}</h3>
                    <div style="font-size: 0.8rem; color: #666; margin-bottom: 10px;">⭐ ${loc.rating || 4.5} | ${loc.type}</div>
                    <button class="btn-primary-gradient" style="padding: 10px; border-radius: 10px; font-size: 12px; font-weight: 700; width: 100%; border:none; color:white; cursor:pointer;" onclick="window.GoHappyMap.showAddSiteModal(${loc.lat}, ${loc.lng}, '${loc.name.replace(/'/g, "\\'")}')">
                        📝 Escribir Reseña
                    </button>
                </div>
            </div>
        `;

        const popup = new maplibregl.Popup({ offset: 40, className: 'premium-popup-3d' }).setHTML(popupHTML);

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
        window.GoHappyMap.markers.forEach(m => {
            if (type === 'all' || m.type === type) m.instance.addTo(window.GoHappyMap.instance);
            else m.instance.remove();
        });
    },

    handleSearch: async (query) => {
        if (!query) return;
        const input = document.getElementById('map-search-input');
        input.placeholder = "✨ IA pensando...";
        input.disabled = true;

        try {
            const results = await window.GoHappyData.searchLocations(query, window.GoHappyMap.lastKnownCoords);
            if (results && results.length > 0) {
                window.GoHappyMap.clearMarkers();
                results.forEach(loc => window.GoHappyMap.createMarker(loc));
                window.GoHappyMap.instance.flyTo({ center: [results[0].lng, results[0].lat], zoom: 17, pitch: 0, speed: 1.0 });
            } else {
                // geocoding fallback
                const resp = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`);
                const data = await resp.json();
                if (data.features && data.features.length > 0) {
                    const c = data.features[0].geometry.coordinates;
                    window.GoHappyMap.instance.flyTo({ center: c, zoom: 17, pitch: 0 });
                }
            }
        } catch (e) { console.warn("Search error:", e); }

        input.placeholder = "Pregunta a Gemini...";
        input.disabled = false;
        input.value = "";
    },

    startGPSWatch: () => {
        if (!navigator.geolocation) return;

        let lastLat = null;
        let lastLng = null;

        navigator.geolocation.watchPosition((pos) => {
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

            window.GoHappyMap.instance.easeTo({
                center: [lng, lat],
                bearing: heading || window.GoHappyMap.instance.getBearing(),
                pitch: 70, // Waze-style driving view
                zoom: 18.5, // Closer zoom for Waze feel
                duration: 1500,
                easing: (t) => t * (2 - t) // Smooth deceleration
            });
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
            window.GoHappyToast.warning('Inicia sesión para contribuir con la Tribu.');
            window.GoHappyAuth.renderAuthModal();
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal entry-anim';
        modal.innerHTML = `
            <div class="auth-container" style="padding: 20px;">
                <div class="auth-card premium-glass" style="max-height: 85vh; overflow-y: auto; border-radius: 30px; border: 1px solid rgba(255,255,255,0.4); padding: 25px;">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <span style="font-size: 40px; display: block; margin-bottom: 10px;">🌟</span>
                        <h3 style="color:var(--primary-cobalt); font-weight: 900; font-size: 1.5rem; margin: 0;">${name ? `Reseñar ${name}` : 'Añadir a la Tribu'}</h3>
                        <p style="font-size:13px; color:#64748b; margin-top: 5px;">Tu experiencia ayuda a cientos de familias.</p>
                    </div>

                    ${name ? '' : '<div style="margin-bottom: 15px;"><label style="font-size: 11px; font-weight: 700; color: var(--primary-cobalt); text-transform: uppercase; margin-bottom: 5px; display: block;">Nombre del lugar</label><input type="text" id="new-site-name" placeholder="Ej: Parque Los Pinos" class="review-input" style="width: 100%; padding: 14px; border-radius: 12px; border: 1px solid #eee; background: #f8fafc;"></div>'}

                    <div style="text-align: center; margin-bottom: 20px;">
                        <label style="font-size: 11px; font-weight: 700; color: var(--primary-cobalt); text-transform: uppercase; margin-bottom: 5px; display: block;">¿Qué nota le das?</label>
                        <div class="star-rating" style="font-size: 2.5rem; color: #ddd; cursor: pointer;">
                            <span class="star" data-val="1">★</span><span class="star" data-val="2">★</span><span class="star" data-val="3">★</span><span class="star" data-val="4">★</span><span class="star" data-val="5">★</span>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label style="font-size: 11px; font-weight: 700; color: var(--primary-cobalt); text-transform: uppercase; margin-bottom: 5px; display: block;">Tu opinión (Breve)</label>
                        <textarea id="review-text" class="review-input" placeholder="Limpieza, columpios, zona de sombra..." style="width: 100%; height:100px; padding: 14px; border-radius: 12px; border: 1px solid #eee; background: #f8fafc; font-size: 14px; resize: none;"></textarea>
                    </div>

                    <button id="post-review-btn" class="btn-primary-gradient" style="width: 100%; height: 55px; border-radius: 16px; font-size: 1.1rem; font-weight: 800; border: none; box-shadow: 0 10px 20px rgba(11, 113, 252, 0.2);">🚀 Publicar en el Mapa</button>
                    <button class="btn-text full-width" style="margin-top:15px; color: #888; font-size: 13px; text-decoration: underline;" onclick="this.closest('.modal').remove()">Ahora no, gracias</button>
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
            if (!finalName || rating === 0) return window.GoHappyToast.warning('Completa el nombre y la nota. ⭐');

            try {
                // Save to Firestore
                await window.GoHappyDB.collection('reviews').add({
                    userId: user.uid,
                    userName: user.nickname,
                    siteName: finalName,
                    rating: parseInt(rating),
                    text: reviewText,
                    lat: lat,
                    lng: lng,
                    createdAt: new Date()
                });

                // Add points
                await window.GoHappyPoints.addPoints('REVIEW');
                
                // Visual feedback on map
                window.GoHappyMap.createMarker({ name: finalName, lat, lng, rating, type: 'new' });
                
                window.GoHappyToast.points(`¡Reseña publicada! +100 pts. ¡Gracias por ayudar a la comunidad! ✨`);
                modal.remove();
            } catch (e) {
                console.error("Error saving review:", e);
                window.GoHappyToast.error('Error al guardar la reseña. Inténtalo de nuevo.');
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


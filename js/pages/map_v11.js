// Definitive Kidoa 3D Map Engine - v2.1.0 (MapLibre GL / Premium)
window.KidoaMap = {
    instance: null,
    isInitialized: false,
    markers: [],
    currentFilter: 'all',
    userMarker: null,
    lastKnownCoords: "41.6520, -4.7286",

    render: async (container) => {
        console.log("Rendering Kidoa 3D Map v2.1.0...");
        container.style.display = 'block';

        if (!window.KidoaMap.isInitialized) {
            await window.KidoaMap.init(container);
        } else {
            window.KidoaMap.instance.resize();
            // Refresh markers in case of data updates
            window.KidoaMap.loadMarkers();
        }
    },

    init: async (container) => {
        if (window.KidoaMap.isInitialized && window.KidoaMap.instance) return;

        try {
            window.KidoaMap.instance = new maplibregl.Map({
                container: container,
                style: 'https://tiles.openfreemap.org/styles/liberty', // Clean, premium vector style
                center: [-4.7286, 41.6520],
                zoom: 17.5,
                pitch: 70, // Stronger GPS Tilt
                bearing: 0,
                antialias: true,
                hash: false
            });

            window.KidoaMap.instance.on('load', async () => {
                window.KidoaMap.isInitialized = true;

                // Add 3D Buildings
                window.KidoaMap.instance.addLayer({
                    'id': '3d-buildings',
                    'source': 'openmaptiles',
                    'source-layer': 'building',
                    'type': 'fill-extrusion',
                    'minzoom': 15,
                    'paint': {
                        'fill-extrusion-color': '#e2e8f0',
                        'fill-extrusion-height': ['get', 'render_height'],
                        'fill-extrusion-base': ['get', 'render_min_height'],
                        'fill-extrusion-opacity': 0.8
                    }
                });

                // Add Sky for Bird's Eye feel
                window.KidoaMap.instance.setSky({
                    "sky-color": "#191ada",
                    "sky-horizon-blend": 0.5,
                    "horizon-color": "#ffffff",
                    "horizon-fog-blend": 0.5,
                    "fog-color": "#ffffff",
                    "fog-ground-blend": 0.5
                });

                window.KidoaMap.injectUI(container);
                await window.KidoaMap.loadMarkers();
                window.KidoaMap.startGPSWatch();
            });

            window.KidoaMap.instance.on('dblclick', (e) => {
                window.KidoaMap.showAddSiteModal(e.lngLat.lat, e.lngLat.lng);
            });

        } catch (e) {
            console.error("KidoaMap Init Failed:", e);
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
            <div class="map-search-bar" style="display:flex; align-items:center; background: white; border-radius: 25px; padding: 2px 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); flex:1; width: 100%;">
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
            if (e.key === 'Enter') window.KidoaMap.handleSearch(input.value);
        });

        document.getElementById('locate-me-btn').addEventListener('click', () => {
            if (window.KidoaMap.userMarker) {
                const lngLat = window.KidoaMap.userMarker.getLngLat();
                window.KidoaMap.instance.easeTo({ center: lngLat, zoom: 18, pitch: 60, speed: 1.2 });
            } else {
                window.KidoaMap.locateUser();
            }
        });

        const chips = document.querySelectorAll('.filter-chip');
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                chips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                window.KidoaMap.filterMarkers(chip.dataset.type);
            });
        });
    },

    loadMarkers: async () => {
        let coords = window.lastKnownCoords || "41.6520, -4.7286";
        const locations = await window.KidoaData.getLocations(coords);
        window.KidoaMap.clearMarkers();

        locations.forEach(loc => {
            window.KidoaMap.createMarker(loc);
        });
    },

    createMarker: (loc) => {
        const isHighRated = loc.rating >= 4.5;
        const el = document.createElement('div');
        el.className = `kidoa-marker-3d-wrap ${isHighRated ? 'highlight-poi' : ''}`;
        el.innerHTML = `
            <div class="kidoa-marker-3d">
                <div class="kidoa-marker-pin" style="background: ${isHighRated ? 'linear-gradient(135deg, var(--accent-pink), #ff758c)' : 'linear-gradient(135deg, var(--primary-blue), #4cc9f0)'};">
                    <img src="assets/logo.png" style="width: 130%; height: 130%; object-fit: contain; filter: brightness(100) grayscale(1);">
                </div>
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
                    <button class="btn-primary-gradient" style="padding: 10px; border-radius: 10px; font-size: 12px; font-weight: 700; width: 100%; border:none; color:white; cursor:pointer;" onclick="window.KidoaMap.showAddSiteModal(${loc.lat}, ${loc.lng}, '${loc.name.replace(/'/g, "\\'")}')">
                        📝 Escribir Reseña
                    </button>
                </div>
            </div>
        `;

        const popup = new maplibregl.Popup({ offset: 40, className: 'premium-popup-3d' }).setHTML(popupHTML);

        const marker = new maplibregl.Marker({ element: el })
            .setLngLat([loc.lng, loc.lat])
            .setPopup(popup)
            .addTo(window.KidoaMap.instance);

        window.KidoaMap.markers.push({ instance: marker, type: loc.type, data: loc });
    },

    clearMarkers: () => {
        window.KidoaMap.markers.forEach(m => m.instance.remove());
        window.KidoaMap.markers = [];
    },

    filterMarkers: (type) => {
        window.KidoaMap.markers.forEach(m => {
            if (type === 'all' || m.type === type) m.instance.addTo(window.KidoaMap.instance);
            else m.instance.remove();
        });
    },

    handleSearch: async (query) => {
        if (!query) return;
        const input = document.getElementById('map-search-input');
        input.placeholder = "✨ IA pensando...";
        input.disabled = true;

        try {
            const results = await window.KidoaData.searchLocations(query, window.KidoaMap.lastKnownCoords);
            if (results && results.length > 0) {
                window.KidoaMap.clearMarkers();
                results.forEach(loc => window.KidoaMap.createMarker(loc));
                window.KidoaMap.instance.flyTo({ center: [results[0].lng, results[0].lat], zoom: 17, pitch: 60, speed: 1.0 });
            } else {
                // geocoding fallback
                const resp = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`);
                const data = await resp.json();
                if (data.features && data.features.length > 0) {
                    const c = data.features[0].geometry.coordinates;
                    window.KidoaMap.instance.flyTo({ center: c, zoom: 17, pitch: 60 });
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
                window.dispatchEvent(new CustomEvent('kidoa-location-sync', { detail: newCoords }));
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

            window.KidoaMap.updateUserIcon(lat, lng, heading); // Pass the updated heading to the marker physically

            window.KidoaMap.instance.easeTo({
                center: [lng, lat],
                bearing: heading || window.KidoaMap.instance.getBearing(), // Auto-rotación Waze si nos movemos
                pitch: 60,
                zoom: 18,
                duration: 1200
            });
        }, null, { enableHighAccuracy: true });
    },

    updateUserIcon: (lat, lng, heading = 0) => {
        if (!window.KidoaMap.userMarker) {
            const el = document.createElement('div');
            el.innerHTML = `
                <div class="user-gps-arrow" style="
                    width: 50px; height: 50px;
                    background: radial-gradient(circle, rgba(0,255,150,0.3) 0%, transparent 70%);
                    display: flex; justify-content: center; align-items: center;
                    border-radius: 50%;
                    transform: rotate(${heading}deg);
                    transition: transform 0.3s ease-out;
                ">
                    <div style="
                        width: 0; 
                        height: 0; 
                        border-left: 12px solid transparent;
                        border-right: 12px solid transparent;
                        border-bottom: 24px solid var(--accent-pink);
                        filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4));
                        transform: translateY(-4px);
                    "></div>
                </div>
            `;
            window.KidoaMap.userMarker = new maplibregl.Marker({ element: el, pitchAlignment: 'map', rotationAlignment: 'map' })
                .setLngLat([lng, lat])
                .addTo(window.KidoaMap.instance);
        } else {
            window.KidoaMap.userMarker.setLngLat([lng, lat]);
            const arrow = window.KidoaMap.userMarker.getElement().querySelector('.user-gps-arrow');
            if (arrow) arrow.style.transform = `rotate(${heading}deg)`;
        }
    },

    updateUserHeading: (heading) => {
        const arrow = document.querySelector('.user-gps-arrow');
        if (arrow && heading !== null) {
            arrow.style.transform = `rotate(${heading}deg)`;
        }
    },

    locateUser: () => {
        navigator.geolocation.getCurrentPosition((pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            window.KidoaMap.instance.flyTo({ center: [lng, lat], zoom: 18, pitch: 60 });
            window.KidoaMap.updateUserIcon(lat, lng);
        });
    },

    showAddSiteModal: (lat, lng, name = "") => {
        const user = window.KidoaAuth.checkAuth();
        if (!user) {
            alert("Inicia sesión para contribuir con la Tribu.");
            window.KidoaAuth.renderAuthModal();
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
                < div class="auth-container slide-up-anim" >
                    <div class="auth-card premium-glass" style="max-height: 85vh; overflow-y: auto;">
                        <h3 style="color:var(--primary-navy);">${name ? `Reseñar ${name}` : 'Añadir Lugar 📍'}</h3>
                        <p style="font-size:12px; color:#666; margin-bottom:15px;">Suma puntos y ayuda a otras familias.</p>

                        ${name ? '' : '<input type="text" id="new-site-name" placeholder="Nombre (Ej: Parque Sol)..." class="review-input">'}

                        <div class="star-rating" style="font-size: 2rem; margin: 10px 0;">
                            <span class="star" data-val="1">★</span><span class="star" data-val="2">★</span><span class="star" data-val="3">★</span><span class="star" data-val="4">★</span><span class="star" data-val="5">★</span>
                        </div>

                        <textarea id="review-text" class="review-input" placeholder="¿Qué tal el sitio? (Misión, limpieza, sombra...)" style="height:80px;"></textarea>

                        <button id="post-review-btn" class="btn-primary full-width">Publicar en Kidoa</button>
                        <button class="btn-text full-width" style="margin-top:10px;" onclick="this.closest('.modal').remove()">Cancelar</button>
                    </div>
            </div >
                `;
        document.body.appendChild(modal);

        let rating = 0;
        modal.querySelectorAll('.star').forEach(s => {
            s.onclick = () => {
                rating = s.dataset.val;
                modal.querySelectorAll('.star').forEach(x => x.style.color = x.dataset.val <= rating ? '#FFD700' : '#ccc');
            };
        });

        document.getElementById('post-review-btn').onclick = () => {
            const finalName = name || document.getElementById('new-site-name').value;
            if (!finalName || rating === 0) return alert("Completa el nombre y la nota.");

            window.KidoaPoints.addPoints('REVIEW');
            window.KidoaMap.createMarker({ name: finalName, lat, lng, rating, type: 'new' });
            alert("¡Gracias! Has ganado 100 puntos y ayudado a la comunidad. ✨");
            modal.remove();
        };
    }
};

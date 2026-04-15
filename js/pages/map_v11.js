// Definitive GoHappy 3D Map Engine - v2.1.0 (MapLibre GL / Premium)
window.GoHappyMap = {
    instance: null,
    isInitialized: false,
    markers: [],
    currentFilter: 'all',
    userMarker: null,
    lastKnownCoords: "41.6520, -4.7286",

    render: async (container) => {
        console.log("Rendering GoHappy 3D Map v2.1.0...");
        container.style.display = 'block';

        if (!window.GoHappyMap.isInitialized) {
            await window.GoHappyMap.init(container);
        } else {
            window.GoHappyMap.instance.resize();
            // Refresh markers in case of data updates
            window.GoHappyMap.loadMarkers();
        }
    },

    init: async (container) => {
        if (window.GoHappyMap.isInitialized && window.GoHappyMap.instance) return;

        try {
            window.GoHappyMap.instance = new maplibregl.Map({
                container: container,
                style: 'https://tiles.openfreemap.org/styles/liberty',
                center: [-4.7286, 41.6520],
                zoom: 16.5,
                pitch: 60, // Premium 3D isometric view
                bearing: 0,
                antialias: true,
                hash: false
            });

            window.GoHappyMap.instance.on('load', async () => {
                window.GoHappyMap.isInitialized = true;

                // Check if layers exist before modifying them to prevent Error: Layer does not exist
                if (window.GoHappyMap.instance.getLayer('water')) {
                    window.GoHappyMap.instance.setPaintProperty('water', 'fill-color', '#4CC9F0'); // GoHappy Light Blue
                }
                if (window.GoHappyMap.instance.getLayer('landuse-natural')) {
                    window.GoHappyMap.instance.setPaintProperty('landuse-natural', 'fill-color', '#C8E6C9'); // Soft Green
                }
                if (window.GoHappyMap.instance.getLayer('landuse-park')) {
                    window.GoHappyMap.instance.setPaintProperty('landuse-park', 'fill-color', '#A5D6A7'); // Park Green
                }
                if (window.GoHappyMap.instance.getLayer('land')) {
                    window.GoHappyMap.instance.setPaintProperty('land', 'fill-color', '#F8FAFC'); // GoHappy Grayish White
                }

                // Remove 3D Buildings - Force them to be flat
                try {
                    if (window.GoHappyMap.instance.getLayer('building')) {
                        // 3D GoHappy Glass Buildings
                        window.GoHappyMap.instance.setPaintProperty('building', 'fill-color', 'rgba(0, 150, 255, 0.15)'); // Very soft azure glass
                        window.GoHappyMap.instance.setPaintProperty('building', 'fill-outline-color', 'rgba(0, 150, 255, 0.3)');
                        window.GoHappyMap.instance.setPaintProperty('building', 'fill-opacity', 0.8);
                        // Extrude based on heights
                        window.GoHappyMap.instance.setPaintProperty('building', 'fill-extrusion-height', ['coalesce', ['get', 'render_height'], 15]);
                        window.GoHappyMap.instance.setPaintProperty('building', 'fill-extrusion-base', ['coalesce', ['get', 'render_min_height'], 0]);
                    }
                } catch (e) {}

                // Thicker, cleaner roads
                if (window.GoHappyMap.instance.getLayer('road-primary')) {
                    window.GoHappyMap.instance.setPaintProperty('road-primary', 'line-color', '#ffffff');
                    window.GoHappyMap.instance.setPaintProperty('road-primary', 'line-width', 4);
                }

                window.GoHappyMap.injectUI(container);
                await window.GoHappyMap.loadMarkers();
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
            chip.addEventListener('click', () => {
                chips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                window.GoHappyMap.filterMarkers(chip.dataset.type);
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
        const isHighRated = loc.rating >= 4.5;
        const el = document.createElement('div');
        el.className = `GoHappy-marker-3d-wrap ${isHighRated ? 'highlight-poi' : ''}`;
        el.innerHTML = `
            <div class="GoHappy-marker-3d">
                <div class="GoHappy-marker-pin" style="background: ${isHighRated ? 'linear-gradient(135deg, var(--accent-pink), #ff758c)' : 'linear-gradient(135deg, var(--primary-blue), #4cc9f0)'};">
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
                pitch: 60, // 3D driving view
                zoom: 17.5,
                duration: 1500,
                easing: (t) => t * (2 - t) // Smooth deceleration
            });
        }, null, { enableHighAccuracy: true });
    },

    updateUserIcon: (lat, lng, heading = 0) => {
        if (!window.GoHappyMap.userMarker) {
            const el = document.createElement('div');
            el.innerHTML = `
                <div class="user-GoHappy-orb star-mode" style="
                    width: 60px; height: 60px;
                    background: radial-gradient(circle, rgba(0, 206, 209, 0.4) 0%, transparent 60%);
                    display: flex; justify-content: center; align-items: center;
                    border-radius: 50%;
                ">
                    <div style="font-size: 28px; filter: drop-shadow(0 0 10px rgba(0,255,255,0.8));">⭐</div>
                </div>
            `;
            window.GoHappyMap.userMarker = new maplibregl.Marker({ element: el, pitchAlignment: 'map', rotationAlignment: 'map' })
                .setLngLat([lng, lat])
                .addTo(window.GoHappyMap.instance);
        } else {
            window.GoHappyMap.userMarker.setLngLat([lng, lat]);
            const indicator = window.GoHappyMap.userMarker.getElement().querySelector('[style*="border-bottom: 10px solid"]');
            if (indicator) indicator.style.transform = `rotate(${heading}deg) translateY(-2px)`;
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
            window.GoHappyMap.instance.flyTo({ center: [lng, lat], zoom: 18, pitch: 0 });
            window.GoHappyMap.updateUserIcon(lat, lng);
        });
    },

    showAddSiteModal: (lat, lng, name = "") => {
        const user = window.GoHappyAuth.checkAuth();
        if (!user) {
            alert("Inicia sesión para contribuir con la Tribu.");
            window.GoHappyAuth.renderAuthModal();
            return;
        }

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="auth-container slide-up-anim">
                <div class="auth-card premium-glass" style="max-height: 85vh; overflow-y: auto;">
                    <h3 style="color:var(--primary-navy);">${name ? `Reseñar ${name}` : 'Añadir Lugar 📍'}</h3>
                    <p style="font-size:12px; color:#666; margin-bottom:15px;">Suma puntos y ayuda a otras familias.</p>

                    ${name ? '' : '<input type="text" id="new-site-name" placeholder="Nombre (Ej: Parque Sol)..." class="review-input">'}

                    <div class="star-rating" style="font-size: 2rem; margin: 10px 0;">
                        <span class="star" data-val="1">★</span><span class="star" data-val="2">★</span><span class="star" data-val="3">★</span><span class="star" data-val="4">★</span><span class="star" data-val="5">★</span>
                    </div>

                    <textarea id="review-text" class="review-input" placeholder="¿Qué tal el sitio? (Misión, limpieza, sombra...)" style="height:80px;"></textarea>

                    <button id="post-review-btn" class="btn-primary full-width">Publicar en GoHappy</button>
                    <button class="btn-text full-width" style="margin-top:10px;" onclick="this.closest('.modal').remove()">Cancelar</button>
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
            if (!finalName || rating === 0) return alert("Completa el nombre y la nota.");

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
                
                alert("¡Gracias! Tu reseña ha sido publicada. Has ganado 100 puntos y ayudado a la comunidad. ✨");
                modal.remove();
            } catch (e) {
                console.error("Error saving review:", e);
                alert("Hubo un error al guardar tu reseña. Por favor, intenta de nuevo.");
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


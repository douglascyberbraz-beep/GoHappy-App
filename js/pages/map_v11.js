// Definitive Kindr Map Engine - v1.0.0 (Production)
window.KindrMap = {
    instance: null,
    isInitialized: false,
    markers: [],
    currentFilter: 'all',

    render: (container) => {
        console.log("Rendering Kindr Map v1.0.0...");

        // CRITICAL FIX: Ensure visibility BEFORE any Leaflet calls
        container.style.display = 'block';

        if (!window.KindrMap.isInitialized) {
            window.KindrMap.init(container);
        }

        if (window.KindrMap.instance) {
            // Force layout capture
            setTimeout(() => {
                window.KindrMap.instance.invalidateSize();
            }, 100);

            // Repeated invalidation to handle slow mobile reflows
            const invalidator = setInterval(() => {
                window.KindrMap.instance.invalidateSize();
            }, 1000);

            setTimeout(() => clearInterval(invalidator), 4000);
        }
    },

    init: (container) => {
        if (window.KindrMap.isInitialized) return;

        console.log("Initializing Definitive Map Engine v1.0.0...");

        // Setup the Base Map with Canvas for maximum performance
        const map = L.map(container, {
            zoomControl: false,
            attributionControl: false,
            tap: true,
            preferCanvas: true
        }).setView([41.6520, -4.7286], 13); // Default to Valladolid Center

        // Switching to Google Maps Tiles for better performance and familiarity
        L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20
        }).addTo(map);

        // Ultimate fix para problema de celdas/cuadrículas en dispositivos móviles usando ResizeObserver
        const resizeObserver = new ResizeObserver(() => {
            map.invalidateSize();
        });
        resizeObserver.observe(container);

        // REMOVED: CSS filters which cause choppiness on mobile

        window.KindrMap.instance = map;
        window.KindrMap.isInitialized = true;

        // UI Injections
        window.KindrMap.injectUI(container);

        // Load Markers
        window.KindrMap.loadMarkers();

        // Check for Geolocation
        window.KindrMap.tryAutoLocate();

        // New Feature: Clic largo o clic para añadir punto (Función Estrella)
        map.on('contextmenu', (e) => {
            window.KindrMap.showAddSiteModal(e.latlng.lat, e.latlng.lng);
        });
    },

    injectUI: (container) => {
        // Search & Filter Overlay
        const overlay = document.createElement('div');
        overlay.className = 'map-search-container';
        overlay.innerHTML = `
            <div class="map-search-bar">
                <span class="gemini-sparkle">✨</span>
                <input type="text" id="map-search-input" class="map-search-input" placeholder="Pregunta a Gemini o busca un lugar...">
                <button id="locate-me-btn" class="locate-me-btn">📍</button>
            </div>
            <div id="search-results-list"></div>
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

        // Event Listeners
        const input = document.getElementById('map-search-input');
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') window.KindrMap.handleSearch(input.value);
        });

        document.getElementById('locate-me-btn').addEventListener('click', () => window.KindrMap.locateUser());

        // Chips
        const chips = document.querySelectorAll('.filter-chip');
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                chips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                window.KindrMap.filterMarkers(chip.dataset.type);
            });
        });
    },

    loadMarkers: () => {
        const locations = window.KindrData.getLocations();
        window.KindrMap.clearMarkers();

        locations.forEach(loc => {
            const marker = window.KindrMap.createMarker(loc);
            window.KindrMap.markers.push({ instance: marker, data: loc });
        });
    },

    createMarker: (loc) => {
        // Official Kindr Icon for markers (Heart + Pin concept)
        const kindrIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `
                <div class="kindr-marker">
                    <div class="kindr-marker-pin" style="background-color: var(--primary-blue); border: 2.5px solid white; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                        <img src="assets/logo_white.png" style="width: 80%; height: 80%; object-fit: contain;">
                    </div>
                </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -35]
        });

        const popupContent = `
            <div class="popup-premium" style="min-width: 220px;">
                ${loc.image ? `<img src="${loc.image}" class="popup-img" style="border-radius: 12px 12px 0 0; width: 100%; height: 110px; object-fit: cover;">` : `<div class="popup-img" style="background: linear-gradient(135deg, var(--primary-blue), #4cc9f0); height: 80px; border-radius: 12px 12px 0 0; display:flex; align-items:center; justify-content:center; color:white; font-size:2rem;">📍</div>`}
                <div class="popup-body" style="padding: 15px;">
                    <h3 style="margin: 0 0 5px 0; font-size: 1.1rem; font-weight: 800; color: var(--primary-navy);">${loc.name}</h3>
                    <div class="popup-meta" style="display: flex; gap: 10px; font-size: 0.8rem; color: #666; margin-bottom: 12px;">
                        <span class="popup-rating" style="background: #FFF9C4; color: #FBC02D; padding: 2px 6px; border-radius: 6px; font-weight: 700;">⭐ ${loc.rating || 0}</span>
                        <span>${loc.reviews || 0} reseñas</span>
                    </div>
                    
                    <div class="popup-actions" style="display: flex; flex-direction: column; gap: 8px;">
                        <button class="btn-primary small full-width" style="padding: 10px; border-radius: 10px; font-size: 12px; font-weight: 700;" onclick="window.KindrMap.showAddSiteModal(${loc.lat}, ${loc.lng}, '${loc.name.replace(/'/g, "\\'")}')">
                            ✍️ Escribir Reseña
                        </button>
                        <button class="btn-secondary small full-width" style="background: #f0f4f8; color: var(--primary-navy); border: none; padding: 10px; border-radius: 10px; font-size: 11px; font-weight: 700;" onclick="window.KindrMap.openExternal('${loc.name.replace(/'/g, "\\'")}', ${loc.lat}, ${loc.lng})">
                            🚙 Cómo llegar
                        </button>
                    </div>
                </div>
            </div>
        `;

        const marker = L.marker([loc.lat, loc.lng], { icon: kindrIcon }).addTo(window.KindrMap.instance);
        marker.bindPopup(popupContent, { maxWidth: 300, className: 'premium-popup-wrap' });
        return marker;
    },

    showAddSiteModal: (lat, lng, name = "") => {
        const user = window.KindrAuth.checkAuth();
        if (!user) {
            alert("Necesitas estar registrado para añadir o reseñar sitios.");
            window.KindrAuth.renderAuthModal();
            return;
        }

        const modal = document.createElement('div');
        modal.id = 'review-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="auth-container slide-up-anim">
                <div class="auth-card premium-glass" style="max-height: 90vh; overflow-y: auto;">
                    <h3>${name ? `Reseñar ${name}` : 'Añadir Nuevo Sitio'}</h3>
                    <p style="font-size:0.8rem">Gana hasta 50 puntos por esta acción</p>
                    
                    ${name ? '' : '<input type="text" id="site-name" placeholder="Nombre del sitio..." class="review-input">'}
                    
                    <div class="star-rating" id="star-selector">
                        <span class="star" data-val="1">★</span>
                        <span class="star" data-val="2">★</span>
                        <span class="star" data-val="3">★</span>
                        <span class="star" data-val="4">★</span>
                        <span class="star" data-val="5">★</span>
                    </div>
                    
                    <textarea id="review-comment" class="review-input" maxlength="160" placeholder="Tu reseña (Max 160 carácteres)..."></textarea>
                    
                    <div class="review-semantic-filters" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
                        <select id="review-age" class="review-input small">
                            <option value="">Edad recomendada...</option>
                            <option value="0-3">0-3 años</option>
                            <option value="3-6">3-6 años</option>
                            <option value="6-12">6-12 años</option>
                            <option value="12+">12+ años</option>
                        </select>
                        <select id="review-shade" class="review-input small">
                            <option value="">¿Tiene sombra?</option>
                            <option value="yes">Mucha sombra 🌳</option>
                            <option value="partial">Algo de sombra ⛅</option>
                            <option value="no">Sin sombra ☀️</option>
                        </select>
                        <select id="review-capacity" class="review-input small">
                            <option value="">Aforo/Espacio</option>
                            <option value="spacious">Muy amplio</option>
                            <option value="medium">Normal</option>
                            <option value="compact">Pequeño</option>
                        </select>
                        <select id="review-type" class="review-input small">
                            <option value="">Tipo</option>
                            <option value="outdoor">Aire libre</option>
                            <option value="indoor">Interior</option>
                        </select>
                    </div>

                    <div class="media-upload-area" style="border: 2px dashed var(--primary-blue); padding: 15px; border-radius: 15px; margin-bottom: 20px; background: rgba(0,29,61,0.05); cursor: pointer;">
                        <span style="font-size: 1.5rem;">📸</span>
                        <p style="margin:0; font-weight:600; color:var(--primary-blue);">Añadir fotos o vídeo</p>
                        <input type="file" id="media-input" accept="image/*,video/*" multiple style="display:none;">
                    </div>

                    <button id="save-review-btn" class="btn-primary full-width">Publicar Reseña</button>
                    <button id="cancel-review-btn" class="btn-text" style="margin-top:10px;">Cancelar</button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Star Logic
        let selectedStars = 0;
        const starBtns = modal.querySelectorAll('.star');
        starBtns.forEach(sb => {
            sb.addEventListener('click', () => {
                selectedStars = sb.dataset.val;
                starBtns.forEach(s => s.classList.toggle('active', s.dataset.val <= selectedStars));
            });
        });

        // Click to trigger hidden file input
        modal.querySelector('.media-upload-area').addEventListener('click', () => {
            document.getElementById('media-input').click();
        });

        document.getElementById('save-review-btn').addEventListener('click', () => {
            const finalName = name || document.getElementById('site-name').value;
            const comment = document.getElementById('review-comment').value;

            if (!finalName || selectedStars == 0) {
                alert("Por favor, pon un nombre y una puntuación.");
                return;
            }

            // SAVE Logic (Mock for now, points rewarded)
            window.KindrPoints.addPoints('REVIEW');
            if (document.getElementById('media-input').files.length > 0) {
                window.KindrPoints.addPoints('PHOTO_VIDEO');
            }

            // Create a marker on the fly if it was a new site
            if (!name) {
                window.KindrMap.createMarker({
                    name: finalName,
                    lat: lat,
                    lng: lng,
                    rating: selectedStars,
                    reviews: 1,
                    type: 'new'
                });
            }

            alert(`¡Reseña publicada! Has ganado puntos y subido de nivel.`);
            modal.remove();
        });

        document.getElementById('cancel-review-btn').addEventListener('click', () => modal.remove());
    },

    clearMarkers: () => {
        window.KindrMap.markers.forEach(m => window.KindrMap.instance.removeLayer(m.instance));
        window.KindrMap.markers = [];
    },

    filterMarkers: (type) => {
        window.KindrMap.currentFilter = type;
        window.KindrMap.markers.forEach(m => {
            if (type === 'all' || m.data.type === type) {
                if (!window.KindrMap.instance.hasLayer(m.instance)) m.instance.addTo(window.KindrMap.instance);
            } else {
                window.KindrMap.instance.removeLayer(m.instance);
            }
        });
    },

    handleSearch: async (query) => {
        if (!query) return;

        const input = document.getElementById('map-search-input');
        input.disabled = true;
        input.placeholder = "IA Gemini analizando...";

        // MAGIC: Use Gemini for Intent Analysis
        try {
            const intent = await window.KindrMap.analyzeWithGemini(query);
            console.log("Gemini Intent:", intent);

            if (intent.type === 'geocoding') {
                await window.KindrMap.performGeocoding(intent.location);
            } else if (intent.type === 'category') {
                window.KindrMap.filterMarkers(intent.category);
                // Fly to best center for that category
                const filtered = window.KindrMap.markers.filter(m => m.data.type === intent.category);
                if (filtered.length > 0) {
                    const group = new L.featureGroup(filtered.map(f => f.instance));
                    window.KindrMap.instance.fitBounds(group.getBounds().pad(0.5));
                }
            } else {
                // Default to photon geocoding
                await window.KindrMap.performGeocoding(query);
            }
        } catch (e) {
            console.error("Gemini Search Failed, falling back to basic:", e);
            await window.KindrMap.performGeocoding(query);
        } finally {
            input.disabled = false;
            input.placeholder = "Busca lo que quieras...";
        }
    },

    analyzeWithGemini: async (query) => {
        // MÓDULO DE IA DINÁMICA: Si no hay clave, simulamos el analizador semántico de manera robusta
        if (!window.GEMINI_KEY || window.GEMINI_KEY.includes('PEGAR_AQUI')) {
            console.log("Modo IA Simulado en ejecución porque no se proveyó clave de Gemini.");
            const queryLower = query.toLowerCase();

            // Reglas semánticas locales de la Demo
            if (queryLower.match(/parque|verde|jugar|aire|naturaleza/)) return { type: "category", category: "park" };
            if (queryLower.match(/cultura|museo|arte|historia|exposicion/)) return { type: "category", category: "culture" };
            if (queryLower.match(/comida|comer|hambre|restaurante|cafeteria|cafe/)) return { type: "category", category: "food" };

            // Fallback a geolocalización tradicional
            return { type: "geocoding", location: query };
        }

        const prompt = `Analiza esta búsqueda de un usuario en KINDR (App de crianza): "${query}". 
        Devuelve SOLO un JSON con este formato:
        { 
          "type": "geocoding" | "category" | "semantic", 
          "location": "ciudad o sitio", 
          "category": "park" | "culture" | "food",
          "filters": { "shade": "yes" | "no", "age": "0-3" | "3-6" | "6-12" },
          "reasoning": "breve" 
        }
        Ejemplos de búsqueda semántica: "parques con mucha sombra para bebés", "sitios para comer con zona de juegos".`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${window.GEMINI_KEY}`, {
                method: 'POST',
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (!response.ok) {
                console.error("Gemini HTTP Error:", response.status);
                // Fallback a lógico
                return { type: "geocoding", location: query };
            }

            const data = await response.json();

            if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                const text = data.candidates[0].content.parts[0].text;
                const cleanJson = text.replace(/```json|```/g, '').trim();
                return JSON.parse(cleanJson);
            } else {
                console.warn("Gemini Response malformed.", data);
                return { type: "geocoding", location: query };
            }

        } catch (e) {
            console.error("Error connecting to Gemini API:", e);
            return { type: "geocoding", location: query };
        }
    },

    performGeocoding: async (place) => {
        const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(place)}&limit=1`);
        const data = await response.json();

        if (data.features && data.features.length > 0) {
            const coord = data.features[0].geometry.coordinates;
            window.KindrMap.instance.flyTo([coord[1], coord[0]], 15);
        }
    },

    locateUser: () => {
        if (!navigator.geolocation) {
            alert("Tu navegador no soporta geolocalización.");
            return;
        }

        const input = document.getElementById('map-search-input');
        if (input) input.placeholder = "Buscando tu ubicación...";

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                // Efecto de visualización suave hacia la ubicación
                window.KindrMap.instance.setView([lat, lng], 16);

                // Añadir un marcador de usuario en tiempo real si no existe
                if (!window.KindrMap.userMarker) {
                    const userIcon = L.divIcon({
                        className: 'user-loc-icon',
                        html: '<div style="width:20px;height:20px;background:#4CC9F0;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(0,0,0,0.5); animation: pulse 1.5s infinite;"></div>',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10]
                    });
                    window.KindrMap.userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(window.KindrMap.instance);
                    window.KindrMap.userMarker.bindPopup('<div style="font-weight:bold;color:var(--primary-navy)">¡Estás aquí!</div>').openPopup();
                } else {
                    window.KindrMap.userMarker.setLatLng([lat, lng]);
                    window.KindrMap.userMarker.openPopup();
                }

                if (input) input.placeholder = "Pregunta lo que necesites...";
            },
            (error) => {
                console.warn("Geolocalización falló:", error);
                if (input) input.placeholder = "Error de GPS. Busca un lugar manual.";
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    },

    openExternal: (name, lat, lng) => {
        // Safe Google Maps Intent
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${lat},${lng}`;
        // For mobile, this typically triggers the native app. 
        // Fallback is the browser.
        window.open(url, '_blank');
    },

    tryAutoLocate: () => {
        // Silent locate if allowed
        try {
            if (navigator.permissions && navigator.permissions.query) {
                navigator.permissions.query({ name: 'geolocation' }).then(result => {
                    if (result.state === 'granted') window.KindrMap.locateUser();
                }).catch(e => console.warn('Geolocation permission query failed:', e));
            }
        } catch (e) {
            console.warn('Geolocation permissions not fully supported:', e);
        }
    }
};

// ================================================================
// GoHappy Navigation — Abrir rutas en navegador nativo del cliente
// iOS    → Apple Maps (con fallback a Google Maps app)
// Android → Geo intent (el sistema pregunta: Maps/Waze/etc)
// Web    → Google Maps web
// ================================================================
window.GoHappyNav = {

    // Detección plataforma
    _isIOS: () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream,
    _isAndroid: () => /android/i.test(navigator.userAgent),
    _isNativeApp: () => window.Capacitor && window.Capacitor.isNativePlatform(),

    /**
     * Abre ruta hacia un destino en el navegador nativo del cliente.
     * @param {number} lat - latitud destino
     * @param {number} lng - longitud destino
     * @param {string} name - nombre del lugar (label)
     * @param {object} opts - { mode: 'driving'|'walking'|'transit', from: {lat,lng} }
     */
    openRoute: (lat, lng, name = '', opts = {}) => {
        const latN = parseFloat(lat);
        const lngN = parseFloat(lng);
        if (!latN || !lngN) {
            // Si no hay coords, intentar búsqueda por nombre
            return window.GoHappyNav.openSearch(name);
        }

        const label = encodeURIComponent(name || 'Destino');
        const mode = opts.mode || 'driving';

        // iOS: priorizar Apple Maps, fallback Google Maps app
        if (window.GoHappyNav._isIOS()) {
            // Apple Maps URL Scheme con dirección
            const appleUrl = `maps://?daddr=${latN},${lngN}&q=${label}&dirflg=${mode === 'walking' ? 'w' : mode === 'transit' ? 'r' : 'd'}`;
            // Fallback web (siempre abre algo)
            const fallback = `https://maps.apple.com/?daddr=${latN},${lngN}&q=${label}`;
            window.GoHappyNav._tryOpen(appleUrl, fallback);
            return;
        }

        // Android: usar geo: intent, el sistema deja al usuario elegir app
        if (window.GoHappyNav._isAndroid()) {
            // geo URI con label — abre el chooser nativo (Maps, Waze, etc)
            const geoUrl = `geo:${latN},${lngN}?q=${latN},${lngN}(${label})`;
            const fallback = `https://www.google.com/maps/dir/?api=1&destination=${latN},${lngN}&destination_place_id=&travelmode=${mode}`;
            window.GoHappyNav._tryOpen(geoUrl, fallback);
            return;
        }

        // Web desktop: Google Maps web con direcciones
        const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latN},${lngN}&travelmode=${mode}`;
        window.open(webUrl, '_blank', 'noopener');
    },

    /**
     * Búsqueda de un lugar por nombre (sin coords concretas)
     */
    openSearch: (query) => {
        const q = encodeURIComponent(query || '');
        if (window.GoHappyNav._isIOS()) {
            const appleUrl = `maps://?q=${q}`;
            const fallback = `https://maps.apple.com/?q=${q}`;
            window.GoHappyNav._tryOpen(appleUrl, fallback);
            return;
        }
        if (window.GoHappyNav._isAndroid()) {
            const geoUrl = `geo:0,0?q=${q}`;
            const fallback = `https://www.google.com/maps/search/?api=1&query=${q}`;
            window.GoHappyNav._tryOpen(geoUrl, fallback);
            return;
        }
        window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank', 'noopener');
    },

    /**
     * Compartir ubicación por sistema nativo (Web Share API)
     * Cae en Google Maps web si no hay Share API
     */
    shareLocation: async (lat, lng, name = '') => {
        const latN = parseFloat(lat);
        const lngN = parseFloat(lng);
        const url = `https://www.google.com/maps/search/?api=1&query=${latN},${lngN}`;
        const shareText = name ? `${name} 📍\n${url}` : url;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: name || 'Ubicación GoHappy',
                    text: shareText,
                    url
                });
                return true;
            } catch (e) {
                if (e.name !== 'AbortError') console.warn('Share failed:', e);
            }
        }
        // Fallback: copiar al portapapeles
        try {
            await navigator.clipboard.writeText(shareText);
            window.GoHappyToast && window.GoHappyToast.info('📋 Enlace copiado al portapapeles');
            return true;
        } catch (e) {
            window.open(url, '_blank', 'noopener');
        }
        return false;
    },

    /**
     * Intentar abrir un URL scheme nativo; si falla rápido, fallback web
     * El truco: setTimeout que verifica si la página perdió foco (= app abierta)
     */
    _tryOpen: (deepLink, fallbackUrl) => {
        // Para deep links nativos, simplemente cambiamos location
        // Si la app está instalada, abrirá. Si no, después de 1s saltamos al fallback web.
        const startedAt = Date.now();
        let fellBack = false;

        const tryFallback = () => {
            if (fellBack) return;
            // Solo si la página sigue visible tras 1.5s, el deep link falló
            if (Date.now() - startedAt < 2000 && document.visibilityState === 'visible') {
                fellBack = true;
                window.open(fallbackUrl, '_blank', 'noopener');
            }
        };

        try {
            // Intento principal: deep link
            window.location.href = deepLink;
        } catch (e) {
            // Fallback inmediato si la URL scheme es rechazada
            window.open(fallbackUrl, '_blank', 'noopener');
            return;
        }

        // Fallback diferido si la app nativa no captura el deep link
        setTimeout(tryFallback, 1200);
    }
};

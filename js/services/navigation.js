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
    // Preferencia guardada (navegador de confianza del usuario)
    _PREF_KEY: 'GoHappy_nav_app',
    _getPref: () => { try { return localStorage.getItem(window.GoHappyNav._PREF_KEY); } catch (e) { return null; } },
    clearPref: () => { try { localStorage.removeItem(window.GoHappyNav._PREF_KEY); } catch (e) {} },

    openRoute: (lat, lng, name = '', opts = {}) => {
        const latN = parseFloat(lat);
        const lngN = parseFloat(lng);
        if (!latN || !lngN) {
            // Si no hay coords, intentar búsqueda por nombre
            return window.GoHappyNav.openSearch(name);
        }
        const mode = opts.mode || 'driving';

        // Si ya eligió su navegador de confianza, ir directo
        const pref = window.GoHappyNav._getPref();
        if (pref) { window.GoHappyNav._openInApp(pref, latN, lngN, name, mode); return; }

        // Si no, preguntar qué navegador quiere usar
        window.GoHappyNav._showNavPicker(latN, lngN, name, mode);
    },

    // ── Selector: ¿con qué app de navegación quieres llegar? ──
    _showNavPicker: (lat, lng, name, mode) => {
        const L = window.L || ((es) => es);
        const ios = window.GoHappyNav._isIOS();
        document.getElementById('gh-nav-picker')?.remove();

        // Apple Maps solo en iOS; Google y Waze en todos
        const apps = [
            { id: 'google', icon: '🗺️', label: 'Google Maps' },
            ...(ios ? [{ id: 'apple', icon: '🧭', label: 'Apple Maps' }] : []),
            { id: 'waze', icon: '🚗', label: 'Waze' }
        ];

        const modal = document.createElement('div');
        modal.id = 'gh-nav-picker';
        modal.className = 'modal entry-anim';
        modal.style.cssText = 'z-index:9500;';
        modal.innerHTML = `
            <div class="auth-container" style="padding:20px;">
                <div class="auth-card premium-glass" style="padding:24px 20px; border-radius:30px; max-width:380px;">
                    <h3 style="text-align:center; color:var(--primary-cobalt); font-weight:900; margin:0 0 4px; font-size:1.15rem;">🚘 ${L('¿Cómo quieres llegar?', 'How do you want to get there?')}</h3>
                    <p style="text-align:center; font-size:12.5px; color:var(--text-secondary); margin:0 0 18px;">${(name || '').replace(/[<>]/g, '').slice(0, 50)}</p>
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        ${apps.map(a => `
                            <button class="gh-nav-opt" data-app="${a.id}" style="display:flex; align-items:center; gap:14px; padding:14px 16px; border:0.5px solid rgba(11,76,143,0.15); border-radius:16px; background:rgba(255,255,255,0.92); cursor:pointer; font-size:15px; font-weight:800; color:var(--primary-cobalt); text-align:left; transition:transform 0.15s;">
                                <span style="font-size:24px;">${a.icon}</span>${a.label}<span style="margin-left:auto; opacity:0.45;">→</span>
                            </button>`).join('')}
                    </div>
                    <label style="display:flex; align-items:center; gap:8px; margin-top:14px; font-size:12px; color:var(--text-secondary); cursor:pointer;">
                        <input type="checkbox" id="gh-nav-remember" style="width:16px; height:16px;"> ${L('Recordar mi elección', 'Remember my choice')}
                    </label>
                    <button class="btn-text full-width" id="gh-nav-cancel" style="margin-top:6px; padding:8px; color:var(--text-secondary); background:none; border:none; cursor:pointer;">${L('Cancelar', 'Cancel')}</button>
                </div>
            </div>`;
        document.body.appendChild(modal);

        modal.querySelector('#gh-nav-cancel').onclick = () => modal.remove();
        modal.querySelectorAll('.gh-nav-opt').forEach(b => {
            b.onclick = () => {
                const app = b.dataset.app;
                if (document.getElementById('gh-nav-remember')?.checked) {
                    try { localStorage.setItem(window.GoHappyNav._PREF_KEY, app); } catch (e) {}
                }
                modal.remove();
                window.GoHappyNav._openInApp(app, lat, lng, name, mode);
            };
        });
    },

    // ── Abrir la app elegida con las coordenadas EXACTAS del destino ──
    _openInApp: (app, lat, lng, name = '', mode = 'driving') => {
        const label = encodeURIComponent(name || 'Destino');
        if (app === 'waze') {
            window.open(`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`, '_blank', 'noopener');
            return;
        }
        if (app === 'apple') {
            const appleApp = `maps://?daddr=${lat},${lng}&q=${label}&dirflg=${mode === 'walking' ? 'w' : mode === 'transit' ? 'r' : 'd'}`;
            const fallback = `https://maps.apple.com/?daddr=${lat},${lng}&q=${label}`;
            if (window.GoHappyNav._isIOS()) window.GoHappyNav._tryOpen(appleApp, fallback);
            else window.open(fallback, '_blank', 'noopener');
            return;
        }
        // Google Maps (por defecto) — coords exactas + direcciones
        if (window.GoHappyNav._isIOS()) {
            const gApp = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=${mode}`;
            const fallback = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=${mode}`;
            window.GoHappyNav._tryOpen(gApp, fallback);
            return;
        }
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=${mode}`, '_blank', 'noopener');
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

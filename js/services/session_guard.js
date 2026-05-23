// ================================================================
// GoHappy Session Guard — Hardening de sesión cliente
// - HMAC-like integrity check del localStorage de sesión
// - Auto-logout por inactividad (30 min)
// - Sincronización de logout entre TODAS las pestañas (BroadcastChannel)
// - Detección de tampering del DOM por extensiones
// ================================================================
window.GoHappySessionGuard = (() => {

    const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;  // 30 min
    const SESSION_KEY = 'GoHappy_local_user';
    const SESSION_SIG_KEY = '__gh_sig';
    const BROADCAST_NAME = 'gh-auth-channel';

    let inactivityTimer = null;
    let broadcastChannel = null;

    // ─── Integrity: firma simple basada en SubtleCrypto SHA-256 ───
    // No es HMAC verdadero (la "clave" está en el cliente), pero ayuda a
    // detectar TAMPERING accidental o por scripts naive. Defensa en capa.
    async function sign(data) {
        try {
            const enc = new TextEncoder().encode(data + '|gh-salt-2026');
            const buf = await crypto.subtle.digest('SHA-256', enc);
            return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            // Fallback non-crypto (compat con navegadores muy viejos)
            let h = 0;
            const s = data + '|gh-salt-2026';
            for (let i = 0; i < s.length; i++) {
                h = ((h << 5) - h) + s.charCodeAt(i);
                h |= 0;
            }
            return 'fb_' + Math.abs(h).toString(36);
        }
    }

    /**
     * Guarda sesión con firma de integridad
     */
    async function saveSession(userObj) {
        if (!userObj || typeof userObj !== 'object') return;
        const raw = JSON.stringify(userObj);
        const sig = await sign(raw);
        try {
            localStorage.setItem(SESSION_KEY, raw);
            localStorage.setItem(SESSION_SIG_KEY, sig);
        } catch (e) {
            console.warn('[SessionGuard] save error:', e?.message);
        }
    }

    /**
     * Lee sesión y verifica integridad. Si fue manipulada, la limpia.
     * Retorna user object o null
     */
    async function loadSession() {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            const sig = localStorage.getItem(SESSION_SIG_KEY);
            if (!raw || !sig) return null;
            const expectedSig = await sign(raw);
            if (sig !== expectedSig) {
                console.warn('[SessionGuard] ⚠ Sesión MANIPULADA detectada — limpiando');
                localStorage.removeItem(SESSION_KEY);
                localStorage.removeItem(SESSION_SIG_KEY);
                // Forzar reload para limpiar contexto
                try { window.GoHappyToast?.error('Sesión inválida. Cerrando…', 2000); } catch (e) {}
                setTimeout(() => window.location.reload(), 1500);
                return null;
            }
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    function clearSession() {
        try {
            localStorage.removeItem(SESSION_KEY);
            localStorage.removeItem(SESSION_SIG_KEY);
        } catch (e) {}
    }

    // ─── Auto-logout por inactividad ───
    function resetInactivityTimer() {
        if (inactivityTimer) clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(() => {
            // Solo si hay sesión activa real (no guest)
            const user = window.GoHappyAuth?.checkAuth?.();
            if (user && !user.isGuest) {
                console.warn('[SessionGuard] Logout por inactividad');
                try { window.GoHappyToast?.info('🔒 Sesión cerrada por inactividad', 3000); } catch (e) {}
                setTimeout(() => {
                    if (window.GoHappyAuth?.logout) window.GoHappyAuth.logout();
                }, 1500);
            }
        }, INACTIVITY_TIMEOUT_MS);
    }

    function setupInactivityWatcher() {
        ['mousemove', 'keydown', 'touchstart', 'click', 'scroll'].forEach(evt => {
            window.addEventListener(evt, resetInactivityTimer, { passive: true });
        });
        resetInactivityTimer();
    }

    // ─── BroadcastChannel: logout sincronizado entre pestañas ───
    function setupBroadcast() {
        if (typeof BroadcastChannel === 'undefined') return;
        try {
            broadcastChannel = new BroadcastChannel(BROADCAST_NAME);
            broadcastChannel.onmessage = (event) => {
                if (event.data?.type === 'LOGOUT_ALL') {
                    console.info('[SessionGuard] Logout sincronizado desde otra pestaña');
                    clearSession();
                    setTimeout(() => window.location.reload(), 500);
                }
                if (event.data?.type === 'SESSION_HIJACK_DETECTED') {
                    console.warn('[SessionGuard] Hijack detectado en otra pestaña');
                    clearSession();
                    setTimeout(() => window.location.reload(), 500);
                }
            };
        } catch (e) {}
    }

    function broadcastLogout() {
        if (broadcastChannel) {
            try { broadcastChannel.postMessage({ type: 'LOGOUT_ALL', ts: Date.now() }); } catch (e) {}
        }
    }

    // ─── Detección de tampering del DOM (extensiones maliciosas) ───
    function detectDevToolsAccess() {
        // No bloqueamos DevTools (sería hostil al usuario legítimo) pero
        // monitoreamos cambios sospechosos en window.GoHappyAuth (suplantación)
        const originalAuth = window.GoHappyAuth;
        Object.defineProperty(window, 'GoHappyAuth', {
            configurable: false,
            writable: false,
            value: originalAuth
        });
    }

    // ─── Inicialización ───
    async function init() {
        // Verificar integridad al cargar
        const raw = localStorage.getItem(SESSION_KEY);
        const sig = localStorage.getItem(SESSION_SIG_KEY);
        if (raw && !sig) {
            // Sesión sin firma — probablemente legacy. Re-firmar.
            try {
                JSON.parse(raw);  // validar JSON
                const newSig = await sign(raw);
                localStorage.setItem(SESSION_SIG_KEY, newSig);
                console.info('[SessionGuard] Sesión legacy firmada');
            } catch (e) {
                localStorage.removeItem(SESSION_KEY);
            }
        } else if (raw && sig) {
            const expected = await sign(raw);
            if (sig !== expected) {
                console.warn('[SessionGuard] ⚠ Tampering detectado en arranque');
                clearSession();
                if (broadcastChannel) {
                    try { broadcastChannel.postMessage({ type: 'SESSION_HIJACK_DETECTED' }); } catch (e) {}
                }
            }
        }

        setupInactivityWatcher();
        setupBroadcast();

        // Proteger window.GoHappyAuth de reasignación (después de carga)
        setTimeout(() => {
            try { detectDevToolsAccess(); } catch (e) {}
        }, 2000);
    }

    return {
        init,
        saveSession,
        loadSession,
        clearSession,
        broadcastLogout,
        sign
    };
})();

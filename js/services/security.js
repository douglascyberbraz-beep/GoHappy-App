// GoHappy Security Service — v2.8.0
// Sanitización XSS, validación de inputs, rate limiting cliente
window.GoHappySecurity = (() => {

    // ─── Sanitización HTML (prevención XSS) ────────────────────────────────
    const ESC_MAP = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":"&#39;", '/':'&#47;', '`':'&#96;', '=':'&#61;' };

    const escapeHTML = (str) => {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"'`=/]/g, c => ESC_MAP[c] || c);
    };

    // Permite solo un subconjunto seguro de HTML (para posts de Tribu que usan innerHTML)
    const sanitizeUserHTML = (html) => {
        if (typeof html !== 'string') return '';
        // Strip all tags except safe ones
        const safe = html
            .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
            .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')      // event handlers
            .replace(/javascript\s*:/gi, '')                    // javascript: URLs
            .replace(/data\s*:/gi, '')                          // data: URLs
            .replace(/<iframe[\s\S]*?>/gi, '')
            .replace(/<object[\s\S]*?>/gi, '')
            .replace(/<embed[\s\S]*?>/gi, '')
            .replace(/<form[\s\S]*?>/gi, '')
            .replace(/<input[\s\S]*?>/gi, '');
        return safe;
    };

    // ─── Validación de inputs ───────────────────────────────────────────────
    const validators = {
        email: (v) => /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(v?.trim()),

        nickname: (v) => {
            if (typeof v !== 'string') return false;
            const t = v.trim();
            return t.length >= 2 && t.length <= 24 && /^[\w\s\-áéíóúñüÁÉÍÓÚÑÜ]+$/u.test(t);
        },

        name: (v) => {
            if (typeof v !== 'string') return false;
            const t = v.trim();
            return t.length >= 1 && t.length <= 50 && /^[\w\s\-'áéíóúñüÁÉÍÓÚÑÜ]+$/u.test(t);
        },

        password: (v) => typeof v === 'string' && v.length >= 6 && v.length <= 128,

        postContent: (v) => {
            if (typeof v !== 'string') return false;
            const t = v.trim();
            return t.length >= 1 && t.length <= 160;
        },

        referralCode: (v) => {
            if (!v) return true; // Opcional
            return /^GH-[A-Z0-9]{4,8}$/.test(v?.toUpperCase().trim());
        },

        coordinates: (v) => {
            if (typeof v !== 'string') return false;
            const parts = v.split(',').map(p => parseFloat(p.trim()));
            return parts.length === 2 &&
                   !isNaN(parts[0]) && parts[0] >= -90  && parts[0] <= 90 &&
                   !isNaN(parts[1]) && parts[1] >= -180 && parts[1] <= 180;
        }
    };

    // ─── Detección de intentos de inyección ────────────────────────────────
    const INJECTION_PATTERNS = [
        /<script/i, /javascript:/i, /on\w+\s*=/i,
        /SELECT\s+\*\s+FROM/i, /DROP\s+TABLE/i,        // SQL
        /\$\{.*\}/,                                      // Template injection
        /\.\.\//g,                                       // Path traversal
        /__proto__/i, /constructor\[/i                  // Prototype pollution
    ];

    const isClean = (str) => {
        if (typeof str !== 'string') return true;
        return !INJECTION_PATTERNS.some(p => p.test(str));
    };

    // ─── Rate Limiting cliente (Firestore como fuente de verdad) ───────────
    // El proxy server-side tiene el rate limiting real.
    // Este es un guard extra para reducir llamadas innecesarias.
    const _localRateLimits = {};

    const checkLocalRateLimit = (action, maxPerMinute = 10) => {
        const now = Date.now();
        if (!_localRateLimits[action]) _localRateLimits[action] = [];

        // Limpiar entradas viejas
        _localRateLimits[action] = _localRateLimits[action].filter(t => now - t < 60000);

        if (_localRateLimits[action].length >= maxPerMinute) {
            return false;
        }
        _localRateLimits[action].push(now);
        return true;
    };

    // ─── Content Security Policy — reportar violaciones ────────────────────
    if (typeof document !== 'undefined') {
        document.addEventListener('securitypolicyviolation', (e) => {
            console.warn('[GoHappy Security] CSP violation:', {
                directive: e.violatedDirective,
                blockedURI: e.blockedURI
            });
        });
    }

    // ─── Protección de sesión ───────────────────────────────────────────────
    const SESSION_KEY = 'GoHappy_local_user';

    const validateStoredSession = () => {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            // Verificar que tenga los campos mínimos esperados
            if (!parsed.uid || typeof parsed.uid !== 'string') {
                localStorage.removeItem(SESSION_KEY);
                return null;
            }
            // Verificar que el uid no sea manipulado (no tiene caracteres extraños)
            if (!/^[a-zA-Z0-9\-_]{1,128}$/.test(parsed.uid)) {
                localStorage.removeItem(SESSION_KEY);
                return null;
            }
            return parsed;
        } catch (e) {
            localStorage.removeItem(SESSION_KEY);
            return null;
        }
    };

    // ─── API pública ────────────────────────────────────────────────────────
    return {
        escapeHTML,
        sanitizeUserHTML,
        validate: validators,
        isClean,
        checkLocalRateLimit,
        validateStoredSession,

        // Sanitizar antes de mostrar contenido de usuario
        safe: (str) => escapeHTML(String(str || '')),

        // Sanitizar posts de Tribu (permite <strong> y <br> pero nada más)
        safePost: (html) => {
            const clean = sanitizeUserHTML(html);
            // Solo permite strong, b, br, em, i
            return clean.replace(/<(?!\/?(?:strong|b|br|em|i)\b)[^>]*>/gi, '');
        }
    };
})();

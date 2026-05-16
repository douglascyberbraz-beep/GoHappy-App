// ================================================================
// GoHappy Family Context — Memoria compartida del usuario
// Todo el app (Today, Care, Moments, Quests, Map) lee y escribe aquí.
// Esto convierte la app en un asistente PERSONAL contextual.
// ================================================================
window.GoHappyContext = {

    LOCAL_KEY: 'GoHappy_family_context_v1',
    _cache: null,
    _loaded: false,

    // Schema inicial vacío
    _empty: () => ({
        version: 1,
        childrenAges: [],            // ej [3, 7]
        interests: [],               // tags: ['nature', 'museums', 'sports']
        recentChallenges: [],        // últimos challenges discutidos en Care
        recentActivities: [],        // últimas acciones (quests, planes, reseñas)
        preferences: {               // de Today questionnaire
            environment: null,       // 'outdoor' | 'indoor' | 'both'
            budget: null,            // 'free' | 'any'
            distance: null           // 'walking' | 'shortDrive' | 'any'
        },
        insights: {                  // computed insights
            likesNature: false,
            likesMuseums: false,
            likesSports: false,
            challengingHours: null,
            bestDayOfWeek: null
        },
        stats: {
            questsCompleted: 0,
            momentsShared: 0,
            placesReviewed: 0,
            careConsultations: 0
        },
        updatedAt: Date.now()
    }),

    // Carga inicial: localStorage primero, luego Firestore si hay user
    load: async () => {
        if (window.GoHappyContext._loaded) return window.GoHappyContext._cache;

        // 1. Local primero (rápido)
        try {
            const raw = localStorage.getItem(window.GoHappyContext.LOCAL_KEY);
            if (raw) window.GoHappyContext._cache = JSON.parse(raw);
        } catch (e) {}

        if (!window.GoHappyContext._cache) {
            window.GoHappyContext._cache = window.GoHappyContext._empty();
        }

        // 2. Firestore en background (sync si más reciente)
        const user = window.GoHappyAuth?.checkAuth?.();
        if (user && !user.isGuest && window.GoHappyDB) {
            try {
                const doc = await window.GoHappyDB
                    .collection('users').doc(user.uid)
                    .collection('private').doc('family_context')
                    .get();
                if (doc.exists) {
                    const remote = doc.data();
                    if (remote.updatedAt > (window.GoHappyContext._cache.updatedAt || 0)) {
                        window.GoHappyContext._cache = remote;
                        try { localStorage.setItem(window.GoHappyContext.LOCAL_KEY, JSON.stringify(remote)); } catch (e) {}
                    }
                }
            } catch (e) {
                console.warn('[Context] Firestore load fallback:', e?.message);
            }
        }

        window.GoHappyContext._loaded = true;
        return window.GoHappyContext._cache;
    },

    // Guarda en localStorage siempre + Firestore si hay user (debounced)
    _saveTimer: null,
    save: () => {
        if (!window.GoHappyContext._cache) return;
        window.GoHappyContext._cache.updatedAt = Date.now();
        try {
            localStorage.setItem(window.GoHappyContext.LOCAL_KEY, JSON.stringify(window.GoHappyContext._cache));
        } catch (e) {}

        // Debounce 2s para Firestore (evitar writes excesivos)
        if (window.GoHappyContext._saveTimer) clearTimeout(window.GoHappyContext._saveTimer);
        window.GoHappyContext._saveTimer = setTimeout(async () => {
            const user = window.GoHappyAuth?.checkAuth?.();
            if (!user || user.isGuest || !window.GoHappyDB) return;
            try {
                await window.GoHappyDB
                    .collection('users').doc(user.uid)
                    .collection('private').doc('family_context')
                    .set(window.GoHappyContext._cache, { merge: true });
            } catch (e) {
                console.warn('[Context] Firestore save error:', e?.message);
            }
        }, 2000);
    },

    // Lectura sincrona del cache
    get: () => window.GoHappyContext._cache || window.GoHappyContext._empty(),

    // Actualizar campos puntuales (merge)
    update: (patch) => {
        if (!window.GoHappyContext._cache) window.GoHappyContext._cache = window.GoHappyContext._empty();
        Object.keys(patch).forEach(key => {
            if (typeof patch[key] === 'object' && !Array.isArray(patch[key]) && patch[key] !== null) {
                window.GoHappyContext._cache[key] = { ...(window.GoHappyContext._cache[key] || {}), ...patch[key] };
            } else {
                window.GoHappyContext._cache[key] = patch[key];
            }
        });
        window.GoHappyContext.save();
    },

    // Añade un "challenge" detectado en Care (ej: rabietas)
    addChallenge: (tag, context = '') => {
        if (!window.GoHappyContext._cache) window.GoHappyContext._cache = window.GoHappyContext._empty();
        const list = window.GoHappyContext._cache.recentChallenges || [];
        // Quitar previos del mismo tag (mantenemos solo el más reciente)
        const filtered = list.filter(c => c.tag !== tag);
        filtered.unshift({ tag, context: String(context).slice(0, 140), ts: Date.now() });
        window.GoHappyContext._cache.recentChallenges = filtered.slice(0, 5); // máx 5
        window.GoHappyContext._cache.stats.careConsultations = (window.GoHappyContext._cache.stats.careConsultations || 0) + 1;
        window.GoHappyContext.save();
    },

    // Añade actividad reciente (quest completada, plan visitado, etc)
    addActivity: (type, detail = {}) => {
        if (!window.GoHappyContext._cache) window.GoHappyContext._cache = window.GoHappyContext._empty();
        const list = window.GoHappyContext._cache.recentActivities || [];
        list.unshift({ type, ...detail, ts: Date.now() });
        window.GoHappyContext._cache.recentActivities = list.slice(0, 10); // máx 10
        // Estadística rápida
        if (type === 'quest_completed')  window.GoHappyContext._cache.stats.questsCompleted++;
        if (type === 'moment_shared')    window.GoHappyContext._cache.stats.momentsShared++;
        if (type === 'place_reviewed')   window.GoHappyContext._cache.stats.placesReviewed++;
        window.GoHappyContext.save();
    },

    // Añade intereses detectados (de captions de Moments, reseñas, etc)
    addInterest: (tag) => {
        if (!tag || typeof tag !== 'string') return;
        if (!window.GoHappyContext._cache) window.GoHappyContext._cache = window.GoHappyContext._empty();
        const list = window.GoHappyContext._cache.interests || [];
        if (list.includes(tag)) {
            // Moverlo al inicio si ya existe
            const idx = list.indexOf(tag);
            list.splice(idx, 1);
        }
        list.unshift(tag);
        window.GoHappyContext._cache.interests = list.slice(0, 10);
        window.GoHappyContext.save();
    },

    // Set edades hijos (cuando se rellena questionnaire de Today)
    setChildrenAges: (agesText) => {
        if (!window.GoHappyContext._cache) window.GoHappyContext._cache = window.GoHappyContext._empty();
        const nums = String(agesText || '').match(/\d{1,2}/g)?.map(n => parseInt(n, 10)).filter(n => n >= 0 && n <= 18) || [];
        window.GoHappyContext._cache.childrenAges = nums.slice(0, 6);
        window.GoHappyContext.save();
    },

    // Devuelve resumen COMPACTO para inyectar en prompts IA
    summary: () => {
        const c = window.GoHappyContext._cache;
        if (!c) return null;
        const summary = {};
        if (c.childrenAges?.length) summary.childrenAges = c.childrenAges;
        if (c.interests?.length)    summary.interests = c.interests.slice(0, 5);
        if (c.recentChallenges?.length) {
            // Solo los de las últimas 72h
            const recent = c.recentChallenges.filter(ch => Date.now() - ch.ts < 72 * 3600 * 1000);
            if (recent.length) summary.recentConcerns = recent.slice(0, 3).map(r => ({ tag: r.tag, context: r.context }));
        }
        if (c.preferences && Object.values(c.preferences).some(v => v)) {
            summary.preferences = c.preferences;
        }
        if (c.recentActivities?.length) {
            const lastVisited = c.recentActivities
                .filter(a => a.place)
                .slice(0, 3)
                .map(a => a.place);
            if (lastVisited.length) summary.recentlyVisited = lastVisited;
        }
        return Object.keys(summary).length ? summary : null;
    },

    // Obtiene el insight MÁS RECIENTE (último 12h) para banner contextual
    latestInsight: () => {
        const c = window.GoHappyContext._cache;
        if (!c?.recentChallenges?.length) return null;
        const latest = c.recentChallenges[0];
        if (Date.now() - latest.ts > 12 * 3600 * 1000) return null;  // > 12h
        return latest;
    },

    // RESET (debug o privacidad)
    clear: async () => {
        window.GoHappyContext._cache = window.GoHappyContext._empty();
        try { localStorage.removeItem(window.GoHappyContext.LOCAL_KEY); } catch (e) {}
        const user = window.GoHappyAuth?.checkAuth?.();
        if (user && !user.isGuest && window.GoHappyDB) {
            try {
                await window.GoHappyDB.collection('users').doc(user.uid)
                    .collection('private').doc('family_context').delete();
            } catch (e) {}
        }
    }
};

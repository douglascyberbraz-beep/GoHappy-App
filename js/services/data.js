// ------------------------------------------------------------------
// GoHappyData - Firestore Service (100% datos REALES)
// Sin datos pre-cargados ni demos. Si una fuente no responde, devuelve [].
// ------------------------------------------------------------------
window.GoHappyData = {

    // -- LOCATIONS --
    // Sin seed pre-cargado: el mapa pinta lo que aporta la comunidad
    // (reviews reales en Firestore) y Gemini en vivo.
    getLocations: async (coords = "41.6520, -4.7286") => {
        // 1. Intentar leer reseñas reales de la comunidad
        try {
            const snap = await window.GoHappyDB.collection('reviews')
                .orderBy('createdAt', 'desc')
                .limit(50)
                .get();

            if (!snap.empty) {
                const community = snap.docs.map(d => {
                    const r = d.data();
                    return {
                        id:          d.id,
                        name:        r.siteName || 'Sitio',
                        type:        r.type || 'community',
                        lat:         r.lat,
                        lng:         r.lng,
                        rating:      r.rating || 4.5,
                        isCommunity: true,
                        reviewedBy:  r.userName || 'Familia GoHappy'
                    };
                }).filter(p => typeof p.lat === 'number' && typeof p.lng === 'number');

                // En background, enriquecer con IA (no bloquea UI)
                if (window.GEMINI_PROXY_ACTIVE && window.GoHappyAI?.getDynamicLocations) {
                    window.GoHappyAI.getDynamicLocations(coords)
                        .then(extra => {
                            if (!extra?.length) return;
                            const known = new Set(community.map(s => s.name));
                            extra.filter(e => !known.has(e.name)).forEach(loc => {
                                if (window.GoHappyMap?.createMarker) {
                                    window.GoHappyMap.createMarker(loc);
                                }
                            });
                        }).catch(() => {});
                }

                if (community.length > 0) return community;
            }
        } catch (e) {
            console.warn("[Data] reviews fetch fallback:", e?.message);
        }

        // 2. Sin reseñas todavía → pedir a Gemini sitios reales
        try {
            if (window.GEMINI_PROXY_ACTIVE && window.GoHappyAI?.getDynamicLocations) {
                const dynamic = await window.GoHappyAI.getDynamicLocations(coords);
                if (dynamic?.length) return dynamic;
            }
        } catch (e) {
            console.warn("[Data] Gemini locations fallback:", e?.message);
        }

        // 3. Sin nada → array vacío (la UI muestra "todavía sin sitios cerca")
        return [];
    },

    searchLocations: async (query, coords = "41.6520, -4.7286") => {
        try {
            if (window.GEMINI_PROXY_ACTIVE && window.GoHappyAI?.searchDynamicLocations) {
                return await window.GoHappyAI.searchDynamicLocations(query, coords);
            }
        } catch (e) {
            console.warn("[Data] AI search fallback:", e?.message);
        }
        return [];
    },

    // -- NEWS --
    getNews: async (coords) => {
        try {
            if (window.GEMINI_PROXY_ACTIVE && window.GoHappyAI?.getNews) {
                const news = await window.GoHappyAI.getNews(coords);
                if (news?.length) return news;
            }
            const snap = await window.GoHappyDB.collection('news').limit(10).get();
            if (!snap.empty) return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.warn("[Data] news fallback:", e?.message);
        }
        return []; // sin demos
    },

    // -- EVENTS --
    getEvents: async (coords) => {
        try {
            if (window.GEMINI_PROXY_ACTIVE && window.GoHappyAI?.getEvents) {
                const events = await window.GoHappyAI.getEvents(coords);
                if (events?.length) return events;
            }
            const snap = await window.GoHappyDB.collection('events').limit(10).get();
            if (!snap.empty) return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.warn("[Data] events fallback:", e?.message);
        }
        return []; // sin demos
    },

    // -- BECAS / AYUDAS --
    getBecas: async (coords) => {
        try {
            if (window.GEMINI_PROXY_ACTIVE && window.GoHappyAI?.getBecas) {
                const becas = await window.GoHappyAI.getBecas(coords);
                if (becas?.length) return becas;
            }
        } catch (e) {
            console.warn("[Data] becas fallback:", e?.message);
        }
        return []; // sin demos
    },

    // -- TRIBU POSTS --
    getTribuPosts: async () => {
        try {
            const snap = await window.GoHappyDB.collection('posts')
                .orderBy('createdAt', 'desc')
                .limit(20)
                .get();
            if (!snap.empty) return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.warn("[Data] tribu fallback:", e?.message);
        }
        return []; // sin demos
    },

    addTribuPost: async (content, user) => {
        const cleanContent = (content || '').trim().slice(0, 280);
        if (!cleanContent) throw new Error('El mensaje está vacío.');
        // Detectar HTML que la rule rechaza
        if (/[<>]/.test(cleanContent)) {
            throw new Error('No uses los caracteres < o > en tu mensaje.');
        }
        const post = {
            userId:    user.uid,
            user:      user.nickname || "Anónimo",
            avatar:    (user.photo && user.photo.startsWith('data:') && user.photo.length > 100) ? '👤' : (user.photo || "👤"),
            content:   cleanContent,
            likes:     0,
            comments:  0,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        try {
            await window.GoHappyDB.collection('posts').add(post);
            return true;
        } catch (e) {
            console.error("[Data] post error:", e?.code, e?.message);
            if (e?.code === 'permission-denied') {
                throw new Error('Permiso denegado. Verifica que tu cuenta NO es anónima/invitado.');
            }
            if (e?.code === 'unavailable') {
                throw new Error('Sin conexión a Firestore. Comprueba tu internet.');
            }
            throw new Error('Error al publicar: ' + (e?.message || e?.code || 'desconocido'));
        }
    },

    getTodayActivities: async (coords, preferences = null) => {
        try {
            if (window.GEMINI_PROXY_ACTIVE && window.GoHappyAI?.getTodayActivities) {
                const acts = await window.GoHappyAI.getTodayActivities(coords, preferences);
                if (acts?.length) return acts;
            }
        } catch (e) {
            console.warn("[Data] today fallback:", e?.message);
        }
        return []; // sin demos
    },

    // -- RANKING / CONTRIBUTORS --
    getContributors: async () => {
        try {
            const snap = await window.GoHappyDB.collection('users')
                .orderBy('weeklyPoints', 'desc')
                .limit(10)
                .get();
            if (!snap.empty) {
                return snap.docs.map(d => {
                    const data = d.data();
                    const name = data.nickname ||
                        (data.name
                            ? data.name.split(' ')[0] + ' ' + (data.name.split(' ')[1] ? data.name.split(' ')[1][0] + '.' : '')
                            : "Explorador");
                    const photo = (data.photo && data.photo.startsWith('data:') && data.photo.length > 100) ? '👤' : (data.photo || '👤');
                    return {
                        name:          name,
                        points:        data.weeklyPoints || data.points || 0,
                        rank:          data.level || "Explorador",
                        contributions: data.contributions || 0,
                        role:          "🎖️",
                        avatar:        photo
                    };
                });
            }
        } catch (e) {
            console.warn("[Data] contributors fallback:", e?.message);
        }
        return []; // sin demos
    }
};

// ------------------------------------------------------------------
// GoHappyData - Firestore Service (con fallback a datos estáticos)
// ------------------------------------------------------------------
window.GoHappyData = {

    // -- LOCATIONS --
    // Estrategia: SEED estático local (instantáneo, ~50 POIs reales) + IA opcional para enriquecer
    getLocations: async (coords = "41.6520, -4.7286") => {
        // 1. Cargar SIEMPRE el seed pre-cargado (instantáneo, sin red)
        const seed = window.GoHappyPOISeed || [];

        // 2. Filtrar por proximidad geográfica (~50km del usuario)
        const [userLat, userLng] = coords.split(',').map(s => parseFloat(s.trim()));
        const nearbySeed = seed
            .map(p => ({ ...p, _dist: Math.sqrt(Math.pow(p.lat - userLat, 2) + Math.pow(p.lng - userLng, 2)) }))
            .sort((a, b) => a._dist - b._dist)
            .filter(p => p._dist < 0.8) // ~50-80km
            .slice(0, 20);

        // Si hay POIs cerca, devolverlos inmediatamente
        if (nearbySeed.length >= 5) {
            // En background, intentar enriquecer con IA (no bloquea UI)
            if (window.GEMINI_PROXY_ACTIVE && window.GoHappyAI) {
                window.GoHappyAI.getDynamicLocations(coords)
                    .then(extra => {
                        if (extra?.length) {
                            const seedNames = new Set(nearbySeed.map(s => s.name));
                            const newOnes = extra.filter(e => !seedNames.has(e.name));
                            if (newOnes.length && window.GoHappyMap?.instance) {
                                newOnes.forEach(loc => window.GoHappyMap.createMarker(loc));
                            }
                        }
                    }).catch(() => {});
            }
            return nearbySeed;
        }

        // Si no hay nada cerca (usuario en otra zona), pedir a la IA
        try {
            if (window.GEMINI_PROXY_ACTIVE) {
                const dynamicLocs = await window.GoHappyAI.getDynamicLocations(coords);
                if (dynamicLocs?.length) return dynamicLocs;
            }
            const snap = await window.GoHappyDB.collection('locations').get();
            if (!snap.empty) return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.warn("getLocations fallback:", e);
        }

        // Último fallback: devolver TODO el seed (mejor que vacío)
        return seed.slice(0, 15);
    },

    searchLocations: async (query, coords = "41.6520, -4.7286") => {
        try {
            if (window.GEMINI_PROXY_ACTIVE) {
                return await window.GoHappyAI.searchDynamicLocations(query, coords);
            }
        } catch (e) {
            console.warn("AI searchLocations fallback:", e);
        }
        return []; // Empty means fallback to local filtering in UI
    },

    // -- NEWS --
    getNews: async (coords) => {
        try {
            if (window.GEMINI_PROXY_ACTIVE) {
                return await window.GoHappyAI.getNews(coords);
            }
            const snap = await window.GoHappyDB.collection('news').limit(10).get();
            if (!snap.empty) {
                return snap.docs.map(d => ({ id: d.id, ...d.data() }));
            }
        } catch (e) {
            console.warn("Firestore/AI getNews fallback:", e);
        }
        // Fallback estático real
        return [
            { id: 1, title: "Nuevas ayudas a la Conciliación JCYL", summary: "La Junta de Castilla y León anuncia el programa de apoyo para familias con niños menores de 3 años.", sourceName: "Junta de Castilla y León", link: "#", date: "Hace 2 horas" },
            { id: 2, title: "Valladolid amplía carriles bici escolares", summary: "Mejora de seguridad en accesos a centros educativos del barrio de Parquesol.", sourceName: "Ayuntamiento de Valladolid", link: "#", date: "Hace 5 horas" }
        ];
    },

    // -- EVENTS --
    getEvents: async (coords) => {
        try {
            if (window.GEMINI_PROXY_ACTIVE) {
                return await window.GoHappyAI.getEvents(coords);
            }
            const snap = await window.GoHappyDB.collection('events').limit(10).get();
            if (!snap.empty) {
                return snap.docs.map(d => ({ id: d.id, ...d.data() }));
            }
        } catch (e) {
            console.warn("Firestore/AI getEvents fallback:", e);
        }
        // Fallback estático
        return [
            { id: 1, title: "Titirimundi 2025: Avance", date: "Sábado, 15 Mar - 11:00", location: "Plaza Mayor de Segovia", price: "Gratis", link: "#" },
            { id: 2, title: "Taller 'Pequeños Evolucionadores'", date: "Domingo, 16 Mar - 12:30", location: "Museo Evolución Humana, Burgos", price: "5€", link: "#" }
        ];
    },

    // -- BECAS --
    getBecas: async (coords) => {
        try {
            if (window.GEMINI_PROXY_ACTIVE) {
                return await window.GoHappyAI.getBecas(coords);
            }
        } catch (e) {
            console.warn("AI getBecas fallback:", e);
        }
        // Fallback estático
        return [
            { title: "Ayudas para Comedor Escolar 2026", description: "Plazo abierto hasta el 30 de Mayo de 2026. Disponible para Centros Públicos y Concertados.", status: "PLAZO ABIERTO", statusColor: "#27AE60", linkText: "Bases y Solicitud" },
            { title: "Jornadas de Puertas Abiertas (Escuelas Infantiles)", description: "Consulta el calendario de visitas para el próximo curso escolar en tu ciudad.", status: "PRÓXIMAMENTE", statusColor: "#F39C12", linkText: "Ver centros" }
        ];
    },

    // -- TRIBU POSTS --
    getTribuPosts: async () => {
        try {
            const snap = await window.GoHappyDB.collection('posts').orderBy('createdAt', 'desc').limit(20).get();
            if (!snap.empty) {
                return snap.docs.map(d => ({ id: d.id, ...d.data() }));
            }
        } catch (e) {
            console.warn("Firestore getTribuPosts fallback:", e);
        }
        // Fallback estático
        return [
            { id: 1, user: "Marta S.", avatar: "👩‍🦰", time: "Hace 20 min", content: "¿Vais a ir al Titirimundi este año? 🎭", likes: 8, comments: 3 },
            { id: 2, user: "Jorge L.", avatar: "🧔", time: "Hace 1h", content: "¡Increíble la visita a Atapuerca! 🦣", likes: 31, comments: 2 }
        ];
    },

    // Añadir un nuevo post a Firestore
    addTribuPost: async (content, user) => {
        try {
            const cleanContent = (content || '').trim().slice(0, 280);
            if (!cleanContent) return false;
            const post = {
                userId:    user.uid,
                user:      user.nickname || "Anónimo",
                avatar:    user.photo || "👤",
                content:   cleanContent,
                likes:     0,
                comments:  0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            await window.GoHappyDB.collection('posts').add(post);
            return true;
        } catch (e) {
            console.error("Error añadiendo post:", e);
            return false;
        }
    },

    getTodayActivities: async (coords, preferences = null) => {
        try {
            if (window.GEMINI_PROXY_ACTIVE) {
                return await window.GoHappyAI.getTodayActivities(coords, preferences);
            }
        } catch (e) {
            console.warn("AI getTodayActivities fallback:", e);
        }
        return [
            { id: 1, title: "Tarde de Cuentacuentos", summary: "Disfruta de una tarde mágica con historias increíbles.", time: "17:30 - 19:00", location: "Biblioteca Municipal", lat: 41.6525, lng: -4.7245, price: "Gratis", age: "3-8 años" },
            { id: 2, title: "Taller de Robótica LEGO", summary: "Construye y programa tus primeros robots.", time: "18:00 - 20:00", location: "Centro Joven", lat: 41.6420, lng: -4.7350, price: "12€", age: "8-12 años" }
        ];
    },

    // -- RANKING / CONTRIBUTORS --
    getContributors: async () => {
        try {
            const snap = await window.GoHappyDB.collection('users').orderBy('weeklyPoints', 'desc').limit(10).get();
            if (!snap.empty) {
                return snap.docs.map(d => {
                    const data = d.data();
                    const name = data.nickname || (data.name ? data.name.split(' ')[0] + ' ' + (data.name.split(' ')[1] ? data.name.split(' ')[1][0] + '.' : '') : "Explorador");
                    return {
                        name: name,
                        points: data.weeklyPoints || data.points || 0,
                        rank: data.level || "Explorador",
                        contributions: data.contributions || 0,
                        role: "🎖️",
                        avatar: data.photo || '👤'
                    };
                });
            }
        } catch (e) {
            console.warn("Firestore getContributors fallback:", e);
        }
        // Fallback estático con nombres protegidos
        return [
            { name: "Elena R.", points: 1250, rank: "Maestro GoHappy", contributions: 45, role: "🥇 Top" },
            { name: "Carlos R.", points: 980, rank: "Guía Tribu", contributions: 32, role: "🥈 Pro" },
            { name: "Marta S.", points: 750, rank: "Guía Tribu", contributions: 28, role: "🥉 Social" },
            { name: "Javier L.", points: 420, rank: "Explorador", contributions: 15, role: "🎖️ Activo" }
        ];
    }
};


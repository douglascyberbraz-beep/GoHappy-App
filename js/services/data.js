// ------------------------------------------------------------------
// KidoaData - Firestore Service (con fallback a datos estáticos)
// ------------------------------------------------------------------
window.KidoaData = {

    // -- LOCATIONS --
    getLocations: async (coords = "41.6520, -4.7286") => {
        try {
            // Priority: Dynamic AI Generation
            if (window.GEMINI_KEY && !window.GEMINI_KEY.includes('PEGAR_AQUI')) {
                const dynamicLocs = await window.KidoaAI.getDynamicLocations(coords);
                if (dynamicLocs && dynamicLocs.length > 0) return dynamicLocs;
            }

            // Fallback: Firestore
            const snap = await window.KidoaDB.collection('locations').get();
            if (!snap.empty) {
                return snap.docs.map(d => ({ id: d.id, ...d.data() }));
            }
        } catch (e) {
            console.warn("AI/Firestore getLocations fallback:", e);
        }
        // Fallback: Default Static (Real locations in Valladolid/Castilla)
        return [
            { id: 101, name: "Parque Campo Grande", type: "park", lat: 41.6444, lng: -4.7303, rating: 4.8, reviews: 245, image: "https://images.unsplash.com/photo-1596431718100-33671233075c?auto=format&fit=crop&w=400" },
            { id: 102, name: "Museo de la Ciencia de Valladolid", type: "museum", lat: 41.6385, lng: -4.7431, rating: 4.6, reviews: 189, image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400" },
            { id: 103, name: "Parque Ribera de Castilla", type: "park", lat: 41.6620, lng: -4.7250, rating: 4.7, reviews: 312, image: "https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=400" }
        ];
    },

    searchLocations: async (query, coords = "41.6520, -4.7286") => {
        try {
            if (window.GEMINI_KEY && !window.GEMINI_KEY.includes('PEGAR_AQUI')) {
                return await window.KidoaAI.searchDynamicLocations(query, coords);
            }
        } catch (e) {
            console.warn("AI searchLocations fallback:", e);
        }
        return []; // Empty means fallback to local filtering in UI
    },

    // -- NEWS --
    getNews: async (coords) => {
        try {
            if (window.GEMINI_KEY && !window.GEMINI_KEY.includes('PEGAR_AQUI')) {
                return await window.KidoaAI.getNews(coords);
            }
            const snap = await window.KidoaDB.collection('news').orderBy('date', 'desc').limit(10).get();
            if (!snap.empty) {
                return snap.docs.map(d => ({ id: d.id, ...d.data() }));
            }
        } catch (e) {
            console.warn("Firestore/AI getNews fallback:", e);
        }
        // Fallback estático real
        return [
            { id: 1, title: "Nuevas ayudas a la Conciliación JCYL", summary: "La Junta de Castilla y León anuncia el programa de apoyo para familias con niños menores de 3 años.", source: "Junta de Castilla y León", date: "Hace 2 horas" },
            { id: 2, title: "Valladolid amplía carriles bici escolares", summary: "Mejora de seguridad en accesos a centros educativos del barrio de Parquesol.", source: "Ayuntamiento de Valladolid", date: "Hace 5 horas" }
        ];
    },

    // -- EVENTS --
    getEvents: async (coords) => {
        try {
            if (window.GEMINI_KEY && !window.GEMINI_KEY.includes('PEGAR_AQUI')) {
                return await window.KidoaAI.getEvents(coords);
            }
            const snap = await window.KidoaDB.collection('events').orderBy('date', 'asc').limit(10).get();
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
            if (window.GEMINI_KEY && !window.GEMINI_KEY.includes('PEGAR_AQUI')) {
                return await window.KidoaAI.getBecas(coords);
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
            const snap = await window.KidoaDB.collection('posts').orderBy('createdAt', 'desc').limit(20).get();
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
            const post = {
                user: user.nickname || "Anónimo",
                avatar: user.photo || "👤",
                content,
                likes: 0,
                comments: 0,
                createdAt: new Date()
            };
            await window.KidoaDB.collection('posts').add(post);
            return true;
        } catch (e) {
            console.error("Error añadiendo post:", e);
            return false;
        }
    },

    getTodayActivities: async (coords, preferences = null) => {
        try {
            if (window.GEMINI_KEY && !window.GEMINI_KEY.includes('PEGAR_AQUI')) {
                return await window.KidoaAI.getTodayActivities(coords, preferences);
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
            const snap = await window.KidoaDB.collection('users').orderBy('points', 'desc').limit(10).get();
            if (!snap.empty) {
                return snap.docs.map(d => {
                    const data = d.data();
                    return {
                        name: data.nickname || "Desconocido",
                        points: data.points || 0,
                        rank: data.level || "Explorador",
                        contributions: data.contributions || 0,
                        role: "🎖️"
                    };
                });
            }
        } catch (e) {
            console.warn("Firestore getContributors fallback:", e);
        }
        // Fallback estático
        return [
            { name: "Elena Ramos", points: 1250, rank: "Maestro Kidoa", contributions: 45, role: "🥇 Top" },
            { name: "Carlos Ruiz", points: 980, rank: "Guía Tribu", contributions: 32, role: "🥈 Pro" },
            { name: "Marta Sanz", points: 750, rank: "Guía Tribu", contributions: 28, role: "🥉 Social" },
            { name: "Javier López", points: 420, rank: "Explorador", contributions: 15, role: "🎖️ Activo" }
        ];
    }
};

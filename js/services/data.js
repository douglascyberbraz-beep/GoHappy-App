// ------------------------------------------------------------------
// KindrData - Firestore Service (con fallback a datos estáticos)
// ------------------------------------------------------------------
window.KindrData = {

    // -- LOCATIONS --
    getLocations: async () => {
        try {
            const snap = await window.KindrDB.collection('locations').get();
            if (!snap.empty) {
                return snap.docs.map(d => ({ id: d.id, ...d.data() }));
            }
        } catch (e) {
            console.warn("Firestore getLocations fallback:", e);
        }
        // Fallback estático ENRIQUECIDO
        return [
            { id: 101, name: "Campo Grande", type: "park", lat: 41.6444, lng: -4.7303, rating: 4.8, reviews: 245, image: "https://images.unsplash.com/photo-1596431718100-33671233075c?auto=format&fit=crop&w=400" },
            { id: 102, name: "Museo de la Ciencia", type: "museum", lat: 41.6385, lng: -4.7431, rating: 4.6, reviews: 189, image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400" },
            { id: 103, name: "Parque Ribera de Castilla", type: "park", lat: 41.6661, lng: -4.7171, rating: 4.3, reviews: 92 },
            { id: 301, name: "Escuela Infantil Municipal 'Fantasía'", type: "school", lat: 41.6580, lng: -4.7250, rating: 4.9, reviews: 42 },
            { id: 302, name: "CEIP Miguel de Cervantes", type: "school", lat: 41.6410, lng: -4.7180, rating: 4.7, reviews: 156 },
            { id: 401, name: "Teatro Calderón (Sesión Infantil)", type: "theater", lat: 41.6545, lng: -4.7265, rating: 4.8, reviews: 310 },
            { id: 402, name: "Cines Broadway (Kids)", type: "cinema", lat: 41.6480, lng: -4.7320, rating: 4.5, reviews: 88 },
            { id: 501, name: "Zona Infantil Plaza Mayor", type: "kidzone", lat: 41.6525, lng: -4.7285, rating: 4.6, reviews: 520 },
            { id: 502, name: "Ludoteca 'El Recreo'", type: "kidzone", lat: 41.6595, lng: -4.7380, rating: 4.7, reviews: 75 },
            { id: 104, name: "Pizza y Come (Kid Friendly)", type: "food", lat: 41.6525, lng: -4.7280, rating: 4.5, reviews: 56 },
            { id: 105, name: "Ludoteca Arco Iris", type: "kidzone", lat: 41.6492, lng: -4.7350, rating: 4.7, reviews: 34 }
        ];
    },

    // -- NEWS --
    getNews: async () => {
        try {
            const snap = await window.KindrDB.collection('news').orderBy('date', 'desc').limit(10).get();
            if (!snap.empty) {
                return snap.docs.map(d => ({ id: d.id, ...d.data() }));
            }
        } catch (e) {
            console.warn("Firestore getNews fallback:", e);
        }
        // Fallback estático
        return [
            { id: 1, title: "Ayudas Junta CyL: Conciliación 2025", summary: "La Junta de Castilla y León abre el plazo para las ayudas directas a la conciliación familiar.", source: "Junta de Castilla y León", date: "Hace 2 horas" },
            { id: 2, title: "Nueva ludoteca en Valladolid", summary: "Inaugurada la mayor ludoteca municipal en el barrio de Parquesol.", source: "Ayuntamiento de Valladolid", date: "Hace 5 horas" }
        ];
    },

    // -- EVENTS --
    getEvents: async () => {
        try {
            const snap = await window.KindrDB.collection('events').orderBy('date', 'asc').limit(10).get();
            if (!snap.empty) {
                return snap.docs.map(d => ({ id: d.id, ...d.data() }));
            }
        } catch (e) {
            console.warn("Firestore getEvents fallback:", e);
        }
        // Fallback estático
        return [
            { id: 1, title: "Titirimundi 2025: Avance", date: "Sábado, 15 Mar - 11:00", location: "Plaza Mayor de Segovia", price: "Gratis", link: "#" },
            { id: 2, title: "Taller 'Pequeños Evolucionadores'", date: "Domingo, 16 Mar - 12:30", location: "Museo Evolución Humana, Burgos", price: "5€", link: "#" }
        ];
    },

    // -- TRIBU POSTS --
    getTribuPosts: async () => {
        try {
            const snap = await window.KindrDB.collection('posts').orderBy('createdAt', 'desc').limit(20).get();
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
            await window.KindrDB.collection('posts').add(post);
            return true;
        } catch (e) {
            console.error("Error añadiendo post:", e);
            return false;
        }
    },

    // -- RANKING / CONTRIBUTORS --
    getContributors: async () => {
        try {
            const snap = await window.KindrDB.collection('users').orderBy('points', 'desc').limit(10).get();
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
            { name: "Elena Ramos", points: 1250, rank: "Maestro Kindr", contributions: 45, role: "🥇 Top" },
            { name: "Carlos Ruiz", points: 980, rank: "Guía Tribu", contributions: 32, role: "🥈 Pro" },
            { name: "Marta Sanz", points: 750, rank: "Guía Tribu", contributions: 28, role: "🥉 Social" },
            { name: "Javier López", points: 420, rank: "Explorador", contributions: 15, role: "🎖️ Activo" }
        ];
    }
};

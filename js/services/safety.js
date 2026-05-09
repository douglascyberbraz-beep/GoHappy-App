// ------------------------------------------------------------------
// GoHappySafe - Safety Alerts Service
// ------------------------------------------------------------------
window.GoHappySafe = {

    ALERT_TYPES: {
        DANGER: { icon: '🚨', label: 'Peligro', color: '#E74C3C' },
        CONSTRUCTION: { icon: '🚧', label: 'Obras', color: '#F39C12' },
        CLOSED: { icon: '🔒', label: 'Cerrado', color: '#95A5A6' },
        WEATHER: { icon: '⛈️', label: 'Clima', color: '#3498DB' },
        INFO: { icon: 'ℹ️', label: 'Info', color: '#2980B9' }
    },

    // Obtener alertas cercanas (filter active en cliente para no necesitar índice compuesto)
    getAlerts: async (coords) => {
        try {
            const snap = await window.GoHappyDB.collection('alerts')
                .orderBy('createdAt', 'desc')
                .limit(30)
                .get();

            if (!snap.empty) {
                const alerts = snap.docs
                    .map(d => ({ id: d.id, ...d.data() }))
                    .filter(a => a.active !== false)
                    .slice(0, 15);
                if (alerts.length > 0) return alerts;
            }
        } catch (e) {
            console.warn("Firestore alerts fallback:", e);
        }

        // Demo alerts
        return [
            {
                id: 'demo-a1',
                type: 'CONSTRUCTION',
                title: 'Obras en zona de columpios',
                location: 'Parque Campo Grande',
                description: 'Zona de juegos infantiles cerrada por reformas hasta el 15 de marzo.',
                reportedBy: 'María S.',
                timeAgo: 'Hace 2 horas',
                lat: 41.6444, lng: -4.7303,
                active: true,
                votes: 5
            },
            {
                id: 'demo-a2',
                type: 'INFO',
                title: 'Cambio de horario del museo',
                location: 'Museo de la Ciencia',
                description: 'El museo cierra a las 15:00 este sábado por evento privado.',
                reportedBy: 'Carlos R.',
                timeAgo: 'Hace 5 horas',
                lat: 41.6385, lng: -4.7431,
                active: true,
                votes: 3
            },
            {
                id: 'demo-a3',
                type: 'DANGER',
                title: 'Camino deteriorado',
                location: 'Parque Ribera de Castilla',
                description: 'Zona del sendero noroeste con gravilla suelta. Cuidado con carritos.',
                reportedBy: 'Ana P.',
                timeAgo: 'Hace 1 día',
                lat: 41.6661, lng: -4.7171,
                active: true,
                votes: 8
            }
        ];
    },

    // Reportar una nueva alerta
    reportAlert: async (alertData) => {
        const user = window.GoHappyAuth.checkAuth();
        if (!user || user.isGuest) return false;

        try {
            const alert = {
                ...alertData,
                reportedBy: user.nickname || 'Anónimo',
                userId: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                active: true,
                votes: 0
            };
            await window.GoHappyDB.collection('alerts').add(alert);

            // Activity para Memories — title obligatorio según reglas
            await window.GoHappyDB.collection('activity').add({
                userId:    user.uid,
                type:      'safety_report',
                title:     alertData.title || 'Alerta de seguridad',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            window.GoHappyPoints.addPoints('SAFETY_REPORT');
            return true;
        } catch (e) {
            console.error("Error reportando alerta:", e);
            return false;
        }
    },

    // Votar una alerta (atomic increment, sin race conditions)
    voteAlert: async (alertId) => {
        try {
            await window.GoHappyDB.collection('alerts').doc(alertId).update({
                votes: firebase.firestore.FieldValue.increment(1)
            });
            return true;
        } catch (e) {
            console.warn("Vote error:", e);
        }
        return false;
    }
};


// ------------------------------------------------------------------
// KindrSafe - Safety Alerts Service
// ------------------------------------------------------------------
window.KindrSafe = {

    ALERT_TYPES: {
        DANGER: { icon: '🚨', label: 'Peligro', color: '#E74C3C' },
        CONSTRUCTION: { icon: '🚧', label: 'Obras', color: '#F39C12' },
        CLOSED: { icon: '🔒', label: 'Cerrado', color: '#95A5A6' },
        WEATHER: { icon: '⛈️', label: 'Clima', color: '#3498DB' },
        INFO: { icon: 'ℹ️', label: 'Info', color: '#2980B9' }
    },

    // Obtener alertas cercanas
    getAlerts: async (coords) => {
        try {
            const snap = await window.KindrDB.collection('alerts')
                .where('active', '==', true)
                .orderBy('createdAt', 'desc')
                .limit(15)
                .get();

            if (!snap.empty) {
                return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
        const user = window.KindrAuth.checkAuth();
        if (!user) return false;

        try {
            const alert = {
                ...alertData,
                reportedBy: user.nickname || 'Anónimo',
                userId: user.uid,
                createdAt: new Date(),
                active: true,
                votes: 0
            };
            await window.KindrDB.collection('alerts').add(alert);

            // Activity for Memories
            await window.KindrDB.collection('activity').add({
                userId: user.uid,
                type: 'safety_report',
                timestamp: new Date()
            });

            window.KindrPoints.addPoints('REVIEW');
            return true;
        } catch (e) {
            console.error("Error reportando alerta:", e);
            return false;
        }
    },

    // Votar una alerta (confirmar que sigue vigente)
    voteAlert: async (alertId) => {
        try {
            const ref = window.KindrDB.collection('alerts').doc(alertId);
            const doc = await ref.get();
            if (doc.exists) {
                await ref.update({ votes: (doc.data().votes || 0) + 1 });
                return true;
            }
        } catch (e) {
            console.warn("Vote error:", e);
        }
        return false;
    }
};

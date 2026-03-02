// ------------------------------------------------------------------
// KindrQuests - Motor de Misiones Familiares
// ------------------------------------------------------------------
window.KindrQuests = {

    // Tipos de misión disponibles
    MISSION_TYPES: {
        EXPLORE: { icon: '🗺️', label: 'Exploración', color: '#4A90D9' },
        PHOTO: { icon: '📸', label: 'Fotógrafo', color: '#E67E22' },
        GASTRO: { icon: '🍽️', label: 'Gastro', color: '#27AE60' },
        SOCIAL: { icon: '🤝', label: 'Social', color: '#8E44AD' },
        TRIVIA: { icon: '🧠', label: 'Trivia', color: '#E74C3C' },
        ADVENTURE: { icon: '🏃', label: 'Aventura', color: '#16A085' }
    },

    // Obtener misiones activas del usuario
    getActiveQuests: async () => {
        const user = window.KindrAuth.checkAuth();
        if (!user) return window.KindrQuests._getDefaultQuests();

        try {
            const snap = await window.KindrDB.collection('quests')
                .where('userId', '==', user.uid)
                .where('status', '==', 'active')
                .get();

            if (!snap.empty) {
                return snap.docs.map(d => ({ id: d.id, ...d.data() }));
            }
        } catch (e) {
            console.warn("Firestore quests fallback:", e);
        }

        return window.KindrQuests._getDefaultQuests();
    },

    // Generar nuevas misiones con IA basadas en ubicación
    generateQuests: async (coords = "41.6520, -4.7286") => {
        try {
            const prompt = `Genera 3 misiones familiares divertidas para padres con niños cerca de las coordenadas ${coords}.
            Cada misión debe ser completable en 1-7 días y motivar a explorar la ciudad.
            Tipos: exploración de parques, fotografía familiar, restaurantes kid-friendly, retos sociales.
            
            Formato JSON estricto:
            [
                {
                    "title": "nombre corto de la misión",
                    "description": "descripción motivadora de 1-2 líneas",
                    "type": "EXPLORE|PHOTO|GASTRO|SOCIAL|TRIVIA|ADVENTURE",
                    "objectives": ["objetivo 1", "objetivo 2"],
                    "points": 100,
                    "timeLimit": "7 días",
                    "difficulty": "fácil|media|difícil"
                }
            ]`;

            const missions = await window.KindrAI._callGemini(prompt);
            return Array.isArray(missions) ? missions : [];
        } catch (e) {
            console.error("Error generando misiones:", e);
            return window.KindrQuests._getDefaultQuests();
        }
    },

    // Completar una misión
    completeQuest: async (questId) => {
        const user = window.KindrAuth.checkAuth();
        if (!user) return false;

        try {
            await window.KindrDB.collection('quests').doc(questId).update({
                status: 'completed',
                completedAt: new Date()
            });

            // Registrar en el historial de actividad (para Memories)
            await window.KindrDB.collection('activity').add({
                userId: user.uid,
                type: 'quest_completed',
                questId: questId,
                timestamp: new Date()
            });

            window.KindrPoints.addPoints('QUEST_COMPLETE');
            return true;
        } catch (e) {
            console.error("Error completando misión:", e);
            return false;
        }
    },

    // Misiones por defecto / demo
    _getDefaultQuests: () => [
        {
            id: 'demo-1',
            title: 'Exploradores del Parque Oculto',
            description: 'Descubre 2 parques que aún no has visitado en tu zona y comparte tu experiencia.',
            type: 'EXPLORE',
            objectives: ['Visita un parque nuevo', 'Escribe una reseña', 'Sube una foto'],
            points: 150,
            timeLimit: '7 días',
            difficulty: 'fácil',
            progress: 1,
            totalSteps: 3,
            status: 'active'
        },
        {
            id: 'demo-2',
            title: 'Fotógrafo Familiar',
            description: 'Captura los mejores momentos en familia en 3 sitios diferentes de tu ciudad.',
            type: 'PHOTO',
            objectives: ['Foto en un parque', 'Foto en un museo o centro cultural', 'Foto en un restaurante'],
            points: 120,
            timeLimit: '5 días',
            difficulty: 'fácil',
            progress: 0,
            totalSteps: 3,
            status: 'active'
        },
        {
            id: 'demo-3',
            title: 'Embajador Kindr',
            description: 'Invita a otra familia a KINDR y completad juntos una misión.',
            type: 'SOCIAL',
            objectives: ['Comparte tu código de referido', 'Tu amigo se registra', 'Completad una misión juntos'],
            points: 250,
            timeLimit: '14 días',
            difficulty: 'media',
            progress: 0,
            totalSteps: 3,
            status: 'active'
        }
    ]
};

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
                .orderBy('createdAt', 'desc')
                .get();

            if (!snap.empty) {
                return snap.docs.map(d => ({ id: d.id, ...d.data() }));
            }
        } catch (e) {
            console.warn("Firestore quests fetch error:", e);
        }

        // Si no hay misiones en Firestore, devolvemos las de demo solo si es invitado o primer login
        return window.KindrQuests._getDefaultQuests();
    },

    // Guardar una misión generada por IA en la cuenta del usuario
    saveQuest: async (questData) => {
        const user = window.KindrAuth.checkAuth();
        if (!user) return null;

        try {
            const newQuest = {
                ...questData,
                userId: user.uid,
                status: 'active',
                progress: 0,
                totalSteps: questData.objectives?.length || 1,
                createdAt: new Date()
            };
            const docRef = await window.KindrDB.collection('quests').add(newQuest);
            return { id: docRef.id, ...newQuest };
        } catch (e) {
            console.error("Error saving quest:", e);
            return null;
        }
    },

    // Actualizar progreso de una misión
    updateQuestProgress: async (questId, newProgress, isComplete) => {
        const user = window.KindrAuth.checkAuth();
        if (!user) return false;

        try {
            const updateData = { progress: newProgress };
            if (isComplete) {
                updateData.status = 'completed';
                updateData.completedAt = new Date();
            }

            await window.KindrDB.collection('quests').doc(questId).update(updateData);

            if (isComplete) {
                // Registrar actividad para Memories
                await window.KindrDB.collection('activity').add({
                    userId: user.uid,
                    type: 'quest_completed',
                    title: 'Misión completada',
                    description: `Has terminado la misión "${questId}"`, // Sería mejor el título pero necesitamos pasarlo
                    timestamp: new Date(),
                    points: 100 // Puntos base por misión
                });
                window.KindrPoints.addPoints('QUEST_COMPLETE');
            }
            return true;
        } catch (e) {
            console.error("Error updating quest progress:", e);
            return false;
        }
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

    // Misiones por defecto / demo - RICA EN CONTENIDO
    _getDefaultQuests: () => [
        {
            id: 'q-parque-1',
            title: 'Rey de los Columpios',
            description: 'Visita 3 parques diferentes en tu barrio y dinos cuál tiene los mejores columpios.',
            type: 'EXPLORE',
            category: 'Parques',
            objectives: ['Encuentra un parque nuevo', 'Prueba los columpios', 'Deja una reseña con foto'],
            points: 150,
            progress: 0,
            totalSteps: 3,
            difficulty: 'fácil',
            status: 'active'
        },
        {
            id: 'q-cultura-1',
            title: 'Pequeños Críticos de Arte',
            description: 'Lleva a los peques a un museo o teatro local y comparte su reacción.',
            type: 'ADVENTURE',
            category: 'Cultura',
            objectives: ['Visita un museo o teatro', 'Saca una foto creativa', 'Comenta qué les gustó más'],
            points: 200,
            progress: 1,
            totalSteps: 3,
            difficulty: 'media',
            status: 'active'
        },
        {
            id: 'q-gastro-1',
            title: 'Cena sin Dramas',
            description: 'Descubre un restaurante con zona infantil donde se coma bien.',
            type: 'GASTRO',
            category: 'Restaurantes',
            objectives: ['Reserva en sitio kid-friendly', 'Foto del menú infantil', 'Valora la limpieza y seguridad'],
            points: 120,
            progress: 0,
            totalSteps: 3,
            difficulty: 'fácil',
            status: 'active'
        },
        {
            id: 'q-social-1',
            title: 'Líder de la Tribu',
            description: 'Participa activamente en la comunidad ayudando a otros padres.',
            type: 'SOCIAL',
            category: 'Comunidad',
            objectives: ['Publica un consejo útil', 'Recibe 5 likes', 'Responde a una duda'],
            points: 300,
            progress: 0,
            totalSteps: 3,
            difficulty: 'difícil',
            status: 'active'
        }
    ]
};

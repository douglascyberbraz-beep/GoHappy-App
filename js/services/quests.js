// ------------------------------------------------------------------
// GoHappyQuests - Motor de Misiones Familiares
// ------------------------------------------------------------------
window.GoHappyQuests = {

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
        const user = window.GoHappyAuth.checkAuth();
        const defaults = window.GoHappyQuests._getDefaultQuests().slice(0, 2);
        
        if (!user || user.isGuest) return defaults;

        try {
            const fetchPromise = window.GoHappyDB.collection('quests')
                .where('userId', '==', user.uid)
                .where('status', '==', 'active')
                .get();

            const snap = await Promise.race([
                fetchPromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4000))
            ]);

            let activeQuests = [];
            if (snap && !snap.empty) {
                activeQuests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            }

            if (activeQuests.length === 0) return defaults;
            return activeQuests;
        } catch (e) {
            console.warn("Firestore fetch fallback:", e);
            return defaults;
        }
    },

    // Guardar una misión generada por IA en la cuenta del usuario
    saveQuest: async (questData) => {
        const user = window.GoHappyAuth.checkAuth();
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
            const docRef = await window.GoHappyDB.collection('quests').add(newQuest);
            return { id: docRef.id, ...newQuest };
        } catch (e) {
            console.error("Error saving quest:", e);
            return null;
        }
    },

    // Actualizar progreso de una misión
    updateQuestProgress: async (questId, newProgress, isComplete) => {
        const user = window.GoHappyAuth.checkAuth();
        if (!user) return false;

        try {
            const updateData = { progress: newProgress };
            if (isComplete) {
                updateData.status = 'completed';
                updateData.completedAt = new Date();
            }

            await window.GoHappyDB.collection('quests').doc(questId).update(updateData);

            if (isComplete) {
                // Necesitamos los puntos de la misión
                const questDoc = await window.GoHappyDB.collection('quests').doc(questId).get();
                const questData = questDoc.exists ? questDoc.data() : { points: 100, title: 'Misión' };

                // Registrar actividad para Memories
                await window.GoHappyDB.collection('activity').add({
                    userId: user.uid,
                    type: 'quest_completed',
                    title: 'Misión completada',
                    description: `Has terminado la misión "${questData.title || questId}"`, 
                    timestamp: new Date(),
                    points: questData.points || 100
                });
                
                // Otorgar los puntos dinámicamente
                if (window.GoHappyPoints && window.GoHappyPoints.addPoints) {
                    window.GoHappyPoints.addPoints('QUEST_COMPLETE', user.uid, questData.points || 100);
                }
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
            if (window.GEMINI_KEY && !window.GEMINI_KEY.includes('PEGAR_AQUI')) {
                const aiQuests = await window.GoHappyAI.generateLocalQuests(coords);
                return aiQuests.map(q => ({ ...q, isDefault: false }));
            }
            // Fallback mock
            return window.GoHappyQuests._getDefaultQuests().slice(2, 4).map(q => ({ ...q, isDefault: false }));
        } catch (e) {
            console.error("Error generando misiones:", e);
            return [];
        }
    },

    // Completar una misión
    completeQuest: async (questId) => {
        const user = window.GoHappyAuth.checkAuth();
        if (!user) return false;

        try {
            await window.GoHappyDB.collection('quests').doc(questId).update({
                status: 'completed',
                completedAt: new Date()
            });

            // Registrar en el historial de actividad (para Memories)
            await window.GoHappyDB.collection('activity').add({
                userId: user.uid,
                type: 'quest_completed',
                questId: questId,
                timestamp: new Date()
            });

            window.GoHappyPoints.addPoints('QUEST_COMPLETE');
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


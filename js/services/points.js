window.GoHappyPoints = {
    // Configuración de la tabla de puntos
    REWARDS: {
        REGISTER: 50,
        REVIEW: 30,
        PHOTO_VIDEO: 50,
        COMMENT: 10,
        REFERRAL: 1000,           // ★ La recompensa más alta — invitar a amigos
        REFERRED_BONUS: 200,      // Bono al que se registra con un código
        QUEST_EASY: 50,
        QUEST_MEDIUM: 100,
        QUEST_HARD: 200,
        SAFETY_REPORT: 20,
        DAILY_LOGIN: 5,
        QUEST: 50
    },

    LEVELS: [
        { min: 0, name: "Explorador Novato", icon: "🌱" },
        { min: 150, name: "Explorador Activo", icon: "🌿" },
        { min: 500, name: "Guía de la Tribu", icon: "🌳" },
        { min: 1200, name: "Maestro GoHappy", icon: "⭐" },
        { min: 2500, name: "Leyenda GoHappy", icon: "👑" },
        { min: 5000, name: "Héroe de la Tribu", icon: "🛡️" }
    ],

    // Obtener información de nivel basada en puntos
    getLevelInfo: (points = 0) => {
        const pts = points || 0;
        let currentLevel = window.GoHappyPoints.LEVELS[0];
        let nextLevel = null;

        for (let i = 0; i < window.GoHappyPoints.LEVELS.length; i++) {
            if (pts >= window.GoHappyPoints.LEVELS[i].min) {
                currentLevel = window.GoHappyPoints.LEVELS[i];
                nextLevel = window.GoHappyPoints.LEVELS[i + 1] || null;
            }
        }

        const progress = nextLevel
            ? ((pts - currentLevel.min) / (nextLevel.min - currentLevel.min)) * 100
            : 100;

        return {
            name: currentLevel.name,
            icon: currentLevel.icon,
            nextPoints: nextLevel ? nextLevel.min : null,
            progress: Math.min(100, Math.max(0, progress))
        };
    },

    // Otorgar puntos reales y sincronizar con Firestore
    addPoints: async (action, _userId = null, customPoints = null) => {
        const pointsToAdd = customPoints !== null ? customPoints : (window.GoHappyPoints.REWARDS[action] || 0);
        if (pointsToAdd <= 0) return 0;
        console.log(`Otorgando ${pointsToAdd} puntos por acción: ${action}`);

        const user = window.GoHappyAuth.checkAuth();

        if (user && !user.isGuest) {
            try {
                // Actualizar localmente para feedback inmediato
                user.points = (user.points || 0) + pointsToAdd;
                user.weeklyPoints = (user.weeklyPoints || 0) + pointsToAdd;
                localStorage.setItem('GoHappy_local_user', JSON.stringify(user));

                // Sincronizar con Firestore — increment atómico, solo campos permitidos
                await window.GoHappyDB.collection('users').doc(user.uid).update({
                    points:       firebase.firestore.FieldValue.increment(pointsToAdd),
                    weeklyPoints: firebase.firestore.FieldValue.increment(pointsToAdd)
                });

                // Disparar eventos para actualizar UI en todas las pages
                window.dispatchEvent(new CustomEvent('GoHappy-points-sync', {
                    detail: { points: user.points, action, added: pointsToAdd }
                }));
                window.dispatchEvent(new CustomEvent('pointsUpdated', {
                    detail: { points: user.points, amount: pointsToAdd }
                }));

                console.log("✅ Puntos sincronizados con Firestore");
                return pointsToAdd;
            } catch (e) {
                console.error("Error sincronizando puntos:", e);
                // Aún devolvemos los puntos otorgados localmente
                return pointsToAdd;
            }
        } else {
            // Fallback para invitados — solo localStorage
            let pts = parseInt(localStorage.getItem('GoHappy_guest_points')) || 0;
            pts += pointsToAdd;
            localStorage.setItem('GoHappy_guest_points', pts.toString());
            window.dispatchEvent(new CustomEvent('pointsUpdated', {
                detail: { points: pts, amount: pointsToAdd }
            }));
        }
        return pointsToAdd;
    },

    // Resetea puntos semanales del usuario (típicamente lunes 00:00 local)
    // Lo llamamos al cargar la app si detectamos cambio de semana
    checkWeeklyReset: async () => {
        const user = window.GoHappyAuth.checkAuth();
        if (!user || user.isGuest) return;

        const lastReset = localStorage.getItem('GoHappy_last_weekly_reset');
        const now = new Date();
        const week = `${now.getFullYear()}-W${Math.ceil((((now - new Date(now.getFullYear(), 0, 1)) / 86400000) + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7)}`;

        if (lastReset === week) return;

        try {
            await window.GoHappyDB.collection('users').doc(user.uid).update({
                weeklyPoints: 0
            });
            localStorage.setItem('GoHappy_last_weekly_reset', week);
            user.weeklyPoints = 0;
            localStorage.setItem('GoHappy_local_user', JSON.stringify(user));
        } catch (e) {
            console.warn('Weekly reset failed:', e);
        }
    }
};


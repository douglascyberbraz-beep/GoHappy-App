window.GoHappyPoints = {
    // Configuración de la tabla de puntos
    REWARDS: {
        REGISTER: 50,
        REVIEW: 30,
        PHOTO_VIDEO: 50,
        COMMENT: 10,
        REFERRAL: 500,
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
    addPoints: async (action, userId, customPoints = null) => {
        const pointsToAdd = customPoints !== null ? customPoints : (window.GoHappyPoints.REWARDS[action] || 0);
        console.log(`Otorgando ${pointsToAdd} puntos por acción: ${action}`);

        const user = window.GoHappyAuth.checkAuth();
        
        if (user && !user.isGuest) {
            try {
                // Actualizar localmente para feedback inmediato
                user.points = (user.points || 0) + pointsToAdd;
                localStorage.setItem('GoHappy_local_user', JSON.stringify(user));
                
                // Sincronizar con Firestore
                const userRef = window.GoHappyDB.collection('users').doc(user.uid);
                await window.GoHappyDB.runTransaction(async (transaction) => {
                    const sfDoc = await transaction.get(userRef);
                    const now = new Date();
                    
                    const getWeek = (d) => {
                        const date = new Date(d.getTime());
                        date.setHours(0, 0, 0, 0);
                        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
                        const week1 = new Date(date.getFullYear(), 0, 4);
                        return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
                    };

                    if (!sfDoc.exists) {
                        transaction.set(userRef, { 
                            points: pointsToAdd,
                            weeklyPoints: pointsToAdd,
                            lastPointUpdate: now.toISOString()
                        });
                    } else {
                        const data = sfDoc.data();
                        const newPoints = (data.points || 0) + pointsToAdd;
                        
                        let currentWeekly = data.weeklyPoints || 0;
                        let lastUpdate = data.lastPointUpdate ? new Date(data.lastPointUpdate) : new Date(0);
                        
                        if (getWeek(now) !== getWeek(lastUpdate) || now.getFullYear() !== lastUpdate.getFullYear()) {
                            currentWeekly = 0;
                        }
                        
                        transaction.update(userRef, { 
                            points: newPoints,
                            weeklyPoints: currentWeekly + pointsToAdd,
                            lastPointUpdate: now.toISOString()
                        });
                    }
                });
                
                // --- CRITICAL: GLOBAL SYNC ---
                // Dispatch event to update UI across all pages
                window.dispatchEvent(new CustomEvent('GoHappy-points-sync', { 
                    detail: { 
                        points: user.points, 
                        action: action,
                        added: pointsToAdd
                    } 
                }));

                window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: user.points }));
                console.log("✅ Puntos sincronizados con Firestore");
                return pointsToAdd;
            } catch (e) {
                console.error("Error sincronizando puntos:", e);
                return 0;
            }
        } else {
            // Fallback para invitados o local
            let pts = parseInt(localStorage.getItem('GoHappy_guest_points')) || 0;
            pts += pointsToAdd;
            localStorage.setItem('GoHappy_guest_points', pts.toString());
            window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: pts }));
        }
        return pointsToAdd;
    }
};


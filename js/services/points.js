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

    // Cada fase tiene color de aro (ring) que rodea el avatar.
    // Diseño: progresión de verde tierno → cyan → bronce → plata → oro → holográfico.
    LEVELS: [
        { min: 0,    name: "Explorador Novato",    icon: "🌱", ring: 'linear-gradient(135deg, #A0E0B6, #65C18C)',                              shadow: 'rgba(101,193,140,0.45)' },
        { min: 150,  name: "Explorador Activo",    icon: "🌿", ring: 'linear-gradient(135deg, #7DC4F0, #17C8D4)',                              shadow: 'rgba(23,200,212,0.50)' },
        { min: 500,  name: "Guía de la Tribu",     icon: "🌳", ring: 'linear-gradient(135deg, #E8B788, #B47346)',                              shadow: 'rgba(180,115,70,0.55)' },
        { min: 1200, name: "Maestro GoHappy",      icon: "⭐", ring: 'linear-gradient(135deg, #E8EBF0, #B8C0CC 50%, #E8EBF0)',                  shadow: 'rgba(184,192,204,0.65)' },
        { min: 2500, name: "Leyenda GoHappy",      icon: "👑", ring: 'linear-gradient(135deg, #FFE27A, #F5B547 50%, #FFE27A)',                 shadow: 'rgba(245,181,71,0.70)' },
        { min: 5000, name: "Héroe de la Tribu",    icon: "🛡️", ring: 'conic-gradient(from 0deg, #FF6B9D, #FFB347, #FFE27A, #06FEFE, #B084F5, #FF6B9D)', shadow: 'rgba(176,132,245,0.80)' }
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
            ring: currentLevel.ring,
            shadow: currentLevel.shadow,
            nextPoints: nextLevel ? nextLevel.min : null,
            progress: Math.min(100, Math.max(0, progress))
        };
    },

    /**
     * Devuelve un wrapper HTML con el aro de nivel rodeando el avatar interior.
     * @param {string} innerHtml - HTML del avatar (emoji o <img>)
     * @param {number} points - puntos del usuario
     * @param {number} size - tamaño total en px (default 56)
     * @param {number} ringWidth - grosor del aro en px (default 3)
     */
    levelRingWrapper: (innerHtml, points = 0, size = 56, ringWidth = 3) => {
        const lvl = window.GoHappyPoints.getLevelInfo(points || 0);
        const innerSize = size - (ringWidth * 2);
        const ringBg = lvl.ring || 'linear-gradient(135deg,#A0E0B6,#65C18C)';
        const shadow = lvl.shadow || 'rgba(101,193,140,0.45)';
        return `
            <div class="gh-level-ring" data-level="${lvl.name}" style="
                position:relative;
                width:${size}px; height:${size}px;
                padding:${ringWidth}px;
                border-radius:50%;
                background:${ringBg};
                box-shadow:0 0 ${Math.round(size/4)}px ${shadow}, inset 0 0 0 1px rgba(255,255,255,0.6);
                display:inline-flex; align-items:center; justify-content:center;
                box-sizing:border-box;
                animation:gh-ring-pulse 3.5s ease-in-out infinite;
            ">
                <div style="
                    width:${innerSize}px; height:${innerSize}px;
                    border-radius:50%;
                    background:white;
                    display:flex; align-items:center; justify-content:center;
                    overflow:hidden;
                    box-sizing:border-box;
                    font-size:${Math.round(innerSize * 0.55)}px;
                ">${innerHtml}</div>
            </div>
        `;
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
                if (window.GoHappyAuth._saveLocalSession) window.GoHappyAuth._saveLocalSession(user);
                else localStorage.setItem('GoHappy_local_user', JSON.stringify(user));

                // Sincronizar con Firestore — increment atómico, solo campos permitidos
                await window.GoHappyDB.collection('users').doc(user.uid).set({
                    points:       firebase.firestore.FieldValue.increment(pointsToAdd),
                    weeklyPoints: firebase.firestore.FieldValue.increment(pointsToAdd)
                }, { merge: true });

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
            await window.GoHappyDB.collection('users').doc(user.uid).set({
                weeklyPoints: 0
            }, { merge: true });
            localStorage.setItem('GoHappy_last_weekly_reset', week);
            user.weeklyPoints = 0;
            if (window.GoHappyAuth._saveLocalSession) window.GoHappyAuth._saveLocalSession(user);
            else localStorage.setItem('GoHappy_local_user', JSON.stringify(user));
        } catch (e) {
            console.warn('Weekly reset failed:', e);
        }
    }
};


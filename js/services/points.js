window.KindrPoints = {
    // Configuración de la tabla de puntos
    REWARDS: {
        REGISTER: 50,
        REVIEW: 30,         // Increased
        PHOTO_VIDEO: 50,    // Increased for value
        COMMENT: 10,        // Increased
        REFERRAL: 150,      // Increased
        QUEST_COMPLETE: 200, // Increased
        QUEST_PHOTO: 50,
        DAILY_LOGIN: 5
    },

    LEVELS: [
        { min: 0, name: "Explorador Novato", icon: "🌱" },
        { min: 150, name: "Explorador Activo", icon: "🌿" },
        { min: 500, name: "Guía de la Tribu", icon: "🌳" },
        { min: 1200, name: "Maestro Kindr", icon: "⭐" },
        { min: 2500, name: "Leyenda Kindr", icon: "👑" }
    ],

    // Obtener información de nivel basada en puntos
    getLevelInfo: (points = 0) => {
        const pts = points || 0;
        let currentLevel = window.KindrPoints.LEVELS[0];
        let nextLevel = null;

        for (let i = 0; i < window.KindrPoints.LEVELS.length; i++) {
            if (pts >= window.KindrPoints.LEVELS[i].min) {
                currentLevel = window.KindrPoints.LEVELS[i];
                nextLevel = window.KindrPoints.LEVELS[i + 1] || null;
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

    // Simular otorgar puntos
    addPoints: (action, userId) => {
        const pointsToAdd = window.KindrPoints.REWARDS[action] || 0;
        console.log(`Otorgando ${pointsToAdd} puntos por acción: ${action}`);

        const userStr = localStorage.getItem('kindr_user');
        if (userStr) {
            let user = JSON.parse(userStr);
            user.points = (user.points || 0) + pointsToAdd;
            localStorage.setItem('kindr_user', JSON.stringify(user));
            window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: user.points }));
        } else if (localStorage.getItem('kindr_guest') === 'true') {
            let pts = parseInt(localStorage.getItem('kindr_guest_points')) || 0;
            pts += pointsToAdd;
            localStorage.setItem('kindr_guest_points', pts.toString());
            window.dispatchEvent(new CustomEvent('pointsUpdated', { detail: pts }));
        }
        return pointsToAdd;
    }
};

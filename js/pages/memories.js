window.GoHappyMemories = {
    render: async (container) => {
        const user = window.GoHappyAuth.checkAuth();
        const now = new Date();
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const currentMonth = monthNames[now.getMonth()];
        const currentYear = now.getFullYear();

        container.innerHTML = `
            <div class="memories-page">
                <div class="unified-hero">
                    ${window.GoHappyPremium ? window.GoHappyPremium.greetingHTML() : ''}
                    <h2>📖 Memories</h2>
                    <p>Tu diario familiar de aventuras</p>
                </div>

                <!-- Monthly Summary Card -->
                <div class="memory-summary-card premium-glass" id="memory-summary">
                    <div class="memory-month-header">
                        <span class="memory-month">${currentMonth} ${currentYear}</span>
                        <span class="memory-emoji">🗓️</span>
                    </div>
                    <div class="memory-stats-grid">
                        <div class="memory-stat">
                            <span class="mem-stat-icon">🗺️</span>
                            <span class="mem-stat-num" id="mem-places">0</span>
                            <span class="mem-stat-label">Sitios</span>
                        </div>
                        <div class="memory-stat">
                            <span class="mem-stat-icon">📸</span>
                            <span class="mem-stat-num" id="mem-photos">0</span>
                            <span class="mem-stat-label">Fotos</span>
                        </div>
                        <div class="memory-stat">
                            <span class="mem-stat-icon">⭐</span>
                            <span class="mem-stat-num" id="mem-points">0</span>
                            <span class="mem-stat-label">Puntos</span>
                        </div>
                        <div class="memory-stat">
                            <span class="mem-stat-icon">⚔️</span>
                            <span class="mem-stat-num" id="mem-quests">0</span>
                            <span class="mem-stat-label">Misiones</span>
                        </div>
                    </div>
                </div>

                <!-- Timeline -->
                <div class="memory-timeline" id="memory-timeline">
                    <h3 style="padding: 15px 20px; color: var(--primary-navy);">Timeline de Actividad</h3>
                </div>

                <!-- Share Button -->
                <div style="padding: 20px; text-align: center;">
                    <button id="share-memories" class="btn-primary" style="max-width: 280px;">
                        📤 Compartir Mi Mes
                    </button>
                </div>
            </div>
        `;

        // Load activity data
        const activity = await window.GoHappyMemories._getActivity(user);

        // Update stats
        document.getElementById('mem-places').textContent = activity.places;
        document.getElementById('mem-photos').textContent = activity.photos;
        document.getElementById('mem-points').textContent = activity.points;
        document.getElementById('mem-quests').textContent = activity.quests;

        // Generate AI reflection
        // Reflexión IA movida a Perfil (más visible)
        // window.GoHappyMemories._generateReflection(activity, currentMonth);

        // Render timeline
        const timeline = document.getElementById('memory-timeline');
        activity.events.forEach(event => {
            const item = document.createElement('div');
            item.className = 'timeline-item entry-anim';
            item.innerHTML = `
                <div class="timeline-dot" style="background: ${event.color};"></div>
                <div class="timeline-content premium-glass">
                    <div class="timeline-date">${event.date}</div>
                    <div class="timeline-icon">${event.icon}</div>
                    <h4>${event.title}</h4>
                    <p>${event.description}</p>
                    ${event.points ? `<span class="timeline-points">+${event.points} pts</span>` : ''}
                </div>
            `;
            timeline.appendChild(item);
        });

        // Share button
        document.getElementById('share-memories').addEventListener('click', () => {
            const shareText = `🎉 Mi mes de ${currentMonth} en GoHappy:\n🗺️ ${activity.places} sitios visitados\n⭐ ${activity.points} puntos ganados\n⚔️ ${activity.quests} misiones completadas\n\n¡Únete! GoHappy.app`;

            if (navigator.share) {
                navigator.share({
                    title: `Mis Memories GoHappy - ${currentMonth}`,
                    text: shareText
                });
            } else {
                navigator.clipboard.writeText(shareText).then(() => {
                    alert('📋 ¡Resumen copiado al portapapeles!');
                });
            }
            window.GoHappySound.play('success');
        });
    },

    _getActivity: async (user) => {
        // Estado vacío motivador (NO demos)
        const emptyState = {
            places: 0, photos: 0, points: user?.points || 0, quests: 0,
            events: [{
                date: 'Hoy', icon: '👋', title: '¡Bienvenido a Memories!',
                description: 'Aquí aparecerán tus aventuras reales. Sube una foto en Moments, completa una misión o reseña un sitio en el mapa.',
                color: '#002C77'
            }]
        };

        if (!user || user.isGuest) return emptyState;

        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            // Query simple (sin orderBy en server) para evitar exigir índice compuesto
            // que rompía silenciosamente la página. Ordenamos en cliente.
            const snap = await window.GoHappyDB.collection('activity')
                .where('userId', '==', user.uid)
                .get();

            if (snap.empty) return emptyState;

            const activities = snap.docs
                .map(d => d.data())
                .filter(a => {
                    const ts = a.timestamp?.toDate ? a.timestamp.toDate() : null;
                    return ts && ts >= startOfMonth;
                })
                .sort((a, b) => {
                    const ta = a.timestamp?.toDate?.() || 0;
                    const tb = b.timestamp?.toDate?.() || 0;
                    return tb - ta;
                });

            if (activities.length === 0) return emptyState;

            return {
                places:  activities.filter(a => a.type === 'review' || a.type === 'visit' || a.type === 'place_reviewed').length,
                photos:  activities.filter(a => a.type === 'photo' || a.type === 'moment_shared').length,
                points:  user.points || 0,
                quests:  activities.filter(a => a.type === 'quest_completed' || a.type === 'mission_completed').length,
                events:  activities.map(a => window.GoHappyMemories._activityToEvent(a))
            };
        } catch (e) {
            console.warn("[Memories] activity fetch failed:", e?.message);
            return emptyState;
        }
    },

    _activityToEvent: (activity) => {
        const types = {
            'review':            { icon: '⭐', title: 'Nueva reseña',       color: '#27AE60' },
            'place_reviewed':    { icon: '⭐', title: 'Sitio reseñado',     color: '#27AE60' },
            'photo':             { icon: '📸', title: 'Foto subida',        color: '#E67E22' },
            'moment_shared':     { icon: '📸', title: 'Momento compartido', color: '#E67E22' },
            'quest_completed':   { icon: '⚔️', title: 'Misión completada',  color: '#4A90D9' },
            'mission_completed': { icon: '⚔️', title: 'Misión completada',  color: '#4A90D9' },
            'safety_report':     { icon: '🛡️', title: 'Alerta reportada',  color: '#E74C3C' },
            'post':              { icon: '💬', title: 'Post en La Tribu',   color: '#8E44AD' }
        };
        const t = types[activity.type] || { icon: '📌', title: 'Actividad', color: '#888' };
        const date = activity.timestamp?.toDate ? activity.timestamp.toDate() : new Date();
        return {
            date: date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
            icon: t.icon,
            title: t.title,
            description: activity.description || '',
            points: activity.points || 0,
            color: t.color
        };
    },

    _generateReflection: async (activity, month) => {
        const reflectionEl = document.getElementById('reflection-text');

        try {
            const prompt = `Genera una reflexión motivadora y emocional de 2-3 frases para una familia que en ${month} ha visitado ${activity.places} sitios, compartido ${activity.photos} fotos, completado ${activity.quests} misiones y ganado ${activity.points} puntos en una app de planes familiares. Sé cálido y específico. No uses emojis. Máximo 150 caracteres.`;

            const text = await window.GoHappyAI._callGemini(prompt, false);
            reflectionEl.textContent = text || window.GoHappyMemories._getDefaultReflection(activity, month);
        } catch (e) {
            reflectionEl.textContent = window.GoHappyMemories._getDefaultReflection(activity, month);
        }
    },

    _getDefaultReflection: (activity, month) => {
        if (activity.places >= 5) {
            return `${month} ha sido un mes increíble para tu familia. ${activity.places} sitios explorados juntos — cada uno de ellos es un recuerdo que tus hijos guardarán para siempre.`;
        }
        return `Cada salida en familia es una inversión en recuerdos. Este mes ya has dado ${activity.places} pasos hacia aventuras que contaréis durante años.`;
    }
};


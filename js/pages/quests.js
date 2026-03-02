window.KindrQuestsPage = {
    render: async (container) => {
        container.innerHTML = `
            <div class="quests-page">
                <div class="page-header center-text" style="padding-bottom: 5px;">
                    <h2 style="color: var(--primary-navy); font-weight: 800;">⚔️ KINDR Quest</h2>
                    <p style="color: #888; font-size: 13px;">Misiones familiares para explorar juntos</p>
                </div>

                <div class="quest-stats-bar premium-glass" id="quest-stats">
                    <div class="quest-stat">
                        <span class="stat-num" id="q-active">-</span>
                        <span class="stat-label">Activas</span>
                    </div>
                    <div class="quest-stat">
                        <span class="stat-num" id="q-completed">-</span>
                        <span class="stat-label">Completadas</span>
                    </div>
                    <div class="quest-stat">
                        <span class="stat-num" id="q-points">-</span>
                        <span class="stat-label">Pts Ganados</span>
                    </div>
                </div>

                <div id="quests-list" class="quests-list">
                    <div class="center-text p-20"><div class="typing-dots"><span></span><span></span><span></span></div><p>Preparando tus misiones...</p></div>
                </div>

                <button id="generate-quests-btn" class="btn-primary full-width" style="margin: 20px auto; max-width: 320px; display: block;">
                    🎲 Generar Nuevas Misiones
                </button>
            </div>
        `;

        const list = document.getElementById('quests-list');

        // Load active quests
        const quests = await window.KindrQuests.getActiveQuests();

        // Update stats
        document.getElementById('q-active').textContent = quests.filter(q => q.status === 'active').length;
        document.getElementById('q-completed').textContent = quests.filter(q => q.status === 'completed').length;
        document.getElementById('q-points').textContent = quests.reduce((sum, q) => sum + (q.status === 'completed' ? q.points : 0), 0);

        // Render quests
        list.innerHTML = '';

        if (quests.length === 0) {
            list.innerHTML = '<p class="center-text p-20" style="color: #888;">No tienes misiones activas. ¡Genera algunas!</p>';
        } else {
            quests.forEach(quest => {
                const typeInfo = window.KindrQuests.MISSION_TYPES[quest.type] || { icon: '🎯', label: 'Misión', color: '#666' };
                const progress = quest.progress || 0;
                const total = quest.totalSteps || quest.objectives?.length || 1;
                const pct = Math.round((progress / total) * 100);
                const isComplete = quest.status === 'completed';

                const difficultyColors = { 'fácil': '#27AE60', 'media': '#F39C12', 'difícil': '#E74C3C' };
                const diffColor = difficultyColors[quest.difficulty] || '#888';

                const card = document.createElement('div');
                card.className = `quest-card premium-shadow entry-anim ${isComplete ? 'quest-done' : ''}`;
                card.innerHTML = `
                    <div class="quest-card-header" style="border-left: 4px solid ${typeInfo.color};">
                        <div class="quest-type-badge" style="background: ${typeInfo.color}15; color: ${typeInfo.color};">
                            ${typeInfo.icon} ${typeInfo.label}
                        </div>
                        <div class="quest-meta">
                            <span class="quest-difficulty" style="color: ${diffColor};">● ${quest.difficulty || 'media'}</span>
                            <span class="quest-time">⏱️ ${quest.timeLimit}</span>
                        </div>
                    </div>
                    <div class="quest-card-body">
                        <h3 class="quest-title">${quest.title}</h3>
                        <p class="quest-desc">${quest.description}</p>
                        
                        <div class="quest-objectives">
                            ${(quest.objectives || []).map((obj, i) => `
                                <div class="quest-obj ${i < progress ? 'obj-done' : ''}">
                                    <span class="obj-check">${i < progress ? '✅' : '⬜'}</span>
                                    <span>${obj}</span>
                                </div>
                            `).join('')}
                        </div>

                        <div class="quest-progress-wrap">
                            <div class="quest-progress-bar">
                                <div class="quest-progress-fill" style="width: ${pct}%; background: ${typeInfo.color};"></div>
                            </div>
                            <span class="quest-pct">${pct}%</span>
                        </div>

                        <div class="quest-footer">
                            <span class="quest-reward">🏅 ${quest.points} pts</span>
                            ${isComplete
                        ? '<span class="quest-badge-done">✨ Completada</span>'
                        : `<button class="btn-quest-action" data-quest="${quest.id}">Avanzar ➤</button>`
                    }
                        </div>
                    </div>
                `;
                list.appendChild(card);
            });
        }

        // Advance quest progress (demo behavior)
        list.querySelectorAll('.btn-quest-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const qId = e.target.dataset.quest;
                const quest = quests.find(q => q.id === qId);
                if (quest) {
                    quest.progress = Math.min((quest.progress || 0) + 1, quest.totalSteps || quest.objectives?.length || 1);
                    if (quest.progress >= (quest.totalSteps || quest.objectives?.length || 1)) {
                        quest.status = 'completed';
                        window.KindrPoints.addPoints('QUEST_COMPLETE');
                        window.KindrSound.play('success');
                        alert(`🎉 ¡Misión "${quest.title}" completada! +${quest.points} puntos`);
                    } else {
                        window.KindrSound.play('click');
                    }
                    // Re-render
                    window.KindrQuestsPage.render(container);
                }
            });
        });

        // Generate new quests button
        document.getElementById('generate-quests-btn').addEventListener('click', async () => {
            const btn = document.getElementById('generate-quests-btn');
            btn.disabled = true;
            btn.textContent = '🔄 Generando misiones con IA...';
            list.innerHTML = '<div class="center-text p-20"><div class="typing-dots"><span></span><span></span><span></span></div><p>La IA está creando misiones personalizadas...</p></div>';

            let coords = "41.6520, -4.7286";
            if (navigator.geolocation) {
                const pos = await new Promise((resolve) => {
                    navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 5000 });
                });
                if (pos) coords = `${pos.coords.latitude}, ${pos.coords.longitude}`;
            }

            const newQuests = await window.KindrQuests.generateQuests(coords);
            if (newQuests.length > 0) {
                // Merge with defaults for display
                const enriched = newQuests.map((q, i) => ({
                    ...q,
                    id: `ai-${Date.now()}-${i}`,
                    progress: 0,
                    totalSteps: q.objectives?.length || 3,
                    status: 'active'
                }));
                list.innerHTML = '';
                // Re-render with new quests by passing them through
                window.KindrQuestsPage.render(container);
            }

            btn.disabled = false;
            btn.textContent = '🎲 Generar Nuevas Misiones';
        });
    }
};

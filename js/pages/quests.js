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
                    <div class="quest-card-header" style="border-left: 4px solid ${typeInfo.color}; display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #fafafa;">
                        <div class="quest-type-badge" style="background: ${typeInfo.color}15; color: ${typeInfo.color}; padding: 4px 10px; border-radius: 20px; font-weight: 700; font-size: 11px;">
                            ${typeInfo.icon} ${quest.category || typeInfo.label}
                        </div>
                        <div class="quest-meta" style="font-size: 11px; color: #888; display: flex; gap: 10px;">
                            <span class="quest-difficulty" style="color: ${diffColor}; font-weight: 600;">● ${quest.difficulty || 'media'}</span>
                            <span class="quest-points" style="font-weight: 800; color: var(--primary-navy);">🏅 ${quest.points} pts</span>
                        </div>
                    </div>
                    <div class="quest-card-body" style="padding: 16px;">
                        <h3 class="quest-title" style="margin: 0 0 8px 0; font-size: 1.1rem; color: var(--primary-navy);">${quest.title}</h3>
                        <p class="quest-desc" style="font-size: 13px; color: #666; line-height: 1.4; margin-bottom: 12px;">${quest.description}</p>
                        
                        <div class="quest-objectives" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 15px;">
                            ${(quest.objectives || []).map((obj, i) => `
                                <div class="quest-obj ${i < progress ? 'obj-done' : ''}" style="display: flex; align-items: center; gap: 10px; font-size: 13px; ${i < progress ? 'opacity: 0.6; text-decoration: line-through;' : ''}">
                                    <span class="obj-check" style="font-size: 16px;">${i < progress ? '✅' : '⬜'}</span>
                                    <span>${obj}</span>
                                </div>
                            `).join('')}
                        </div>

                        <div class="quest-progress-wrap" style="display: flex; align-items: center; gap: 12px;">
                            <div class="quest-progress-bar" style="flex: 1; height: 10px; background: #eee; border-radius: 10px; overflow: hidden;">
                                <div class="quest-progress-fill" style="width: ${pct}%; height: 100%; background: linear-gradient(90deg, ${typeInfo.color}, ${typeInfo.color}aa); transition: width 0.5s ease;"></div>
                            </div>
                            <span class="quest-pct" style="font-size: 12px; font-weight: 800; color: var(--primary-navy); min-width: 35px;">${pct}%</span>
                        </div>

                        ${!isComplete ? `
                            <button class="btn-quest-action" data-quest="${quest.id}" style="margin-top: 15px; width: 100%; background: var(--primary-navy); color: white; border: none; padding: 10px; border-radius: 12px; font-weight: 700; cursor: pointer;">
                                Avanzar Misión ➤
                            </button>
                        ` : `
                            <div style="margin-top: 15px; text-align: center; color: #27AE60; font-weight: 800; font-size: 14px;">
                                ✨ ¡Misión Completada!
                            </div>
                        `}
                    </div>
                `;
                list.appendChild(card);
            });
        }

        // Advance quest progress (real persistence)
        list.querySelectorAll('.btn-quest-action').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const qId = e.target.dataset.quest;
                const quest = quests.find(q => q.id === qId);
                if (quest) {
                    const newProgress = Math.min((quest.progress || 0) + 1, quest.totalSteps || quest.objectives?.length || 1);
                    const isComplete = newProgress >= (quest.totalSteps || quest.objectives?.length || 1);

                    e.target.disabled = true;
                    e.target.textContent = '⌛...';

                    const success = await window.KindrQuests.updateQuestProgress(qId, newProgress, isComplete);

                    if (success) {
                        if (isComplete) {
                            window.KindrSound.play('success');
                            alert(`🎉 ¡Misión "${quest.title}" completada! +${quest.points} puntos`);
                        } else {
                            window.KindrSound.play('click');
                        }
                        // Re-render
                        window.KindrQuestsPage.render(container);
                    } else {
                        e.target.disabled = false;
                        e.target.textContent = 'Error ⚠️';
                    }
                }
            });
        });

        // Generate new quests button
        document.getElementById('generate-quests-btn').addEventListener('click', async () => {
            const btn = document.getElementById('generate-quests-btn');
            btn.disabled = true;
            btn.innerHTML = '<span class="typing-dots"><span></span><span></span><span></span></span> Generando...';

            let coords = "41.6520, -4.7286";
            if (navigator.geolocation) {
                try {
                    const pos = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                    });
                    if (pos) coords = `${pos.coords.latitude}, ${pos.coords.longitude}`;
                } catch (e) { }
            }

            const newQuests = await window.KindrQuests.generateQuests(coords);
            if (newQuests && newQuests.length > 0) {
                list.innerHTML = '<p class="center-text p-20">💾 Guardando misiones en tu perfil...</p>';

                // Save them to Firestore properly
                for (const q of newQuests) {
                    await window.KindrQuests.saveQuest(q);
                }

                // Re-render to show new active quests from Firestore
                window.KindrQuestsPage.render(container);
            } else {
                alert("No se pudieron generar misiones en este momento. Inténtalo de nuevo.");
            }

            btn.disabled = false;
            btn.textContent = '🎲 Generar Nuevas Misiones';
        });
    }
};

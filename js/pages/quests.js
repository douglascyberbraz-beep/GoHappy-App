// ================================================================
// GoHappy Quests Page v2.1 — SMART CARDS DESIGN
// UI compacta, inmersiva y sin desbordamientos.
// ================================================================
window.GoHappyQuestsPage = {

    render: async (container) => {
        const user = window.GoHappyAuth.checkAuth();
        const familyId = user?.familyId || null;

        // Estructura Base (Control total del ancho)
        const T = window.t || (k => k);
        const lang = window.GoHappyI18n?.lang || 'es';
        const daysLabel = lang === 'en' ? 'DAYS' : 'DÍAS';

        container.innerHTML = `
            <div class="quests-page">

                <!-- HEADER LIQUID GLASS -->
                <div class="q-header-premium">
                    <div class="q-header-content">
                        <div class="q-title-group">
                            <h2>${T('quests.title')}</h2>
                            <p class="q-subtitle">
                                ${familyId ? `${T('quests.tribu')} <span>${user?.familyName || 'GoHappy'}</span>` : T('quests.subtitle')}
                            </p>
                        </div>
                        <div id="racha-badge" class="q-racha-capsule">
                            <div class="racha-icon">🔥</div>
                            <div class="racha-info">
                                <span id="racha-num">-</span>
                                <label>${daysLabel}</label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- BARRA DE STATS (Floating Glass Capsule) -->
                <div class="q-stats-floating-bar">
                    <div class="stat-item">
                        <span id="stat-pendientes" class="stat-val">-</span>
                        <span class="stat-label">${T('quests.stat.free')}</span>
                    </div>
                    <div class="stat-divider"></div>
                    <div class="stat-item">
                        <span id="stat-completadas" class="stat-val done">-</span>
                        <span class="stat-label">${T('quests.stat.done')}</span>
                    </div>
                    <div class="stat-divider"></div>
                    <div class="stat-item">
                        <span id="stat-puntos" class="stat-val pts">-</span>
                        <span class="stat-label">${T('quests.stat.points')}</span>
                    </div>
                </div>

                <!-- FILTROS (Premium Pills) -->
                <div class="q-filters-container">
                    <button class="q-filter-btn active" data-filter="todas">${T('quests.filter.all')}</button>
                    <button class="q-filter-btn" data-filter="diaria">${T('quests.filter.daily')}</button>
                    <button class="q-filter-btn" data-filter="semanal">${T('quests.filter.weekly')}</button>
                    <button class="q-filter-btn" data-filter="mensual">${T('quests.filter.monthly')}</button>
                    <button class="q-filter-btn" data-filter="fisica">${T('quests.filter.active')}</button>
                </div>

                <!-- LISTA DE TARJETAS (Staggered Animation) -->
                <div id="quests-list" class="stagger-list">
                    <!-- Dinámico -->
                </div>

                <div style="height:140px;"></div>
            </div>
        `;

        // Estilos mínimos específicos de quests (todo lo demás lo controla premium.css)
        const styleId = 'quests-minimal-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .quests-page { width:100%; box-sizing:border-box; overflow-x:hidden; min-height: 100vh; }
                .q-header-content { display:flex; justify-content:space-between; align-items:center; gap:12px; position:relative; z-index:2; }
                .q-title-group { flex:1; min-width:0; }
                .racha-icon { font-size:22px; filter: drop-shadow(0 0 6px #F39C12); }
                .racha-info { display:flex; flex-direction:column; align-items:flex-start; }
                .q-stats-floating-bar { display:flex; justify-content:space-around; align-items:center; }
                .stat-item { text-align:center; }
                .stat-val { display:block; font-size:1.3rem; font-weight:900; color:var(--cobalt); }
                .stat-val.done { color:#27AE60; }
                .stat-val.pts { color:#F39C12; }
                .stat-label { font-size:9px; color:var(--text-tertiary); font-weight:800; text-transform:uppercase; margin-top:3px; letter-spacing:0.3px; }
                .stat-divider { width:1px; height:28px; background:rgba(11,76,143,0.1); }
                .q-filters-container { display:flex; gap:8px; padding:20px 16px 8px; overflow-x:auto; scrollbar-width:none; }
                .q-filters-container::-webkit-scrollbar { display:none; }
                .q-icon-box {
                    width:52px; height:52px; background:linear-gradient(135deg,rgba(11,113,252,0.06),rgba(23,200,212,0.10)); border-radius:18px;
                    display:flex; align-items:center; justify-content:center;
                    font-size:24px; flex-shrink:0; box-shadow: inset 0 1px 0 rgba(255,255,255,0.6);
                }
                .quest-card-smart { display:flex; align-items:center; gap:14px; }
                .q-content { flex:1; min-width:0; }
                .q-title { font-weight:800; font-size:15px; color:var(--text-primary); margin:0; }
                .q-meta { display:flex; align-items:center; gap:10px; margin-top:4px; }
                .q-frec { font-size:10px; font-weight:700; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.3px; }
                .q-check-circle {
                    width:38px; height:38px; border-radius:50%; border:2px solid rgba(11,76,143,0.15);
                    background:white; display:flex; align-items:center; justify-content:center;
                    font-size:18px; color:transparent; transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1);
                    flex-shrink:0;
                }
                .quest-card-smart.done .q-check-circle {
                    background:#27AE60; border-color:#27AE60; color:white;
                    box-shadow: 0 4px 12px rgba(39,174,96,0.3);
                }
            `;
            document.head.appendChild(style);
        }

        // Cargar datos
        await window.GoHappyQuestsPage.loadQuests();
        window.GoHappyQuestsPage.setupFilters();
    },

    loadQuests: async (filtro = 'todas') => {
        const listContainer = document.getElementById('quests-list');
        const user = window.GoHappyAuth.checkAuth();
        if (!user) return;

        try {
            // Usar la API correcta del servicio
            const quests = await window.GoHappyQuests.getQuestsDelDia();
            
            // Estadísticas
            const stats = await window.GoHappyQuests.getEstadisticasFamilia(user.familyId);
            const puntosTotales = stats.puntosTotales;
            const completadasHoyCount = stats.completadasHoy;
            
            const elPendientes = document.getElementById('stat-pendientes');
            const elCompletadas = document.getElementById('stat-completadas');
            const elPuntos = document.getElementById('stat-puntos');
            const elRacha = document.getElementById('racha-num');

            if (elPendientes) elPendientes.textContent = (quests.length || 0) - (completadasHoyCount || 0);
            if (elCompletadas) elCompletadas.textContent = completadasHoyCount || 0;
            if (elPuntos) elPuntos.textContent = puntosTotales || 0;
            
            const racha = await window.GoHappyQuests.getRacha(user.familyId);
            if (elRacha) elRacha.textContent = racha || 0;

            let filtradas = quests;
            if (filtro !== 'todas') {
                filtradas = quests.filter(q => q.frecuencia === filtro || q.categoria === filtro);
            }

            const listHtml = filtradas.map(q => `
                <div class="quest-card-smart ${q.completadaHoy ? 'done' : ''} cat-${q.categoria || 'familiar'}" data-id="${q.id}">
                    <div class="q-icon-box">${q.icono || '✨'}</div>
                    <div class="q-content">
                        <h4 class="q-title">${q.titulo}</h4>
                        <div class="q-meta">
                            <span class="q-pts-badge">+${q.puntos} pts</span>
                            <span class="q-frec">${q.frecuencia === 'mensual' ? '📆 Mensual' : q.frecuencia === 'semanal' ? '📅 Semanal' : '☀️ Diaria'}</span>
                        </div>
                    </div>
                    <div class="q-check-circle">
                        ${q.completadaHoy ? '✓' : ''}
                    </div>
                </div>
            `).join('');

            listContainer.innerHTML = listHtml;

            // Click listener
            listContainer.querySelectorAll('.quest-card-smart').forEach(card => {
                card.onclick = async () => {
                    const qId = card.dataset.id;
                    const quest = quests.find(q => q.id === qId);
                    if (!quest || quest.completadaHoy) return;
                    
                    // Comprobar si se puede completar (si tiene familia o es demo)
                    const user = window.GoHappyAuth.checkAuth();
                    if (!user.familyId && quest.id.startsWith('demo')) {
                        // Demo mode
                        quest.completadaHoy = true;
                        // window.GoHappyPoints.addPoints('QUEST', user.uid, quest.puntos);
                        window.GoHappyQuestsPage.loadQuests();
                        window.GoHappyToast.success("¡Misión demo completada! 🎉");
                        return;
                    }

                    window.GoHappyQuestsPage.handleCompletar(quest.id, quest);
                };
            });

        } catch (e) {
            console.error(e);
            listContainer.innerHTML = '<p class="center-text">Error al cargar misiones</p>';
        }
    },

    handleCompletar: async (questId, questData) => {
        const user = window.GoHappyAuth.checkAuth();
        if (!user) return;

        window.GoHappyToast.info("¡Completando misión! 🚀");
        window.GoHappySound && window.GoHappySound.play('click');

        const res = await window.GoHappyQuests.completarQuest(questId, questData);
        if (res.ok) {
            window.GoHappySound && window.GoHappySound.play('quest');
            window.GoHappyToast.points(`¡Misión cumplida! +${res.puntos} pts 🎉`);
            window.GoHappyQuestsPage.loadQuests();

            // Non-blocking memory prompt via toast action
            setTimeout(() => {
                window.GoHappyToast.info("📸 ¿Guardas un recuerdo de este momento?", 4000);
            }, 1200);
        } else {
            window.GoHappySound && window.GoHappySound.play('error');
            window.GoHappyToast.error(res.error || "No se pudo completar");
        }
    },

    setupFilters: () => {
        document.querySelectorAll('.q-filter-btn').forEach(btn => {
            btn.onclick = (e) => {
                document.querySelectorAll('.q-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                window.GoHappyQuestsPage.loadQuests(btn.dataset.filter);
            };
        });
    }
};

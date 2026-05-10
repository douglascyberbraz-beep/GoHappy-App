// ================================================================
// GoHappy Quests Page v2.1 — SMART CARDS DESIGN
// UI compacta, inmersiva y sin desbordamientos.
// ================================================================
window.GoHappyQuestsPage = {

    render: async (container) => {
        const user = window.GoHappyAuth.checkAuth();
        const familyId = user?.familyId || null;

        // Estructura Base (Control total del ancho)
        container.innerHTML = `
            <div class="quests-page">

                <!-- HEADER LIQUID GLASS -->
                <div class="q-header-premium">
                    <div class="q-header-content">
                        <div class="q-title-group">
                            <h2>⚔️ Quests</h2>
                            <p class="q-subtitle">
                                ${familyId ? `Tribu <span>${user?.familyName || 'GoHappy'}</span>` : 'Misiones Familiares'}
                            </p>
                        </div>
                        <div id="racha-badge" class="q-racha-capsule">
                            <div class="racha-icon">🔥</div>
                            <div class="racha-info">
                                <span id="racha-num">-</span>
                                <label>DÍAS</label>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- BARRA DE STATS (Floating Glass Capsule) -->
                <div class="q-stats-floating-bar">
                    <div class="stat-item">
                        <span id="stat-pendientes" class="stat-val">-</span>
                        <span class="stat-label">Libres</span>
                    </div>
                    <div class="stat-divider"></div>
                    <div class="stat-item">
                        <span id="stat-completadas" class="stat-val done">-</span>
                        <span class="stat-label">Hechas</span>
                    </div>
                    <div class="stat-divider"></div>
                    <div class="stat-item">
                        <span id="stat-puntos" class="stat-val pts">-</span>
                        <span class="stat-label">Puntos</span>
                    </div>
                </div>

                <!-- FILTROS (Premium Pills) -->
                <div class="q-filters-container">
                    <button class="q-filter-btn active" data-filter="todas">Todas</button>
                    <button class="q-filter-btn" data-filter="diaria">☀️ Diarias</button>
                    <button class="q-filter-btn" data-filter="semanal">📅 Semanales</button>
                    <button class="q-filter-btn" data-filter="mensual">📆 Mensuales</button>
                    <button class="q-filter-btn" data-filter="fisica">🏃 Activas</button>
                </div>

                <!-- LISTA DE TARJETAS (Staggered Animation) -->
                <div id="quests-list" class="stagger-list">
                    <!-- Dinámico -->
                </div>

                <div style="height:140px;"></div>
            </div>
        `;

        // INYECCIÓN DE ESTILOS SMART (Garantiza que no haya bordes rotos)
        const styleId = 'quests-smart-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .quests-page { width:100%; box-sizing:border-box; overflow-x:hidden; background: #f8fafc; min-height: 100vh; }
                
                /* Header Liquid Glass — premium.css controla el background y padding-top */
                .q-header-content { display: flex; justify-content: space-between; align-items: center; gap: 12px; position: relative; z-index: 2; }
                .q-title-group { flex: 1; min-width: 0; }
                .q-subtitle { color: rgba(255,255,255,0.92); font-size: 13px; margin: 4px 0 0; font-weight: 500; }
                .q-subtitle span { color: #B8F0F4; font-weight: 700; }
                
                .q-racha-capsule {
                    background: rgba(255,255,255,0.1);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(255,255,255,0.2);
                    padding: 8px 15px;
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    box-shadow: 0 8px 20px rgba(0,0,0,0.1);
                }
                .racha-icon { font-size: 22px; filter: drop-shadow(0 0 5px #F39C12); }
                .racha-info { display: flex; flex-direction: column; align-items: flex-start; }
                #racha-num { color: white; font-size: 16px; font-weight: 900; line-height: 1; }
                .racha-info label { color: rgba(255,255,255,0.6); font-size: 8px; font-weight: 800; text-transform: uppercase; margin-top: 2px; }

                /* Stats Bar */
                .q-stats-floating-bar {
                    margin: -25px 20px 0;
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(20px);
                    padding: 18px;
                    border-radius: 24px;
                    display: flex;
                    justify-content: space-around;
                    align-items: center;
                    box-shadow: 0 15px 35px rgba(11, 76, 143, 0.12);
                    z-index: 10;
                    position: relative;
                    border: 1px solid white;
                }
                .stat-item { text-align: center; }
                .stat-val { display: block; font-size: 1.2rem; font-weight: 900; color: var(--primary-cobalt); }
                .stat-val.done { color: #27AE60; }
                .stat-val.pts { color: #F39C12; }
                .stat-label { font-size: 9px; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-top: 2px; }
                .stat-divider { width: 1px; height: 25px; background: #f1f5f9; }

                /* Filters */
                .q-filters-container {
                    display: flex; gap: 10px; padding: 25px 20px 10px; overflow-x: auto; scrollbar-width: none;
                }
                .q-filters-container::-webkit-scrollbar { display: none; }
                .q-filter-btn {
                    background: white; border: none; padding: 10px 20px; border-radius: 16px;
                    font-size: 13px; font-weight: 700; color: #64748b;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.03);
                    white-space: nowrap; cursor: pointer; transition: all 0.3s ease;
                    border: 1px solid transparent;
                }
                .q-filter-btn.active {
                    background: var(--primary-cobalt); color: white;
                    box-shadow: 0 8px 20px rgba(11, 76, 143, 0.25);
                    transform: translateY(-2px);
                }

                /* Quest Cards */
                #quests-list { padding: 15px 20px; display: flex; flex-direction: column; gap: 14px; }
                
                .quest-card-smart {
                    background: white; border-radius: 24px; padding: 16px;
                    display: flex; align-items: center; gap: 16px;
                    box-shadow: 0 8px 25px rgba(0,0,0,0.03);
                    border: 1px solid rgba(255,255,255,1);
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    position: relative; overflow: hidden;
                    animation: slideIn 0.5s ease-out forwards;
                }
                .quest-card-smart:active { transform: scale(0.97); }
                
                /* Category Stripes */
                .quest-card-smart::before {
                    content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 6px;
                    background: var(--primary-cobalt); opacity: 0.8;
                }
                .quest-card-smart.cat-fisica::before { background: #3498db; }
                .quest-card-smart.cat-familiar::before { background: #f1c40f; }
                .quest-card-smart.cat-creativa::before { background: #e91e63; }
                .quest-card-smart.cat-educativa::before { background: #9b59b6; }
                
                .quest-card-smart.done { opacity: 0.8; background: #f1f5f9; filter: grayscale(0.5); }
                .quest-card-smart.done::before { background: #27AE60; }
                
                .q-icon-box {
                    width: 52px; height: 52px; background: #f8fafc; border-radius: 18px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 24px; flex-shrink: 0; box-shadow: inset 0 2px 5px rgba(0,0,0,0.05);
                }
                .q-content { flex: 1; min-width: 0; }
                .q-title { font-weight: 800; font-size: 15px; color: #1e293b; margin: 0; }
                .q-meta { display: flex; align-items: center; gap: 10px; margin-top: 4px; }
                .q-pts-badge { 
                    font-size: 11px; font-weight: 800; color: #F39C12; 
                    background: rgba(243, 156, 18, 0.1); padding: 2px 8px; border-radius: 8px;
                }
                .q-frec { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
                
                .q-check-circle {
                    width: 40px; height: 40px; border-radius: 50%; border: 2px solid #e2e8f0;
                    background: white; display: flex; align-items: center; justify-content: center;
                    font-size: 18px; color: transparent; transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                    cursor: pointer;
                }
                .quest-card-smart.done .q-check-circle {
                    background: #27AE60; border-color: #27AE60; color: white;
                    box-shadow: 0 5px 15px rgba(39, 174, 96, 0.3);
                }
                
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* Staggered load */
                .quest-card-smart:nth-child(1) { animation-delay: 0.1s; }
                .quest-card-smart:nth-child(2) { animation-delay: 0.15s; }
                .quest-card-smart:nth-child(3) { animation-delay: 0.2s; }
                .quest-card-smart:nth-child(4) { animation-delay: 0.25s; }
                .quest-card-smart:nth-child(5) { animation-delay: 0.3s; }
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

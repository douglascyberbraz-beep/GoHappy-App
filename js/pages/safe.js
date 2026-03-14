window.KidoaSafePage = {
    render: async (container) => {
        container.innerHTML = `
            <div class="safe-page">
                <div class="page-header center-text">
                    <h2 style="color: var(--primary-navy); font-weight: 800;">🛡️ SAFE</h2>
                    <p style="color: #888; font-size: 13px;">Alertas de seguridad en tu zona</p>
                </div>

                <div id="ai-safe-insight" class="info-alert" style="margin: 0 15px 15px 15px; padding: 12px; background: linear-gradient(135deg, rgba(74, 144, 217, 0.1), rgba(76, 201, 240, 0.1)); border-radius: 12px; border-left: 4px solid var(--primary-blue); font-size: 13px; color: var(--primary-navy); line-height: 1.4; display: none;">
                    <span style="font-weight: 800;">✨ KIDOA IA:</span> <span id="ai-safe-text">Analizando tu zona...</span>
                </div>

                <div class="safe-report-bar premium-glass" style="display: flex; justify-content: center; padding: 12px; margin-top: 10px;">
                    <button id="report-alert-btn" class="btn-primary" style="font-size: 14px;">
                        ⚠️ Reportar Alerta
                    </button>
                </div>

                <div id="alerts-list" class="alerts-list">
                    <div class="center-text p-20"><div class="typing-dots"><span></span><span></span><span></span></div></div>
                </div>

                <!-- Report Modal -->
                <div id="report-modal" class="modal hidden">
                    <div class="auth-container slide-up-anim">
                        <div class="auth-card premium-glass">
                            <h3 style="margin-bottom: 15px;">⚠️ Reportar Alerta</h3>
                            
                            <div class="report-type-grid" id="alert-type-selector">
                                <button class="type-btn selected" data-type="CONSTRUCTION">🚧 Obras</button>
                                <button class="type-btn" data-type="DANGER">🚨 Peligro</button>
                                <button class="type-btn" data-type="CLOSED">🔒 Cerrado</button>
                                <button class="type-btn" data-type="WEATHER">⛈️ Clima</button>
                                <button class="type-btn" data-type="INFO">ℹ️ Info</button>
                            </div>

                            <input type="text" id="alert-title" placeholder="Título breve" class="auth-input" style="margin-top: 12px;">
                            <input type="text" id="alert-location" placeholder="📍 Lugar (ej: Parque Campo Grande)" class="auth-input">
                            <textarea id="alert-desc" placeholder="Descripción del aviso..." class="auth-input" style="min-height: 80px; resize:none;"></textarea>

                            <button id="submit-alert" class="btn-primary full-width" style="margin-top: 12px;">Enviar Alerta</button>
                            <button id="close-report" class="btn-text" style="margin-top: 8px;">Cancelar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const alertsList = document.getElementById('alerts-list');
        const insightBox = document.getElementById('ai-safe-insight');
        const insightText = document.getElementById('ai-safe-text');

        // Load AI Insight asynchronously
        setTimeout(async () => {
            if (window.GEMINI_KEY && !window.GEMINI_KEY.includes('PEGAR_AQUI')) {
                insightBox.style.display = 'block';
                insightText.innerHTML = '<span class="typing-dots"><span></span><span></span><span></span></span>';
                
                try {
                    let coords = "41.6520, -4.7286";
                    try {
                        const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 }));
                        if (pos) coords = `${pos.coords.latitude}, ${pos.coords.longitude}`;
                    } catch (e) { }

                    const insight = await window.KidoaAI.getDailySafeInsight(coords);
                    if (insight && insight.length > 5) {
                        insightText.innerText = insight;
                    } else {
                        insightBox.style.display = 'none';
                    }
                } catch (e) {
                    insightBox.style.display = 'none';
                }
            }
        }, 300);

        // Load alerts
        const alerts = await window.KidoaSafe.getAlerts();
        alertsList.innerHTML = '';

        if (alerts.length === 0) {
            alertsList.innerHTML = `
                <div class="center-text p-40" style="color:#aaa;">
                    <div style="font-size: 40px; margin-bottom: 15px;">🛡️</div>
                    <h3 style="color: var(--primary-navy);">Todo despejado</h3>
                    <p style="font-size: 14px;">No hay alertas de seguridad activas en tu zona ahora mismo.</p>
                </div>
            `;
        } else {
            alerts.forEach(alert => {
                const typeInfo = window.KidoaSafe.ALERT_TYPES[alert.type] || window.KidoaSafe.ALERT_TYPES.INFO;
                const card = document.createElement('div');
                card.className = 'alert-card entry-anim';
                card.innerHTML = `
                    <div class="alert-card-left" style="border-left: 4px solid ${typeInfo.color};">
                        <div class="alert-icon" style="background: ${typeInfo.color}15; color: ${typeInfo.color}; font-size: 1.5rem; width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                            ${typeInfo.icon}
                        </div>
                    </div>
                    <div class="alert-card-body">
                        <div class="alert-header-row">
                            <span class="alert-type-label" style="color: ${typeInfo.color}; font-size: 11px; font-weight: 700;">${typeInfo.label.toUpperCase()}</span>
                            <span class="alert-time" style="color: #aaa; font-size: 11px;">${alert.timeAgo}</span>
                        </div>
                        <h4 class="alert-title" style="margin: 4px 0; color: var(--primary-navy);">${alert.title}</h4>
                        <p class="alert-location" style="font-size: 12px; color: #888;">📍 ${alert.location}</p>
                        <p class="alert-desc" style="font-size: 13px; color: #555; margin-top: 6px; line-height: 1.4;">${alert.description}</p>
                        <div class="alert-footer" style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                            <span style="font-size: 11px; color: #aaa;">👤 ${alert.reportedBy}</span>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <span style="font-size: 12px; color: #888;">👍 ${alert.votes}</span>
                                <button class="btn-vote" data-alert="${alert.id}" style="font-size: 11px; padding: 4px 10px; border-radius: 8px; border: 1px solid #ddd; background: #f9f9f9; cursor: pointer;">Confirmar</button>
                            </div>
                        </div>
                    </div>
                `;
                alertsList.appendChild(card);
            });
        }

        // Vote handlers
        alertsList.querySelectorAll('.btn-vote').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const alertId = e.target.dataset.alert;
                e.target.textContent = '✅';
                e.target.disabled = true;
                await window.KidoaSafe.voteAlert(alertId);
                window.KidoaSound.play('click');
            });
        });

        // Modal logic
        const modal = document.getElementById('report-modal');
        let selectedType = 'CONSTRUCTION';

        document.getElementById('report-alert-btn').addEventListener('click', () => {
            modal.classList.remove('hidden');
        });

        document.getElementById('close-report').addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        // Type selector
        modal.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                modal.querySelectorAll('.type-btn').forEach(b => b.classList.remove('selected'));
                e.target.classList.add('selected');
                selectedType = e.target.dataset.type;
            });
        });

        // Submit alert
        document.getElementById('submit-alert').addEventListener('click', async () => {
            const title = document.getElementById('alert-title').value.trim();
            const location = document.getElementById('alert-location').value.trim();
            const desc = document.getElementById('alert-desc').value.trim();

            if (!title || !location) {
                alert("Título y lugar son obligatorios.");
                return;
            }

            const submitBtn = document.getElementById('submit-alert');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';

            const success = await window.KidoaSafe.reportAlert({
                type: selectedType,
                title,
                location,
                description: desc
            });

            if (success) {
                modal.classList.add('hidden');
                alert("✅ Alerta reportada. ¡Gracias por cuidar a la comunidad! +20 puntos");
                window.KidoaSafePage.render(container);
            } else {
                alert("Error al enviar. Inténtalo de nuevo.");
            }

            submitBtn.disabled = false;
            submitBtn.textContent = 'Enviar Alerta';
        });
    }
};

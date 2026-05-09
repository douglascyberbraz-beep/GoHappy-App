window.GoHappySafePage = {
    render: async (container) => {
        container.innerHTML = `
            <div class="safe-page stagger-group">
                <div class="page-header center-text">
                    <h2 style="color: var(--primary-cobalt); font-weight: 800;">🛡️ SAFE</h2>
                    <p style="color: #888; font-size: 13px;">Alertas de seguridad en tu zona</p>
                </div>

                <div id="ai-safe-insight" class="info-alert" style="margin: 0 15px 15px 15px; padding: 12px; background: linear-gradient(135deg, rgba(11, 113, 252, 0.05), rgba(6, 254, 254, 0.1)); border-radius: 12px; border-left: 4px solid var(--primary-cobalt); font-size: 13px; color: var(--primary-cobalt); line-height: 1.4; display: none;">
                    <span style="font-weight: 800;">✨ GoHappy IA:</span> <span id="ai-safe-text">Analizando tu zona...</span>
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

        // Load alerts first
        const alerts = await window.GoHappySafe.getAlerts();
        alertsList.innerHTML = '';

        if (alerts.length === 0) {
            alertsList.innerHTML = `
                <div class="center-text p-40" style="color:#aaa;">
                    <div style="font-size: 40px; margin-bottom: 15px;">🛡️</div>
                    <h3 style="color: var(--primary-cobalt);">Todo despejado</h3>
                    <p style="font-size: 14px;">No hay alertas de seguridad activas en tu zona ahora mismo.</p>
                </div>
            `;
        } else {
            alerts.forEach(alert => {
                const typeInfo = window.GoHappySafe.ALERT_TYPES[alert.type] || window.GoHappySafe.ALERT_TYPES.INFO;
                const card = document.createElement('div');
                card.className = 'alert-card entry-anim';
                card.style.cssText = 'display:flex; gap:12px; padding:16px; background:white; border-radius:20px; margin:0 15px 12px; box-shadow:0 4px 16px rgba(11,76,143,0.06); border-left:4px solid ' + typeInfo.color;
                card.innerHTML = `
                    <div class="alert-icon" style="background:${typeInfo.color}15; color:${typeInfo.color}; font-size:1.5rem; width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                        ${typeInfo.icon}
                    </div>
                    <div class="alert-card-body" style="flex:1; min-width:0;">
                        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                            <span style="color:${typeInfo.color}; font-size:11px; font-weight:800; text-transform:uppercase;">${typeInfo.label}</span>
                            <span style="color:#94a3b8; font-size:11px;">${alert.timeAgo || 'Reciente'}</span>
                        </div>
                        <h4 style="margin:4px 0 2px; color:var(--primary-cobalt); font-size:15px; font-weight:800;">${alert.title}</h4>
                        <p style="font-size:12px; color:#64748b;">📍 ${alert.location}</p>
                        <p style="font-size:13px; color:#475569; margin-top:6px; line-height:1.4;">${alert.description}</p>
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px; padding-top:10px; border-top:1px solid #f1f5f9;">
                            <span style="font-size:11px; color:#94a3b8;">👤 ${alert.reportedBy || 'Anónimo'}</span>
                            <div style="display:flex; align-items:center; gap:8px;">
                                <span style="font-size:12px; color:#64748b;">👍 ${alert.votes || 0}</span>
                                <button class="btn-vote" data-alert="${alert.id}" style="background:rgba(11,76,143,0.08); color:var(--primary-cobalt); border:none; padding:5px 12px; border-radius:14px; font-size:11px; font-weight:800; cursor:pointer;">Confirmar</button>
                            </div>
                        </div>
                    </div>
                `;
                alertsList.appendChild(card);
            });
        }

        // Load AI Insight asynchronously AFTER alerts are loaded
        setTimeout(async () => {
            if (window.GEMINI_PROXY_ACTIVE && window.GoHappyAI?.getDailySafeInsight) {
                insightBox.style.display = 'block';
                insightText.innerHTML = '<span class="typing-dots"><span></span><span></span><span></span></span>';
                
                try {
                    let coords = "41.6520, -4.7286";
                    try {
                        const pos = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 }));
                        if (pos) coords = `${pos.coords.latitude}, ${pos.coords.longitude}`;
                    } catch (e) { }

                    const insight = await window.GoHappyAI.getDailySafeInsight(coords, alerts);
                    if (insight && insight.length > 5) {
                        insightText.innerText = insight;
                    } else {
                        insightBox.style.display = 'none';
                    }
                } catch (e) {
                    insightBox.style.display = 'none';
                }
            }
        }, 100);

        // Vote handlers
        alertsList.querySelectorAll('.btn-vote').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const alertId = e.target.dataset.alert;
                e.target.textContent = '✅';
                e.target.disabled = true;
                await window.GoHappySafe.voteAlert(alertId);
                window.GoHappySound.play('click');
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
                window.GoHappyToast.warning('El título y el lugar son obligatorios.');
                return;
            }

            const submitBtn = document.getElementById('submit-alert');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Enviando...';

            const success = await window.GoHappySafe.reportAlert({
                type: selectedType,
                title,
                location,
                description: desc
            });

            if (success) {
                modal.classList.add('hidden');
                // Los puntos ya los suma reportAlert internamente
                window.GoHappyToast.points('¡Alerta reportada! +20 pts. ¡Gracias por cuidar a la comunidad!');
                window.GoHappySafePage.render(container);
            } else {
                window.GoHappyToast.error('Error al enviar. Inicia sesión con cuenta real (los invitados no pueden reportar).');
            }

            submitBtn.disabled = false;
            submitBtn.textContent = 'Enviar Alerta';
        });
    }
};


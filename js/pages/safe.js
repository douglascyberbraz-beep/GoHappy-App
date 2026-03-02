window.KindrSafePage = {
    render: async (container) => {
        container.innerHTML = `
            <div class="safe-page">
                <div class="page-header center-text">
                    <h2 style="color: var(--primary-navy); font-weight: 800;">🛡️ KINDR Safe</h2>
                    <p style="color: #888; font-size: 13px;">Alertas de seguridad en tu zona</p>
                </div>

                <div class="safe-report-bar premium-glass" style="display: flex; justify-content: center; padding: 12px;">
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

        // Load alerts
        const alerts = await window.KindrSafe.getAlerts();
        alertsList.innerHTML = '';

        if (alerts.length === 0) {
            alertsList.innerHTML = '<p class="center-text p-20" style="color:#888;">No hay alertas activas en tu zona. ¡Buenas noticias! 🎉</p>';
        } else {
            alerts.forEach(alert => {
                const typeInfo = window.KindrSafe.ALERT_TYPES[alert.type] || window.KindrSafe.ALERT_TYPES.INFO;
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
                await window.KindrSafe.voteAlert(alertId);
                window.KindrSound.play('click');
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

            const success = await window.KindrSafe.reportAlert({
                type: selectedType,
                title,
                location,
                description: desc
            });

            if (success) {
                modal.classList.add('hidden');
                alert("✅ Alerta reportada. ¡Gracias por cuidar a la comunidad! +20 puntos");
                window.KindrSafePage.render(container);
            } else {
                alert("Error al enviar. Inténtalo de nuevo.");
            }

            submitBtn.disabled = false;
            submitBtn.textContent = 'Enviar Alerta';
        });
    }
};

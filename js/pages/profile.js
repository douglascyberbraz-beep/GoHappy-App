window.KindrProfile = {
    render: (container) => {
        const user = window.KindrAuth.checkAuth();
        if (!user) {
            container.innerHTML = `<div class="p-20 center-text"><p>Inicia sesión para ver tu perfil.</p></div>`;
            return;
        }

        const levelInfo = window.KindrPoints.getLevelInfo(user.points);

        container.innerHTML = `
            <div class="profile-page">
                <div class="profile-hero center-text">
                    <div class="profile-avatar-large gradient-bg">${user.photo || '👤'}</div>
                    <h2 class="profile-name">${user.nickname || 'Usuario Kindr'}</h2>
                    <p class="profile-email">${user.email}</p>
                </div>

                <div class="profile-section gamification-card premium-glass">
                    <div class="level-header">
                        <span class="level-badge">${levelInfo.icon} ${levelInfo.name}</span>
                        <span class="points-total"><strong>${user.points}</strong> pts</span>
                    </div>
                    <div class="level-progress-container">
                        <div class="level-progress-bar" style="width: ${levelInfo.progress}%"></div>
                    </div>
                    <p class="level-footer">
                        ${levelInfo.nextPoints ? `Te faltan ${levelInfo.nextPoints - user.points} pts para el siguiente nivel` : '¡Nivel máximo alcanzado!'}
                    </p>
                </div>

                <div class="profile-section invite-card premium-glass">
                    <h3>🎁 Invita y Gana</h3>
                    <p>Gana 100 puntos por cada amigo que se registre con tu código.</p>
                    
                    <div id="referral-qr" class="referral-qr"></div>
                    
                    <div class="referral-code-box">
                        <span id="ref-code">${user.referralCode}</span>
                        <button id="copy-ref-link" class="btn-secondary small">Copiar Enlace</button>
                    </div>
                </div>

                <div class="profile-section premium-glass" style="padding: 15px; border-radius: 20px; margin-bottom: 20px;">
                    <h3 style="font-size: 14px; color: var(--primary-navy); margin-bottom: 12px;">📌 Más</h3>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                        <button class="profile-quick-btn" data-goto="memories" style="background:#f5f5f5; border:none; padding:12px 8px; border-radius:14px; cursor:pointer; text-align:center;">
                            <span style="display:block; font-size:1.3rem;">📖</span>
                            <span style="font-size:11px; font-weight:600; color:var(--primary-navy);">Memories</span>
                        </button>
                        <button class="profile-quick-btn" data-goto="news" style="background:#f5f5f5; border:none; padding:12px 8px; border-radius:14px; cursor:pointer; text-align:center;">
                            <span style="display:block; font-size:1.3rem;">✨</span>
                            <span style="font-size:11px; font-weight:600; color:var(--primary-navy);">Noticias</span>
                        </button>
                        <button class="profile-quick-btn" data-goto="events" style="background:#f5f5f5; border:none; padding:12px 8px; border-radius:14px; cursor:pointer; text-align:center;">
                            <span style="display:block; font-size:1.3rem;">🎈</span>
                            <span style="font-size:11px; font-weight:600; color:var(--primary-navy);">Eventos</span>
                        </button>
                    </div>
                </div>

                <div class="profile-actions" style="margin-top: 10px;">
                    <button id="install-pwa-btn" class="btn-primary full-width" style="display:none; margin-bottom: 10px;">📲 Instalar App</button>
                    <button id="terms-link" class="btn-text full-width" style="margin-bottom: 10px; color: var(--primary-blue);">📜 Términos y Condiciones</button>
                    <button id="logout-btn" class="btn-outline full-width">Cerrar Sesión</button>
                </div>
            </div>
        `;

        // Generate QR Code
        setTimeout(() => {
            const qrContainer = document.getElementById('referral-qr');
            if (qrContainer && window.QRCode) {
                new QRCode(qrContainer, {
                    text: `https://kindr.app/invite/${user.referralCode}`,
                    width: 128,
                    height: 128,
                    colorDark: "#001d3d",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.H
                });
            }
        }, 100);

        // Copy Link Logic
        document.getElementById('copy-ref-link').addEventListener('click', () => {
            const link = `https://kindr.app/join?ref=${user.referralCode}`;
            navigator.clipboard.writeText(link).then(() => {
                const btn = document.getElementById('copy-ref-link');
                btn.innerText = '¡Copiado!';
                btn.classList.add('success');
                setTimeout(() => {
                    btn.innerText = 'Copiar Enlace';
                    btn.classList.remove('success');
                }, 2000);
            });
        });

        // Quick navigation buttons
        container.querySelectorAll('.profile-quick-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                window.KindrApp.loadPage(btn.dataset.goto);
            });
        });

        // Terms & Conditions link
        document.getElementById('terms-link').addEventListener('click', () => {
            window.KindrApp.loadPage('legal');
        });

        // PWA Install
        const installBtn = document.getElementById('install-pwa-btn');
        if (window.deferredPrompt) {
            installBtn.style.display = 'block';
            installBtn.addEventListener('click', async () => {
                window.deferredPrompt.prompt();
                const result = await window.deferredPrompt.userChoice;
                if (result.outcome === 'accepted') {
                    installBtn.style.display = 'none';
                }
                window.deferredPrompt = null;
            });
        }

        document.getElementById('logout-btn').addEventListener('click', () => {
            window.KindrAuth.logout();
        });
    }
};

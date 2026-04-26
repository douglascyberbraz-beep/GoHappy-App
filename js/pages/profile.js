window.GoHappyProfile = {
    render: async (container) => {
        container.innerHTML = `<div class="p-20 center-text"><div class="typing-dots"><span></span><span></span><span></span></div><p>Sincronizando con la nube...</p></div>`;

        const user = window.GoHappyAuth.checkAuth();

        if (!user) {
            container.innerHTML = `
                <div class="p-20 center-text entry-anim">
                    <div style="font-size: 5rem; margin-bottom: 30px; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.1));">🕶️</div>
                    <h3 style="color: var(--primary-cobalt); font-size: 20px; font-weight: 800;">¿Quién eres?</h3>
                    <p style="color: #666; margin-top: 10px;">Identifícate para desbloquear tu nivel, puntos y premios exclusivos.</p>
                    <button id="login-from-profile" class="btn-primary" style="margin-top: 30px; padding: 15px 40px; font-size: 16px;">Entrar a GoHappy</button>
                    <p style="font-size: 12px; color: #aaa; margin-top: 20px;">Únete a miles de familias 🌍</p>
                </div>
            `;
            document.getElementById('login-from-profile').addEventListener('click', () => {
                window.GoHappyAuth.renderAuthModal();
            });
            return;
        }

        const levelInfo = window.GoHappyPoints.getLevelInfo(user.points);

        container.innerHTML = `
            <div class="profile-page entry-anim" style="padding-bottom: 120px; background: #f8fafc;">
                <div class="profile-hero-premium" style="background: white; padding: 40px 20px; border-radius: 0 0 50px 50px; margin-bottom: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); width: 100%; display: flex; flex-direction: column; align-items: center;">
                    <div class="profile-avatar-wrapper" id="open-avatar-editor" style="cursor: pointer; position: relative; margin-bottom: 20px;">
                        <div class="profile-avatar-large profile-glow" style="width: 110px; height: 110px; border-radius: 50%; font-size: 60px; background: white; border: 4px solid var(--primary-cobalt); display: flex; align-items: center; justify-content: center; box-shadow: 0 15px 35px rgba(11, 113, 252, 0.2);">${user.photo || '👤'}</div>
                        <div class="level-label-bubble" style="background: var(--primary-cobalt); color: white; font-weight: 800; padding: 6px 18px; border-radius: 20px; position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%); font-size: 12px; box-shadow: 0 5px 15px rgba(11, 113, 252, 0.3);">Nivel ${user.level || '1'}</div>
                    </div>
                    <div class="profile-info-header" style="text-align: center;">
                        <h2 class="profile-name-premium" style="color: var(--primary-navy); font-weight: 900; font-size: 1.8rem; margin: 0;">${user.nickname || 'Explorador'}</h2>
                        <p style="color: #64748b; font-size: 13px; font-weight: 600; margin-top: 5px;">${user.email || 'Miembro de la Tribu'}</p>
                    </div>
                </div>

                <div class="gamification-dashboard premium-glass">
                    <div class="dashboard-header">
                        <div class="points-circle">
                            <span class="big-pts">${user.points}</span>
                            <span class="pts-label">PUNTOS</span>
                        </div>
                        <div class="level-status">
                            <h3 style="margin:0; font-size: 18px;">${levelInfo.icon} ${levelInfo.name}</h3>
                            <p style="font-size: 12px; opacity: 0.8; margin-top: 5px;">
                                ${levelInfo.nextPoints ? `Próximo: ${levelInfo.nextPoints} pts` : '¡Máximo Nivel!'}
                            </p>
                        </div>
                    </div>
                    
                    <div class="premium-progress-container">
                        <div class="premium-progress-bar" style="width: ${levelInfo.progress}%">
                            <div class="progress-glow"></div>
                        </div>
                    </div>
                    <p class="progress-flavor-text">${levelInfo.progress === 100 ? '¡Eres una leyenda!' : `Estás al ${Math.floor(levelInfo.progress)}% de tu siguiente reto.`}</p>
                </div>

                <div class="quick-grid">
                    <div class="quick-card card-anim" data-goto="memories">
                        <span class="q-icon">📸</span>
                        <h4>Recuerdos</h4>
                        <p>Mis fotos</p>
                    </div>
                    <div class="quick-card card-anim" id="share-app-btn">
                        <span class="q-icon">🎁</span>
                        <h4>Invitar</h4>
                        <p>+100 pts</p>
                    </div>
                </div>

                <div class="referral-premium-box premium-glass" style="margin: 20px 0; padding: 25px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.4);">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h3 style="color: var(--primary-cobalt); font-weight: 900; margin: 0;">¡Invita y Gana! 🎁</h3>
                        <p style="font-size: 13px; color: #64748b; margin-top: 5px;">Gana 500 puntos por cada amigo que se una.</p>
                    </div>
                    
                    <div style="display: flex; gap: 20px; align-items: center; background: white; padding: 15px; border-radius: 20px; box-shadow: var(--shadow-soft);">
                        <div id="referral-qr" style="width: 100px; height: 100px; background: #f8fafc; border-radius: 12px; display: flex; align-items: center; justify-content: center;"></div>
                        <div style="flex: 1;">
                            <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">Tu código personal</div>
                            <div id="ref-code-display" style="font-size: 1.5rem; font-weight: 900; color: var(--primary-cobalt); letter-spacing: 1px;">${user.referralCode || 'GH-123'}</div>
                            <button id="copy-ref-link" style="margin-top: 10px; background: var(--primary-cobalt); color: white; border: none; padding: 8px 15px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer;">Copiar Enlace</button>
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN MI FAMILIA -->
                <div id="family-section" style="margin: 0 20px 20px; padding: 24px; background: white; border-radius: 28px; box-shadow: 0 4px 15px rgba(0,0,0,0.06);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                        <h3 style="color:var(--primary-cobalt); font-weight:900; margin:0; font-size:1rem;">👨‍👩‍👧‍👦 Mi Familia</h3>
                        <div id="family-loading" style="font-size:12px; color:#94a3b8;">Cargando...</div>
                    </div>
                    <div id="family-content"></div>
                </div>

                <div class="account-actions-list">
                    <button id="terms-link" class="action-list-item">
                        <span>📜 Términos y Soporte</span>
                        <span class="arrow">→</span>
                    </button>
                    <button id="logout-btn" class="action-list-item danger">
                        <span>🚪 Cerrar Sesión</span>
                    </button>
                </div>
            </div>
        `;

        // Interaction logic
        document.getElementById('logout-btn').onclick = () => window.GoHappyAuth.logout();

        // Cargar datos de familia de forma asíncrona (no bloquea el render)
        window.GoHappyProfile._loadFamilySection(user);

        document.getElementById('copy-ref-link').onclick = (e) => {
            const link = `https://GoHappy.app/invite/${user.referralCode}`;
            navigator.clipboard.writeText(link);
            e.target.innerText = "¡Copiado! ✅";
            window.GoHappySound.play('success');
            setTimeout(() => e.target.innerText = "Copiar Enlace de Invitación", 2000);
        };

        document.getElementById('share-app-btn').onclick = () => {
            const shareData = {
                title: 'Únete a GoHappy',
                text: `¡Hola! Únete a GoHappy y explora planes increíbles en familia. Usa mi código: ${user.referralCode}`,
                url: `https://GoHappy.app/invite/${user.referralCode}`
            };
            if (navigator.share) {
                navigator.share(shareData).catch(() => {
                    document.getElementById('copy-ref-link').click();
                });
            } else {
                document.getElementById('copy-ref-link').click();
            }
        };

        document.getElementById('terms-link').onclick = () => {
            window.GoHappyApp.loadPage('legal');
        };

        document.getElementById('open-avatar-editor').onclick = () => {
            const modal = document.createElement('div');
            modal.className = 'modal entry-anim';
            modal.innerHTML = `
                <div class="auth-container" style="padding: 20px;">
                    <div class="auth-card premium-glass" style="padding: 30px; border-radius: 35px;">
                        <h3 style="color:var(--primary-cobalt); text-align:center; font-weight:900; margin-bottom:20px;">Cambiar Avatar</h3>
                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px;">
                            ${['👤', '🦁', '🐼', '🦄', '🦊', '🤖', '👩‍🚀', '🦒'].map(emoji => `
                                <div class="avatar-option" data-emoji="${emoji}" style="font-size: 35px; background: white; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; border-radius: 50%; cursor: pointer; border: 2px solid transparent; ${user.photo === emoji ? 'border-color: var(--primary-cobalt); background: rgba(11, 113, 252, 0.1);' : ''}">${emoji}</div>
                            `).join('')}
                        </div>
                        <button id="save-avatar-btn" class="btn-primary-gradient full-width" style="height: 55px; font-weight: 800;">Guardar Cambios</button>
                        <button class="btn-text full-width" style="margin-top:15px;" onclick="this.closest('.modal').remove()">Cancelar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            let selected = user.photo;
            modal.querySelectorAll('.avatar-option').forEach(opt => {
                opt.onclick = () => {
                    modal.querySelectorAll('.avatar-option').forEach(o => {
                        o.style.borderColor = 'transparent';
                        o.style.background = 'white';
                    });
                    opt.style.borderColor = 'var(--primary-cobalt)';
                    opt.style.background = 'rgba(11, 113, 252, 0.1)';
                    selected = opt.dataset.emoji;
                };
            });

            document.getElementById('save-avatar-btn').onclick = async () => {
                try {
                    await window.GoHappyDB.collection('users').doc(user.uid).update({ photo: selected });
                    user.photo = selected;
                    localStorage.setItem('GoHappy_local_user', JSON.stringify(user));
                    modal.remove();
                    window.GoHappyProfile.render(container);
                    window.GoHappySound.play('success');
                } catch (e) {
                    alert("Error al guardar el avatar.");
                }
            };
        };

        container.querySelectorAll('.quick-card[data-goto]').forEach(card => {
            card.onclick = () => {
                const target = card.dataset.goto;
                if (target) {
                    window.GoHappySound.play('click');
                    window.GoHappyApp.loadPage(target);
                }
            };
        });

        // Generate QR
        setTimeout(() => {
            const qrContainer = document.getElementById('referral-qr');
            if (qrContainer && window.QRCode) {
                new QRCode(qrContainer, {
                    text: `https://GoHappy.app/invite/${user.referralCode}`,
                    width: 100,
                    height: 100,
                    colorDark: "#0B71FC",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.M
                });
            }
        }, 300);
    },

    _loadFamilySection: async (user) => {
        const loadingEl = document.getElementById('family-loading');
        const contentEl = document.getElementById('family-content');
        if (!contentEl) return;

        try {
            if (!user.familyId) {
                // Sin familia — mostrar CTA
                if (loadingEl) loadingEl.style.display = 'none';
                contentEl.innerHTML = `
                    <div style="text-align:center; padding:10px 0 5px;">
                        <div style="font-size:40px; margin-bottom:12px;">🏠</div>
                        <p style="color:#64748b; font-size:13px; margin-bottom:18px; line-height:1.5;">
                            Aún no perteneces a ninguna familia.<br>
                            <strong>¡Crea la tuya o únete con un código!</strong>
                        </p>
                        <button id="setup-family-btn" style="
                            background:linear-gradient(135deg,#0B71FC,#0B4C8F); color:white;
                            border:none; padding:14px 28px; border-radius:16px;
                            font-size:14px; font-weight:800; cursor:pointer; width:100%;
                            box-shadow:0 8px 20px rgba(11,113,252,0.25);
                        ">
                            👨‍👩‍👧‍👦 Crear o Unirme a una Familia
                        </button>
                    </div>
                `;
                document.getElementById('setup-family-btn').onclick = () => {
                    if (window.GoHappyFamilyOnboarding) window.GoHappyFamilyOnboarding.show();
                };
                return;
            }

            // Con familia — cargar datos
            const family = await window.GoHappyFamilies.getMyFamily();
            if (loadingEl) loadingEl.style.display = 'none';

            if (!family) {
                contentEl.innerHTML = `<p style="color:#94a3b8; font-size:13px; text-align:center;">Error al cargar los datos de la familia.</p>`;
                return;
            }

            const esAdmin = user.rol === 'admin';
            const miembros = family.miembrosData || [];

            contentEl.innerHTML = `
                <!-- Nombre y código -->
                <div style="background:linear-gradient(135deg,rgba(11,113,252,0.05),rgba(6,254,254,0.1)); border-radius:20px; padding:18px; margin-bottom:16px; border:1px solid rgba(11,113,252,0.1);">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <div style="font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase; margin-bottom:4px;">Familia</div>
                            <div style="font-size:1.2rem; font-weight:900; color:var(--primary-cobalt);">${family.nombre}</div>
                            <div style="font-size:11px; color:#64748b; margin-top:2px;">${esAdmin ? '👑 Administrador' : '👤 Miembro'}</div>
                        </div>
                        ${esAdmin ? `
                            <div style="text-align:right;">
                                <div style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; margin-bottom:6px;">Código de invitación</div>
                                <div style="font-size:1.5rem; font-weight:900; color:var(--primary-cobalt); letter-spacing:6px; font-family:monospace;">${family.codigoInvitacion}</div>
                                <button id="copy-family-code" style="margin-top:8px; background:var(--primary-cobalt); color:white; border:none; padding:6px 14px; border-radius:10px; font-size:11px; font-weight:700; cursor:pointer;">
                                    📋 Copiar
                                </button>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Miembros -->
                <div style="margin-bottom:16px;">
                    <div style="font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase; margin-bottom:12px;">
                        Miembros (${miembros.length}/6)
                    </div>
                    <div style="display:flex; flex-wrap:wrap; gap:12px;">
                        ${miembros.map(m => `
                            <div style="display:flex; align-items:center; gap:10px; background:#f8fafc; padding:10px 14px; border-radius:16px; flex:1; min-width:140px;">
                                <div style="font-size:28px; background:white; border-radius:50%; width:42px; height:42px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                                    ${m.photo || '👤'}
                                </div>
                                <div>
                                    <div style="font-size:13px; font-weight:800; color:#1e293b;">${m.nickname || 'Miembro'} ${m.uid === user.uid ? '<span style="font-size:10px; color:var(--primary-cobalt);">(tú)</span>' : ''}</div>
                                    <div style="font-size:11px; color:#64748b;">⭐ ${m.points || 0} pts</div>
                                </div>
                            </div>
                        `).join('')}
                        ${miembros.length < 6 ? `
                            <div id="invite-family-slot" style="display:flex; align-items:center; justify-content:center; gap:8px; background:rgba(11,113,252,0.05); padding:10px 14px; border-radius:16px; flex:1; min-width:140px; border:2px dashed rgba(11,113,252,0.2); cursor:pointer;">
                                <span style="font-size:22px; color:rgba(11,113,252,0.4);">+</span>
                                <span style="font-size:12px; font-weight:700; color:rgba(11,113,252,0.5);">Invitar</span>
                            </div>
                        ` : ''}
                    </div>
                </div>

                ${!esAdmin ? `
                    <button id="leave-family-btn" style="
                        width:100%; padding:12px; border-radius:14px; border:2px solid rgba(231,76,60,0.2);
                        background:rgba(231,76,60,0.05); color:#E74C3C; font-size:13px;
                        font-weight:700; cursor:pointer; margin-top:4px;
                    ">🚪 Salir de la familia</button>
                ` : ''}
            `;

            // Botón copiar código (solo admin)
            const copyBtn = document.getElementById('copy-family-code');
            if (copyBtn) {
                copyBtn.onclick = () => {
                    navigator.clipboard.writeText(family.codigoInvitacion).then(() => {
                        window.GoHappyToast.success(`Código "${family.codigoInvitacion}" copiado`);
                    });
                };
            }

            // Slot invitar abre el onboarding (para que compartan el código)
            const inviteSlot = document.getElementById('invite-family-slot');
            if (inviteSlot) {
                inviteSlot.onclick = () => {
                    navigator.clipboard.writeText(family.codigoInvitacion).then(() => {
                        window.GoHappyToast.info(`Comparte el código ${family.codigoInvitacion} con tu familia`);
                    });
                };
            }

            // Botón salir
            const leaveBtn = document.getElementById('leave-family-btn');
            if (leaveBtn) {
                leaveBtn.onclick = async () => {
                    if (!confirm('¿Seguro que quieres salir de la familia? Perderás el progreso compartido.')) return;
                    try {
                        await window.GoHappyFamilies.leaveFamily();
                        window.GoHappyToast.info('Has salido de la familia.');
                        window.GoHappyApp.loadPage('profile');
                    } catch (e) {
                        window.GoHappyToast.error(e.message || 'Error al salir de la familia.');
                    }
                };
            }

        } catch (e) {
            console.warn('_loadFamilySection error:', e);
            if (loadingEl) loadingEl.style.display = 'none';
            if (contentEl) contentEl.innerHTML = `<p style="color:#94a3b8; font-size:13px; text-align:center;">No se pudo cargar la información familiar.</p>`;
        }
    }
};


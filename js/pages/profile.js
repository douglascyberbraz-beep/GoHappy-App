window.GoHappyProfile = {
    render: async (container) => {
        const T = window.t || (k => k);
        container.innerHTML = `<div class="p-20 center-text"><div class="typing-dots"><span></span><span></span><span></span></div><p>${T('profile.loading')}</p></div>`;

        const user = window.GoHappyAuth.checkAuth();

        if (!user) {
            container.innerHTML = `
                <div class="p-20 center-text entry-anim" style="padding-top: calc(var(--safe-top, 44px) + 60px);">
                    <div style="font-size: 5rem; margin-bottom: 30px; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.1));">🕶️</div>
                    <h3 style="color: var(--primary-cobalt); font-size: 20px; font-weight: 800;">${T('profile.guest.title')}</h3>
                    <p style="color: #666; margin-top: 10px;">${T('profile.guest.sub')}</p>
                    <button id="login-from-profile" class="btn-primary" style="margin-top: 30px; padding: 15px 40px; font-size: 16px;">${T('profile.guest.btn')}</button>
                    <p style="font-size: 12px; color: #aaa; margin-top: 20px;">${T('profile.guest.foot')}</p>
                </div>
            `;
            document.getElementById('login-from-profile').addEventListener('click', () => {
                window.GoHappyAuth.renderAuthModal();
            });
            return;
        }

        const levelInfo = window.GoHappyPoints.getLevelInfo(user.points);

        container.innerHTML = `
            <div class="profile-page-premium stagger-group">
                <div class="profile-hero-premium">
                    <div class="profile-avatar-wrapper" id="open-avatar-editor">
                        <div class="profile-avatar-large profile-glow">${user.photo || '👤'}</div>
                        <div class="level-badge-premium">${levelInfo.icon} ${levelInfo.name}</div>
                    </div>
                    <div class="profile-meta-header">
                        <h2 class="profile-name-main">${user.nickname || 'Explorador'}</h2>
                        <p class="profile-email-sub">${user.email || 'Miembro GoHappy'}</p>
                    </div>
                </div>

                <div class="gamification-card-premium">
                    <div class="g-card-header">
                        <div class="g-points-display">
                            <span class="g-points-val">${user.points}</span>
                            <label>${T('profile.points')}</label>
                        </div>
                        <div class="g-level-info">
                            <h3>${levelInfo.icon} ${levelInfo.name}</h3>
                            <p>${levelInfo.nextPoints ? T('profile.next.level', { n: levelInfo.nextPoints - user.points }) : T('profile.max.level')}</p>
                        </div>
                    </div>
                    
                    <div class="g-progress-wrapper">
                        <div class="g-progress-track">
                            <div class="g-progress-fill" style="width: ${levelInfo.progress}%">
                                <div class="fill-glow"></div>
                            </div>
                        </div>
                        <div class="g-progress-stats">
                            <span>${Math.floor(levelInfo.progress)}%</span>
                            <span>${levelInfo.nextPoints || 'Max'} pts</span>
                        </div>
                    </div>
                </div>

                <div class="profile-action-grid">
                    <div class="action-card-glass" data-goto="memories">
                        <div class="a-icon">📸</div>
                        <div class="a-text">
                            <h4>${T('profile.memories')}</h4>
                            <p>${T('profile.my.photos')}</p>
                        </div>
                    </div>
                    <div class="action-card-glass" id="share-app-btn">
                        <div class="a-icon">🎁</div>
                        <div class="a-text">
                            <h4>${T('profile.invite')}</h4>
                            <p>${T('profile.invite.gain')}</p>
                        </div>
                    </div>
                </div>

                <!-- Flujo D: Family DNA (perfil familiar generado por IA) -->
                <div id="family-dna-box" style="margin: 20px 16px; padding: 22px; border-radius: 28px; background: linear-gradient(135deg, rgba(11,113,252,0.08), rgba(23,200,212,0.10)); border: 0.5px solid rgba(11,76,143,0.15); backdrop-filter: blur(14px) saturate(180%); box-shadow: 0 6px 20px rgba(11,76,143,0.08); display:none;">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
                        <span style="font-size:24px;">🧬</span>
                        <h3 style="color:var(--primary-cobalt); font-weight:900; margin:0; font-size:1rem;" id="dna-title">${(window.GoHappyI18n?.lang === 'en') ? 'Your family DNA' : 'Vuestro ADN familiar'}</h3>
                    </div>
                    <div id="dna-tags" style="display:flex; flex-wrap:wrap; gap:8px; margin-bottom:10px;"></div>
                    <p id="dna-insight" style="font-size:13px; color:var(--text-primary); line-height:1.45; margin:0;"></p>
                </div>

                <div class="referral-premium-box premium-glass" style="margin: 20px 0; padding: 25px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.4);">
                    <div style="text-align: center; margin-bottom: 20px;">
                        <h3 style="color: var(--primary-cobalt); font-weight: 900; margin: 0;">${T('profile.referral.title')}</h3>
                        <p style="font-size: 13px; color: #64748b; margin-top: 5px;">${T('profile.referral.sub')}</p>
                    </div>

                    <div style="display: flex; gap: 20px; align-items: center; background: white; padding: 15px; border-radius: 20px; box-shadow: var(--shadow-soft);">
                        <div id="referral-qr" style="width: 100px; height: 100px; background: #f8fafc; border-radius: 12px; display: flex; align-items: center; justify-content: center;"></div>
                        <div style="flex: 1;">
                            <div style="font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase;">${T('profile.your.code')}</div>
                            <div id="ref-code-display" style="font-size: 1.5rem; font-weight: 900; color: var(--primary-cobalt); letter-spacing: 1px;">${user.referralCode || 'GH-123'}</div>
                            <button id="copy-ref-link" style="margin-top: 10px; background: var(--primary-cobalt); color: white; border: none; padding: 8px 15px; border-radius: 10px; font-size: 12px; font-weight: 700; cursor: pointer;">${T('profile.copy.link')}</button>
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN MI FAMILIA -->
                <div id="family-section" style="margin: 0 20px 20px; padding: 24px; background: white; border-radius: 28px; box-shadow: 0 4px 15px rgba(0,0,0,0.06);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                        <h3 style="color:var(--primary-cobalt); font-weight:900; margin:0; font-size:1rem;">${T('profile.my.family')}</h3>
                        <div id="family-loading" style="font-size:12px; color:#94a3b8;">${T('profile.family.loading')}</div>
                    </div>
                    <div id="family-content"></div>
                    
                    <!-- INTEGRACIÓN INVISIBLE: OBJETIVOS FAMILIARES -->
                    <div style="margin-top: 24px; padding-top: 20px; border-top: 1px dashed #f1f5f9;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                            <h4 style="font-size:13px; font-weight:800; color:var(--text-dark); margin:0;">🎁 Objetivo Familiar</h4>
                            <span style="font-size:11px; font-weight:700; color:var(--primary-cobalt);">+1.500 pts</span>
                        </div>
                        <div style="background:#f8fafc; border-radius:14px; padding:12px; display:flex; align-items:center; gap:12px; border:1px solid #f1f5f9;">
                            <span style="font-size:24px;">🍕</span>
                            <div style="flex:1;">
                                <div style="font-size:12px; font-weight:700; color:#1e293b;">Tarde de Pizza & Cine</div>
                                <div style="height:6px; background:#e2e8f0; border-radius:3px; margin-top:6px; overflow:hidden;">
                                    <div style="width:65%; height:100%; background:var(--primary-cobalt); border-radius:3px;"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Acceso rápido a páginas — diseño premium con icono grande, sin Noticias -->
                <div class="profile-quick-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin:18px 16px;">
                    <button class="profile-quick-card" data-goto-page="my_family" style="background:linear-gradient(135deg,rgba(11,113,252,0.10),rgba(23,200,212,0.14)); border:0.5px solid rgba(11,113,252,0.20); border-radius:20px; padding:18px 14px; cursor:pointer; text-align:left; display:flex; flex-direction:column; gap:6px; box-shadow:0 4px 14px rgba(11,76,143,0.08); transition:transform 0.2s;">
                        <div style="font-size:28px;">👨‍👩‍👧</div>
                        <div style="font-weight:800; color:var(--primary-cobalt); font-size:14px;">${(window.GoHappyI18n?.lang === 'en') ? 'My Family' : 'Mi Familia'}</div>
                        <div style="font-size:11px; color:var(--text-secondary);">${(window.GoHappyI18n?.lang === 'en') ? 'Retos, photos & members' : 'Retos, fotos y miembros'}</div>
                    </button>
                    <button class="profile-quick-card" data-goto-page="memories" style="background:rgba(255,255,255,0.85); border:0.5px solid rgba(255,255,255,0.95); border-radius:20px; padding:18px 14px; cursor:pointer; text-align:left; display:flex; flex-direction:column; gap:6px; box-shadow:0 4px 14px rgba(11,76,143,0.08); transition:transform 0.2s;">
                        <div style="font-size:28px;">📸</div>
                        <div style="font-weight:800; color:var(--primary-cobalt); font-size:14px;">${(window.GoHappyI18n?.lang === 'en') ? 'Memories' : 'Recuerdos'}</div>
                        <div style="font-size:11px; color:var(--text-secondary);">${(window.GoHappyI18n?.lang === 'en') ? 'Your activity timeline' : 'Tu historial de aventuras'}</div>
                    </button>
                    <button class="profile-quick-card" data-goto-page="tribu" style="background:linear-gradient(135deg,rgba(168,85,247,0.08),rgba(236,72,153,0.10)); border:0.5px solid rgba(168,85,247,0.20); border-radius:20px; padding:18px 14px; cursor:pointer; text-align:left; display:flex; flex-direction:column; gap:6px; box-shadow:0 4px 14px rgba(168,85,247,0.10); transition:transform 0.2s;">
                        <div style="font-size:28px;">🏘️</div>
                        <div style="font-weight:800; color:#7C3AED; font-size:14px;">${(window.GoHappyI18n?.lang === 'en') ? 'Community' : 'Comunidad'}</div>
                        <div style="font-size:11px; color:var(--text-secondary);">${(window.GoHappyI18n?.lang === 'en') ? 'Tribe of parents' : 'Tribu de padres'}</div>
                    </button>
                    <button class="profile-quick-card" data-goto-page="safe" style="background:linear-gradient(135deg,rgba(239,68,68,0.06),rgba(245,158,11,0.10)); border:0.5px solid rgba(239,68,68,0.20); border-radius:20px; padding:18px 14px; cursor:pointer; text-align:left; display:flex; flex-direction:column; gap:6px; box-shadow:0 4px 14px rgba(239,68,68,0.08); transition:transform 0.2s;">
                        <div style="font-size:28px;">🛡️</div>
                        <div style="font-weight:800; color:#DC2626; font-size:14px;">${(window.GoHappyI18n?.lang === 'en') ? 'Safety alerts' : 'Alertas'}</div>
                        <div style="font-size:11px; color:var(--text-secondary);">${(window.GoHappyI18n?.lang === 'en') ? 'Community warnings' : 'Avisos comunitarios'}</div>
                    </button>
                </div>

                <div class="account-actions-list">
                    <button id="terms-link" class="action-list-item">
                        <span>${T('profile.terms')}</span>
                        <span class="arrow">→</span>
                    </button>
                    <button id="logout-btn" class="action-list-item danger">
                        <span>${T('profile.logout')}</span>
                    </button>
                </div>
            </div>
        `;

        // Interaction logic
        document.getElementById('logout-btn').onclick = () => window.GoHappyAuth.logout();

        // Bindings de navegación a páginas extra
        document.querySelectorAll('[data-goto-page]').forEach(btn => {
            btn.onclick = () => {
                const target = btn.dataset.gotoPage;
                if (target && window.GoHappyApp?.loadPage) window.GoHappyApp.loadPage(target);
            };
        });
        document.querySelectorAll('[data-goto]').forEach(btn => {
            btn.onclick = () => {
                const target = btn.dataset.goto;
                if (target && window.GoHappyApp?.loadPage) window.GoHappyApp.loadPage(target);
            };
        });

        // Cargar datos de familia de forma asíncrona (no bloquea el render)
        window.GoHappyProfile._loadFamilySection(user);

        // Flujo D: renderizar ADN familiar desde family_context
        window.GoHappyProfile._renderFamilyDNA();

        // ─── REFERIDO: URL base configurable ───
        const INVITE_BASE_URL = 'https://douglascyberbraz-beep.github.io/GoHappy-App/';
        const buildInviteLink = (code) => `${INVITE_BASE_URL}?ref=${encodeURIComponent(code || '')}`;

        document.getElementById('copy-ref-link').onclick = async (e) => {
            const link = buildInviteLink(user.referralCode);
            try {
                await navigator.clipboard.writeText(link);
            } catch (err) {
                // Fallback (HTTP / older browsers): textarea trick
                const ta = document.createElement('textarea');
                ta.value = link; document.body.appendChild(ta);
                ta.select(); document.execCommand('copy'); ta.remove();
            }
            const T = window.t || (k => k);
            e.target.innerText = T('profile.copied');
            window.GoHappySound && window.GoHappySound.play('success');
            window.GoHappyToast && window.GoHappyToast.success(T('profile.copied'), 2000);
            setTimeout(() => e.target.innerText = T('profile.copy.link'), 2400);
        };

        document.getElementById('share-app-btn').onclick = async () => {
            const lang = window.GoHappyI18n?.lang || 'es';
            const link = buildInviteLink(user.referralCode);
            const shareData = {
                title: 'GoHappy Family',
                text: lang === 'en'
                    ? `Hey! Join GoHappy and discover amazing family plans. Use my code ${user.referralCode} and I get 1000 pts 🎁`
                    : `¡Hola! Únete a GoHappy y descubre planes increíbles en familia. Usa mi código ${user.referralCode} y yo gano 1000 pts 🎁`,
                url: link
            };
            if (navigator.share) {
                try {
                    await navigator.share(shareData);
                } catch (err) {
                    if (err.name !== 'AbortError') {
                        document.getElementById('copy-ref-link').click();
                    }
                }
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
                const btn = document.getElementById('save-avatar-btn');
                const lang = window.GoHappyI18n?.lang || 'es';

                // Validar usuario real
                if (!user || !user.uid || user.isGuest) {
                    window.GoHappyToast.warning(lang === 'en' ? 'Sign in to save your avatar' : 'Inicia sesión para guardar tu avatar');
                    return;
                }
                if (!selected) {
                    window.GoHappyToast.warning(lang === 'en' ? 'Pick an avatar first' : 'Elige un avatar primero');
                    return;
                }

                btn.disabled = true;
                btn.textContent = lang === 'en' ? '⌛ Saving...' : '⌛ Guardando...';

                try {
                    // 1) Update Firestore (solo el campo permitido)
                    await window.GoHappyDB.collection('users').doc(user.uid).update({
                        photo: selected
                    });

                    // 2) Update local cache
                    user.photo = selected;
                    window.GoHappyAuth._currentUser = { ...window.GoHappyAuth._currentUser, photo: selected };
                    localStorage.setItem('GoHappy_local_user', JSON.stringify(window.GoHappyAuth._currentUser));

                    // 3) Feedback inmediato
                    window.GoHappySound && window.GoHappySound.play('success');
                    window.GoHappyToast.success(lang === 'en' ? '✓ Avatar saved' : '✓ Avatar guardado', 1800);

                    // 4) Cerrar modal y refrescar UI
                    modal.remove();
                    setTimeout(() => {
                        try { window.GoHappyProfile.render(container); } catch (e) { /* container puede estar fuera de DOM */ }
                    }, 100);
                } catch (e) {
                    console.error('[Profile] save avatar error:', e?.code, e?.message);
                    btn.disabled = false;
                    btn.textContent = lang === 'en' ? 'Save changes' : 'Guardar Cambios';

                    // Mensaje específico según código de error
                    let msg;
                    if (e?.code === 'permission-denied') {
                        msg = lang === 'en' ? 'No permission to save. Try signing out and in again.' : 'Sin permiso para guardar. Cierra sesión y vuelve a entrar.';
                    } else if (e?.code === 'unavailable' || e?.code === 'failed-precondition') {
                        msg = lang === 'en' ? 'No connection. Try again.' : 'Sin conexión. Inténtalo de nuevo.';
                    } else {
                        msg = (lang === 'en' ? 'Could not save: ' : 'No se pudo guardar: ') + (e?.message || 'error');
                    }
                    window.GoHappyToast.error(msg, 4000);
                }
            };
        };

        // Bind navegación de cards de acción (Recuerdos, etc)
        container.querySelectorAll('[data-goto]').forEach(card => {
            card.onclick = () => {
                const target = card.dataset.goto;
                if (target) {
                    window.GoHappySound && window.GoHappySound.play('click');
                    window.GoHappyApp.loadPage(target);
                }
            };
        });

        // --- REACTIVE SYNC --- evitar memory leak: remover listener anterior
        if (window.GoHappyProfile._syncListener) {
            window.removeEventListener('GoHappy-points-sync', window.GoHappyProfile._syncListener);
        }
        window.GoHappyProfile._syncListener = (e) => {
            if (window.GoHappyApp.currentPage === 'profile') {
                window.GoHappyProfile.render(container);
            }
        };
        window.addEventListener('GoHappy-points-sync', window.GoHappyProfile._syncListener);

        // Generate QR — URL real con el referral del usuario
        setTimeout(() => {
            const qrContainer = document.getElementById('referral-qr');
            if (qrContainer && window.QRCode) {
                qrContainer.innerHTML = ''; // limpiar previo
                new QRCode(qrContainer, {
                    text: buildInviteLink(user.referralCode),
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

            // Botón copiar código de familia → comparte LINK + texto
            const FAM_BASE_URL = 'https://douglascyberbraz-beep.github.io/GoHappy-App/';
            const buildFamilyLink = (code) => `${FAM_BASE_URL}?fam=${encodeURIComponent(code || '')}`;
            const lang = window.GoHappyI18n?.lang || 'es';
            const shareText = (code, name) => lang === 'en'
                ? `Join our family "${name}" on GoHappy 👨‍👩‍👧‍👦\nFamily code: ${code}\n${buildFamilyLink(code)}`
                : `Únete a nuestra familia "${name}" en GoHappy 👨‍👩‍👧‍👦\nCódigo: ${code}\n${buildFamilyLink(code)}`;

            const copyBtn = document.getElementById('copy-family-code');
            if (copyBtn) {
                copyBtn.onclick = async () => {
                    const txt = shareText(family.codigoInvitacion, family.nombre);
                    try {
                        if (navigator.share) {
                            await navigator.share({
                                title: 'GoHappy Family',
                                text: txt
                            });
                            return;
                        }
                    } catch (err) { if (err.name === 'AbortError') return; }
                    try {
                        await navigator.clipboard.writeText(txt);
                        window.GoHappyToast.success((window.t ? window.t('common.copied') : '¡Copiado!') + ' ' + family.codigoInvitacion);
                    } catch (err) {}
                };
            }

            const inviteSlot = document.getElementById('invite-family-slot');
            if (inviteSlot) {
                inviteSlot.onclick = async () => {
                    const txt = shareText(family.codigoInvitacion, family.nombre);
                    try {
                        if (navigator.share) {
                            await navigator.share({ title: 'GoHappy Family', text: txt });
                            return;
                        }
                    } catch (err) { if (err.name === 'AbortError') return; }
                    try {
                        await navigator.clipboard.writeText(txt);
                        window.GoHappyToast.info((window.t ? window.t('common.copied') : '¡Copiado!') + ' ' + family.codigoInvitacion);
                    } catch (err) {}
                };
            }

            // Botón salir
            const leaveBtn = document.getElementById('leave-family-btn');
            if (leaveBtn) {
                leaveBtn.onclick = async () => {
                    // Confirmación in-app (no usar confirm nativo bloqueante)
                    const ok = await window.GoHappyProfile._confirmDialog(
                        '¿Salir de la familia?',
                        'Perderás el progreso compartido. Esta acción no se puede deshacer.',
                        'Salir', 'Cancelar'
                    );
                    if (!ok) return;
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
    },

    // Confirmación in-app premium (reemplaza confirm() nativo)
    _confirmDialog: (title, message, okText = 'Aceptar', cancelText = 'Cancelar') => {
        return new Promise(resolve => {
            const modal = document.createElement('div');
            modal.className = 'modal entry-anim';
            modal.style.zIndex = '10000';
            modal.innerHTML = `
                <div class="auth-container" style="padding:0;">
                    <div style="background:white; border-radius:24px 24px 0 0; padding:28px 28px calc(env(safe-area-inset-bottom,20px) + 24px); text-align:center;">
                        <h3 style="color:var(--primary-cobalt); font-weight:900; margin-bottom:8px; font-size:1.2rem;">${title}</h3>
                        <p style="color:#64748b; font-size:14px; margin-bottom:24px; line-height:1.5;">${message}</p>
                        <div style="display:flex; gap:12px;">
                            <button id="cd-cancel" style="flex:1; padding:14px; border-radius:14px; border:none; background:#f1f5f9; color:#64748b; font-weight:700; font-size:15px; cursor:pointer;">${cancelText}</button>
                            <button id="cd-ok" style="flex:1; padding:14px; border-radius:14px; border:none; background:#E74C3C; color:white; font-weight:800; font-size:15px; cursor:pointer; box-shadow:0 6px 18px rgba(231,76,60,0.3);">${okText}</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.querySelector('#cd-ok').onclick = () => { modal.remove(); resolve(true); };
            modal.querySelector('#cd-cancel').onclick = () => { modal.remove(); resolve(false); };
        });
    },

    // ───────────── Flujo D: ADN Familiar ─────────────
    _renderFamilyDNA: () => {
        try {
            const ctx = window.GoHappyContext?.get?.();
            const box = document.getElementById('family-dna-box');
            if (!box || !ctx) return;

            const interests   = (ctx.interests || []).slice(0, 6);
            const ages        = ctx.childrenAges || [];
            const stats       = ctx.stats || {};
            const totalSignal = interests.length + ages.length + (stats.questsCompleted || 0) + (stats.momentsShared || 0);

            // Si todavía no hay señal suficiente, ocultar
            if (totalSignal < 2) return;

            const lang = window.GoHappyI18n?.lang || 'es';
            const labelMap = {
                nature:    lang === 'en' ? '🌿 Nature' : '🌿 Naturaleza',
                museum:    lang === 'en' ? '🏛️ Museums' : '🏛️ Museos',
                sports:    lang === 'en' ? '⚽ Sports' : '⚽ Deporte',
                food:      lang === 'en' ? '🍽️ Food' : '🍽️ Comida',
                culture:   lang === 'en' ? '🎭 Culture' : '🎭 Cultura',
                animals:   lang === 'en' ? '🐾 Animals' : '🐾 Animales',
                water:     lang === 'en' ? '💧 Water' : '💧 Agua',
                adventure: lang === 'en' ? '🧗 Adventure' : '🧗 Aventura'
            };

            // Chips de intereses
            const chipsHtml = interests.map(tag => `
                <span style="display:inline-flex; align-items:center; gap:4px; padding:6px 12px; background:white; border-radius:999px; font-size:12px; font-weight:700; color:var(--primary-cobalt); box-shadow:0 2px 6px rgba(11,76,143,0.08);">
                    ${labelMap[tag] || tag}
                </span>
            `).join('');
            document.getElementById('dna-tags').innerHTML = chipsHtml;

            // Insight narrativo
            const topInterest = interests[0] ? (labelMap[interests[0]] || interests[0]).replace(/^\S+\s/, '') : null;
            const childrenStr = ages.length
                ? (lang === 'en' ? `${ages.length} child${ages.length>1?'ren':''} (ages ${ages.join(', ')})` : `${ages.length} hij${ages.length>1?'os':'o'} (${ages.join(', ')} años)`)
                : null;

            const parts = [];
            if (childrenStr) parts.push(childrenStr);
            if (topInterest) parts.push(
                lang === 'en'
                    ? `loves ${topInterest.toLowerCase()}`
                    : `disfruta ${topInterest.toLowerCase()}`
            );
            if (stats.questsCompleted) parts.push(
                lang === 'en'
                    ? `${stats.questsCompleted} quests done`
                    : `${stats.questsCompleted} misiones cumplidas`
            );
            if (stats.momentsShared) parts.push(
                lang === 'en'
                    ? `${stats.momentsShared} memories captured`
                    : `${stats.momentsShared} recuerdos guardados`
            );

            const insight = parts.length
                ? (lang === 'en'
                    ? `A family of ${parts.join(', ')}. We tailor every plan to that.`
                    : `Una familia de ${parts.join(', ')}. Adaptamos cada propuesta a eso.`)
                : (lang === 'en'
                    ? 'Use the app for a few days and we\'ll show your family\'s pattern here.'
                    : 'Usa la app unos días y aquí aparecerá vuestro patrón familiar.');
            document.getElementById('dna-insight').textContent = insight;

            box.style.display = 'block';
        } catch (e) {
            console.warn('[Profile] DNA render error:', e?.message);
        }
    }
};


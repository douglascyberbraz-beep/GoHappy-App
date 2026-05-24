// ================================================================
// GoHappy Family Onboarding — v1.0.0
// Se muestra tras el login si el usuario no tiene familia asignada.
// ================================================================
window.GoHappyFamilyOnboarding = {

    // ──────────────────────────────────────────────────
    // COMPROBAR si el usuario necesita onboarding
    // ──────────────────────────────────────────────────
    needsOnboarding: () => {
        const user = window.GoHappyAuth.checkAuth();
        // Solo usuarios reales (no invitados) sin familyId asignado
        return user && !user.isGuest && !user.familyId;
    },

    // ──────────────────────────────────────────────────
    // MOSTRAR el modal de elección (Crear / Unirse / Saltar)
    // ──────────────────────────────────────────────────
    show: () => {
        if (document.getElementById('family-onboarding-modal')) return;
        const user = window.GoHappyAuth.checkAuth();

        // Si hay código de familia pendiente, auto-unir
        const pendingFam = localStorage.getItem('GoHappy_pending_family');

        const modal = document.createElement('div');
        modal.id = 'family-onboarding-modal';
        modal.className = 'modal';
        modal.style.cssText = 'z-index: 9000;';

        const T = window.t || (k => k);
        const lang = window.GoHappyI18n?.lang || 'es';
        const backLabel = lang === 'en' ? '← Back' : '← Volver';
        const createTitle = lang === 'en' ? 'Create my family' : 'Crear mi familia';
        const createQuestion = lang === 'en' ? 'What is your family called?' : '¿Cómo se llama vuestra familia?';

        modal.innerHTML = `
            <div class="auth-container entry-anim" style="padding: 20px;">
                <div class="auth-card premium-glass" style="max-height:92vh; overflow-y:auto; border-radius:36px; padding: 32px 24px;">

                    <!-- Header -->
                    <div style="text-align:center; margin-bottom:28px;">
                        <div style="font-size:60px; line-height:1; margin-bottom:16px;">👨‍👩‍👧‍👦</div>
                        <h2 style="color:var(--primary-cobalt); font-size:1.7rem; font-weight:900; margin:0; letter-spacing:-0.5px;">
                            ${T('fam.welcome').replace('{name}', user?.nickname || (lang === 'en' ? 'Explorer' : 'Explorador'))}
                        </h2>
                        <p style="color:#64748b; font-size:0.95rem; margin-top:8px; line-height:1.5;">
                            ${T('fam.intro')}<br>
                            <strong style="color:var(--primary-cobalt);">${T('fam.create.join')}</strong>
                        </p>
                    </div>

                    <!-- Vista 1: Elección inicial -->
                    <div id="ob-step-choice">
                        <button id="ob-btn-create" style="
                            width:100%; padding:20px; border-radius:24px; border:2px solid var(--primary-cobalt);
                            background:linear-gradient(135deg,#0B71FC,#0B4C8F); color:white;
                            font-size:1rem; font-weight:800; cursor:pointer; margin-bottom:14px;
                            display:flex; align-items:center; gap:14px; text-align:left;
                            box-shadow: 0 8px 25px rgba(11,113,252,0.3); transition: transform 0.15s;
                        ">
                            <span style="font-size:2rem;">🏠</span>
                            <div>
                                <div style="font-size:1.05rem;">${T('fam.create.btn')}</div>
                                <div style="font-size:12px; opacity:0.85; font-weight:500; margin-top:2px;">${T('fam.create.sub')}</div>
                            </div>
                        </button>

                        <button id="ob-btn-join" style="
                            width:100%; padding:20px; border-radius:24px; border:2px solid rgba(11,113,252,0.2);
                            background:white; color:var(--primary-cobalt);
                            font-size:1rem; font-weight:800; cursor:pointer; margin-bottom:14px;
                            display:flex; align-items:center; gap:14px; text-align:left;
                            box-shadow: 0 4px 15px rgba(0,0,0,0.06); transition: transform 0.15s;
                        ">
                            <span style="font-size:2rem;">🔗</span>
                            <div>
                                <div style="font-size:1.05rem;">${T('fam.join.btn')}</div>
                                <div style="font-size:12px; color:#64748b; font-weight:500; margin-top:2px;">${T('fam.join.sub')}</div>
                            </div>
                        </button>

                        <button id="ob-btn-skip" style="
                            width:100%; padding:12px; background:none; border:none;
                            color:#94a3b8; font-size:13px; font-weight:600; cursor:pointer;
                            text-decoration:underline; margin-top:4px;
                        ">
                            ${T('fam.skip')}
                        </button>
                    </div>

                    <!-- Vista 2: Crear familia -->
                    <div id="ob-step-create" style="display:none;">
                        <button id="ob-back-create" style="background:none;border:none;color:#94a3b8;font-size:13px;cursor:pointer;margin-bottom:16px;display:flex;align-items:center;gap:6px;">
                            ${backLabel}
                        </button>
                        <div style="text-align:center; margin-bottom:24px;">
                            <div style="font-size:48px;">🏠</div>
                            <h3 style="color:var(--primary-cobalt); font-weight:900; margin:8px 0 4px;">${createTitle}</h3>
                            <p style="color:#64748b; font-size:13px;">${createQuestion}</p>
                        </div>

                        <div id="ob-create-error" style="display:none; background:rgba(231,76,60,0.1); color:#E74C3C; padding:12px 16px; border-radius:14px; font-size:13px; font-weight:600; margin-bottom:14px;"></div>

                        <input
                            type="text" id="ob-family-name"
                            placeholder="${T('fam.name.placeholder')}"
                            maxlength="40"
                            style="width:100%; padding:16px; border-radius:16px; border:2px solid #e2e8f0; background:#f8fafc; font-size:1rem; font-weight:600; outline:none; color:#1e293b; box-sizing:border-box;"
                        >
                        <p style="font-size:11px; color:#94a3b8; margin:6px 0 20px 4px;">${T('fam.name.help')}</p>

                        <div style="background:rgba(11,113,252,0.05); border-radius:16px; padding:16px; margin-bottom:20px; border:1px solid rgba(11,113,252,0.1);">
                            <div style="font-size:12px; font-weight:800; color:var(--primary-cobalt); text-transform:uppercase; margin-bottom:6px;">${T('fam.create.benefits')}</div>
                            <ul style="font-size:13px; color:#475569; padding-left:18px; margin:0; line-height:1.8;">
                                <li>${T('fam.benefit.code')}</li>
                                <li>${T('fam.benefit.invite')}</li>
                                <li>${T('fam.benefit.share')}</li>
                            </ul>
                        </div>

                        <button id="ob-confirm-create" style="
                            width:100%; height:56px; border-radius:18px; border:none;
                            background:var(--brand-bright, linear-gradient(135deg,#0B71FC,#0B4C8F)); color:white;
                            font-size:1.05rem; font-weight:800; cursor:pointer;
                            box-shadow:0 8px 25px rgba(11,113,252,0.3);
                        ">
                            ${T('fam.create.confirm')}
                        </button>
                    </div>

                    <!-- Vista 3: Unirse a familia -->
                    <div id="ob-step-join" style="display:none;">
                        <button id="ob-back-join" style="background:none;border:none;color:#94a3b8;font-size:13px;cursor:pointer;margin-bottom:16px;display:flex;align-items:center;gap:6px;">
                            ${backLabel}
                        </button>
                        <div style="text-align:center; margin-bottom:24px;">
                            <div style="font-size:48px;">🔗</div>
                            <h3 style="color:var(--primary-cobalt); font-weight:900; margin:8px 0 4px;">${T('fam.join.btn')}</h3>
                            <p style="color:#64748b; font-size:13px;">${T('fam.code.title')}</p>
                        </div>

                        <div id="ob-join-error" style="display:none; background:rgba(231,76,60,0.1); color:#E74C3C; padding:12px 16px; border-radius:14px; font-size:13px; font-weight:600; margin-bottom:14px;"></div>

                        <!-- Inputs individuales para cada carácter del código -->
                        <div style="display:flex; gap:10px; justify-content:center; margin-bottom:20px;">
                            ${[0,1,2,3,4,5].map(i => `
                                <input
                                    type="text" maxlength="1" id="ob-code-${i}"
                                    class="ob-code-input"
                                    style="
                                        width:48px; height:56px; border-radius:14px;
                                        border:2px solid #e2e8f0; background:#f8fafc;
                                        font-size:1.6rem; font-weight:900; text-align:center;
                                        color:var(--primary-cobalt); text-transform:uppercase;
                                        outline:none; box-shadow:0 2px 8px rgba(0,0,0,0.05);
                                        transition: border-color 0.2s;
                                    "
                                >
                            `).join('')}
                        </div>

                        <div style="background:rgba(39,174,96,0.05); border-radius:16px; padding:14px; margin-bottom:20px; border:1px solid rgba(39,174,96,0.15);">
                            <p style="font-size:12px; color:#27AE60; font-weight:700; margin:0;">
                                ${T('fam.code.help')}
                            </p>
                        </div>

                        <button id="ob-confirm-join" style="
                            width:100%; height:56px; border-radius:18px; border:none;
                            background:linear-gradient(135deg,#27AE60,#1a8a46); color:white;
                            font-size:1.05rem; font-weight:800; cursor:pointer;
                            box-shadow:0 8px 25px rgba(39,174,96,0.3);
                        ">
                            ${T('fam.join.confirm')}
                        </button>
                    </div>

                    <!-- Vista 4: Éxito -->
                    <div id="ob-step-success" style="display:none; text-align:center; padding:20px 0;">
                        <div style="font-size:80px; margin-bottom:20px; animation: float 3s ease-in-out infinite;">🎉</div>
                        <h2 style="color:var(--primary-cobalt); font-size:1.6rem; font-weight:900;" id="ob-success-title">${lang === 'en' ? 'Family created!' : '¡Familia creada!'}</h2>
                        <p style="color:#64748b; font-size:0.95rem; margin:10px 0 25px;" id="ob-success-msg">${T('fam.success.welcome')}</p>

                        <div id="ob-code-display" style="
                            background:linear-gradient(135deg,rgba(11,113,252,0.05),rgba(6,254,254,0.1));
                            border:2px dashed rgba(11,113,252,0.3); border-radius:24px;
                            padding:24px; margin-bottom:24px; display:none;
                        ">
                            <div style="font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase; margin-bottom:10px;">
                                ${T('fam.success.code.label')}
                            </div>
                            <div id="ob-code-value" style="
                                font-size:2.2rem; font-weight:900; color:var(--primary-cobalt);
                                letter-spacing:8px; font-family:monospace;
                            "></div>
                            <p style="font-size:12px; color:#64748b; margin:10px 0 16px;">${T('fam.success.code.help')}</p>
                            <button id="ob-copy-code" style="
                                background:var(--primary-cobalt); color:white; border:none;
                                padding:10px 22px; border-radius:12px; font-size:13px;
                                font-weight:700; cursor:pointer;
                            ">${T('fam.success.copy')}</button>
                        </div>

                        <button id="ob-finish" style="
                            width:100%; height:56px; border-radius:18px; border:none;
                            background:var(--brand-bright, linear-gradient(135deg,#0B71FC,#0B4C8F)); color:white;
                            font-size:1.05rem; font-weight:800; cursor:pointer;
                            box-shadow:0 8px 25px rgba(11,113,252,0.3);
                        ">
                            ${T('fam.success.go')}
                        </button>
                    </div>

                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // ── Auto-relleno si hay código pendiente ──
        if (pendingFam && pendingFam.length === 6) {
            // Saltar al paso de unirse y rellenar los inputs
            setTimeout(() => {
                const stepJoin = document.getElementById('ob-step-join');
                if (stepJoin) {
                    document.getElementById('ob-step-choice').style.display = 'none';
                    stepJoin.style.display = 'block';
                    for (let i = 0; i < 6; i++) {
                        const inp = document.getElementById(`ob-code-${i}`);
                        if (inp) inp.value = pendingFam.charAt(i);
                    }
                }
            }, 100);
        }

        // ── Helpers de navegación entre pasos ──
        const showStep = (id) => {
            ['ob-step-choice', 'ob-step-create', 'ob-step-join', 'ob-step-success']
                .forEach(s => {
                    const el = document.getElementById(s);
                    if (el) el.style.display = 'none';
                });
            const target = document.getElementById(id);
            if (target) target.style.display = 'block';
        };

        const showError = (containerId, msg) => {
            const el = document.getElementById(containerId);
            if (el) { el.textContent = msg; el.style.display = 'block'; }
        };

        const hideError = (containerId) => {
            const el = document.getElementById(containerId);
            if (el) el.style.display = 'none';
        };

        const setLoading = (btnId, loading, text = '') => {
            const btn = document.getElementById(btnId);
            if (!btn) return;
            btn.disabled = loading;
            if (loading) {
                btn.dataset.originalText = btn.textContent;
                btn.innerHTML = '<span style="opacity:0.7">⌛ Un momento...</span>';
            } else {
                btn.textContent = text || btn.dataset.originalText || btn.textContent;
            }
        };

        // ── NAVEGACIÓN STEP 1 → 2 / 3 ──
        document.getElementById('ob-btn-create').onclick = () => showStep('ob-step-create');
        document.getElementById('ob-btn-join').onclick   = () => showStep('ob-step-join');
        document.getElementById('ob-btn-skip').onclick   = () => modal.remove();
        document.getElementById('ob-back-create').onclick = () => showStep('ob-step-choice');
        document.getElementById('ob-back-join').onclick   = () => showStep('ob-step-choice');

        // ── INPUTS DEL CÓDIGO (autoavanzar al siguiente input) ──
        for (let i = 0; i < 6; i++) {
            const inp = document.getElementById(`ob-code-${i}`);
            inp.addEventListener('input', (e) => {
                inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                if (inp.value.length === 1 && i < 5) {
                    document.getElementById(`ob-code-${i + 1}`).focus();
                }
            });
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && inp.value === '' && i > 0) {
                    document.getElementById(`ob-code-${i - 1}`).focus();
                }
            });
            inp.addEventListener('focus', () => inp.style.borderColor = 'var(--primary-cobalt)');
            inp.addEventListener('blur', () => inp.style.borderColor = '#e2e8f0');
        }

        // Helper bilingüe
        const L = (es, en) => (window.GoHappyI18n?.lang === 'en' ? en : es);

        // ── CREAR FAMILIA ──
        document.getElementById('ob-confirm-create').onclick = async () => {
            hideError('ob-create-error');
            const nombre = document.getElementById('ob-family-name').value;
            setLoading('ob-confirm-create', true);

            try {
                const result = await window.GoHappyFamilies.createFamily(nombre);

                // Mostrar pantalla de éxito con el código
                document.getElementById('ob-success-title').textContent = L(
                    `¡Familia "${result.nombre}" creada! 🏠`,
                    `Family "${result.nombre}" created! 🏠`
                );
                document.getElementById('ob-success-msg').textContent = L(
                    'Comparte el código con tu familia para que se unan.',
                    'Share the code with your family so they can join.'
                );
                document.getElementById('ob-code-display').style.display = 'block';
                document.getElementById('ob-code-value').textContent = result.codigoInvitacion;
                showStep('ob-step-success');

                document.getElementById('ob-copy-code').onclick = () => {
                    navigator.clipboard.writeText(result.codigoInvitacion).then(() => {
                        window.GoHappyToast.success(L(
                            `Código "${result.codigoInvitacion}" copiado al portapapeles`,
                            `Code "${result.codigoInvitacion}" copied to clipboard`
                        ));
                    });
                };
            } catch (e) {
                showError('ob-create-error', e.message || L('Error al crear la familia.', 'Could not create the family.'));
            } finally {
                setLoading('ob-confirm-create', false);
            }
        };

        // ── UNIRSE A FAMILIA ──
        document.getElementById('ob-confirm-join').onclick = async () => {
            hideError('ob-join-error');
            const code = [0,1,2,3,4,5]
                .map(i => document.getElementById(`ob-code-${i}`).value)
                .join('');

            if (code.length < 6) {
                showError('ob-join-error', L('Introduce los 6 caracteres del código.', 'Enter the 6 characters of the code.'));
                return;
            }
            setLoading('ob-confirm-join', true);

            try {
                const result = await window.GoHappyFamilies.joinFamily(code);
                try { localStorage.removeItem('GoHappy_pending_family'); } catch (e) {}
                document.getElementById('ob-success-title').textContent = L(
                    `¡Te has unido a "${result.nombre}"! 🔗`,
                    `You joined "${result.nombre}"! 🔗`
                );
                document.getElementById('ob-success-msg').textContent = L(
                    '¡Ya eres parte de la familia! Explorad GoHappy juntos.',
                    'You are now part of the family! Explore GoHappy together.'
                );
                document.getElementById('ob-code-display').style.display = 'none';
                showStep('ob-step-success');
            } catch (e) {
                showError('ob-join-error', e.message || L('Error al unirse a la familia.', 'Could not join the family.'));
            } finally {
                setLoading('ob-confirm-join', false);
            }
        };

        // ── FINALIZAR ──
        document.getElementById('ob-finish').onclick = () => {
            modal.remove();
            window.GoHappyToast.points(window.t ? window.t('fam.welcome.toast') : '¡Bienvenido a la familia! Empecéis a ganar puntos juntos 🚀');
            // Si estamos en el perfil, refrescarlo
            const user = window.GoHappyAuth.checkAuth();
            if (window.GoHappyApp && window.GoHappyApp.currentPage === 'profile') {
                window.GoHappyApp.loadPage('profile');
            }
        };

        // Focus en el primer input de código al ir al step join
        const joinObserver = new MutationObserver(() => {
            const joinStep = document.getElementById('ob-step-join');
            if (joinStep && joinStep.style.display !== 'none') {
                document.getElementById('ob-code-0').focus();
            }
        });
        joinObserver.observe(document.getElementById('ob-step-join'), { attributes: true });
    }
};

window.GoHappyProfile = {

    // ─── 📌 MIS PLANES GUARDADOS (los que el usuario guardó en Today) ───
    _renderSavedPlans: () => {
        const box = document.getElementById('profile-saved-plans');
        if (!box) return;
        const lang = window.GoHappyI18n?.lang || 'es';
        const sec = window.GoHappySecurity;
        const safe = (s) => sec ? sec.safe(s || '') : String(s || '').replace(/[<>]/g, '');
        let plans = [];
        try { plans = JSON.parse(localStorage.getItem('GoHappy_saved_plans') || '[]'); } catch (e) {}

        if (!plans.length) { box.innerHTML = ''; return; }  // sin planes → no ocupar espacio

        box.innerHTML = `
            <div style="background:rgba(255,255,255,0.85); border:0.5px solid rgba(255,255,255,0.95); border-radius:20px; padding:16px; box-shadow:0 4px 14px rgba(11,76,143,0.08);">
                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
                    <h3 style="font-size:14px; font-weight:800; color:var(--primary-cobalt,#0B4C8F); margin:0;">📌 ${lang === 'en' ? 'My saved plans' : 'Mis planes guardados'}</h3>
                    <span style="font-size:11px; color:var(--text-secondary);">${plans.length}</span>
                </div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    ${plans.slice(0, 8).map((p, i) => `
                        <div class="psp-row" data-i="${i}" style="display:flex; gap:10px; align-items:center; padding:10px; background:rgba(11,76,143,0.04); border-radius:12px;">
                            <div style="flex:1; min-width:0;">
                                <div style="font-weight:800; font-size:13px; color:var(--cobalt,#0B4C8F); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${safe(p.title)}</div>
                                <div style="font-size:11px; color:var(--text-secondary); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">📍 ${safe(p.location)}${p.time ? ' · 🕐 ' + safe(p.time) : ''}</div>
                            </div>
                            ${(p.lat && p.lng) ? `<button class="psp-map" data-i="${i}" title="${lang === 'en' ? 'Open in maps' : 'Abrir en mapa'}" style="flex-shrink:0; width:36px; height:36px; border-radius:10px; border:none; background:rgba(11,113,252,0.10); color:var(--cobalt,#0B4C8F); font-size:16px; cursor:pointer;">🗺️</button>` : ''}
                            <button class="psp-del" data-i="${i}" title="${lang === 'en' ? 'Remove' : 'Quitar'}" style="flex-shrink:0; width:36px; height:36px; border-radius:10px; border:none; background:rgba(239,68,68,0.08); color:#DC2626; font-size:14px; cursor:pointer;">✕</button>
                        </div>
                    `).join('')}
                </div>
            </div>`;

        box.querySelectorAll('.psp-map').forEach(b => b.onclick = (e) => {
            e.stopPropagation();
            const p = plans[parseInt(b.dataset.i)];
            if (p && p.lat && p.lng && window.GoHappyNav) window.GoHappyNav.openRoute(p.lat, p.lng, p.location);
            else if (p && window.GoHappyNav) window.GoHappyNav.openSearch(p.location || '');
        });
        box.querySelectorAll('.psp-del').forEach(b => b.onclick = (e) => {
            e.stopPropagation();
            const i = parseInt(b.dataset.i);
            plans.splice(i, 1);
            try { localStorage.setItem('GoHappy_saved_plans', JSON.stringify(plans)); } catch (er) {}
            window.GoHappyProfile._renderSavedPlans();
        });
    },

    // ─── REFLEXIÓN IA (movida desde Memories — más visible aquí) ───
    _loadReflection: async (user) => {
        const el = document.getElementById('profile-reflection-text');
        if (!el) return;
        const lang = window.GoHappyI18n?.lang || 'es';

        // Resumen de stats del usuario para personalizar
        const points = user.points || 0;
        const weeklyPts = user.weeklyPoints || 0;
        const levelName = (window.GoHappyPoints?.getLevelInfo?.(points)?.name) || 'Explorador';
        const familyName = user.familyName ? `de la familia ${user.familyName}` : '';

        const monthName = new Date().toLocaleDateString(lang === 'en' ? 'en-GB' : 'es-ES', { month: 'long' });
        const ctxSummary = window.GoHappyContext?.summary?.();

        const prompt = lang === 'en'
            ? `You are GoHappy AI. Write a SHORT motivational reflection (2 sentences max, 180 chars total) for ${user.nickname || 'this parent'} ${familyName}, currently a ${levelName}. They have ${points} total points, ${weeklyPts} this week, and we are in ${monthName}. ${ctxSummary ? 'Their interests: ' + JSON.stringify(ctxSummary).slice(0, 250) : ''} Warm, personal, British English. NO emojis. NO disclaimers. NO 'as an AI'. Just the reflection.`
            : `Eres GoHappy IA. Escribe una reflexión motivacional CORTA (máx 2 frases, 180 chars total) para ${user.nickname || 'esta familia'} ${familyName}, actualmente ${levelName}. Tiene ${points} puntos totales, ${weeklyPts} esta semana, estamos en ${monthName}. ${ctxSummary ? 'Sus intereses: ' + JSON.stringify(ctxSummary).slice(0, 250) : ''} Tono cálido, personal, español de España. SIN emojis. SIN disclaimers. SIN 'como IA'. Solo la reflexión.`;

        try {
            const text = await window.GoHappyAI._callGemini(prompt, false);
            if (text && typeof text === 'string' && text.length > 10) {
                el.textContent = text.trim().replace(/^["']|["']$/g, '');
                return;
            }
        } catch (e) { /* fallback */ }

        // Fallback motivacional sin IA
        el.textContent = lang === 'en'
            ? `Each step you take with your family is a memory in the making. With ${points} points, you are showing what conscious parenting looks like.`
            : `Cada paso que das con tu familia es un recuerdo que perdurará. Con ${points} puntos, estás demostrando lo que es la crianza consciente.`;
    },

    render: async (container) => {
        const T = window.t || (k => k);
        // Helper para escape XSS — usa GoHappySecurity si está disponible
        const safe = (s) => window.GoHappySecurity ? window.GoHappySecurity.safe(s) : String(s || '').replace(/[<>&"'`]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c]));
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
                    <div class="profile-avatar-wrapper" id="open-avatar-editor" style="cursor:pointer;">
                        <div class="gh-level-ring" data-level="${levelInfo.name}" title="${levelInfo.name}" style="
                            position:relative; width:124px; height:124px; padding:5px;
                            border-radius:50%; background:${levelInfo.ring};
                            box-shadow:0 0 30px ${levelInfo.shadow}, inset 0 0 0 1px rgba(255,255,255,0.7);
                            display:inline-flex; align-items:center; justify-content:center; box-sizing:border-box;
                            animation:gh-ring-pulse 3.5s ease-in-out infinite;
                        ">
                            <div style="
                                width:114px; height:114px; border-radius:50%; background:white;
                                display:flex; align-items:center; justify-content:center; font-size:54px;
                                overflow:hidden; box-sizing:border-box;
                                ${(user.photo && (user.photo.startsWith('data:') || user.photo.startsWith('http'))) ? `background-image:url('${user.photo}'); background-size:cover; background-position:center; font-size:0;` : ''}
                            ">${(user.photo && (user.photo.startsWith('data:') || user.photo.startsWith('http'))) ? '' : (user.photo || '👤')}</div>
                        </div>
                        <div class="level-badge-premium" style="margin-top:10px;">${levelInfo.icon} ${levelInfo.name}</div>
                    </div>
                    <div class="profile-meta-header">
                        ${window.GoHappyPremium ? window.GoHappyPremium.greetingHTML() : ''}
                        <h2 class="profile-name-main">${safe(user.nickname || 'Explorador')}</h2>
                        <p class="profile-email-sub">${safe(user.email || 'Miembro GoHappy')}</p>
                    </div>
                </div>

                <!-- ✨ REFLEXIÓN IA (movida desde Memories — más visible aquí) -->
                <div id="profile-ai-reflection" class="profile-reflection-card" style="
                    background:linear-gradient(135deg, rgba(11,113,252,0.06) 0%, rgba(23,200,212,0.10) 100%);
                    backdrop-filter:blur(28px) saturate(180%);
                    -webkit-backdrop-filter:blur(28px) saturate(180%);
                    border:0.5px solid rgba(11,113,252,0.18);
                    border-radius:22px;
                    padding:18px 18px 16px;
                    margin:0 16px 16px;
                    box-shadow:0 10px 30px rgba(11,113,252,0.10), inset 0 1px 0 rgba(255,255,255,0.85);
                    position:relative; overflow:hidden;
                ">
                    <div style="position:absolute; top:-30px; right:-30px; width:120px; height:120px; background:radial-gradient(circle, rgba(23,200,212,0.20) 0%, transparent 70%); pointer-events:none;"></div>
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px; position:relative;">
                        <div style="width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg,#0B71FC,#17C8D4); display:flex; align-items:center; justify-content:center; color:white; font-size:17px; box-shadow:0 6px 16px rgba(11,113,252,0.32);">🤖</div>
                        <div style="font-family:'Poppins', sans-serif; font-weight:900; font-size:14px; color:var(--primary-cobalt,#0B4C8F);">${(window.GoHappyI18n?.lang === 'en') ? 'GoHappy AI · Your reflection' : 'GoHappy IA · Tu reflexión'}</div>
                    </div>
                    <p id="profile-reflection-text" style="font-size:14px; line-height:1.55; color:var(--text-primary, #1e293b); margin:0; font-weight:500;">
                        <span class="typing-dots"><span></span><span></span><span></span></span>
                    </p>
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
                    
                    <!-- Progreso + fases OCULTOS por defecto → doble clic en la foto de perfil los muestra -->
                    <div id="g-detail" style="display:none;">
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

                        <div style="margin-top:18px; padding-top:14px; border-top:0.5px solid rgba(11,76,143,0.10);">
                            <div style="font-size:10px; font-weight:800; color:var(--text-secondary); text-transform:uppercase; letter-spacing:1px; margin-bottom:10px; text-align:center;">${T('profile.phases') || 'Fases'}</div>
                            <div style="display:flex; justify-content:space-between; gap:6px; overflow-x:auto; padding:4px 2px;">
                                ${(window.GoHappyPoints?.LEVELS || []).map(lv => {
                                    const reached = (user.points || 0) >= lv.min;
                                    return `
                                        <div style="flex:1; min-width:48px; text-align:center; opacity:${reached ? '1' : '0.42'};">
                                            <div style="margin:0 auto; width:34px; height:34px; padding:2.5px; border-radius:50%; background:${lv.ring}; box-shadow:0 0 ${reached ? '8px' : '4px'} ${lv.shadow}; display:flex; align-items:center; justify-content:center; box-sizing:border-box;">
                                                <div style="width:29px; height:29px; border-radius:50%; background:white; display:flex; align-items:center; justify-content:center; font-size:14px;">${lv.icon}</div>
                                            </div>
                                            <div style="font-size:9px; font-weight:700; color:var(--cobalt); margin-top:5px; line-height:1.2;">${lv.min}</div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
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

                <!-- Mi Familia: acceso GRANDE (tamaño del card de Invita y Gana) -->
                <button class="profile-quick-card" data-goto-page="my_family" style="width:calc(100% - 32px); margin:18px 16px 14px; padding:20px 22px; border:0.5px solid rgba(11,113,252,0.22); border-radius:26px; cursor:pointer; text-align:left; display:flex; align-items:center; gap:16px; background:linear-gradient(135deg,rgba(11,113,252,0.12),rgba(23,200,212,0.16)); box-shadow:0 8px 24px rgba(11,76,143,0.10); transition:transform 0.2s;">
                    <div style="font-size:42px; flex-shrink:0; line-height:1;">👨‍👩‍👧</div>
                    <div style="flex:1; min-width:0;">
                        <div style="font-family:'Poppins',sans-serif; font-weight:900; color:var(--primary-cobalt,#0B4C8F); font-size:19px; line-height:1.15;">${(window.GoHappyI18n?.lang === 'en') ? 'My Family' : 'Mi Familia'}</div>
                        <div style="font-size:12.5px; color:var(--text-secondary); margin-top:3px;">${(window.GoHappyI18n?.lang === 'en') ? 'Protection, quests, photos & members' : 'Protección, retos, fotos y miembros'}</div>
                    </div>
                    <span style="font-size:24px; color:var(--primary-cobalt,#0B4C8F); flex-shrink:0;">→</span>
                </button>

                <!-- Otras 3 funciones en formato circular debajo -->
                <div style="display:flex; justify-content:space-around; align-items:flex-start; gap:8px; margin:2px 16px 14px;">
                    <button class="profile-quick-card" data-goto-page="memories" style="background:none; border:none; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:8px; flex:1; padding:4px;">
                        <div style="width:60px; height:60px; border-radius:50%; background:rgba(255,255,255,0.92); border:0.5px solid rgba(11,76,143,0.12); box-shadow:0 4px 14px rgba(11,76,143,0.10); display:flex; align-items:center; justify-content:center; font-size:27px;">📸</div>
                        <span style="font-size:11.5px; font-weight:700; color:var(--primary-cobalt,#0B4C8F);">${(window.GoHappyI18n?.lang === 'en') ? 'Memories' : 'Recuerdos'}</span>
                    </button>
                    <button class="profile-quick-card" data-goto-page="tribu" style="background:none; border:none; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:8px; flex:1; padding:4px;">
                        <div style="width:60px; height:60px; border-radius:50%; background:linear-gradient(135deg,rgba(168,85,247,0.12),rgba(236,72,153,0.16)); border:0.5px solid rgba(168,85,247,0.22); box-shadow:0 4px 14px rgba(168,85,247,0.12); display:flex; align-items:center; justify-content:center; font-size:27px;">🏘️</div>
                        <span style="font-size:11.5px; font-weight:700; color:#7C3AED;">${(window.GoHappyI18n?.lang === 'en') ? 'Community' : 'Comunidad'}</span>
                    </button>
                    <button class="profile-quick-card" data-goto-page="safe" style="background:none; border:none; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:8px; flex:1; padding:4px;">
                        <div style="width:60px; height:60px; border-radius:50%; background:linear-gradient(135deg,rgba(239,68,68,0.10),rgba(245,158,11,0.16)); border:0.5px solid rgba(239,68,68,0.22); box-shadow:0 4px 14px rgba(239,68,68,0.10); display:flex; align-items:center; justify-content:center; font-size:27px;">🛡️</div>
                        <span style="font-size:11.5px; font-weight:700; color:#DC2626;">${(window.GoHappyI18n?.lang === 'en') ? 'Alerts' : 'Alertas'}</span>
                    </button>
                </div>

                <!-- 📌 Mis planes guardados (desde Today) -->
                <div id="profile-saved-plans" style="margin-top:10px;"></div>

                <div class="account-actions-list">
                    <button id="show-tour-btn" class="action-list-item">
                        <span>🎓 ${(window.GoHappyI18n?.lang === 'en') ? 'Show tutorial again' : 'Ver tutorial otra vez'}</span>
                        <span class="arrow">→</span>
                    </button>
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

        // Re-disparar tour bajo demanda
        const tourBtn = document.getElementById('show-tour-btn');
        if (tourBtn) tourBtn.onclick = () => {
            if (window.GoHappyTour) {
                window.GoHappyTour.reset();
                window.GoHappyApp?.loadPage?.('adventures');  // ir a primera pestaña antes
                setTimeout(() => window.GoHappyTour.start(true), 600);
            }
        };

        // ✨ Premium polish: PTR + stagger entry
        if (window.GoHappyPremium) {
            window.GoHappyPremium.attachPullToRefresh(container, () => window.GoHappyProfile.render(container));
            setTimeout(() => {
                const cards = container.querySelectorAll('.action-card-glass, .gamification-card-premium, .profile-hero-premium, .profile-reflection-card');
                if (cards.length) window.GoHappyPremium.staggerIn(cards, 60);
            }, 50);
        }

        // 📌 Mis planes guardados (desde Today)
        window.GoHappyProfile._renderSavedPlans();

        // 🤖 Generar reflexión IA personalizada (async, no bloquea)
        window.GoHappyProfile._loadReflection(user);

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

        // Mi Familia ya no se renderiza aquí — su acceso es el card del quick-grid
        // (los datos completos viven en la página dedicada my_family)

        // Flujo D: renderizar ADN familiar desde family_context
        window.GoHappyProfile._renderFamilyDNA();

        // ─── REFERIDO: el QR/link lleva a nuestra WEB (landing). La landing
        //     reenvía el ?ref= al app, donde se aplica la recompensa (+1000 pts). ───
        const INVITE_BASE_URL = 'https://gohappy-landing.web.app/';
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

        const shareAppBtn = document.getElementById('share-app-btn');
        if (shareAppBtn) shareAppBtn.onclick = async () => {
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

        const _openAvatarEditor = () => {
            const lang = window.GoHappyI18n?.lang || 'es';
            const L = (es, en) => lang === 'en' ? en : es;
            const modal = document.createElement('div');
            modal.className = 'modal entry-anim';
            modal.style.zIndex = '9000';
            const isPhotoUrl = (typeof user.photo === 'string') && (user.photo.startsWith('data:') || user.photo.startsWith('http'));
            modal.innerHTML = `
                <div class="auth-container" style="padding: 20px;">
                    <div class="auth-card premium-glass" style="padding: 28px 22px; border-radius: 32px; max-width: 420px;">
                        <h3 style="color:var(--primary-cobalt); text-align:center; font-weight:900; margin-bottom:16px;">${L('Cambiar Avatar', 'Change Avatar')}</h3>

                        <!-- Preview actual -->
                        <div style="display:flex; justify-content:center; margin-bottom:18px;">
                            <div id="av-preview" style="width:88px; height:88px; border-radius:50%; background:linear-gradient(135deg,#0B4C8F,#17C8D4); display:flex; align-items:center; justify-content:center; font-size:42px; color:white; background-size:cover; background-position:center; box-shadow:0 8px 22px rgba(11,76,143,0.20); overflow:hidden;">
                                ${isPhotoUrl ? '' : (user.photo || '👤')}
                            </div>
                        </div>

                        <!-- Botón subir foto real -->
                        <input type="file" id="av-file" accept="image/*" style="display:none;">
                        <button id="av-pick-photo" style="width:100%; padding:14px; border:none; border-radius:14px; background:linear-gradient(135deg,#0B71FC,#17C8D4); color:white; font-weight:800; font-size:14px; cursor:pointer; margin-bottom:14px; box-shadow:0 6px 16px rgba(11,113,252,0.28);">
                            📷 ${L('Subir foto desde galería', 'Upload photo from gallery')}
                        </button>

                        <div style="text-align:center; color:var(--text-tertiary); font-size:11px; margin:6px 0 14px;">${L('o elige un emoji', 'or pick an emoji')}</div>

                        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 22px;">
                            ${['👤', '🦁', '🐼', '🦄', '🦊', '🤖', '👩‍🚀', '🦒', '🐱', '🐶', '🦋', '⭐'].map(emoji => `
                                <div class="avatar-option" data-emoji="${emoji}" style="font-size: 30px; background: white; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; border-radius: 50%; cursor: pointer; border: 2px solid transparent; ${user.photo === emoji ? 'border-color: var(--primary-cobalt); background: rgba(11, 113, 252, 0.1);' : ''}">${emoji}</div>
                            `).join('')}
                        </div>
                        <button id="save-avatar-btn" class="btn-primary-gradient full-width" style="height: 52px; font-weight: 800;">${L('Guardar', 'Save')}</button>
                        <button class="btn-text full-width" style="margin-top:12px;" onclick="this.closest('.modal').remove()">${L('Cancelar', 'Cancel')}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Set preview con la foto actual si es URL
            const preview = document.getElementById('av-preview');
            if (isPhotoUrl) {
                preview.style.backgroundImage = `url('${user.photo}')`;
            }

            // Bind subir foto
            const fileInput = document.getElementById('av-file');
            document.getElementById('av-pick-photo').onclick = () => fileInput.click();
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = new Image();
                    img.onload = () => {
                        // Crop cuadrado central + redimensionar a 240×240 (suficiente para avatar)
                        const size = Math.min(img.width, img.height);
                        const sx = (img.width - size) / 2;
                        const sy = (img.height - size) / 2;
                        const canvas = document.createElement('canvas');
                        canvas.width = 240; canvas.height = 240;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, sx, sy, size, size, 0, 0, 240, 240);
                        selected = canvas.toDataURL('image/jpeg', 0.78);
                        // Preview
                        preview.style.backgroundImage = `url('${selected}')`;
                        preview.textContent = '';
                        // Desmarcar emojis
                        modal.querySelectorAll('.avatar-option').forEach(o => {
                            o.style.borderColor = 'transparent';
                            o.style.background = 'white';
                        });
                    };
                    img.src = ev.target.result;
                };
                reader.readAsDataURL(file);
            };

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
                    const ref = window.GoHappyDB.collection('users').doc(user.uid);
                    const withTimeout = (p, ms = 15000) => Promise.race([
                        p,
                        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout-firestore-' + ms + 'ms')), ms))
                    ]);

                    // Estrategia bulletproof:
                    // 1) Intentar set+merge solo con {photo}
                    // 2) Si falla → comprobar si el doc existe
                    // 3) Si no existe → crear perfil completo (auto-heal) y reintentar
                    try {
                        await withTimeout(ref.set({ photo: selected }, { merge: true }));
                    } catch (firstErr) {
                        console.warn('[Profile] primer set falló:', firstErr?.code, firstErr?.message, '— probando auto-heal');
                        const docCheck = await withTimeout(ref.get(), 8000);
                        if (!docCheck.exists) {
                            // Crear perfil completo (cumple rule CREATE)
                            const fb = window.GoHappyAuthReal?.currentUser;
                            await withTimeout(ref.set({
                                uid: user.uid,
                                email: fb?.email || user.email || `${user.uid}@guest.local`,
                                nickname: (user.nickname || 'Explorador').slice(0, 24),
                                photo: selected,
                                points: user.points || 0,
                                weeklyPoints: user.weeklyPoints || 0,
                                level: user.level || 'Explorador Novato',
                                familyId: null,
                                createdAt: firebase.firestore.FieldValue.serverTimestamp()
                            }));
                            console.info('[Profile] ✓ Perfil auto-creado con avatar');
                        } else {
                            // Doc existe pero la rule rechazó algún campo — re-throw
                            throw firstErr;
                        }
                    }

                    // 2) Update local cache (vía SessionGuard para mantener firma de integridad)
                    user.photo = selected;
                    window.GoHappyAuth._currentUser = { ...window.GoHappyAuth._currentUser, photo: selected };
                    if (window.GoHappyAuth._saveLocalSession) {
                        window.GoHappyAuth._saveLocalSession(window.GoHappyAuth._currentUser);
                    }

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
                    if (e?.message === 'timeout-firestore-15s') {
                        msg = lang === 'en'
                            ? 'Took too long. Check your connection and retry.'
                            : 'Está tardando demasiado. Comprueba tu conexión e intenta de nuevo.';
                    } else if (e?.code === 'permission-denied') {
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

        // Foto de perfil: 1 clic = editar avatar · DOBLE clic = ver progreso + fases
        const _avatarEl = document.getElementById('open-avatar-editor');
        let _avTimer = null;
        if (_avatarEl) {
            _avatarEl.onclick = () => {
                if (_avTimer) return; // segundo clic en curso → lo gestiona dblclick
                _avTimer = setTimeout(() => { _avTimer = null; _openAvatarEditor(); }, 250);
            };
            _avatarEl.ondblclick = () => {
                if (_avTimer) { clearTimeout(_avTimer); _avTimer = null; }
                const d = document.getElementById('g-detail');
                if (!d) return;
                const open = d.style.display !== 'none';
                d.style.display = open ? 'none' : 'block';
                if (!open) {
                    d.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    const lang = window.GoHappyI18n?.lang || 'es';
                    window.GoHappyToast && window.GoHappyToast.info(lang === 'en' ? '📊 Progress & phases' : '📊 Progreso y fases', 1600);
                }
            };
        }

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
            // Anti-XSS: escape de todos los strings de usuario antes de inyectar
            const sec = window.GoHappySecurity;
            const safeStr = (s) => sec ? sec.safe(s) : String(s || '').replace(/[<>&"'`]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;','`':'&#96;'}[c]));

            contentEl.innerHTML = `
                <!-- Nombre y código -->
                <div style="background:linear-gradient(135deg,rgba(11,113,252,0.05),rgba(6,254,254,0.1)); border-radius:20px; padding:18px; margin-bottom:16px; border:1px solid rgba(11,113,252,0.1);">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <div style="font-size:11px; font-weight:800; color:#94a3b8; text-transform:uppercase; margin-bottom:4px;">Familia</div>
                            <div style="font-size:1.2rem; font-weight:900; color:var(--primary-cobalt);">${safeStr(family.nombre)}</div>
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


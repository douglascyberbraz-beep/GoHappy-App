// ================================================================
// GoHappy Today v3 — Centro de comando familiar
// 3 vistas: 🎫 Eventos (default) | 🪄 Planes IA | 📅 Semana
// ================================================================
window.GoHappyToday = {

    _currentView: 'planes',  // 'planes' | 'eventos' | 'semana' (default Planes IA)
    _currentFilter: 'hoy',    // 'hoy' | 'manana' | 'finde'
    _city: null,
    _coords: '41.6520, -4.7286',

    // ─── Skeleton helper para evitar pantalla en blanco ───
    _skeletonCards: (count = 3) => {
        let html = '<div class="today-skel-wrap">';
        for (let i = 0; i < count; i++) {
            html += `
                <div class="today-skel-card">
                    <div class="skel-img"></div>
                    <div class="skel-line skel-line-title"></div>
                    <div class="skel-line skel-line-meta"></div>
                    <div class="skel-line skel-line-body"></div>
                    <div class="skel-line skel-line-body short"></div>
                    <div class="skel-row">
                        <div class="skel-btn"></div>
                        <div class="skel-btn small"></div>
                    </div>
                </div>
            `;
        }
        return html + '</div>';
    },

    // Sprint 2: etiqueta humana del tag
    _tagLabel: (tag) => {
        const lang = window.GoHappyI18n?.lang || 'es';
        const ES = { tantrums:'rabietas', sleep:'sueño', food:'alimentación', homework:'deberes', screens:'pantallas', siblings:'hermanos', school:'cole', emotions:'emociones' };
        const EN = { tantrums:'tantrums', sleep:'sleep', food:'eating', homework:'homework', screens:'screen time', siblings:'siblings', school:'school', emotions:'emotions' };
        return (lang === 'en' ? EN : ES)[tag] || tag;
    },

    // ─── RACHA DIARIA — días seguidos abriendo la app (hábito) ───
    // Idempotente por día: llamarlo varias veces el mismo día no incrementa.
    _bumpStreak: () => {
        try {
            const today = new Date().toISOString().slice(0, 10);
            const yest  = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
            const s = JSON.parse(localStorage.getItem('GoHappy_streak') || 'null') || { count: 0, last: null };
            if (s.last === today) return s.count || 1;       // ya contado hoy
            s.count = (s.last === yest) ? (s.count || 0) + 1 : 1;  // consecutivo o reinicio
            s.last = today;
            localStorage.setItem('GoHappy_streak', JSON.stringify(s));
            return s.count;
        } catch (e) { return 1; }
    },

    // ─── 🕑 Momento del día (asistente que cambia mañana/tarde/noche) ───
    _dayMoment: () => {
        const h = new Date().getHours();
        if (h < 12) return 'morning';
        if (h < 19) return 'afternoon';
        return 'evening';
    },

    // ─── 🔁 CERRAR EL BUCLE: marcar un plan como "pendiente de feedback" ───
    // Cuando el usuario guarda un plan, lo recordamos para preguntarle por la
    // tarde/noche "¿qué tal estuvo?" → eso alimenta sus sitios favoritos.
    _markPlanPending: (plan) => {
        try {
            const today = new Date().toISOString().slice(0, 10);
            localStorage.setItem('GoHappy_plan_pending', JSON.stringify({
                date: today,
                title: plan.title || '',
                location: plan.location || '',
                lat: parseFloat(plan.lat) || null,
                lng: parseFloat(plan.lng) || null,
                rated: false
            }));
        } catch (e) { /* ignore */ }
    },

    // ─── 📌 Persistir un plan guardado → lista "Mis planes guardados" (Perfil) ───
    _persistSavedPlan: (plan) => {
        try {
            const list = JSON.parse(localStorage.getItem('GoHappy_saved_plans') || '[]');
            const entry = {
                title: plan.title || '', location: plan.location || '', summary: plan.summary || '',
                time: plan.time || '', price: plan.price || '',
                lat: parseFloat(plan.lat) || null, lng: parseFloat(plan.lng) || null,
                savedAt: Date.now()
            };
            // dedupe por título+lugar, lo más reciente primero, máx 30
            const filtered = list.filter(p => !(p.title === entry.title && p.location === entry.location));
            filtered.unshift(entry);
            localStorage.setItem('GoHappy_saved_plans', JSON.stringify(filtered.slice(0, 30)));
        } catch (e) { /* ignore */ }
    },

    // ─── 💾 Guardar el SÚPER PLAN del día (por-usuario, para la push) ───
    _saveSuperPlan: (plan) => {
        try {
            const today = new Date().toISOString().slice(0, 10);
            const compact = {
                date: today,
                title: plan.title || '',
                summary: plan.summary || '',
                whyPerfect: plan.whyPerfect || '',
                location: plan.location || '',
                time: plan.time || '',
                price: plan.price || '',
                lat: parseFloat(plan.lat) || null,
                lng: parseFloat(plan.lng) || null
            };
            localStorage.setItem('GoHappy_super_plan_today', JSON.stringify(compact));
            // Persistir en Firestore (users/{uid}/private/family_context) para que un
            // job de notificaciones push pueda leer el súper plan de cada usuario.
            if (window.GoHappyContext?.update) {
                window.GoHappyContext.update({ superPlanToday: compact });
            }
        } catch (e) { /* ignore */ }
    },

    // ─── ⭐ PLAN DEL DÍA — el plan estrella de hoy, instantáneo desde caché ───
    _renderPlanDelDia: async () => {
        const box = document.getElementById('today-plan-hero');
        if (!box) return;
        const lang = window.GoHappyI18n?.lang || 'es';
        const prefs = JSON.parse(localStorage.getItem('GoHappy_family_prefs') || 'null');
        const sec = window.GoHappySecurity;
        const safe = (s) => sec ? sec.safe(s || '') : String(s || '').replace(/[<>]/g, '');

        // 🔁 CERRAR EL BUCLE: por la tarde/noche, si hay un plan guardado hoy sin
        // valorar, preguntamos "¿qué tal estuvo?" (alimenta sitios favoritos → mejor
        // súper plan mañana) en lugar de mostrar otro plan.
        const moment = window.GoHappyToday._dayMoment();
        const todayStr = new Date().toISOString().slice(0, 10);
        let pending = null;
        try { pending = JSON.parse(localStorage.getItem('GoHappy_plan_pending') || 'null'); } catch (e) {}
        if ((moment === 'afternoon' || moment === 'evening') && pending && pending.date === todayStr && !pending.rated) {
            window.GoHappyToday._renderFeedbackCard(box, pending, lang, safe);
            return;
        }

        // Sin preferencias → invitación a personalizar (1 toque)
        if (!prefs) {
            box.innerHTML = `
                <div class="pdd-card pdd-setup">
                    <div class="pdd-eyebrow">✨ ${lang === 'en' ? 'YOUR DAILY PLAN' : 'TU PLAN DE HOY'}</div>
                    <div class="pdd-setup-title">${lang === 'en' ? 'Tell us who you are and get your perfect plan every morning' : 'Cuéntanos quiénes sois y tendréis vuestro plan perfecto cada mañana'}</div>
                    <button class="pdd-cta" id="pdd-setup-btn">${lang === 'en' ? '🎯 Personalise my plan' : '🎯 Personalizar mi plan'}</button>
                </div>`;
            const b = document.getElementById('pdd-setup-btn');
            if (b) b.onclick = () => {
                window.GoHappyToday._currentView = 'planes';
                document.querySelectorAll('.t-view-btn').forEach(x => x.classList.toggle('active', x.dataset.view === 'planes'));
                window.GoHappyToday._renderView();
                document.getElementById('today-view-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            };
            return;
        }

        // Skeleton compacto mientras llega (suele ser instantáneo por prefetch)
        box.innerHTML = `<div class="pdd-card pdd-skel"><div class="pdd-skel-line w60"></div><div class="pdd-skel-line w90"></div><div class="pdd-skel-line w40"></div></div>`;

        let best = null;
        try {
            const acts = await window.GoHappyAI.getTodayActivities(window.GoHappyToday._coords, prefs);
            if (Array.isArray(acts) && acts.length) best = acts[0];
        } catch (e) { /* ignore */ }

        if (!best) { box.innerHTML = ''; return; }  // si no hay, ocultar (la vista Planes ya gestiona el error)

        // 💾 Guardar el SÚPER PLAN del día (por-usuario) — lo usará la notificación push
        window.GoHappyToday._saveSuperPlan(best);

        const isFree = (best.price || '').toLowerCase().includes('grat') || (best.price || '').toLowerCase().includes('free');
        const whyHtml = best.whyPerfect
            ? `<div class="pdd-why">💙 ${safe(best.whyPerfect)}</div>` : '';
        // Título adaptado al momento del día (asistente vivo)
        const eyebrowTxt = moment === 'evening'
            ? (lang === 'en' ? '🌙 PLAN FOR TONIGHT' : '🌙 PLAN PARA ESTA NOCHE')
            : moment === 'afternoon'
                ? (lang === 'en' ? '☀️ PLAN FOR THIS AFTERNOON' : '☀️ PLAN PARA LA TARDE')
                : (lang === 'en' ? '⭐ SUPER PLAN OF THE DAY' : '⭐ SÚPER PLAN DEL DÍA');
        box.innerHTML = `
            <div class="pdd-card">
                <div class="pdd-eyebrow">${eyebrowTxt}</div>
                <h3 class="pdd-title">${safe(best.title || (lang === 'en' ? 'Family plan' : 'Plan familiar'))}</h3>
                <p class="pdd-summary">${safe(best.summary || '')}</p>
                ${whyHtml}
                <div class="pdd-meta">
                    <span class="pdd-pill">${safe(best.typeLabel || '📍 Plan')}</span>
                    <span class="pdd-pill">🕐 ${safe(best.time || (lang === 'en' ? 'Flexible' : 'Flexible'))}</span>
                    <span class="pdd-pill ${isFree ? 'free' : 'paid'}">${safe(best.price || (lang === 'en' ? 'Free' : 'Gratis'))}</span>
                </div>
                <div class="pdd-loc">📍 <strong>${safe(best.location || '')}</strong></div>
                <div class="pdd-actions">
                    <button class="pdd-cta" id="pdd-save">✨ ${lang === 'en' ? 'Save plan' : 'Guardar plan'}</button>
                    <button class="pdd-map" id="pdd-map" title="${lang === 'en' ? 'Open in maps' : 'Abrir en mapa'}">🗺️</button>
                </div>
            </div>`;

        // Guardar plan (reutiliza el mismo flujo que las cards: actividad + puntos)
        const saveBtn = document.getElementById('pdd-save');
        if (saveBtn) saveBtn.onclick = async () => {
            if (saveBtn.dataset.done) return;
            saveBtn.dataset.done = '1';
            try {
                if (window.GoHappyPoints) await window.GoHappyPoints.addPoints('QUEST');
                const user = window.GoHappyAuth.checkAuth();
                if (user && !user.isGuest) {
                    await window.GoHappyDB.collection('activity').add({
                        userId: user.uid, type: 'visit',
                        title: best.title || 'Plan',
                        description: `Plan familiar en ${best.location || ''}`,
                        points: 50,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    }).catch(() => {});
                }
            } catch (e) { /* ignore */ }
            // 🔁 recordar este plan para preguntar "¿qué tal estuvo?" por la tarde/noche
            window.GoHappyToday._markPlanPending(best);
            window.GoHappyToday._persistSavedPlan(best); // 📌 a "Mis planes guardados"
            saveBtn.textContent = lang === 'en' ? '✅ Saved' : '✅ Guardado';
            saveBtn.style.background = '#27AE60';
            window.GoHappyToast && window.GoHappyToast.points(
                lang === 'en' ? `Plan saved! +50 pts 🎉` : `¡Plan guardado! +50 pts 🎉`);
        };
        const mapBtn = document.getElementById('pdd-map');
        if (mapBtn) mapBtn.onclick = () => {
            const lat = parseFloat(best.lat), lng = parseFloat(best.lng);
            if (lat && lng && window.GoHappyNav) window.GoHappyNav.openRoute(lat, lng, best.location);
            else if (window.GoHappyNav) window.GoHappyNav.openSearch(best.location || '');
        };
    },

    // ─── 🔁 Tarjeta "¿Qué tal estuvo?" — cierra el bucle y aprende ───
    _renderFeedbackCard: (box, pending, lang, safe) => {
        const place = pending.location || pending.title || (lang === 'en' ? 'your plan' : 'vuestro plan');
        box.innerHTML = `
            <div class="pdd-card pdd-feedback">
                <div class="pdd-eyebrow">${lang === 'en' ? '🔁 HOW DID IT GO?' : '🔁 ¿QUÉ TAL FUE?'}</div>
                <h3 class="pdd-title">${safe(pending.title || place)}</h3>
                <p class="pdd-summary">${lang === 'en' ? 'Rate it so I learn what your family loves 💙' : 'Puntúalo para aprender qué le encanta a tu familia 💙'}</p>
                <div class="pdd-stars" id="pdd-stars">
                    ${[1,2,3,4,5].map(n => `<span class="pdd-star" data-n="${n}">☆</span>`).join('')}
                </div>
                <button class="pdd-skip" id="pdd-skip">${lang === 'en' ? 'Not today' : 'Hoy no'}</button>
            </div>`;

        const stars = box.querySelectorAll('.pdd-star');
        const paint = (n) => stars.forEach(s => s.textContent = (parseInt(s.dataset.n) <= n) ? '★' : '☆');
        stars.forEach(s => {
            s.onmouseenter = () => paint(parseInt(s.dataset.n));
            s.onclick = async () => {
                const rating = parseInt(s.dataset.n);
                paint(rating);
                // Aprende: guarda la valoración → alimenta favoritePlaces (rating>=4)
                try {
                    if (window.GoHappyContext?.addActivity) {
                        window.GoHappyContext.addActivity('place_reviewed', {
                            place: pending.location || pending.title, rating
                        });
                    }
                } catch (e) {}
                try {
                    pending.rated = true;
                    localStorage.setItem('GoHappy_plan_pending', JSON.stringify(pending));
                } catch (e) {}
                if (window.GoHappyPoints) { try { await window.GoHappyPoints.addPoints('REVIEW'); } catch(e){} }

                // Gracias + invitación a inmortalizar el momento (→ Moments)
                box.innerHTML = `
                    <div class="pdd-card pdd-feedback">
                        <div class="pdd-eyebrow">${rating >= 4 ? '💙 ' : ''}${lang === 'en' ? 'THANK YOU!' : '¡GRACIAS!'}</div>
                        <p class="pdd-summary" style="margin-bottom:12px;">${rating >= 4
                            ? (lang === 'en' ? 'Noted — I\'ll suggest more like this ✨' : 'Anotado — te propondré más planes así ✨')
                            : (lang === 'en' ? 'Got it — I\'ll fine-tune your plans.' : 'Entendido — afinaré tus próximos planes.')}</p>
                        <button class="pdd-cta" id="pdd-tomoments">📸 ${lang === 'en' ? 'Share the moment' : 'Guardar el momento'}</button>
                    </div>`;
                const mb = document.getElementById('pdd-tomoments');
                if (mb) mb.onclick = () => { try { window.GoHappyApp?.loadPage?.('moments'); } catch (e) {} };
            };
        });
        const skip = document.getElementById('pdd-skip');
        if (skip) skip.onclick = () => {
            try { pending.rated = true; localStorage.setItem('GoHappy_plan_pending', JSON.stringify(pending)); } catch (e) {}
            window.GoHappyToday._renderPlanDelDia(); // vuelve a mostrar el plan del momento
        };
    },

    render: async (container) => {
        // Coords iniciales
        window.GoHappyToday._coords = window.lastKnownCoords || '41.6520, -4.7286';

        const T = window.t || (k => k);

        // Sprint 2: banner contextual basado en último insight (Care → Today)
        let contextBanner = '';
        try {
            const insight = window.GoHappyContext?.latestInsight?.();
            if (insight) {
                const lang = window.GoHappyI18n?.lang || 'es';
                const label = window.GoHappyToday._tagLabel(insight.tag);
                const msg = lang === 'en'
                    ? `Plans tailored to your recent concern about <strong>${label}</strong>`
                    : `Planes adaptados a tu consulta sobre <strong>${label}</strong>`;
                contextBanner = `
                    <div class="today-context-banner">
                        <span class="tcb-icon">💡</span>
                        <span class="tcb-text">${msg}</span>
                    </div>
                `;
            }
        } catch (e) { /* ignore */ }

        // Saludo personalizado por hora
        const hour = new Date().getHours();
        const lang0 = window.GoHappyI18n?.lang || 'es';
        const greeting = hour < 12
            ? (lang0 === 'en' ? 'Good morning' : 'Buenos días')
            : (hour < 19
                ? (lang0 === 'en' ? 'Good afternoon' : 'Buenas tardes')
                : (lang0 === 'en' ? 'Good evening' : 'Buenas noches'));
        const userName = window.GoHappyAuth?.checkAuth?.()?.nickname || (lang0 === 'en' ? 'Family' : 'Familia');

        // Racha diaria — "llevas N días" (crea hábito de volver cada día)
        const streakCount = window.GoHappyToday._bumpStreak();
        const dayWord = lang0 === 'en'
            ? (streakCount === 1 ? 'day' : 'days')
            : (streakCount === 1 ? 'día' : 'días');
        const streakChip = `<span class="today-streak-chip" title="${lang0==='en'?'Days in a row':'Días seguidos'}">🔥 ${streakCount} ${dayWord}</span>`;

        container.innerHTML = `
            <div class="today-page">
                <!-- Pull-to-refresh indicator -->
                <div id="today-ptr" style="position:absolute; top:0; left:0; right:0; height:60px; display:flex; align-items:flex-end; justify-content:center; padding-bottom:8px; transform:translateY(-60px); transition:transform 0.3s; z-index:3; pointer-events:none;">
                    <div style="background:rgba(255,255,255,0.95); backdrop-filter:blur(20px); border-radius:999px; padding:8px 18px; box-shadow:0 8px 22px rgba(11,76,143,0.15); display:flex; align-items:center; gap:8px; font-size:13px; font-weight:700; color:var(--primary-cobalt,#0B4C8F);">
                        <span id="today-ptr-icon" style="font-size:16px; transition:transform 0.3s;">⬇️</span>
                        <span id="today-ptr-text">${lang0 === 'en' ? 'Pull to refresh' : 'Tira para refrescar'}</span>
                    </div>
                </div>

                <div class="today-hero-premium">
                    <div style="position:relative; z-index:2; display:flex; align-items:flex-start; gap:16px;">
                        <div style="flex:1; min-width:0;">
                            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:2px;">
                                <div style="font-size:13px; font-weight:700; color:var(--text-secondary); opacity:0.85;">${greeting}, <span style="color:var(--primary-cobalt,#0B4C8F);">${userName}</span> ✨</div>
                                ${streakChip}
                            </div>
                            <h2 class="today-welcome-title" style="margin-top:2px;">${T('today.title')}</h2>
                            <p class="today-welcome-subtitle" id="today-city-sub">${T('today.detecting')}</p>
                        </div>
                        <!-- Weather widget -->
                        <div id="today-weather" style="display:flex; flex-direction:column; align-items:center; justify-content:center; min-width:62px; padding:8px 6px; background:rgba(255,255,255,0.6); backdrop-filter:blur(14px); border-radius:14px; border:0.5px solid rgba(255,255,255,0.6); box-shadow:0 4px 14px rgba(11,76,143,0.08); flex-shrink:0;">
                            <span id="today-weather-icon" style="font-size:22px; line-height:1;">⛅</span>
                            <span id="today-weather-temp" style="font-size:13px; font-weight:900; color:var(--primary-cobalt,#0B4C8F); margin-top:2px;">--°</span>
                        </div>
                    </div>
                </div>
                ${contextBanner}

                <!-- ⭐ PLAN DEL DÍA — el motivo de abrir la app cada día -->
                <div id="today-plan-hero" class="today-plan-hero-wrap"></div>

                <!-- Eventos se movieron a su propia pestaña (Events). Today = Planes IA. -->

                <!-- Contenedor dinámico de vistas -->
                <div id="today-view-content" style="padding: 0 14px calc(var(--nav-total, 110px) + 24px); width:100%; box-sizing:border-box;">
                    ${window.GoHappyToday._skeletonCards(3)}
                </div>
            </div>
        `;

        // Estilos específicos de Today
        const styleId = 'today-v3-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .today-page { width:100%; min-height:100vh; box-sizing:border-box; overflow-x:hidden; }

                /* ─── 🔥 Chip de racha diaria ─── */
                .today-streak-chip {
                    display:inline-flex; align-items:center; gap:3px;
                    background:linear-gradient(135deg,#FF8A50,#FF6B9D);
                    color:#fff; font-size:11px; font-weight:900;
                    padding:3px 10px; border-radius:999px;
                    box-shadow:0 3px 10px rgba(255,107,157,0.32);
                    letter-spacing:0.2px; white-space:nowrap;
                }

                /* ─── ⭐ PLAN DEL DÍA (hero card) ─── */
                .today-plan-hero-wrap { padding:0 14px; margin:4px 0 14px; }
                .today-plan-hero-wrap:empty { display:none; }
                .pdd-card {
                    position:relative; overflow:hidden;
                    background:linear-gradient(135deg, rgba(11,113,252,0.97), rgba(23,200,212,0.95));
                    border-radius:24px; padding:18px 18px 16px;
                    box-shadow:0 14px 34px rgba(11,76,143,0.28);
                    color:#fff;
                    animation:pddIn .55s cubic-bezier(.16,1,.3,1) both;
                }
                @keyframes pddIn { from{opacity:0; transform:translateY(16px) scale(.98);} to{opacity:1; transform:none;} }
                .pdd-card::after {
                    content:''; position:absolute; top:-40%; right:-10%;
                    width:55%; height:180%;
                    background:radial-gradient(circle, rgba(255,255,255,0.22), transparent 70%);
                    pointer-events:none;
                }
                .pdd-eyebrow { font-size:10.5px; font-weight:900; letter-spacing:1.2px; opacity:0.92; margin-bottom:6px; }
                .pdd-title {
                    font-family:'Poppins',sans-serif; font-size:20px; font-weight:900;
                    line-height:1.18; margin:0 0 5px; letter-spacing:-0.3px;
                    text-shadow:0 1px 8px rgba(0,0,0,0.12);
                }
                .pdd-summary { font-size:13px; line-height:1.4; opacity:0.95; margin:0 0 10px; }
                .pdd-why {
                    display:inline-block; background:rgba(255,255,255,0.18);
                    border:0.5px solid rgba(255,255,255,0.28);
                    border-radius:12px; padding:7px 11px; margin-bottom:12px;
                    font-size:12px; font-weight:700; line-height:1.35;
                }
                /* 🔁 Tarjeta de feedback "¿qué tal estuvo?" */
                .pdd-feedback { background:linear-gradient(135deg, rgba(124,107,255,0.96), rgba(11,113,252,0.95)); }
                .pdd-stars { display:flex; gap:6px; margin:6px 0 14px; }
                .pdd-star { font-size:32px; line-height:1; cursor:pointer; color:#FFD54A;
                    transition:transform .15s cubic-bezier(.34,1.56,.64,1); user-select:none; }
                .pdd-star:active { transform:scale(0.85); }
                .pdd-skip { background:transparent; border:none; color:rgba(255,255,255,0.85);
                    font-size:12.5px; font-weight:700; cursor:pointer; text-decoration:underline; padding:2px; }
                /* Badge "Súper plan" en la primera card de la lista de Planes */
                .superplan-badge {
                    display:inline-flex; align-items:center; gap:4px;
                    background:linear-gradient(135deg,#FF8A50,#FF6B9D);
                    color:#fff; font-size:10px; font-weight:900; letter-spacing:0.4px;
                    padding:3px 9px; border-radius:999px; text-transform:uppercase;
                    box-shadow:0 3px 10px rgba(255,107,157,0.3);
                }
                .plan-card-premium.is-superplan {
                    border:1.5px solid rgba(255,138,80,0.55);
                    box-shadow:0 10px 26px rgba(255,107,157,0.18);
                }
                .pdd-meta { display:flex; gap:6px; flex-wrap:wrap; margin-bottom:10px; }
                .pdd-pill {
                    background:rgba(255,255,255,0.22); backdrop-filter:blur(8px);
                    border:0.5px solid rgba(255,255,255,0.3);
                    padding:4px 10px; border-radius:999px; font-size:11px; font-weight:800;
                }
                .pdd-pill.free { background:rgba(255,255,255,0.95); color:#1a8a4a; }
                .pdd-pill.paid { background:rgba(255,255,255,0.95); color:#b5651d; }
                .pdd-loc { font-size:12.5px; margin-bottom:14px; opacity:0.96; }
                .pdd-actions { display:flex; gap:8px; }
                .pdd-cta {
                    flex:1; background:#fff; color:var(--primary-cobalt,#0B4C8F);
                    border:none; border-radius:14px; padding:13px 16px;
                    font-size:14px; font-weight:900; cursor:pointer;
                    box-shadow:0 6px 16px rgba(0,0,0,0.16);
                    transition:transform .2s cubic-bezier(.34,1.56,.64,1);
                }
                .pdd-cta:active { transform:scale(.96); }
                .pdd-map {
                    width:48px; flex-shrink:0; background:rgba(255,255,255,0.22);
                    border:0.5px solid rgba(255,255,255,0.3); border-radius:14px;
                    font-size:20px; cursor:pointer; color:#fff;
                    transition:transform .2s cubic-bezier(.34,1.56,.64,1);
                }
                .pdd-map:active { transform:scale(.92); }
                /* Setup (sin prefs) y skeleton */
                .pdd-setup { text-align:left; }
                .pdd-setup-title { font-family:'Poppins',sans-serif; font-size:16px; font-weight:800; line-height:1.3; margin-bottom:12px; }
                .pdd-skel { min-height:120px; }
                .pdd-skel-line { height:14px; border-radius:8px; background:rgba(255,255,255,0.28); margin-bottom:10px; animation:pddPulse 1.2s ease-in-out infinite; }
                .pdd-skel-line.w60 { width:60%; } .pdd-skel-line.w90 { width:90%; } .pdd-skel-line.w40 { width:40%; }
                @keyframes pddPulse { 0%,100%{opacity:0.5;} 50%{opacity:0.9;} }

                /* ─── Skeleton cards (evita pantalla en blanco) ─── */
                /* ─── EVENT CARD V2 — premium y robusta ─── */
                .event-card-v2 {
                    background: rgba(255,255,255,0.92);
                    backdrop-filter: blur(30px) saturate(180%);
                    border: 0.5px solid rgba(255,255,255,0.95);
                    border-radius: 22px;
                    padding: 16px;
                    margin: 0 2px 14px;
                    width: calc(100% - 4px);
                    box-sizing: border-box;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.95),
                                0 8px 22px rgba(11,76,143,0.08);
                    overflow: hidden;
                    transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
                }
                .event-card-v2:active { transform: scale(0.985); }

                .evc-top { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 10px; }
                .evc-icon {
                    width: 44px; height: 44px;
                    border-radius: 12px;
                    background: linear-gradient(135deg, rgba(11,113,252,0.10), rgba(23,200,212,0.14));
                    display: flex; align-items: center; justify-content: center;
                    font-size: 22px;
                    flex-shrink: 0;
                    border: 0.5px solid rgba(11,113,252,0.15);
                }
                .evc-top-text { flex: 1; min-width: 0; }
                .evc-meta { display: flex; gap: 8px; align-items: center; margin-bottom: 4px; flex-wrap: wrap; }
                .evc-day {
                    background: var(--brand-bright, linear-gradient(135deg,#0B71FC,#17C8D4));
                    color: white;
                    padding: 3px 10px;
                    border-radius: 999px;
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 0.4px;
                    text-transform: uppercase;
                    box-shadow: 0 3px 10px rgba(11,113,252,0.22);
                }
                .evc-time { font-size: 11.5px; font-weight: 700; color: var(--text-secondary); }
                .evc-title {
                    font-family: 'Poppins', sans-serif;
                    font-size: 16px;
                    font-weight: 800;
                    color: var(--cobalt);
                    margin: 0;
                    line-height: 1.25;
                    letter-spacing: -0.2px;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                }
                .evc-desc {
                    font-size: 13px;
                    color: var(--text-primary);
                    line-height: 1.45;
                    margin: 0 0 12px;
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                }
                .evc-info {
                    display: flex; flex-direction: column; gap: 6px;
                    background: rgba(11,76,143,0.035);
                    border-radius: 12px;
                    padding: 10px 12px;
                    margin-bottom: 12px;
                }
                .evc-info-row {
                    display: flex; gap: 8px; align-items: flex-start;
                    font-size: 12.5px;
                    color: var(--text-primary);
                    line-height: 1.35;
                }
                .evc-info-emoji { flex-shrink: 0; font-size: 13px; }
                .evc-info-text {
                    flex: 1; min-width: 0;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                }
                .evc-info-pills { gap: 6px; flex-wrap: wrap; margin-top: 2px; }
                .evc-pill {
                    display: inline-flex; align-items: center; gap: 4px;
                    padding: 4px 10px;
                    background: white;
                    border-radius: 999px;
                    font-size: 11px;
                    font-weight: 700;
                    color: var(--text-secondary);
                    border: 0.5px solid rgba(11,76,143,0.10);
                    box-shadow: 0 1px 3px rgba(11,76,143,0.04);
                }
                .evc-pill-price { color: var(--cobalt); background: rgba(11,113,252,0.06); }
                .evc-tip {
                    background: linear-gradient(135deg, rgba(255,200,80,0.10), rgba(255,150,50,0.08));
                    border: 0.5px solid rgba(255,180,80,0.22);
                    border-radius: 12px;
                    padding: 9px 12px;
                    font-size: 12px;
                    color: #8B5C00;
                    line-height: 1.4;
                    margin-bottom: 12px;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                }
                .evc-actions { display: flex; gap: 8px; }
                .evc-btn {
                    flex: 1;
                    min-width: 0;
                    text-align: center;
                    padding: 11px 10px;
                    border-radius: 12px;
                    font-family: -apple-system, sans-serif;
                    font-weight: 800;
                    font-size: 13px;
                    cursor: pointer;
                    border: none;
                    text-decoration: none;
                    box-sizing: border-box;
                    transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1);
                    /* Permitir 2 líneas si el texto es largo */
                    white-space: normal;
                    word-wrap: break-word;
                    line-height: 1.2;
                }
                .evc-btn:active { transform: scale(0.96); }
                .evc-btn-primary {
                    flex: 1.5;
                    background: var(--brand-bright, linear-gradient(135deg,#0B71FC,#17C8D4));
                    color: white;
                    box-shadow: 0 5px 14px rgba(11,113,252,0.26);
                }
                .evc-btn-secondary {
                    background: rgba(11,76,143,0.08);
                    color: var(--cobalt);
                    border: 0.5px solid rgba(11,76,143,0.12);
                }

                .today-skel-wrap { display:flex; flex-direction:column; gap:14px; margin-top:4px; }
                .today-skel-card {
                    background: rgba(255,255,255,0.7);
                    backdrop-filter: blur(14px);
                    border: 0.5px solid rgba(255,255,255,0.6);
                    border-radius: 22px;
                    padding: 14px;
                    overflow: hidden;
                }
                .skel-img, .skel-line, .skel-btn {
                    background: linear-gradient(90deg, rgba(11,76,143,0.06) 0%, rgba(11,76,143,0.14) 50%, rgba(11,76,143,0.06) 100%);
                    background-size: 200% 100%;
                    animation: skelShimmer 1.3s ease-in-out infinite;
                    border-radius: 10px;
                }
                .skel-img        { height: 130px; margin-bottom: 12px; border-radius: 14px; }
                .skel-line       { height: 12px; margin: 6px 0; }
                .skel-line-title { height: 16px; width: 70%; margin-bottom: 10px; }
                .skel-line-meta  { width: 45%; height: 10px; }
                .skel-line-body  { width: 100%; }
                .skel-line-body.short { width: 80%; }
                .skel-row        { display:flex; gap:8px; margin-top: 12px; }
                .skel-btn        { flex: 2; height: 36px; border-radius: 999px; }
                .skel-btn.small  { flex: 1; }
                @keyframes skelShimmer {
                    0%   { background-position: 200% 0; }
                    100% { background-position: -200% 0; }
                }

                /* Sprint 2: Banner contextual (Care → Today) */
                .today-context-banner {
                    display: flex; align-items: center; gap: 10px;
                    margin: 0 16px 14px;
                    padding: 12px 14px;
                    background: linear-gradient(135deg, rgba(11,113,252,0.10), rgba(23,200,212,0.12));
                    border: 0.5px solid rgba(11,113,252,0.22);
                    border-radius: 16px;
                    backdrop-filter: blur(14px) saturate(180%);
                    box-shadow: 0 4px 14px rgba(11,76,143,0.08);
                    font-size: 13px;
                    color: var(--text-primary);
                    line-height: 1.35;
                }
                .today-context-banner .tcb-icon { font-size: 18px; flex-shrink: 0; }
                .today-context-banner .tcb-text { flex: 1; }
                .today-context-banner strong { color: var(--primary-cobalt); font-weight: 700; }

                /* Sprint 3: Citas de Search Grounding */
                .event-citations {
                    margin: 14px 0 8px;
                    padding: 12px 14px;
                    background: rgba(255,255,255,0.66);
                    border: 0.5px solid rgba(11,76,143,0.12);
                    border-radius: 16px;
                    backdrop-filter: blur(12px);
                }
                .event-citations .ec-title {
                    font-size: 11px; font-weight: 800; letter-spacing: 0.5px;
                    color: var(--text-secondary); text-transform: uppercase;
                    margin-bottom: 8px;
                }
                .event-citations .ec-link {
                    display: block;
                    font-size: 12.5px;
                    color: var(--primary-cobalt);
                    text-decoration: none;
                    padding: 5px 0;
                    border-bottom: 0.5px solid rgba(11,76,143,0.08);
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .event-citations .ec-link:last-child { border-bottom: none; }

                /* TOGGLE 3 vistas */
                .today-view-toggle {
                    display: flex; gap: 6px;
                    background: rgba(255,255,255,0.78);
                    backdrop-filter: blur(20px) saturate(180%);
                    margin: -10px 16px 16px;
                    padding: 5px;
                    border-radius: 999px;
                    border: 0.5px solid rgba(255,255,255,0.95);
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.95), 0 8px 24px rgba(11,76,143,0.10);
                    position: relative; z-index: 5;
                }
                .t-view-btn {
                    flex: 1;
                    background: transparent;
                    border: none;
                    padding: 10px 8px;
                    border-radius: 999px;
                    font-family: -apple-system, sans-serif;
                    font-size: 12.5px;
                    font-weight: 700;
                    color: var(--text-secondary);
                    cursor: pointer;
                    display: flex; align-items: center; justify-content: center; gap: 5px;
                    transition: all 0.22s cubic-bezier(0.34,1.56,0.64,1);
                    white-space: nowrap;
                }
                .t-view-btn span { font-size: 15px; }
                .t-view-btn.active {
                    background: var(--brand-bright);
                    color: white;
                    font-weight: 800;
                    box-shadow: 0 6px 16px rgba(11,113,252,0.28);
                }
                .t-view-btn:active { transform: scale(0.94); }

                /* Sub-filtros eventos (Hoy/Mañana/Finde) */
                .events-filters {
                    display: flex; gap: 8px;
                    overflow-x: auto; scrollbar-width: none;
                    padding: 4px 0 14px;
                    margin: 0 -4px;
                }
                .events-filters::-webkit-scrollbar { display: none; }
                .ev-filter-chip {
                    flex-shrink: 0;
                    background: rgba(255,255,255,0.85);
                    border: 0.5px solid rgba(11,76,143,0.1);
                    border-radius: 999px;
                    padding: 7px 14px;
                    font-size: 12.5px;
                    font-weight: 700;
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1);
                }
                .ev-filter-chip.active {
                    background: var(--cobalt);
                    color: white;
                    border-color: transparent;
                    box-shadow: 0 4px 12px rgba(11,76,143,0.24);
                }
                .ev-filter-chip:active { transform: scale(0.92); }

                /* Card de Evento (vista Eventos) */
                .event-card, .plan-card-premium {
                    background: rgba(255,255,255,0.92);
                    backdrop-filter: blur(30px) saturate(180%);
                    border: 0.5px solid rgba(255,255,255,0.95);
                    border-radius: 24px;
                    padding: 16px;
                    margin: 0 0 14px;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.95),
                                0 8px 28px rgba(11,76,143,0.08);
                    transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                    overflow: hidden;
                    position: relative;
                    /* Aislar contenido del border-radius */
                    isolation: isolate;
                }
                .event-card *, .plan-card-premium * {
                    max-width: 100%;
                    box-sizing: border-box;
                }
                .event-card:active, .plan-card-premium:active { transform: scale(0.975); }
                .event-card .event-title, .plan-card-premium .event-title {
                    word-wrap: break-word;
                    overflow-wrap: anywhere;
                    hyphens: auto;
                }
                .event-card .event-desc, .plan-card-premium .event-desc {
                    word-wrap: break-word;
                    overflow-wrap: anywhere;
                    display: -webkit-box;
                    -webkit-line-clamp: 4;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .event-card .event-meta-row, .plan-card-premium .event-meta-row {
                    flex-wrap: wrap;
                    overflow: hidden;
                    row-gap: 6px;
                }
                .event-card .event-cta, .plan-card-premium .event-cta {
                    min-width: 0;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }
                .event-card .event-info-item, .plan-card-premium .event-info-item {
                    /* Permitir 2 líneas en info-item si el nombre del lugar es largo */
                    white-space: normal !important;
                    line-height: 1.35;
                    -webkit-line-clamp: 2;
                    display: -webkit-box;
                    -webkit-box-orient: vertical;
                }

                .event-meta-row {
                    display: flex; align-items: center; gap: 8px;
                    margin-bottom: 10px;
                    flex-wrap: wrap;
                }
                .event-day-badge {
                    background: linear-gradient(135deg, #0B71FC, #17C8D4);
                    color: white;
                    padding: 4px 12px;
                    border-radius: 999px;
                    font-size: 11px;
                    font-weight: 800;
                    letter-spacing: 0.3px;
                    box-shadow: 0 4px 12px rgba(11,113,252,0.22);
                }
                .event-time {
                    font-size: 12px; font-weight: 700;
                    color: var(--text-secondary);
                }
                .event-cat-tag {
                    margin-left: auto;
                    background: rgba(11,76,143,0.06);
                    color: var(--cobalt);
                    padding: 3px 9px;
                    border-radius: 999px;
                    font-size: 10px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }

                .event-title {
                    font-family: 'Poppins', sans-serif;
                    font-size: 1.15rem;
                    font-weight: 800;
                    color: var(--cobalt);
                    margin: 4px 0 6px;
                    line-height: 1.25;
                    letter-spacing: -0.3px;
                }
                .event-desc {
                    font-size: 14px;
                    color: var(--text-primary);
                    line-height: 1.5;
                    margin-bottom: 12px;
                }

                .event-info-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px 10px;
                    background: rgba(11,76,143,0.04);
                    padding: 12px 14px;
                    border-radius: 14px;
                    margin-bottom: 14px;
                    font-size: 12px;
                    box-sizing: border-box;
                    width: 100%;
                    min-width: 0;
                }
                .event-info-item {
                    display: flex; align-items: center; gap: 6px;
                    color: var(--text-secondary);
                    min-width: 0;
                    overflow: hidden;
                    white-space: nowrap;
                    text-overflow: ellipsis;
                }
                .event-info-item strong {
                    color: var(--text-primary); font-weight: 700;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                    min-width: 0;
                }

                .event-tip {
                    background: linear-gradient(135deg, rgba(255,215,0,0.08), rgba(255,165,0,0.06));
                    border: 0.5px solid rgba(255,165,0,0.2);
                    border-radius: 14px;
                    padding: 10px 12px;
                    font-size: 12px;
                    color: #8B6914;
                    margin-bottom: 14px;
                    display: flex; gap: 8px; align-items: flex-start;
                }
                .event-tip-icon { flex-shrink: 0; font-size: 14px; }

                .event-cta {
                    display: block;
                    width: 100%;
                    text-align: center;
                    background: var(--brand-bright);
                    color: white;
                    border: none;
                    border-radius: 14px;
                    padding: 13px;
                    font-family: -apple-system, sans-serif;
                    font-weight: 800;
                    font-size: 14px;
                    cursor: pointer;
                    text-decoration: none;
                    box-shadow: 0 6px 18px rgba(11,113,252,0.28);
                    transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1);
                }
                .event-cta:active { transform: scale(0.96); }

                .event-disclaimer {
                    text-align: center;
                    font-size: 11px;
                    color: var(--text-tertiary);
                    padding: 14px 8px 6px;
                    font-style: italic;
                }

                /* Vista SEMANA — calendar familiar */
                .week-grid {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .week-day-card {
                    background: rgba(255,255,255,0.92);
                    backdrop-filter: blur(20px) saturate(180%);
                    border: 0.5px solid rgba(255,255,255,0.95);
                    border-radius: 20px;
                    padding: 14px 16px;
                    display: flex; align-items: center; gap: 14px;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.95),
                                0 4px 14px rgba(11,76,143,0.06);
                    transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1);
                }
                .week-day-card.today {
                    background: linear-gradient(135deg, rgba(11,113,252,0.06), rgba(23,200,212,0.10));
                    border-color: rgba(23,200,212,0.4);
                }
                .week-day-card:active { transform: scale(0.98); }

                .week-day-pill {
                    flex-shrink: 0;
                    width: 52px; height: 52px;
                    background: linear-gradient(135deg, #0B71FC, #17C8D4);
                    color: white;
                    border-radius: 16px;
                    display: flex; flex-direction: column;
                    align-items: center; justify-content: center;
                    box-shadow: 0 6px 16px rgba(11,113,252,0.28);
                }
                .week-day-pill .day-name {
                    font-size: 10px; font-weight: 700;
                    text-transform: uppercase; letter-spacing: 0.5px;
                    opacity: 0.9;
                }
                .week-day-pill .day-num {
                    font-family: 'Poppins', sans-serif;
                    font-size: 18px; font-weight: 900;
                    line-height: 1;
                }
                .week-day-content {
                    flex: 1; min-width: 0;
                }
                .week-plan-title {
                    font-size: 14px; font-weight: 800;
                    color: var(--cobalt); margin: 0;
                    display: flex; align-items: center; gap: 6px;
                }
                .week-plan-summary {
                    font-size: 12px; color: var(--text-secondary);
                    margin: 3px 0 0; line-height: 1.4;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .week-plan-meta {
                    font-size: 10.5px; font-weight: 700;
                    color: var(--text-tertiary);
                    margin-top: 4px;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }
                .week-plan-empty {
                    font-size: 13px;
                    color: var(--text-tertiary);
                    font-style: italic;
                }

                /* Botón Sorpréndeme arriba de planes IA */
                .surprise-btn {
                    display: flex;
                    align-items: center; justify-content: center;
                    gap: 8px;
                    width: 100%;
                    background: var(--brand-gradient);
                    color: white;
                    border: none;
                    border-radius: 999px;
                    padding: 14px;
                    font-family: -apple-system, sans-serif;
                    font-size: 15px;
                    font-weight: 800;
                    cursor: pointer;
                    margin-bottom: 16px;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.25),
                                0 10px 28px rgba(11,113,252,0.3);
                    transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1);
                }
                .surprise-btn:active { transform: scale(0.96); }
            `;
            document.head.appendChild(style);
        }

        // Detectar ciudad en paralelo + clima Open-Meteo
        window.GoHappyAI.getCityFromCoords(window.GoHappyToday._coords).then(info => {
            window.GoHappyToday._city = info;
            const sub = document.getElementById('today-city-sub');
            if (sub) sub.textContent = `📍 ${info.full}`;
        });

        // ── WEATHER WIDGET (Open-Meteo gratis) ──
        (async () => {
            try {
                const [lat, lng] = window.GoHappyToday._coords.split(',').map(s => parseFloat(s.trim()));
                const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&forecast_days=1`, { signal: AbortSignal.timeout(5000) });
                const data = await r.json();
                const t = data?.current?.temperature_2m;
                const code = data?.current?.weather_code;
                if (typeof t === 'number') {
                    const wIcon = code === 0 ? '☀️'
                        : code <= 3 ? '⛅'
                        : code <= 49 ? '🌫️'
                        : code <= 67 ? '🌧️'
                        : code <= 77 ? '🌨️'
                        : code <= 99 ? '⛈️' : '⛅';
                    const ic = document.getElementById('today-weather-icon');
                    const tp = document.getElementById('today-weather-temp');
                    if (ic) ic.textContent = wIcon;
                    if (tp) tp.textContent = Math.round(t) + '°';
                }
            } catch (e) { /* silent */ }
        })();

        // ── PULL-TO-REFRESH ──
        (() => {
            let startY = 0, pulling = false, currentDistance = 0;
            const ptr = document.getElementById('today-ptr');
            const icon = document.getElementById('today-ptr-icon');
            const txt  = document.getElementById('today-ptr-text');
            const THRESHOLD = 80;
            const onTouchStart = (e) => {
                if (container.scrollTop > 5) { pulling = false; return; }
                startY = e.touches[0].clientY;
                pulling = true;
            };
            const onTouchMove = (e) => {
                if (!pulling) return;
                const dy = e.touches[0].clientY - startY;
                if (dy <= 0) return;
                currentDistance = Math.min(dy * 0.45, 100);
                ptr.style.transform = `translateY(${currentDistance - 60}px)`;
                if (icon) icon.style.transform = currentDistance >= THRESHOLD ? 'rotate(180deg)' : 'rotate(0deg)';
                if (txt && window.GoHappyI18n) {
                    txt.textContent = currentDistance >= THRESHOLD
                        ? (window.GoHappyI18n.lang === 'en' ? 'Release to refresh' : 'Suelta para refrescar')
                        : (window.GoHappyI18n.lang === 'en' ? 'Pull to refresh' : 'Tira para refrescar');
                }
            };
            const onTouchEnd = () => {
                if (!pulling) return;
                pulling = false;
                if (currentDistance >= THRESHOLD) {
                    if (icon) icon.textContent = '🔄';
                    if (txt) txt.textContent = window.GoHappyI18n?.lang === 'en' ? 'Refreshing…' : 'Refrescando…';
                    ptr.style.transform = 'translateY(0px)';
                    // Re-render página
                    setTimeout(() => {
                        if (window.GoHappySound) window.GoHappySound.play('click');
                        window.GoHappyToday.render(container);
                    }, 400);
                } else {
                    ptr.style.transform = 'translateY(-60px)';
                }
                currentDistance = 0;
            };
            container.addEventListener('touchstart', onTouchStart, { passive: true });
            container.addEventListener('touchmove',  onTouchMove,  { passive: true });
            container.addEventListener('touchend',   onTouchEnd,   { passive: true });
            container.addEventListener('touchcancel', () => { pulling = false; ptr.style.transform = 'translateY(-60px)'; currentDistance = 0; }, { passive: true });
        })();

        // Bind toggle
        container.querySelectorAll('.t-view-btn').forEach(btn => {
            btn.onclick = () => {
                container.querySelectorAll('.t-view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                window.GoHappyToday._currentView = btn.dataset.view;
                window.GoHappyToday._renderView();
            };
        });

        // ⭐ Plan del día (no bloquea el resto del render — aparece en cuanto llega)
        window.GoHappyToday._renderPlanDelDia();

        // Render vista inicial
        await window.GoHappyToday._renderView();
    },

    _renderView: async () => {
        const content = document.getElementById('today-view-content');
        if (!content) return;
        const view = window.GoHappyToday._currentView;

        if (view === 'eventos') return window.GoHappyToday._renderEventos(content);
        if (view === 'planes')  return window.GoHappyToday._renderPlanes(content);
        if (view === 'semana')  return window.GoHappyToday._renderSemana(content);
    },

    // ───────────────────── VISTA 1: EVENTOS REALES ─────────────────────
    _renderEventos: async (content) => {
        const T = window.t || (k => k);

        // VISTA UNIFICADA: sin chips de filtro. Pedimos eventos de los próximos 7 días.
        content.innerHTML = `
            <div id="events-list">
                ${window.GoHappyToday._skeletonCards(3)}
            </div>
        `;

        try {
            // Siempre pedimos "próximos 7 días" — más eventos, sin chips
            let events = await window.GoHappyAI.getRealEvents(window.GoHappyToday._coords, 'finde');
            let usedFilter = 'finde';
            let fallbackUsed = false;

            // FALLBACK (legacy var unused now)
            const fallbackChain = []; // not used anymore
            const filter = usedFilter;
            const list = document.getElementById('events-list');

            if (!events || events.length === 0) {
                list.innerHTML = `
                    <div class="moments-empty" style="margin-top: 20px;">
                        <div class="moments-empty-icon">🏜️</div>
                        <div class="moments-empty-title">${T('today.no.events')}</div>
                        <div class="moments-empty-text">${T('today.no.events.sub')}</div>
                    </div>
                `;
                return;
            }

            let fallbackBanner = ''; // sin chips — la fecha se muestra en cada card

            // Sprint 3: citas de Search Grounding (si hay)
            let citationsHtml = '';
            try {
                const cites = window.GoHappyAI?._lastCitations || [];
                if (cites.length) {
                    const lang = window.GoHappyI18n?.lang || 'es';
                    const title = lang === 'en' ? 'Sources' : 'Fuentes';
                    citationsHtml = `
                        <div class="event-citations">
                            <div class="ec-title">🔗 ${title}</div>
                            ${cites.map(c => `<a class="ec-link" href="${c.uri}" target="_blank" rel="noopener noreferrer">${(c.title || '').slice(0, 60)}</a>`).join('')}
                        </div>
                    `;
                }
            } catch (e) {}

            list.innerHTML = fallbackBanner + events.map(e => window.GoHappyToday._renderEventCard(e)).join('') + `
                <div class="event-disclaimer">
                    ${window.GoHappyI18n ? window.GoHappyI18n.t('today.disclaimer') : 'ⓘ Verifica horarios y entradas en la web oficial antes de ir'}
                </div>
                ${citationsHtml}
            `;

            // Bind botones de ruta → navegador nativo
            list.querySelectorAll('.event-route-btn').forEach((btn, idx) => {
                btn.onclick = () => {
                    const ev = events[idx];
                    if (!ev) return;
                    if (window.GoHappyNav) {
                        // Si tenemos coords del evento (lat/lng), usar; si no, buscar por nombre + ciudad
                        const cityName = window.GoHappyToday._city?.city || '';
                        const query = `${ev.location || ev.title}${cityName ? ', ' + cityName : ''}`;
                        if (ev.lat && ev.lng) {
                            window.GoHappyNav.openRoute(parseFloat(ev.lat), parseFloat(ev.lng), ev.location || ev.title);
                        } else {
                            window.GoHappyNav.openSearch(query);
                        }
                    }
                };
            });

            // Indicador IA real
            const src = window.GoHappyAI._lastSource;
            if (src === 'real') {
                window.GoHappyToast && window.GoHappyToast.success(T('today.real.events'), 2500);
            }
        } catch (e) {
            console.error('Eventos error:', e);
            document.getElementById('events-list').innerHTML = `
                <div class="moments-empty"><div class="moments-empty-icon">⚠️</div><div class="moments-empty-title">${T('err.load.page')}</div><div class="moments-empty-text">${T('err.try.again')}</div></div>
            `;
        }
    },

    _renderEventCard: (e) => {
        const sec = window.GoHappySecurity;
        const safe = (s) => sec ? sec.safe(s || '') : String(s || '').replace(/[<>]/g, '');
        const url = (e.linkUrl && /^https?:\/\//.test(e.linkUrl)) ? e.linkUrl : null;
        const linkAttr = url ? `href="${url}" target="_blank" rel="noopener"` : 'href="#" onclick="return false"';
        const t = window.GoHappyI18n ? window.GoHappyI18n.t.bind(window.GoHappyI18n) : (k => k);
        const lang = window.GoHappyI18n?.lang || 'es';
        const routeLabel = lang === 'en' ? '🗺️ Route' : '🗺️ Ruta';
        const linkLabel = safe(e.linkText || (window.t ? window.t('today.event.cta') : 'Más info'));

        // Icono según categoría
        const catIcons = {
            taller: '🎨', workshop: '🎨', teatro: '🎭', theatre: '🎭', theater: '🎭',
            museo: '🏛️', museum: '🏛️', 'aire-libre': '🌳', outdoor: '🌳',
            cine: '🎬', cinema: '🎬', feria: '🎡', fair: '🎡',
            mercado: '🛍️', market: '🛍️', ruta: '🥾', trail: '🥾'
        };
        const catKey = String(e.category || '').toLowerCase();
        const icon = catIcons[catKey] || '✨';

        // Construir fecha legible: prioridad e.date (real) → e.dayLabel (HOY/MAÑANA)
        let dateLabel = '';
        if (e.date) {
            // Si es ISO yyyy-mm-dd o ya viene formateado
            try {
                const d = new Date(e.date);
                if (!isNaN(d.getTime())) {
                    const days = lang === 'en'
                        ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
                        : ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
                    const months = lang === 'en'
                        ? ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
                        : ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
                    dateLabel = `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
                } else {
                    dateLabel = String(e.date);
                }
            } catch { dateLabel = String(e.date); }
        } else if (e.dayLabel) {
            dateLabel = e.dayLabel;
        } else {
            dateLabel = lang === 'en' ? 'Soon' : 'Próximamente';
        }

        return `
            <div class="event-card-v2 card-anim">
                <div class="evc-top">
                    <span class="evc-icon">${icon}</span>
                    <div class="evc-top-text">
                        <div class="evc-meta">
                            <span class="evc-day">📅 ${safe(dateLabel)}</span>
                            <span class="evc-time">${safe(e.time || '')}</span>
                        </div>
                        <h3 class="evc-title">${safe(e.title || 'Evento')}</h3>
                    </div>
                </div>

                ${e.description ? `<p class="evc-desc">${safe(e.description)}</p>` : ''}

                <div class="evc-info">
                    ${e.location ? `<div class="evc-info-row"><span class="evc-info-emoji">📍</span><span class="evc-info-text">${safe(e.location)}</span></div>` : ''}
                    ${e.distanceDesc ? `<div class="evc-info-row"><span class="evc-info-emoji">🚶</span><span class="evc-info-text">${safe(e.distanceDesc)}</span></div>` : ''}
                    <div class="evc-info-row evc-info-pills">
                        <span class="evc-pill evc-pill-price">💰 ${safe(e.price || 'Gratis')}</span>
                        <span class="evc-pill">👶 ${safe(e.ages || 'Familia')}</span>
                    </div>
                </div>

                ${e.tip ? `<div class="evc-tip">💡 ${safe(e.tip)}</div>` : ''}

                <div class="evc-actions">
                    <a class="evc-btn evc-btn-primary" ${linkAttr}>${linkLabel}</a>
                    <button class="evc-btn evc-btn-secondary event-route-btn" data-loc="${safe(e.location)}">${routeLabel}</button>
                </div>
            </div>
        `;
    },

    // ───────────────────── VISTA 2: PLANES IA "DONE FOR YOU" ─────────────────────
    _renderPlanes: async (content) => {
        const storedPrefs = JSON.parse(localStorage.getItem('GoHappy_family_prefs') || 'null');
        const T = window.t || (k => k);

        // El botón "Sorpréndeme" va ABAJO: debajo del cuestionario y, dentro de
        // los planes, al final de todo.
        content.innerHTML = `
            <div id="planes-list">
                ${window.GoHappyToday._skeletonCards(3)}
            </div>
            <button id="surprise-btn" class="surprise-btn" style="margin-top:14px;">
                ${T('today.surprise')}
            </button>
        `;

        document.getElementById('surprise-btn').onclick = () => {
            window.GoHappyToday._loadPlanes(storedPrefs, true);
        };

        if (!storedPrefs) {
            window.GoHappyToday._renderQuestionnaire(document.getElementById('planes-list'));
            return;
        }

        await window.GoHappyToday._loadPlanes(storedPrefs);
    },

    _loadPlanes: async (prefs, force = false) => {
        const list = document.getElementById('planes-list');
        if (!list) return;

        list.innerHTML = window.GoHappyToday._skeletonCards(3);

        try {
            const activities = await window.GoHappyAI.getTodayActivities(window.GoHappyToday._coords, prefs);
            window.GoHappyToday._renderPlanCards(list, activities);

            const src = window.GoHappyAI._lastSource;
            if (src === 'real') {
                window.GoHappyToast && window.GoHappyToast.success(window.L ? window.L('✨ Planes generados por IA real', '✨ Plans generated by real AI') : '✨ Plans by AI', 2500);
            }
        } catch (e) {
            console.error('Planes error:', e);
            list.innerHTML = `<div class="moments-empty"><div class="moments-empty-icon">⚠️</div><div class="moments-empty-title">${window.L ? window.L('No se pudo cargar', 'Could not load') : 'Could not load'}</div></div>`;
        }
    },

    _renderPlanCards: (list, activities) => {
        if (!activities || activities.length === 0) {
            const lang = window.GoHappyI18n?.lang || 'es';
            const src = window.GoHappyAI?._lastSource;

            // Distinguir el motivo real
            let icon = '🏜️';
            let title, sub;
            if (src === 'rate-limited') {
                icon = '⏳';
                title = lang === 'en' ? 'AI is busy right now' : 'IA saturada ahora mismo';
                sub   = lang === 'en' ? 'Try again in 30 seconds' : 'Reintenta en 30 segundos';
            } else if (src === 'timeout' || src === 'error') {
                icon = '⚠️';
                title = lang === 'en' ? 'Could not generate plans' : 'No se pudieron generar planes';
                sub   = lang === 'en' ? 'Check connection and tap retry' : 'Comprueba conexión e intenta de nuevo';
            } else if (src === 'no-auth') {
                icon = '🔐';
                title = lang === 'en' ? 'Sign in to see plans' : 'Inicia sesión para ver planes';
                sub   = '';
            } else {
                title = lang === 'en' ? 'No plans available' : 'No hay planes ahora';
                sub   = lang === 'en' ? 'Try changing your preferences' : 'Prueba a cambiar tus preferencias';
            }

            list.innerHTML = `
                <div class="moments-empty" style="padding:30px 20px;">
                    <div class="moments-empty-icon" style="font-size:42px;">${icon}</div>
                    <div class="moments-empty-title" style="margin-top:10px;">${title}</div>
                    ${sub ? `<div class="moments-empty-text" style="margin-top:4px;">${sub}</div>` : ''}
                    <button id="plans-retry-btn" class="btn-primary" style="margin-top:16px; padding:10px 22px; border-radius:999px; border:none; cursor:pointer;">
                        ${lang === 'en' ? '🔄 Retry' : '🔄 Reintentar'}
                    </button>
                </div>
            `;
            const retryBtn = document.getElementById('plans-retry-btn');
            if (retryBtn) {
                retryBtn.onclick = () => {
                    const prefs = JSON.parse(localStorage.getItem('GoHappy_family_prefs') || 'null');
                    if (prefs) window.GoHappyToday._loadPlanes(prefs);
                };
            }
            return;
        }

        const sec = window.GoHappySecurity;
        const safe = (s) => sec ? sec.safe(s || '') : String(s || '').replace(/[<>]/g, '');

        const lang2 = window.GoHappyI18n?.lang || 'es';
        list.innerHTML = activities.map((act, idx) => {
            const isFree = (act.price || '').toLowerCase().includes('grat');
            const isSuper = idx === 0;
            const superBadge = isSuper
                ? `<span class="superplan-badge">⭐ ${lang2 === 'en' ? 'Super plan' : 'Súper plan'}</span>` : '';
            const whyHtml = (isSuper && act.whyPerfect)
                ? `<div class="event-tip" style="background:rgba(255,138,80,0.10);"><span class="event-tip-icon">💙</span><span>${safe(act.whyPerfect)}</span></div>` : '';
            return `
                <div class="plan-card-premium card-anim ${isSuper ? 'is-superplan' : ''}">
                    <div class="event-meta-row">
                        ${superBadge}
                        <span class="event-day-badge">${safe(act.typeLabel || 'Plan')}</span>
                        <span class="event-time">🕐 ${safe(act.time || 'Flexible')}</span>
                        <span class="event-cat-tag" style="background:${isFree?'rgba(39,174,96,0.1)':'rgba(230,126,34,0.1)'}; color:${isFree?'#27AE60':'#E67E22'};">${safe(act.price || 'Gratis')}</span>
                    </div>
                    <h3 class="event-title">${safe(act.title || 'Plan')}</h3>
                    <p class="event-desc">${safe(act.summary || '')}</p>
                    ${whyHtml}
                    <div class="event-info-grid">
                        <div class="event-info-item">📍 <strong>${safe(act.location || '')}</strong></div>
                        <div class="event-info-item">🚶 ${safe(act.distanceDesc || '')}</div>
                        <div class="event-info-item">⏳ <strong>${safe(act.duration || 'Flexible')}</strong></div>
                        <div class="event-info-item">👶 ${safe(act.ages || act.age || 'Familia')}</div>
                    </div>
                    ${act.tip ? `<div class="event-tip"><span class="event-tip-icon">💡</span><span>${safe(act.tip)}</span></div>` : ''}
                    <div style="display:flex; gap:8px;">
                        <button class="event-cta" data-act="${idx}" style="flex:2;">✨ Guardar plan</button>
                        <button class="event-cta plan-map-btn" data-lat="${parseFloat(act.lat)||0}" data-lng="${parseFloat(act.lng)||0}" data-loc="${safe(act.location)}" style="flex:1; background:rgba(11,76,143,0.08); color:var(--cobalt); box-shadow:none;">🗺️</button>
                    </div>
                </div>
            `;
        }).join('') + `
            <button id="refine-btn" style="width:100%; margin-top:8px; padding:14px; background:transparent; border:none; color:var(--cobalt); font-weight:700; cursor:pointer; text-decoration:underline; font-size:13px;">
                ⚙️ Cambiar preferencias de familia
            </button>
        `;

        // Bind actions
        list.querySelectorAll('[data-act]').forEach(btn => {
            btn.onclick = async () => {
                const idx = parseInt(btn.dataset.act);
                const act = activities[idx];
                window.GoHappyToday._markPlanPending(act); // 🔁 cerrar el bucle más tarde
                window.GoHappyToday._persistSavedPlan(act); // 📌 a "Mis planes guardados"
                if (window.GoHappyPoints) await window.GoHappyPoints.addPoints('QUEST');
                const user = window.GoHappyAuth.checkAuth();
                if (user && !user.isGuest) {
                    try {
                        await window.GoHappyDB.collection('activity').add({
                            userId: user.uid,
                            type: 'visit',
                            title: act.title || 'Plan',
                            description: `Plan familiar en ${act.location || ''}`,
                            points: 50,
                            timestamp: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    } catch (e) {}
                }
                btn.textContent = window.t ? window.t('today.plan.saved') : '✅ Plan guardado';
                btn.style.background = '#27AE60';
                const lang = window.GoHappyI18n?.lang || 'es';
                const msg = lang === 'en' ? `Plan "${act.title}" saved! +50 pts 🎉` : `¡Plan "${act.title}" guardado! +50 pts 🎉`;
                window.GoHappyToast.points(msg);

                // Flujo B: auto-crear Quest familiar a partir del plan guardado
                try {
                    if (user && !user.isGuest && user.familyId && window.GoHappyQuests?.createCustomQuest) {
                        const questTitle = lang === 'en'
                            ? `Family plan: ${act.title}`
                            : `Plan familiar: ${act.title}`;
                        const questDesc = lang === 'en'
                            ? `Make the most of "${act.title}"${act.location ? ' at ' + act.location : ''}. Mark it done when you've enjoyed it together.`
                            : `Disfrutad de "${act.title}"${act.location ? ' en ' + act.location : ''}. Marcad esta misión al volver a casa.`;
                        const res = await window.GoHappyQuests.createCustomQuest({
                            titulo: questTitle,
                            descripcion: questDesc,
                            icono: act.icon || '🎯',
                            puntos: 80,
                            categoria: 'familiar',
                            frecuencia: 'semanal',
                            origen: 'today_plan'
                        });
                        if (res?.ok) {
                            setTimeout(() => {
                                window.GoHappyToast.info(
                                    lang === 'en'
                                        ? '⚔️ A Quest was created from this plan'
                                        : '⚔️ Hemos creado una Quest con este plan',
                                    3500
                                );
                            }, 1500);
                        }
                    }
                } catch (e) { /* ignore */ }
            };
        });

        list.querySelectorAll('.plan-map-btn').forEach(btn => {
            btn.onclick = () => {
                const lat = parseFloat(btn.dataset.lat);
                const lng = parseFloat(btn.dataset.lng);
                const loc = btn.dataset.loc;
                // Abrir en navegador nativo (Apple Maps / Google Maps / Waze)
                if (lat && lng && window.GoHappyNav) {
                    window.GoHappyNav.openRoute(lat, lng, loc);
                } else if (window.GoHappyNav) {
                    window.GoHappyNav.openSearch(loc);
                }
            };
        });

        const refine = document.getElementById('refine-btn');
        if (refine) refine.onclick = () => {
            localStorage.removeItem('GoHappy_family_prefs');
            window.GoHappyToday._renderQuestionnaire(list);
        };
    },

    _renderQuestionnaire: (container) => {
        const T = window.t || (k => k);
        container.innerHTML = `
            <div class="plan-card-premium" style="padding: 24px;">
                <h3 style="font-family:'Poppins',sans-serif; font-weight:900; color:var(--cobalt); margin-bottom:18px; font-size:1.15rem;">
                    ${T('today.questionnaire.title')}
                </h3>

                <div style="margin-bottom:14px;">
                    <label style="font-size:11px; font-weight:800; color:var(--text-secondary); text-transform:uppercase;">${T('today.questionnaire.who')}</label>
                    <div style="display:flex; gap:10px; margin-top:6px;">
                        <input type="number" id="q-adults" value="2" min="1" max="6" placeholder="${T('today.questionnaire.adults')}">
                        <input type="number" id="q-kids" value="2" min="0" max="6" placeholder="${T('today.questionnaire.kids')}">
                    </div>
                </div>
                <div style="margin-bottom:14px;">
                    <label style="font-size:11px; font-weight:800; color:var(--text-secondary); text-transform:uppercase;">${T('today.questionnaire.ages')}</label>
                    <input type="text" id="q-ages" placeholder="${T('today.questionnaire.ages.placeholder')}" style="margin-top:6px;">
                </div>
                <div style="margin-bottom:14px;">
                    <label style="font-size:11px; font-weight:800; color:var(--text-secondary); text-transform:uppercase;">${T('today.questionnaire.pref')}</label>
                    <select id="q-environment" style="margin-top:6px; padding:13px 16px; border-radius:18px; width:100%; border:0.5px solid rgba(11,76,143,0.15); background:white; font-size:15px;">
                        <option value="Both">${T('today.questionnaire.any')}</option>
                        <option value="Outdoor">${T('today.questionnaire.outdoor')}</option>
                        <option value="Indoor">${T('today.questionnaire.indoor')}</option>
                    </select>
                </div>
                <div style="margin-bottom:18px;">
                    <label style="font-size:11px; font-weight:800; color:var(--text-secondary); text-transform:uppercase;">${T('today.questionnaire.budget')}</label>
                    <select id="q-budget" style="margin-top:6px; padding:13px 16px; border-radius:18px; width:100%; border:0.5px solid rgba(11,76,143,0.15); background:white; font-size:15px;">
                        <option value="Any">${T('today.questionnaire.any')}</option>
                        <option value="Free">${T('today.questionnaire.free')}</option>
                    </select>
                </div>
                <button id="save-prefs" class="btn-primary" style="width:100%; height:54px;">${T('today.questionnaire.find')}</button>
            </div>
        `;

        document.getElementById('save-prefs').onclick = () => {
            const prefs = {
                adults: document.getElementById('q-adults').value,
                kids: document.getElementById('q-kids').value,
                ages: document.getElementById('q-ages').value || ((window.GoHappyI18n?.lang || 'es') === 'en' ? 'Various ages' : 'Varias edades'),
                environment: document.getElementById('q-environment').value,
                budget: document.getElementById('q-budget').value,
                distance: 'Any',
                timestamp: Date.now()
            };
            localStorage.setItem('GoHappy_family_prefs', JSON.stringify(prefs));

            // Sprint 2: sincronizar al family_context
            try {
                if (window.GoHappyContext) {
                    window.GoHappyContext.setChildrenAges(prefs.ages);
                    window.GoHappyContext.update({
                        preferences: {
                            environment: String(prefs.environment || '').toLowerCase() || null,
                            budget:      String(prefs.budget || '').toLowerCase() || null,
                            distance:    String(prefs.distance || '').toLowerCase() || null
                        }
                    });
                }
            } catch (e) { /* ignore */ }

            window.GoHappyToday._loadPlanes(prefs);
        };
    },

    // ───────────────────── VISTA 3: SEMANA (CALENDAR) ─────────────────────
    _renderSemana: async (content) => {
        const T = window.t || (k => k);
        content.innerHTML = `
            <div id="week-list">
                ${window.GoHappyToday._skeletonCards(4)}
            </div>
        `;

        try {
            const storedPrefs = JSON.parse(localStorage.getItem('GoHappy_family_prefs') || 'null');
            const weekData = await window.GoHappyAI.getWeekPlans(window.GoHappyToday._coords, storedPrefs);

            const today = new Date();
            const days = [];
            for (let i = 0; i < 7; i++) {
                const d = new Date(today);
                d.setDate(today.getDate() + i);
                days.push({
                    key: `d${i}`,
                    isToday: i === 0,
                    dayName: ((window.GoHappyI18n?.lang || 'es') === 'en'
                        ? ['SUN','MON','TUE','WED','THU','FRI','SAT']
                        : ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'])[d.getDay()],
                    num: d.getDate(),
                    plan: weekData?.[`d${i}`] || null
                });
            }

            const sec = window.GoHappySecurity;
            const safe = (s) => sec ? sec.safe(s || '') : String(s || '').replace(/[<>]/g, '');

            const list = document.getElementById('week-list');
            list.innerHTML = `
                <div class="week-grid">
                    ${days.map(d => {
                        if (!d.plan || !d.plan.title) {
                            return `
                                <div class="week-day-card ${d.isToday?'today':''}">
                                    <div class="week-day-pill"><span class="day-name">${d.dayName}</span><span class="day-num">${d.num}</span></div>
                                    <div class="week-day-content">
                                        <h4 class="week-plan-title">${window.t ? window.t('today.no.plan') : 'Sin planificar'}</h4>
                                        <p class="week-plan-empty">${window.t ? window.t('today.free.day') : 'Día libre — disfrutad juntos'}</p>
                                    </div>
                                </div>
                            `;
                        }
                        return `
                            <div class="week-day-card ${d.isToday?'today':''}">
                                <div class="week-day-pill"><span class="day-name">${d.dayName}</span><span class="day-num">${d.num}</span></div>
                                <div class="week-day-content">
                                    <h4 class="week-plan-title">${safe(d.plan.icon || '✨')} ${safe(d.plan.title)}</h4>
                                    <p class="week-plan-summary">${safe(d.plan.summary || '')}</p>
                                    <div class="week-plan-meta">${safe(d.plan.time || '')} · ${safe(d.plan.location || '')} · ${safe(d.plan.price || '')}</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;

            const src = window.GoHappyAI._lastSource;
            if (src === 'real') {
                window.GoHappyToast && window.GoHappyToast.success('✨ Semana planificada por IA real', 2500);
            }
        } catch (e) {
            console.error('Semana error:', e);
            document.getElementById('week-list').innerHTML = `<div class="moments-empty"><div class="moments-empty-icon">⚠️</div><div class="moments-empty-title">${window.L ? window.L('No se pudo cargar', 'Could not load') : 'Could not load'}</div></div>`;
        }
    }
};

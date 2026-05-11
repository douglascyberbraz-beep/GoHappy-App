// ================================================================
// GoHappy Today v3 — Centro de comando familiar
// 3 vistas: 🎫 Eventos (default) | 🪄 Planes IA | 📅 Semana
// ================================================================
window.GoHappyToday = {

    _currentView: 'eventos',  // 'eventos' | 'planes' | 'semana'
    _currentFilter: 'hoy',    // 'hoy' | 'manana' | 'finde'
    _city: null,
    _coords: '41.6520, -4.7286',

    render: async (container) => {
        // Coords iniciales
        window.GoHappyToday._coords = window.lastKnownCoords || '41.6520, -4.7286';

        const T = window.t || (k => k);
        container.innerHTML = `
            <div class="today-page">
                <div class="today-hero-premium">
                    <div style="position:relative; z-index:2;">
                        <h2 class="today-welcome-title">${T('today.title')}</h2>
                        <p class="today-welcome-subtitle" id="today-city-sub">${T('today.detecting')}</p>
                    </div>
                </div>

                <!-- TOGGLE 3 vistas -->
                <div class="today-view-toggle">
                    <button class="t-view-btn active" data-view="eventos">
                        <span>🎫</span> ${T('today.view.events').replace('🎫 ','')}
                    </button>
                    <button class="t-view-btn" data-view="planes">
                        <span>🪄</span> ${T('today.view.plans').replace('🪄 ','')}
                    </button>
                    <button class="t-view-btn" data-view="semana">
                        <span>📅</span> ${T('today.view.week').replace('📅 ','')}
                    </button>
                </div>

                <!-- Contenedor dinámico de vistas -->
                <div id="today-view-content" style="padding: 0 16px calc(var(--nav-total, 110px) + 24px);">
                    <div class="center-text p-40">
                        <div class="typing-dots"><span></span><span></span><span></span></div>
                        <p style="margin-top:14px; color:var(--text-secondary); font-size:13px;">${T('common.loading')}</p>
                    </div>
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
                .event-card {
                    background: rgba(255,255,255,0.92);
                    backdrop-filter: blur(30px) saturate(180%);
                    border: 0.5px solid rgba(255,255,255,0.95);
                    border-radius: 24px;
                    padding: 18px;
                    margin-bottom: 14px;
                    box-shadow: inset 0 1px 0 rgba(255,255,255,0.95),
                                0 8px 28px rgba(11,76,143,0.08);
                    transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
                }
                .event-card:active { transform: scale(0.975); }

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
                    gap: 6px 10px;
                    background: rgba(11,76,143,0.04);
                    padding: 10px 12px;
                    border-radius: 14px;
                    margin-bottom: 14px;
                    font-size: 12px;
                }
                .event-info-item {
                    display: flex; align-items: center; gap: 6px;
                    color: var(--text-secondary);
                }
                .event-info-item strong { color: var(--text-primary); font-weight: 700; }

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

        // Detectar ciudad en paralelo
        window.GoHappyAI.getCityFromCoords(window.GoHappyToday._coords).then(info => {
            window.GoHappyToday._city = info;
            const sub = document.getElementById('today-city-sub');
            if (sub) sub.textContent = `📍 ${info.full}`;
        });

        // Bind toggle
        container.querySelectorAll('.t-view-btn').forEach(btn => {
            btn.onclick = () => {
                container.querySelectorAll('.t-view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                window.GoHappyToday._currentView = btn.dataset.view;
                window.GoHappyToday._renderView();
            };
        });

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
        const filter = window.GoHappyToday._currentFilter;
        const T = window.t || (k => k);

        content.innerHTML = `
            <div class="events-filters">
                <button class="ev-filter-chip ${filter==='hoy'?'active':''}" data-filter="hoy">${T('today.filter.today')}</button>
                <button class="ev-filter-chip ${filter==='manana'?'active':''}" data-filter="manana">${T('today.filter.tomorrow')}</button>
                <button class="ev-filter-chip ${filter==='finde'?'active':''}" data-filter="finde">${T('today.filter.weekend')}</button>
            </div>
            <div id="events-list">
                <div class="center-text p-40">
                    <div class="magic-loader" style="font-size:40px;">🎫</div>
                    <div class="typing-dots" style="margin-top:12px;"><span></span><span></span><span></span></div>
                    <p style="margin-top:12px; color:var(--text-secondary); font-size:13px;">${T('today.loading.events')}</p>
                </div>
            </div>
        `;

        // Bind filtros
        content.querySelectorAll('.ev-filter-chip').forEach(chip => {
            chip.onclick = () => {
                window.GoHappyToday._currentFilter = chip.dataset.filter;
                window.GoHappyToday._renderEventos(content);
            };
        });

        try {
            const events = await window.GoHappyAI.getRealEvents(window.GoHappyToday._coords, filter);
            const list = document.getElementById('events-list');

            if (!events || events.length === 0) {
                list.innerHTML = `
                    <div class="moments-empty" style="margin-top: 20px;">
                        <div class="moments-empty-icon">🏜️</div>
                        <div class="moments-empty-title">Sin eventos esta vez</div>
                        <div class="moments-empty-text">Prueba con otro día o vuelve más tarde.</div>
                    </div>
                `;
                return;
            }

            list.innerHTML = events.map(e => window.GoHappyToday._renderEventCard(e)).join('') + `
                <div class="event-disclaimer">
                    ${window.GoHappyI18n ? window.GoHappyI18n.t('today.disclaimer') : 'ⓘ Verifica horarios y entradas en la web oficial antes de ir'}
                </div>
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
                window.GoHappyToast && window.GoHappyToast.success('✨ Eventos generados por IA real', 2500);
            }
        } catch (e) {
            console.error('Eventos error:', e);
            document.getElementById('events-list').innerHTML = `
                <div class="moments-empty"><div class="moments-empty-icon">⚠️</div><div class="moments-empty-title">No se pudo cargar</div><div class="moments-empty-text">Inténtalo de nuevo.</div></div>
            `;
        }
    },

    _renderEventCard: (e) => {
        const sec = window.GoHappySecurity;
        const safe = (s) => sec ? sec.safe(s || '') : String(s || '').replace(/[<>]/g, '');
        const url = (e.linkUrl && /^https?:\/\//.test(e.linkUrl)) ? e.linkUrl : null;
        const linkAttr = url ? `href="${url}" target="_blank" rel="noopener"` : 'href="#" onclick="return false"';
        const t = window.GoHappyI18n ? window.GoHappyI18n.t.bind(window.GoHappyI18n) : (k => k);
        const routeLabel = t('map.route');

        return `
            <div class="event-card card-anim">
                <div class="event-meta-row">
                    <span class="event-day-badge">${safe(e.dayLabel || 'HOY')}</span>
                    <span class="event-time">🕐 ${safe(e.time || 'Consultar')}</span>
                    <span class="event-cat-tag">${safe(e.category || 'evento')}</span>
                </div>
                <h3 class="event-title">${safe(e.title || 'Evento')}</h3>
                <p class="event-desc">${safe(e.description || '')}</p>
                <div class="event-info-grid">
                    <div class="event-info-item">📍 <strong>${safe(e.location || '')}</strong></div>
                    <div class="event-info-item">🚶 ${safe(e.distanceDesc || '')}</div>
                    <div class="event-info-item">💰 <strong>${safe(e.price || 'Gratis')}</strong></div>
                    <div class="event-info-item">👶 ${safe(e.ages || 'Familia')}</div>
                </div>
                ${e.tip ? `<div class="event-tip"><span class="event-tip-icon">💡</span><span>${safe(e.tip)}</span></div>` : ''}
                <div style="display:flex; gap:8px;">
                    <a class="event-cta" ${linkAttr} style="flex:2;">${safe(e.linkText || 'Más info')} →</a>
                    <button class="event-cta event-route-btn" data-loc="${safe(e.location)}" style="flex:1; background:rgba(11,76,143,0.08); color:var(--cobalt); box-shadow:none;">${routeLabel}</button>
                </div>
            </div>
        `;
    },

    // ───────────────────── VISTA 2: PLANES IA "DONE FOR YOU" ─────────────────────
    _renderPlanes: async (content) => {
        const storedPrefs = JSON.parse(localStorage.getItem('GoHappy_family_prefs') || 'null');
        const T = window.t || (k => k);

        content.innerHTML = `
            <button id="surprise-btn" class="surprise-btn">
                ${T('today.surprise')}
            </button>
            <div id="planes-list">
                <div class="center-text p-40">
                    <div class="magic-loader">✨</div>
                    <p style="margin-top:12px; color:var(--text-secondary); font-size:13px;">${T('today.loading.plans')}</p>
                </div>
            </div>
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

        list.innerHTML = `
            <div class="center-text p-40">
                <div class="magic-loader" style="font-size:42px;">✨</div>
                <div class="typing-dots" style="margin-top:14px;"><span></span><span></span><span></span></div>
                <p style="margin-top:12px; color:var(--cobalt); font-weight:600;">GoHappy IA está diseñando planes únicos...</p>
            </div>
        `;

        try {
            const activities = await window.GoHappyAI.getTodayActivities(window.GoHappyToday._coords, prefs);
            window.GoHappyToday._renderPlanCards(list, activities);

            const src = window.GoHappyAI._lastSource;
            if (src === 'real') {
                window.GoHappyToast && window.GoHappyToast.success('✨ Planes generados por IA real', 2500);
            }
        } catch (e) {
            console.error('Planes error:', e);
            list.innerHTML = `<div class="moments-empty"><div class="moments-empty-icon">⚠️</div><div class="moments-empty-title">No se pudo cargar</div></div>`;
        }
    },

    _renderPlanCards: (list, activities) => {
        if (!activities || activities.length === 0) {
            list.innerHTML = `<div class="moments-empty"><div class="moments-empty-icon">🏜️</div><div class="moments-empty-title">No hay planes ahora</div></div>`;
            return;
        }

        const sec = window.GoHappySecurity;
        const safe = (s) => sec ? sec.safe(s || '') : String(s || '').replace(/[<>]/g, '');

        list.innerHTML = activities.map((act, idx) => {
            const isFree = (act.price || '').toLowerCase().includes('grat');
            return `
                <div class="plan-card-premium card-anim">
                    <div class="event-meta-row">
                        <span class="event-day-badge">${safe(act.typeLabel || 'Plan')}</span>
                        <span class="event-time">🕐 ${safe(act.time || 'Flexible')}</span>
                        <span class="event-cat-tag" style="background:${isFree?'rgba(39,174,96,0.1)':'rgba(230,126,34,0.1)'}; color:${isFree?'#27AE60':'#E67E22'};">${safe(act.price || 'Gratis')}</span>
                    </div>
                    <h3 class="event-title">${safe(act.title || 'Plan')}</h3>
                    <p class="event-desc">${safe(act.summary || '')}</p>
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
                btn.textContent = '✅ Plan guardado';
                btn.style.background = '#27AE60';
                window.GoHappyToast.points(`¡Plan "${act.title}" guardado! +50 pts 🎉`);
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
        container.innerHTML = `
            <div class="plan-card-premium" style="padding: 24px;">
                <h3 style="font-family:'Poppins',sans-serif; font-weight:900; color:var(--cobalt); margin-bottom:18px; font-size:1.15rem;">
                    ¿Cómo es vuestro plan ideal? 👨‍👩‍👧‍👦
                </h3>

                <div style="margin-bottom:14px;">
                    <label style="font-size:11px; font-weight:800; color:var(--text-secondary); text-transform:uppercase;">Quiénes venís</label>
                    <div style="display:flex; gap:10px; margin-top:6px;">
                        <input type="number" id="q-adults" value="2" min="1" max="6" placeholder="Adultos">
                        <input type="number" id="q-kids" value="2" min="0" max="6" placeholder="Niños">
                    </div>
                </div>
                <div style="margin-bottom:14px;">
                    <label style="font-size:11px; font-weight:800; color:var(--text-secondary); text-transform:uppercase;">Edades niños</label>
                    <input type="text" id="q-ages" placeholder="Ej: 3, 7" style="margin-top:6px;">
                </div>
                <div style="margin-bottom:14px;">
                    <label style="font-size:11px; font-weight:800; color:var(--text-secondary); text-transform:uppercase;">Preferencia</label>
                    <select id="q-environment" style="margin-top:6px; padding:13px 16px; border-radius:18px; width:100%; border:0.5px solid rgba(11,76,143,0.15); background:white; font-size:15px;">
                        <option value="Both">Indiferente</option>
                        <option value="Outdoor">Al aire libre 🌳</option>
                        <option value="Indoor">A cubierto 🏠</option>
                    </select>
                </div>
                <div style="margin-bottom:18px;">
                    <label style="font-size:11px; font-weight:800; color:var(--text-secondary); text-transform:uppercase;">Presupuesto</label>
                    <select id="q-budget" style="margin-top:6px; padding:13px 16px; border-radius:18px; width:100%; border:0.5px solid rgba(11,76,143,0.15); background:white; font-size:15px;">
                        <option value="Any">Cualquiera</option>
                        <option value="Free">Solo gratis 💸</option>
                    </select>
                </div>
                <button id="save-prefs" class="btn-primary" style="width:100%; height:54px;">Encontrar planes ✨</button>
            </div>
        `;

        document.getElementById('save-prefs').onclick = () => {
            const prefs = {
                adults: document.getElementById('q-adults').value,
                kids: document.getElementById('q-kids').value,
                ages: document.getElementById('q-ages').value || 'Varias edades',
                environment: document.getElementById('q-environment').value,
                budget: document.getElementById('q-budget').value,
                distance: 'Any',
                timestamp: Date.now()
            };
            localStorage.setItem('GoHappy_family_prefs', JSON.stringify(prefs));
            window.GoHappyToday._loadPlanes(prefs);
        };
    },

    // ───────────────────── VISTA 3: SEMANA (CALENDAR) ─────────────────────
    _renderSemana: async (content) => {
        const T = window.t || (k => k);
        content.innerHTML = `
            <div id="week-list">
                <div class="center-text p-40">
                    <div class="magic-loader" style="font-size:42px;">📅</div>
                    <div class="typing-dots" style="margin-top:14px;"><span></span><span></span><span></span></div>
                    <p style="margin-top:12px; color:var(--text-secondary); font-size:13px;">${T('today.loading.week')}</p>
                </div>
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
                    dayName: ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'][d.getDay()],
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
                                        <h4 class="week-plan-title">Sin planificar</h4>
                                        <p class="week-plan-empty">Día libre — disfrutad juntos</p>
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
            document.getElementById('week-list').innerHTML = `<div class="moments-empty"><div class="moments-empty-icon">⚠️</div><div class="moments-empty-title">No se pudo cargar</div></div>`;
        }
    }
};

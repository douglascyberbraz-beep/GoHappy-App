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

        container.innerHTML = `
            <div class="today-page">
                <div class="today-hero-premium">
                    <div style="position:relative; z-index:2;">
                        <h2 class="today-welcome-title">${T('today.title')}</h2>
                        <p class="today-welcome-subtitle" id="today-city-sub">${T('today.detecting')}</p>
                    </div>
                </div>
                ${contextBanner}

                <!-- TOGGLE 2 vistas — Planes IA + Eventos (Semana eliminada) -->
                <div class="today-view-toggle">
                    <button class="t-view-btn active" data-view="planes">
                        <span>🪄</span> ${T('today.view.plans').replace('🪄 ','')}
                    </button>
                    <button class="t-view-btn" data-view="eventos">
                        <span>🎫</span> ${T('today.view.events').replace('🎫 ','')}
                    </button>
                </div>

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
            taller: '🎨', teatro: '🎭', museo: '🏛️', 'aire-libre': '🌳',
            cine: '🎬', feria: '🎡', mercado: '🛍️', ruta: '🥾'
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

        content.innerHTML = `
            <button id="surprise-btn" class="surprise-btn">
                ${T('today.surprise')}
            </button>
            <div id="planes-list">
                ${window.GoHappyToday._skeletonCards(3)}
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

        list.innerHTML = window.GoHappyToday._skeletonCards(3);

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
            document.getElementById('week-list').innerHTML = `<div class="moments-empty"><div class="moments-empty-icon">⚠️</div><div class="moments-empty-title">No se pudo cargar</div></div>`;
        }
    }
};

// ================================================================
// GoHappy Proactive — Sugerencias inteligentes al abrir la app
// Convierte GoHappy en un asistente que se anticipa.
//
// Flujo E: Viernes tarde → "3 planes para el finde"
// Flujo F: Care con 3+ consultas del mismo tag en 7 días → mini-plan
// ================================================================
window.GoHappyProactive = {

    _SHOWN_KEY: 'GoHappy_proactive_shown',

    init: () => {
        // Esperar a que el contexto haya cargado
        setTimeout(() => {
            try { window.GoHappyProactive._maybeFridayPlan(); } catch (e) {}
            try { window.GoHappyProactive._maybeRecurrentCareTopic(); } catch (e) {}
        }, 3500);
    },

    _shownToday: (key) => {
        try {
            const raw = localStorage.getItem(window.GoHappyProactive._SHOWN_KEY) || '{}';
            const map = JSON.parse(raw);
            const todayStr = new Date().toISOString().slice(0, 10);
            return map[key] === todayStr;
        } catch (e) { return false; }
    },

    _markShown: (key) => {
        try {
            const raw = localStorage.getItem(window.GoHappyProactive._SHOWN_KEY) || '{}';
            const map = JSON.parse(raw);
            map[key] = new Date().toISOString().slice(0, 10);
            localStorage.setItem(window.GoHappyProactive._SHOWN_KEY, JSON.stringify(map));
        } catch (e) {}
    },

    // ─── Flujo E: Viernes tarde / sábado mañana → 3 planes para el finde ───
    _maybeFridayPlan: () => {
        const now = new Date();
        const dow = now.getDay();   // 5 = Vie, 6 = Sáb
        const hour = now.getHours();
        const isFridayEvening = dow === 5 && hour >= 17;
        const isSaturdayMorning = dow === 6 && hour >= 8 && hour < 12;
        if (!isFridayEvening && !isSaturdayMorning) return;
        if (window.GoHappyProactive._shownToday('friday_plan')) return;

        const user = window.GoHappyAuth?.checkAuth?.();
        if (!user || user.isGuest) return;

        const lang = window.GoHappyI18n?.lang || 'es';
        const title = lang === 'en' ? '🪄 Plans for the weekend' : '🪄 Planes para el finde';
        const body = lang === 'en'
            ? 'I\'ve prepared 3 personalised plans based on the weather and your kids\' ages.'
            : 'Te he preparado 3 planes personalizados según el tiempo y la edad de los niños.';
        const cta = lang === 'en' ? 'See plans' : 'Ver planes';

        window.GoHappyProactive._showBanner({
            id: 'friday-banner',
            icon: '🪄',
            title, body, cta,
            onClick: () => {
                window.GoHappyApp && window.GoHappyApp.loadPage && window.GoHappyApp.loadPage('today');
                window.GoHappyProactive._markShown('friday_plan');
            },
            onDismiss: () => window.GoHappyProactive._markShown('friday_plan')
        });
    },

    // ─── Flujo F: Tema recurrente en Care → mini-plan personalizado ───
    _maybeRecurrentCareTopic: () => {
        const ctx = window.GoHappyContext?.get?.();
        if (!ctx?.recentChallenges?.length) return;
        if (window.GoHappyProactive._shownToday('recurrent_care')) return;

        const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
        const recent = ctx.recentChallenges.filter(c => c.ts > weekAgo);
        if (recent.length < 3) return;

        // Contar por tag
        const counts = {};
        recent.forEach(c => { counts[c.tag] = (counts[c.tag] || 0) + 1; });
        const topTag = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
        if (!topTag || topTag[1] < 3) return;

        const tag = topTag[0];
        const lang = window.GoHappyI18n?.lang || 'es';
        const tagLabel = {
            tantrums:  lang === 'en' ? 'tantrums' : 'rabietas',
            sleep:     lang === 'en' ? 'sleep' : 'sueño',
            food:      lang === 'en' ? 'eating' : 'alimentación',
            homework:  lang === 'en' ? 'homework' : 'deberes',
            screens:   lang === 'en' ? 'screen time' : 'pantallas',
            siblings:  lang === 'en' ? 'sibling fights' : 'hermanos',
            school:    lang === 'en' ? 'school' : 'cole',
            emotions:  lang === 'en' ? 'emotions' : 'emociones'
        }[tag] || tag;

        const title = lang === 'en'
            ? `💡 7-day mini-plan for ${tagLabel}`
            : `💡 Mini-plan de 7 días para ${tagLabel}`;
        const body = lang === 'en'
            ? `You've asked Care about ${tagLabel} ${topTag[1]} times this week. I can build a personalised plan.`
            : `Has consultado Care sobre ${tagLabel} ${topTag[1]} veces esta semana. Puedo crearte un plan personalizado.`;
        const cta = lang === 'en' ? 'Open Care' : 'Abrir Care';

        window.GoHappyProactive._showBanner({
            id: 'care-recurrent-banner',
            icon: '💡',
            title, body, cta,
            onClick: () => {
                // Pre-llenar el input de Care con la solicitud de mini-plan
                try {
                    localStorage.setItem('GoHappy_care_prefill',
                        lang === 'en'
                            ? `Build me a 7-day plan to handle ${tagLabel} step by step.`
                            : `Hazme un plan de 7 días para gestionar ${tagLabel} paso a paso.`
                    );
                } catch (e) {}
                window.GoHappyApp && window.GoHappyApp.loadPage && window.GoHappyApp.loadPage('care');
                window.GoHappyProactive._markShown('recurrent_care');
            },
            onDismiss: () => window.GoHappyProactive._markShown('recurrent_care')
        });
    },

    // ─── Banner persistente (no se desvanece como toast) ───
    _showBanner: ({ id, icon, title, body, cta, onClick, onDismiss }) => {
        if (document.getElementById(id)) return; // Ya visible
        const el = document.createElement('div');
        el.id = id;
        el.className = 'gh-proactive-banner';
        el.innerHTML = `
            <div class="gh-pb-icon">${icon}</div>
            <div class="gh-pb-text">
                <div class="gh-pb-title">${title}</div>
                <div class="gh-pb-body">${body}</div>
            </div>
            <button class="gh-pb-cta">${cta}</button>
            <button class="gh-pb-close" aria-label="close">×</button>
        `;
        document.body.appendChild(el);

        // Styles inline si no están
        if (!document.getElementById('gh-pb-styles')) {
            const s = document.createElement('style');
            s.id = 'gh-pb-styles';
            s.textContent = `
                .gh-proactive-banner {
                    position: fixed; top: 12px; left: 12px; right: 12px;
                    z-index: 9998;
                    display: flex; align-items: center; gap: 12px;
                    padding: 12px 14px;
                    background: linear-gradient(135deg, rgba(11,113,252,0.96), rgba(23,200,212,0.96));
                    color: white;
                    border-radius: 18px;
                    box-shadow: 0 12px 28px rgba(11,76,143,0.28);
                    backdrop-filter: blur(20px) saturate(180%);
                    animation: gh-pb-slide 0.35s cubic-bezier(0.34,1.56,0.64,1);
                    max-width: 580px; margin: 0 auto;
                }
                @keyframes gh-pb-slide { from { transform: translateY(-20px); opacity: 0; } to { transform: none; opacity: 1; } }
                .gh-pb-icon { font-size: 26px; flex-shrink: 0; }
                .gh-pb-text { flex: 1; min-width: 0; }
                .gh-pb-title { font-weight: 800; font-size: 13.5px; line-height: 1.2; }
                .gh-pb-body  { font-size: 12px; opacity: 0.95; margin-top: 2px; line-height: 1.3; }
                .gh-pb-cta {
                    background: white; color: var(--primary-cobalt, #0B4C8F);
                    border: none; padding: 8px 14px; border-radius: 999px;
                    font-weight: 800; font-size: 12px; cursor: pointer;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.12);
                    flex-shrink: 0;
                }
                .gh-pb-cta:active { transform: scale(0.94); }
                .gh-pb-close {
                    background: transparent; border: none; color: white;
                    font-size: 22px; line-height: 1; padding: 0 4px;
                    cursor: pointer; opacity: 0.8; flex-shrink: 0;
                }
                .gh-pb-close:hover { opacity: 1; }
                @media (max-width: 420px) {
                    .gh-pb-body { display: none; }
                }
            `;
            document.head.appendChild(s);
        }

        el.querySelector('.gh-pb-cta').onclick = () => { el.remove(); onClick && onClick(); };
        el.querySelector('.gh-pb-close').onclick = () => { el.remove(); onDismiss && onDismiss(); };
    }
};

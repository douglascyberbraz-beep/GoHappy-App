// ================================================================
// GoHappy Onboarding Tour — Tutorial interactivo primera vez
// Spotlight sobre cada pestaña + tooltip explicativo
// Se dispara tras crear cuenta. Re-disparable desde Perfil.
// ================================================================
window.GoHappyTour = (() => {

    const SEEN_KEY = 'GoHappy_tour_seen_v1';
    let currentStep = 0;
    let steps = [];
    let active = false;
    let overlay = null;

    function getSteps() {
        const lang = window.GoHappyI18n?.lang || 'es';
        const T = (es, en) => lang === 'en' ? en : es;

        return [
            {
                target: null,  // welcome screen, sin spotlight
                emoji: '👋',
                title: T('¡Bienvenido a GoHappy!', 'Welcome to GoHappy!'),
                body: T(
                    'Te enseño la app en 30 segundos. Verás 7 pestañas, cada una para algo distinto.',
                    'Let me show you the app in 30 seconds. You will see 7 tabs, each for something different.'
                ),
                cta: T('Empezar tour ✨', 'Start tour ✨')
            },
            {
                target: '[data-page="adventures"]',
                emoji: '🗺️',
                title: T('Aventuras', 'Adventures'),
                body: T(
                    'Historias narrativas de 1 semana con misiones reales. Al completar todas, ganáis una insignia familiar.',
                    'One-week narrative stories with real missions. Complete all to win a family badge.'
                )
            },
            {
                target: '[data-page="care"]',
                emoji: '🧡',
                title: T('Care', 'Care'),
                body: T(
                    'Tu coach IA de crianza 24/7. Pregúntale por sueño, rabietas, alimentación o cualquier duda.',
                    'Your 24/7 AI parenting coach. Ask about sleep, tantrums, eating or any concern.'
                )
            },
            {
                target: '[data-page="today"]',
                emoji: '✨',
                title: T('Today', 'Today'),
                body: T(
                    'Cada día te genera 3 planes personalizados para tu familia + eventos REALES de tu ciudad.',
                    'Every day generates 3 personalised plans for your family + REAL events in your city.'
                )
            },
            {
                target: '[data-page="map"]',
                emoji: '📍',
                title: T('Mapa', 'Map'),
                body: T(
                    'Mapa 3D con parques, museos, restaurantes... Reseñas reales de otras familias como la tuya.',
                    '3D map with parks, museums, restaurants... Real reviews from families like yours.'
                )
            },
            {
                target: '[data-page="ranking"]',
                emoji: '🏆',
                title: T('Top Tribu', 'Top Tribe'),
                body: T(
                    'Los mejores sitios y los miembros más activos. Compite sano con otras familias de la comunidad.',
                    'Best places and most active members. Compete fairly with other families.'
                )
            },
            {
                target: '[data-page="moments"]',
                emoji: '💝',
                title: T('Moments', 'Moments'),
                body: T(
                    'Vuestros recuerdos. Compartid fotos solo con la familia (privado) o con la comunidad (público).',
                    'Your memories. Share photos privately with family or publicly with the community.'
                )
            },
            {
                target: '[data-page="profile"]',
                emoji: '👤',
                title: T('Perfil', 'Profile'),
                body: T(
                    'Tu cuenta, tu familia, tus insignias y configuración. También invitas amigos desde aquí (+1000 pts).',
                    'Your account, family, badges and settings. Invite friends from here too (+1000 pts).'
                )
            },
            {
                target: null,
                emoji: '🚀',
                title: T('¡Todo listo!', 'All set!'),
                body: T(
                    'Empieza creando tu familia o uniéndote a una con un código. ¡A vivir aventuras juntos!',
                    'Start by creating a family or joining one with a code. Let the adventures begin!'
                ),
                cta: T('¡Vamos! 🎉', 'Let\'s go! 🎉'),
                isFinal: true
            }
        ];
    }

    function ensureOverlay() {
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.id = 'gh-tour-overlay';
        document.body.appendChild(overlay);

        // Estilos inyectados una sola vez
        if (!document.getElementById('gh-tour-styles')) {
            const style = document.createElement('style');
            style.id = 'gh-tour-styles';
            style.textContent = `
                #gh-tour-overlay {
                    position: fixed; inset: 0; z-index: 99999;
                    pointer-events: none;
                    transition: opacity 0.3s;
                }
                .gh-tour-bg {
                    position: fixed; inset: 0;
                    background: rgba(11, 30, 60, 0.78);
                    pointer-events: auto;
                    -webkit-backdrop-filter: blur(2px);
                    backdrop-filter: blur(2px);
                    transition: clip-path 0.4s cubic-bezier(0.34,1.56,0.64,1);
                }
                .gh-tour-spotlight {
                    position: fixed;
                    border-radius: 16px;
                    box-shadow: 0 0 0 3px rgba(23,200,212,0.8),
                                0 0 0 6px rgba(11,113,252,0.4),
                                0 0 50px rgba(11,113,252,0.4);
                    pointer-events: none;
                    transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1);
                    animation: ghTourPulse 1.8s ease-in-out infinite;
                }
                @keyframes ghTourPulse {
                    0%, 100% { box-shadow: 0 0 0 3px rgba(23,200,212,0.8), 0 0 0 6px rgba(11,113,252,0.4), 0 0 50px rgba(11,113,252,0.4); }
                    50%      { box-shadow: 0 0 0 4px rgba(23,200,212,1), 0 0 0 10px rgba(11,113,252,0.5), 0 0 70px rgba(11,113,252,0.6); }
                }
                .gh-tour-tooltip {
                    position: fixed;
                    background: white;
                    border-radius: 22px;
                    padding: 22px 20px 18px;
                    box-shadow: 0 24px 60px rgba(11,30,60,0.4);
                    max-width: calc(100vw - 32px);
                    width: 360px;
                    pointer-events: auto;
                    z-index: 100000;
                    animation: ghTooltipIn 0.4s cubic-bezier(0.34,1.56,0.64,1);
                }
                @keyframes ghTooltipIn {
                    from { opacity: 0; transform: scale(0.85) translateY(20px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
                .gh-tour-tooltip-emoji {
                    font-size: 42px;
                    line-height: 1;
                    margin-bottom: 6px;
                }
                .gh-tour-tooltip-title {
                    font-family: 'Poppins', sans-serif;
                    font-weight: 900;
                    font-size: 20px;
                    color: var(--primary-cobalt, #0B4C8F);
                    margin: 0 0 8px;
                    letter-spacing: -0.3px;
                }
                .gh-tour-tooltip-body {
                    font-size: 14px;
                    color: var(--text-primary, #0F172A);
                    line-height: 1.5;
                    margin: 0 0 16px;
                }
                .gh-tour-progress {
                    display: flex;
                    gap: 6px;
                    justify-content: center;
                    margin-bottom: 14px;
                }
                .gh-tour-dot {
                    width: 6px; height: 6px;
                    border-radius: 50%;
                    background: rgba(11,76,143,0.2);
                    transition: all 0.2s;
                }
                .gh-tour-dot.active {
                    background: var(--cyan, #17C8D4);
                    width: 24px;
                    border-radius: 999px;
                }
                .gh-tour-actions {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                }
                .gh-tour-btn {
                    border: none;
                    border-radius: 14px;
                    padding: 12px 20px;
                    font-weight: 800;
                    font-size: 14px;
                    cursor: pointer;
                    font-family: inherit;
                    transition: transform 0.15s;
                }
                .gh-tour-btn:active { transform: scale(0.96); }
                .gh-tour-btn-primary {
                    flex: 1;
                    background: linear-gradient(135deg, #0B71FC, #17C8D4);
                    color: white;
                    box-shadow: 0 6px 18px rgba(11,113,252,0.36);
                }
                .gh-tour-btn-skip {
                    background: transparent;
                    color: var(--text-tertiary, #94a3b8);
                    padding: 12px;
                    font-weight: 600;
                    font-size: 13px;
                }
                .gh-tour-btn-skip:hover { color: var(--text-secondary, #64748b); }
            `;
            document.head.appendChild(style);
        }
        return overlay;
    }

    function render() {
        const step = steps[currentStep];
        if (!step) { end(); return; }

        const ov = ensureOverlay();
        ov.innerHTML = '';
        ov.style.pointerEvents = 'auto';

        // Background semitransparente
        const bg = document.createElement('div');
        bg.className = 'gh-tour-bg';
        bg.onclick = (e) => {
            // Click fuera del tooltip avanza
            if (e.target === bg) next();
        };
        ov.appendChild(bg);

        // Spotlight sobre target (si hay)
        let spotRect = null;
        if (step.target) {
            const el = document.querySelector(step.target);
            if (el) {
                const r = el.getBoundingClientRect();
                const pad = 6;
                spotRect = { top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 };
                const spot = document.createElement('div');
                spot.className = 'gh-tour-spotlight';
                spot.style.cssText = `top:${spotRect.top}px; left:${spotRect.left}px; width:${spotRect.width}px; height:${spotRect.height}px;`;
                ov.appendChild(spot);

                // Crear "agujero" en el fondo con clip-path
                const cx = spotRect.left + spotRect.width / 2;
                const cy = spotRect.top + spotRect.height / 2;
                const radius = Math.max(spotRect.width, spotRect.height) / 2 + 8;
                bg.style.maskImage = `radial-gradient(circle at ${cx}px ${cy}px, transparent ${radius}px, black ${radius + 4}px)`;
                bg.style.webkitMaskImage = bg.style.maskImage;
            }
        }

        // Tooltip
        const tip = document.createElement('div');
        tip.className = 'gh-tour-tooltip';

        const lang = window.GoHappyI18n?.lang || 'es';
        const skipLabel = lang === 'en' ? 'Skip' : 'Saltar';
        const nextLabel = step.cta || (lang === 'en' ? 'Next →' : 'Siguiente →');

        const sec = window.GoHappySecurity;
        const safe = (s) => sec ? sec.safe(s) : String(s || '');

        tip.innerHTML = `
            <div class="gh-tour-tooltip-emoji">${step.emoji}</div>
            <h3 class="gh-tour-tooltip-title">${safe(step.title)}</h3>
            <p class="gh-tour-tooltip-body">${safe(step.body)}</p>
            <div class="gh-tour-progress">
                ${steps.map((_, i) => `<div class="gh-tour-dot ${i === currentStep ? 'active' : ''}"></div>`).join('')}
            </div>
            <div class="gh-tour-actions">
                ${!step.isFinal && currentStep > 0 ? `<button class="gh-tour-btn gh-tour-btn-skip" data-act="skip">${skipLabel}</button>` : ''}
                <button class="gh-tour-btn gh-tour-btn-primary" data-act="next">${safe(nextLabel)}</button>
            </div>
        `;

        // Posicionar tooltip: bajo el spotlight, o centrado si no hay
        if (spotRect) {
            // Si la pestaña está abajo (nav inferior), tooltip arriba
            const isBottom = spotRect.top > window.innerHeight / 2;
            const tooltipWidth = 360;
            const left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, spotRect.left + spotRect.width / 2 - tooltipWidth / 2));
            tip.style.left = `${left}px`;
            tip.style.width = `min(${tooltipWidth}px, calc(100vw - 32px))`;
            if (isBottom) {
                tip.style.bottom = `${window.innerHeight - spotRect.top + 16}px`;
                tip.style.top = 'auto';
            } else {
                tip.style.top = `${spotRect.top + spotRect.height + 16}px`;
                tip.style.bottom = 'auto';
            }
        } else {
            // Centrado vertical/horizontal
            tip.style.top = '50%';
            tip.style.left = '50%';
            tip.style.transform = 'translate(-50%, -50%)';
        }

        ov.appendChild(tip);

        // Bind botones
        tip.querySelectorAll('[data-act="next"]').forEach(b => b.onclick = next);
        tip.querySelectorAll('[data-act="skip"]').forEach(b => b.onclick = end);

        // ESC para skip
        document.addEventListener('keydown', escHandler);
    }

    function escHandler(e) {
        if (e.key === 'Escape') end();
        if (e.key === 'ArrowRight' || e.key === 'Enter') next();
    }

    function next() {
        currentStep++;
        if (currentStep >= steps.length) {
            end();
            return;
        }
        render();
    }

    function end() {
        if (!active) return;
        active = false;
        document.removeEventListener('keydown', escHandler);
        try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {}
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
                overlay = null;
            }, 350);
        }
    }

    function start(force = false) {
        if (active) return;
        if (!force && localStorage.getItem(SEEN_KEY) === '1') return;
        // Necesita que el nav esté visible (usuario logueado)
        const nav = document.getElementById('bottom-nav');
        if (!nav || nav.classList.contains('hidden')) {
            // Reintentar en 2s si el nav aún no está visible
            setTimeout(() => start(force), 2000);
            return;
        }
        active = true;
        currentStep = 0;
        steps = getSteps();
        render();
    }

    function hasSeen() {
        try { return localStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; }
    }

    function reset() {
        try { localStorage.removeItem(SEEN_KEY); } catch (e) {}
    }

    // Recalcular al cambiar de orientación / resize
    window.addEventListener('resize', () => { if (active) render(); });

    return { start, end, hasSeen, reset };
})();

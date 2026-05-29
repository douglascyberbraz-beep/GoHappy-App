// ════════════════════════════════════════════════════════════════
// GoHappy Premium Page Helpers
// Polish reutilizable: pull-to-refresh, stagger entry, shimmer,
// page hero, micro-interacciones. Mantiene fluidez 60fps.
// ════════════════════════════════════════════════════════════════
window.GoHappyPremium = (() => {

    const lang = () => (window.GoHappyI18n?.lang || 'es');

    /**
     * Pull-to-refresh sobre un container.
     * @param {HTMLElement} container
     * @param {Function} onRefresh - async function to re-render
     */
    function attachPullToRefresh(container, onRefresh) {
        if (!container || container._ghPTRBound) return;
        container._ghPTRBound = true;

        const isEn = lang() === 'en';

        // Indicador
        const ptr = document.createElement('div');
        ptr.className = 'gh-ptr';
        ptr.style.cssText = `
            position:absolute; top:0; left:0; right:0; height:60px;
            display:flex; align-items:flex-end; justify-content:center;
            padding-bottom:8px; transform:translateY(-60px);
            transition:transform 0.3s; z-index:3; pointer-events:none;
        `;
        ptr.innerHTML = `
            <div style="background:rgba(255,255,255,0.95); backdrop-filter:blur(20px) saturate(180%); -webkit-backdrop-filter:blur(20px) saturate(180%); border-radius:999px; padding:8px 18px; box-shadow:0 8px 22px rgba(11,76,143,0.15); display:flex; align-items:center; gap:8px; font-size:13px; font-weight:700; color:var(--primary-cobalt,#0B4C8F);">
                <span class="gh-ptr-icon" style="font-size:16px; transition:transform 0.3s;">⬇️</span>
                <span class="gh-ptr-text">${isEn ? 'Pull to refresh' : 'Tira para refrescar'}</span>
            </div>
        `;
        // Posicionar relativo al container
        if (getComputedStyle(container).position === 'static') {
            container.style.position = 'relative';
        }
        container.insertBefore(ptr, container.firstChild);

        let startY = 0, pulling = false, distance = 0;
        const THRESHOLD = 80;

        const icon = () => ptr.querySelector('.gh-ptr-icon');
        const text = () => ptr.querySelector('.gh-ptr-text');

        const onStart = (e) => {
            const scrollEl = container.scrollTop > 5 ? container :
                (document.scrollingElement?.scrollTop > 5 ? document.scrollingElement : null);
            if (scrollEl) { pulling = false; return; }
            startY = e.touches[0].clientY;
            pulling = true;
        };
        const onMove = (e) => {
            if (!pulling) return;
            const dy = e.touches[0].clientY - startY;
            if (dy <= 0) return;
            distance = Math.min(dy * 0.45, 100);
            ptr.style.transform = `translateY(${distance - 60}px)`;
            const i = icon();
            if (i) i.style.transform = distance >= THRESHOLD ? 'rotate(180deg)' : 'rotate(0deg)';
            const t = text();
            if (t) t.textContent = distance >= THRESHOLD
                ? (isEn ? 'Release to refresh' : 'Suelta para refrescar')
                : (isEn ? 'Pull to refresh' : 'Tira para refrescar');
        };
        const onEnd = () => {
            if (!pulling) return;
            pulling = false;
            if (distance >= THRESHOLD) {
                const i = icon(); if (i) i.textContent = '🔄';
                const t = text(); if (t) t.textContent = isEn ? 'Refreshing…' : 'Refrescando…';
                ptr.style.transform = 'translateY(0px)';
                setTimeout(async () => {
                    try { window.GoHappySound && window.GoHappySound.play('click'); } catch (e) {}
                    try { await onRefresh(); } catch (e) { console.warn('[PTR]', e?.message); }
                    setTimeout(() => { ptr.style.transform = 'translateY(-60px)'; }, 400);
                }, 200);
            } else {
                ptr.style.transform = 'translateY(-60px)';
            }
            distance = 0;
        };
        container.addEventListener('touchstart', onStart, { passive: true });
        container.addEventListener('touchmove',  onMove,  { passive: true });
        container.addEventListener('touchend',   onEnd,   { passive: true });
        container.addEventListener('touchcancel', () => { pulling = false; ptr.style.transform = 'translateY(-60px)'; distance = 0; }, { passive: true });
    }

    /**
     * Anima entrada escalonada de hijos.
     * @param {HTMLElement|NodeList|Array} target
     */
    function staggerIn(target, delayStep = 50) {
        const items = target.length !== undefined ? Array.from(target) : Array.from(target.children);
        items.forEach((el, i) => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(14px)';
            el.style.transition = 'opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
            setTimeout(() => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, i * delayStep);
        });
    }

    /**
     * Inyecta animaciones globales que cualquier página puede usar.
     */
    function ensureGlobalStyles() {
        if (document.getElementById('gh-premium-global-styles')) return;
        const s = document.createElement('style');
        s.id = 'gh-premium-global-styles';
        s.textContent = `
            /* Shimmer skeleton premium */
            @keyframes gh-shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }
            .gh-shimmer {
                background: linear-gradient(90deg,
                    rgba(11,76,143,0.05) 0%,
                    rgba(11,76,143,0.12) 50%,
                    rgba(11,76,143,0.05) 100%);
                background-size: 200% 100%;
                animation: gh-shimmer 1.4s ease-in-out infinite;
                border-radius: 14px;
            }

            /* Card hover-lift */
            .gh-lift {
                transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
                            box-shadow 0.28s cubic-bezier(0.16, 1, 0.3, 1);
            }
            .gh-lift:hover { transform: translateY(-3px); box-shadow: 0 14px 36px rgba(11,76,143,0.18); }
            .gh-lift:active { transform: scale(0.985) translateY(-1px); }

            /* Soft press feedback */
            .gh-press {
                transition: transform 0.16s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .gh-press:active { transform: scale(0.94); }

            /* Floating card glass */
            .gh-glass {
                background: rgba(255,255,255,0.92);
                backdrop-filter: blur(28px) saturate(180%);
                -webkit-backdrop-filter: blur(28px) saturate(180%);
                border: 0.5px solid rgba(255,255,255,0.95);
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.95),
                            0 10px 32px rgba(11,76,143,0.10);
                border-radius: 22px;
            }

            /* Greeting strip premium */
            .gh-greeting {
                font-size: 13px; font-weight: 700;
                color: var(--text-secondary, #64748b);
                opacity: 0.92;
                margin-bottom: 2px;
            }
            .gh-greeting strong { color: var(--primary-cobalt, #0B4C8F); }
        `;
        document.head.appendChild(s);
    }

    /**
     * Strip de saludo personalizado por hora.
     */
    function greetingHTML() {
        const h = new Date().getHours();
        const isEn = lang() === 'en';
        const name = window.GoHappyAuth?.checkAuth?.()?.nickname
                  || (isEn ? 'Family' : 'Familia');
        const greet = h < 12 ? (isEn ? 'Good morning' : 'Buenos días')
                   : h < 19 ? (isEn ? 'Good afternoon' : 'Buenas tardes')
                            : (isEn ? 'Good evening' : 'Buenas noches');
        return `<div class="gh-greeting">${greet}, <strong>${name}</strong> ✨</div>`;
    }

    /**
     * Skeleton genérico (lines + optional image).
     */
    function skeleton({ lines = 3, image = false, image_h = 120 } = {}) {
        let html = '<div style="padding: 14px; display:flex; flex-direction:column; gap:10px;">';
        if (image) html += `<div class="gh-shimmer" style="height:${image_h}px;"></div>`;
        for (let i = 0; i < lines; i++) {
            const w = i === lines - 1 ? '60%' : (60 + Math.random() * 35) + '%';
            html += `<div class="gh-shimmer" style="height:14px; width:${w};"></div>`;
        }
        html += '</div>';
        return html;
    }

    // Auto-inject estilos en boot
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureGlobalStyles);
    } else {
        ensureGlobalStyles();
    }

    return {
        attachPullToRefresh,
        staggerIn,
        greetingHTML,
        skeleton,
        ensureGlobalStyles
    };
})();

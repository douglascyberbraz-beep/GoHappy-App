// ================================================================
// GoHappy Cookies Consent Banner — GDPR / UK GDPR compliant
// Aparece solo la primera vez. Solo cookies esenciales (no terceros).
// ================================================================
window.GoHappyCookies = {
    KEY: 'GoHappy_cookies_consent_v1',

    init: () => {
        // Si ya aceptó/rechazó, no mostrar
        if (localStorage.getItem(window.GoHappyCookies.KEY)) return;

        // Esperar a que se cargue la app (después del splash)
        setTimeout(() => window.GoHappyCookies._show(), 3500);
    },

    _show: () => {
        if (document.getElementById('gh-cookies-banner')) return;
        const lang = window.GoHappyI18n?.lang || 'es';

        const T = lang === 'en' ? {
            title:    '🍪 We use essential cookies',
            body:     'GoHappy uses minimum essential cookies (session, language, AI cache). No advertising or tracking from third parties.',
            more:     'More info',
            accept:   'Got it',
        } : {
            title:    '🍪 Usamos cookies esenciales',
            body:     'GoHappy usa cookies esenciales mínimas (sesión, idioma, caché IA). Sin publicidad ni seguimiento de terceros.',
            more:     'Más info',
            accept:   'Entendido',
        };

        const banner = document.createElement('div');
        banner.id = 'gh-cookies-banner';
        banner.innerHTML = `
            <style>
                #gh-cookies-banner {
                    position: fixed;
                    bottom: calc(var(--nav-total, 110px) + 16px);
                    left: 50%;
                    transform: translateX(-50%) translateY(120%);
                    width: calc(100% - 24px);
                    max-width: 420px;
                    background: rgba(255,255,255,0.96);
                    backdrop-filter: blur(40px) saturate(180%);
                    border: 0.5px solid rgba(255,255,255,0.95);
                    border-radius: 24px;
                    padding: 18px 20px;
                    box-shadow:
                        inset 0 1px 0 rgba(255,255,255,0.95),
                        0 20px 50px rgba(11,76,143,0.18);
                    z-index: 9998;
                    transition: transform 0.5s cubic-bezier(0.19,1,0.22,1);
                }
                #gh-cookies-banner.show { transform: translateX(-50%) translateY(0); }
                #gh-cookies-banner h4 {
                    font-family: 'Poppins', sans-serif;
                    font-weight: 800;
                    color: var(--cobalt);
                    margin: 0 0 6px;
                    font-size: 15px;
                }
                #gh-cookies-banner p {
                    font-size: 13px;
                    color: var(--text-secondary);
                    line-height: 1.5;
                    margin: 0 0 14px;
                }
                #gh-cookies-banner .actions {
                    display: flex; gap: 10px;
                }
                #gh-cookies-banner button {
                    flex: 1;
                    padding: 11px;
                    border-radius: 14px;
                    border: none;
                    font-family: -apple-system, sans-serif;
                    font-weight: 700;
                    font-size: 13px;
                    cursor: pointer;
                    transition: transform 0.15s cubic-bezier(0.34,1.56,0.64,1);
                }
                #gh-cookies-banner button:active { transform: scale(0.94); }
                #gh-cookies-more {
                    background: rgba(11,76,143,0.08);
                    color: var(--cobalt);
                    border: 0.5px solid rgba(11,76,143,0.12);
                    flex: 0.7;
                }
                #gh-cookies-accept {
                    background: var(--brand-bright);
                    color: white;
                    box-shadow: 0 6px 16px rgba(11,113,252,0.28);
                }
            </style>
            <h4>${T.title}</h4>
            <p>${T.body}</p>
            <div class="actions">
                <button id="gh-cookies-more">${T.more}</button>
                <button id="gh-cookies-accept">${T.accept}</button>
            </div>
        `;
        document.body.appendChild(banner);

        // Trigger slide-up animation
        requestAnimationFrame(() => banner.classList.add('show'));

        document.getElementById('gh-cookies-accept').onclick = () => {
            try { localStorage.setItem(window.GoHappyCookies.KEY, JSON.stringify({ accepted: true, ts: Date.now() })); } catch (e) {}
            banner.classList.remove('show');
            setTimeout(() => banner.remove(), 500);
        };

        document.getElementById('gh-cookies-more').onclick = () => {
            try { localStorage.setItem(window.GoHappyCookies.KEY, JSON.stringify({ accepted: true, ts: Date.now() })); } catch (e) {}
            banner.classList.remove('show');
            setTimeout(() => {
                banner.remove();
                if (window.GoHappyApp) window.GoHappyApp.loadPage('legal');
            }, 500);
        };
    }
};

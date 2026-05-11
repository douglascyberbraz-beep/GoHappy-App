// GoHappy App Core - v2.8.0
// toast.js y sound.js se cargan antes que este archivo

const appState = {
    currentPage: 'map',
    user: null,
    location: null,
    transitioning: false
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {

    // i18n: detectar idioma ANTES de renderizar nada (sincronico)
    if (window.GoHappyI18n) {
        try { window.GoHappyI18n.init(); } catch (e) { console.warn('i18n init:', e); }
    }

    // Si GPS refina el idioma en background y difiere, recargar página
    window.addEventListener('GoHappy-lang-changed', () => {
        if (window.GoHappyApp && window.GoHappyApp.currentPage) {
            window.GoHappyApp.loadPage(window.GoHappyApp.currentPage);
        }
    });

    // Banner de cookies (GDPR/UK GDPR) — primera visita
    if (window.GoHappyCookies) {
        try { window.GoHappyCookies.init(); } catch (e) { console.warn('cookies init:', e); }
    }

    // Desbloquear AudioContext en primer gesto del usuario
    document.addEventListener('touchstart', () => window.GoHappySound.unlock(), { once: true });
    document.addEventListener('click', () => window.GoHappySound.unlock(), { once: true });

    // Gemini proxy status check (informativo)
    if (!window.GEMINI_PROXY_ACTIVE) {
        console.info("[GoHappy] Gemini proxy desactivado — usando datos demo.");
    }

    // Sonido de felicidad al cargar el splash (intentamos cuanto antes)
    setTimeout(() => {
        try { window.GoHappySound && window.GoHappySound.play('start'); } catch (e) {}
    }, 200);

    // Splash Screen con timing premium
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (!splash) return;
        splash.style.transition = 'opacity 0.6s cubic-bezier(0.4,0,0.2,1)';
        splash.style.opacity = '0';
        // Sonido secundario "magic" al desvelar la app
        try { window.GoHappySound && window.GoHappySound.play('magic'); } catch (e) {}
        setTimeout(() => {
            splash.style.display = 'none';
            const nav = document.getElementById('bottom-nav');
            if (nav) {
                nav.classList.remove('hidden');
                nav.style.animation = 'navSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards';
            }
        }, 600);
    }, 2200);

    // Firebase Auth init
    window.GoHappyAuth.init((user) => {
        if (!user) {
            if (!document.getElementById('auth-modal')) {
                window.GoHappyAuth.renderAuthModal();
            }
        } else {
            appState.user = user;
            const modal = document.getElementById('auth-modal');
            if (modal) modal.remove();

            setTimeout(() => {
                if (window.GoHappyFamilyOnboarding && window.GoHappyFamilyOnboarding.needsOnboarding()) {
                    window.GoHappyFamilyOnboarding.show();
                }
            }, 2000);
        }
    });

    const quickUser = window.GoHappyAuth.checkAuth();
    appState.user = quickUser;

    setupNavigation();
    loadPage('map');

    // Iniciar notificaciones nativas
    if (window.GoHappyNotifications) {
        window.GoHappyNotifications.init().catch(console.warn);
    }
});

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const target = e.currentTarget;
            const page = target.dataset.page;
            if (page === appState.currentPage || appState.transitioning) return;

            window.GoHappySound.play('click');

            // Animación física del botón
            target.classList.add('nav-active-pop');
            setTimeout(() => target.classList.remove('nav-active-pop'), 350);

            navItems.forEach(nav => nav.classList.remove('active'));
            target.classList.add('active');

            loadPage(page);
        });
    });
}

function updateNavStyles(pageName) {
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.toggle('active', nav.dataset.page === pageName);
    });
}

// Router de páginas
const PAGE_RENDERERS = {
    'today':       () => window.GoHappyToday,
    'ranking':     () => window.GoHappyRanking,
    'moments':     () => window.GoHappyMoments,
    'care':        () => window.GoHappyCare,
    'news_events': () => window.GoHappyNewsEvents,
    'profile':     () => window.GoHappyProfile,
    'legal':       () => window.GoHappyLegal,
    'quests':      () => window.GoHappyQuestsPage,
    'safe':        () => window.GoHappySafePage,
    'memories':    () => window.GoHappyMemories,
    'tribu':       () => window.GoHappyTribu
};

async function loadPage(pageName) {
    if (appState.transitioning) return;
    appState.transitioning = true;

    const overlay = document.getElementById('page-transition-overlay');
    const container = document.getElementById('main-content');
    const mapViewport = document.getElementById('map-viewport-v11');

    try {
        // 1. Activar overlay de cristal
        if (overlay) overlay.classList.add('active');
        await new Promise(r => setTimeout(r, 200));

        // 2. Route Guard
        const user = window.GoHappyAuth.checkAuth();
        const publicPages = ['legal', 'map'];
        if (!user && !publicPages.includes(pageName)) {
            if (overlay) overlay.classList.remove('active');
            window.GoHappyAuth.renderAuthModal();
            appState.transitioning = false;
            return;
        }

        appState.currentPage = pageName;
        updateNavStyles(pageName);

        // 3. Preparar escenario
        if (pageName === 'map') {
            container.classList.add('hidden');
            container.innerHTML = '';
            if (mapViewport) {
                mapViewport.style.display = 'flex';
                if (window.GoHappyMap) {
                    await window.GoHappyMap.render(mapViewport);
                }
            }
            window.GoHappySound.play('map');
        } else {
            if (mapViewport) mapViewport.style.display = 'none';

            // Skeleton loader premium
            container.classList.remove('hidden');
            container.innerHTML = `
                <div class="premium-loader" style="padding: 20px; padding-top: 40px;">
                    <div class="premium-shimmer" style="height: 180px; border-radius: 32px; margin-bottom: 20px;"></div>
                    <div class="premium-shimmer" style="height: 80px; border-radius: 24px; margin-bottom: 15px;"></div>
                    <div class="premium-shimmer" style="height: 80px; border-radius: 24px; margin-bottom: 15px;"></div>
                    <div class="premium-shimmer" style="height: 80px; border-radius: 24px;"></div>
                </div>`;

            const getRenderer = PAGE_RENDERERS[pageName];
            const renderer = getRenderer ? getRenderer() : null;

            if (renderer && renderer.render) {
                container.innerHTML = '';
                await renderer.render(container);

                // Entrada premium
                container.style.animation = 'pageEnterPremium 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards';
                setTimeout(() => { container.style.animation = ''; }, 650);

                // Stagger groups
                container.querySelectorAll('.stagger-group').forEach(g => {
                    setTimeout(() => g.classList.add('active'), 80);
                });
            } else {
                container.innerHTML = `
                    <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:60vh; gap:16px; color:#94a3b8; font-family:Inter,sans-serif;">
                        <span style="font-size:48px;">🚧</span>
                        <h3 style="font-size:18px; font-weight:800; color:#334155; margin:0;">Próximamente</h3>
                        <p style="font-size:14px; margin:0; text-align:center; max-width:240px;">Esta sección estará disponible en la próxima actualización.</p>
                    </div>`;
            }
        }

        // 4. Quitar overlay suavemente
        setTimeout(() => {
            if (overlay) overlay.classList.remove('active');
        }, 150);

    } catch (err) {
        console.error(`[GoHappy] Error cargando ${pageName}:`, err);
        if (overlay) overlay.classList.remove('active');
        if (container) {
            container.classList.remove('hidden');
            container.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:60vh; gap:16px; padding:30px; text-align:center; font-family:Inter,sans-serif;">
                    <span style="font-size:48px;">❌</span>
                    <h3 style="color:#E74C3C; font-size:18px; font-weight:800; margin:0;">Error de carga</h3>
                    <p style="font-size:14px; color:#64748b; margin:0;">${err.message || 'Error desconocido'}</p>
                    <button onclick="window.GoHappyApp.loadPage('${pageName}')"
                        style="background:linear-gradient(135deg,#0B4C8F,#0B71FC);color:white;border:none;padding:14px 28px;border-radius:50px;font-weight:800;font-size:14px;cursor:pointer;margin-top:10px;">
                        🔄 Reintentar
                    </button>
                    <button onclick="window.forceResetApp && window.forceResetApp()"
                        style="background:none;border:none;color:#94a3b8;font-size:13px;cursor:pointer;font-weight:600;">
                        ♻️ Reset total
                    </button>
                </div>`;
        }
        window.GoHappySound.play('error');
    } finally {
        appState.transitioning = false;
    }
}

// API Pública de la App
window.GoHappyApp = {
    get currentPage() { return appState.currentPage; },
    loadPage,

    navigate: (page, context = null) => {
        if (context) window._navContext = context;
        const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
        if (navItem) {
            navItem.classList.add('nav-active-pop');
            setTimeout(() => navItem.classList.remove('nav-active-pop'), 350);
        }
        updateNavStyles(page);
        loadPage(page);
    },

    notify: (eventName, data) => {
        window.dispatchEvent(new CustomEvent(`GoHappy-${eventName}`, { detail: data }));
    }
};

// PWA Install Prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const btn = document.getElementById('install-pwa-btn');
    if (btn) {
        btn.style.display = 'block';
        btn.addEventListener('click', () => {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(() => { deferredPrompt = null; btn.style.display = 'none'; });
        });
    }
});

// Listener global de puntos
window.addEventListener('pointsUpdated', (e) => {
    if (appState.currentPage === 'profile' && window.GoHappyProfile) {
        window.GoHappyProfile.render(document.getElementById('main-content'));
    }
    window.GoHappySound && window.GoHappySound.play('points');
    const amount = e.detail?.amount || 0;
    if (amount > 0) {
        window.GoHappyToast.points(`¡+${amount} puntos! ⭐`);
    }
});

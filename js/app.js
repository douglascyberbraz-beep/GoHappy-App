// GoHappy App - Production v2.2.0
// Toast System (reemplaza alert() para compatibilidad con Google Play TWA)
window.GoHappyToast = {
    show: (message, type = 'info', duration = 3500) => {
        const existing = document.getElementById('gh-toast');
        if (existing) existing.remove();

        const colors = {
            success: { bg: 'linear-gradient(135deg, #27AE60, #2ECC71)', icon: '✅' },
            error:   { bg: 'linear-gradient(135deg, #E74C3C, #C0392B)', icon: '❌' },
            info:    { bg: 'linear-gradient(135deg, #0B71FC, #0B4C8F)', icon: 'ℹ️' },
            warning: { bg: 'linear-gradient(135deg, #F39C12, #E67E22)', icon: '⚠️' },
            points:  { bg: 'linear-gradient(135deg, #8E44AD, #9B59B6)', icon: '⭐' }
        };
        const style = colors[type] || colors.info;

        const toast = document.createElement('div');
        toast.id = 'gh-toast';
        toast.style.cssText = `
            position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%) translateY(20px);
            background: ${style.bg}; color: white; padding: 14px 22px;
            border-radius: 50px; font-size: 14px; font-weight: 700;
            box-shadow: 0 10px 40px rgba(0,0,0,0.25); z-index: 99999;
            max-width: 85vw; text-align: center; line-height: 1.4;
            display: flex; align-items: center; gap: 10px;
            opacity: 0; transition: all 0.3s cubic-bezier(0.34,1.56,0.64,1);
            backdrop-filter: blur(10px);
        `;
        toast.innerHTML = `<span>${style.icon}</span><span>${message}</span>`;
        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(-50%) translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },
    success: (msg) => window.GoHappyToast.show(msg, 'success'),
    error:   (msg) => window.GoHappyToast.show(msg, 'error'),
    info:    (msg) => window.GoHappyToast.show(msg, 'info'),
    warning: (msg) => window.GoHappyToast.show(msg, 'warning'),
    points:  (msg) => window.GoHappyToast.show(msg, 'points', 4000)
};

// Sound System
window.GoHappySound = {
    play: (type) => {
        // Sonidos desactivados temporalmente para evitar errores 404
        // ya que la librería antigua de Google Actions fue retirada.
        try {
            // Future audio implementation here
        } catch (e) { }
    }
};

const appState = {
    currentPage: 'map',
    user: null,
    location: null
};

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {

    // Config Safeguard
    if (window.GEMINI_KEY && window.GEMINI_KEY.includes('PEGAR_AQUI')) {
        console.warn("⚠️ Advertencia: API Key de Gemini no configurada.");
    }

    // Map Initialization: Handled by loadPage('map') to ensure container is visible before L.map()

    // Simulate Splash Screen
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        splash.style.opacity = '0';
        window.GoHappySound.play('start'); // Play magic chime on entry
        setTimeout(() => {
            splash.style.display = 'none';
            document.getElementById('bottom-nav').classList.remove('hidden');

            // Set up initial view if map was loaded first
            if (appState.currentPage === 'map' && window.GoHappyMap && window.GoHappyMap.instance) {
                window.GoHappyMap.instance.invalidateSize();
            }
        }, 500);
    }, 1500); // Shorter splash screen

    // Initialize Firebase Auth and wait for state
    window.GoHappyAuth.init((user) => {
        if (!user) {
            // No auth state: show modal
            if (!document.getElementById('auth-modal')) {
                window.GoHappyAuth.renderAuthModal();
            }
        } else {
            appState.user = user;
            // Remove modal if it exists (e.g., after login)
            const modal = document.getElementById('auth-modal');
            if (modal) modal.remove();
        }
    });

    // Also do a quick sync check to handle initial render
    const quickUser = window.GoHappyAuth.checkAuth();
    appState.user = quickUser;

    // Initialize Navigation
    setupNavigation();

    // Default Page Load
    loadPage('map');

    // Geolocation moved to be requested only when Map is loaded or explicitly requested
    // see window.GoHappyMap.requestLocation()
});

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const target = e.currentTarget;
            const page = target.dataset.page;

            if (page === appState.currentPage) return;

            window.GoHappySound.play('click'); // Click sound feedback

            // Remove active class from all
            navItems.forEach(nav => nav.classList.remove('active'));

            // Add to clicked
            target.classList.add('active');

            loadPage(page);
        });
    });
}

function updateNavStyles(pageName) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(nav => {
        if (nav.dataset.page === pageName) {
            nav.classList.add('active');
        } else {
            nav.classList.remove('active');
        }
    });
}

async function loadPage(pageName) {
    try {
        console.log(`Cargando página: ${pageName}`);
        appState.currentPage = pageName;
        const container = document.getElementById('main-content');
        const mapViewport = document.getElementById('map-viewport-v11');

        // Default hiding
        container.classList.add('hidden');
        if (mapViewport) mapViewport.style.display = 'none';
        container.innerHTML = '<div class="center-text p-20"><div class="typing-dots"><span></span><span></span><span></span></div></div>';

        // Special style for nav items
        updateNavStyles(pageName);

        if (pageName === 'map') {
            if (window.GoHappyMap) {
                window.GoHappyMap.render(mapViewport);
            } else {
                console.error("GoHappyMap no definido");
            }
        } else {
            container.classList.remove('hidden');
            container.classList.add('page-enter');

            // Map table of renderers to satisfy pageName
            const renderers = {
                'today':       window.GoHappyToday,
                'ranking':     window.GoHappyRanking,
                'news_events': window.GoHappyNewsEvents,
                'profile':     window.GoHappyProfile,
                'legal':       window.GoHappyLegal,
                'quests':      window.GoHappyQuestsPage,
                'safe':        window.GoHappySafePage,
                'memories':    window.GoHappyMemories,
                'tribu':       window.GoHappyTribu,
                'chat':        window.GoHappyChat
            };

            const renderer = renderers[pageName];
            if (renderer && renderer.render) {
                await renderer.render(container);
            } else {
                container.innerHTML = `<div class="p-20 center-text"><h3>Página en construcción</h3><p>La sección ${pageName} estará disponible pronto.</p></div>`;
            }

            setTimeout(() => container.classList.remove('page-enter'), 600);
        }
    } catch (err) {
        console.error(`Error cargando página ${pageName}:`, err);
        const container = document.getElementById('main-content');
        container.classList.remove('hidden');
        container.innerHTML = `<div class="p-20 center-text" style="color:red;"><h3>Error de carga</h3><p>Vuelve a intentarlo o recarga la app.</p></div>`;
    }
}

window.GoHappyApp = {
    currentPage: appState.currentPage,
    loadPage: loadPage,
    navigate: (page) => {
        const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
        if (navItem) navItem.click();
        else loadPage(page);
    }
};

// PWA Install Prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log("PWA Install Prompt captured");

    // Reveal install button if it exists
    const installBtn = document.getElementById('install-pwa-btn');
    if (installBtn) installBtn.style.display = 'block';
});

// Global Points Listener
window.addEventListener('pointsUpdated', (e) => {
    console.log("Global Points Update:", e.detail);
    if (appState.currentPage === 'profile') {
        window.GoHappyProfile.render(document.getElementById('main-content'));
    }
});


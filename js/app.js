// Kindr App - Production v1.0.0
// Sound System
window.KindrSound = {
    play: (type) => {
        const sounds = {
            click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Soft wooden tap
            start: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3', // Ethereal chime
            success: 'https://assets.mixkit.co/active_storage/sfx/1918/1918-preview.mp3' // Harp success
        };
        if (sounds[type]) {
            const audio = new Audio(sounds[type]);
            audio.volume = 0.2; // Softer volume for premium feel
            audio.play().catch(e => console.log('Audio auto-play blocked:', e));
        }
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
        window.KindrSound.play('start'); // Play magic chime on entry
        setTimeout(() => {
            splash.style.display = 'none';
            document.getElementById('bottom-nav').classList.remove('hidden');

            // Beta Readiness Notification removed for Production
        }, 500);
    }, 2000); // Reduced slightly for better feel

    // Initialize Firebase Auth and wait for state
    window.KindrAuth.init((user) => {
        if (!user) {
            // No auth state: show modal
            if (!document.getElementById('auth-modal')) {
                window.KindrAuth.renderAuthModal();
            }
        } else {
            appState.user = user;
            // Remove modal if it exists (e.g., after login)
            const modal = document.getElementById('auth-modal');
            if (modal) modal.remove();
        }
    });

    // Also do a quick sync check to handle initial render
    const quickUser = window.KindrAuth.checkAuth();
    appState.user = quickUser;

    // Initialize Navigation
    setupNavigation();

    // Default Page Load
    loadPage('map');

    // Geolocation moved to be requested only when Map is loaded or explicitly requested
    // see window.KindrMap.requestLocation()
});

function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const target = e.currentTarget;
            const page = target.dataset.page;

            if (page === appState.currentPage) return;

            window.KindrSound.play('click'); // Click sound feedback

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
            if (window.KindrMap) {
                window.KindrMap.render(mapViewport);
            } else {
                console.error("KindrMap no definido");
            }
        } else {
            container.classList.remove('hidden');
            container.classList.add('page-enter');

            // Map table of renderers to satisfy pageName
            const renderers = {
                'tribu': window.KindrTribu,
                'ranking': window.KindrRanking,
                'news_events': window.KindrNewsEvents,
                'profile': window.KindrProfile,
                'legal': window.KindrLegal,
                'quests': window.KindrQuestsPage,
                'safe': window.KindrSafePage,
                'memories': window.KindrMemories
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

window.KindrApp = {
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
        window.KindrProfile.render(document.getElementById('main-content'));
    }
});

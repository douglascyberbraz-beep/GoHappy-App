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

function loadPage(pageName) {
    appState.currentPage = pageName;
    const container = document.getElementById('main-content');
    const mapViewport = document.getElementById('map-viewport-v11');

    // Default hiding
    container.classList.add('hidden');
    mapViewport.style.display = 'none';
    container.innerHTML = ''; // Clear other pages content

    // Special style for nav items
    updateNavStyles(pageName);

    if (pageName === 'map') {
        window.KindrMap.render(mapViewport);
    } else {
        container.classList.remove('hidden');
        container.classList.add('page-enter'); // Add animation
        switch (pageName) {
            case 'news':
                window.KindrNews.render(container);
                break;
            case 'events':
                window.KindrEvents.render(container);
                break;
            case 'tribu':
                window.KindrTribu.render(container);
                break;
            case 'ranking':
                window.KindrRanking.render(container);
                break;
            case 'chat':
                window.KindrChat.render(container);
                break;
            case 'profile':
                window.KindrProfile.render(container, appState.user);
                break;
            case 'legal':
                window.KindrLegal.render(container);
                break;
            case 'quests':
                window.KindrQuestsPage.render(container);
                break;
            case 'safe':
                window.KindrSafePage.render(container);
                break;
            case 'memories':
                window.KindrMemories.render(container);
                break;
        }
        setTimeout(() => container.classList.remove('page-enter'), 600);
    }
}

window.KindrApp = {
    currentPage: appState.currentPage,
    loadPage: loadPage
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

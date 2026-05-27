// GoHappy App Core - v2.9.0
// toast.js y sound.js se cargan antes que este archivo

// ═══════════════════════════════════════════════════════════════════
// CACHE PURGE — al bumpear este número, todos los clientes se autolimpian
// la próxima vez que abran la app: localStorage, SW caches, IndexedDB.
// Sólo se preserva la sesión activa (Firebase Auth). Cero datos demo.
// ═══════════════════════════════════════════════════════════════════
const APP_STATE_VERSION = 'v8.0.0';
const APP_VERSION = '8.0.0';

// ═══════════════════════════════════════════════════════════════════
// AUTO-UPDATE AGRESIVO — Detecta nueva versión y fuerza reload
// Cada vez que el app arranca, hace fetch a version.json (no-cache) y
// si la versión servidor > versión local → purga TODO + reload limpio.
// Esto saca al usuario del SW viejo SIN que tenga que hacer nada.
// ═══════════════════════════════════════════════════════════════════
(async function autoUpdateCheck() {
    try {
        // Forzar update del Service Worker si está registrado
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(regs => {
                regs.forEach(r => r.update().catch(() => {}));
            }).catch(() => {});

            // Auto-reload cuando un nuevo SW toma control
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (refreshing) return;
                refreshing = true;
                console.info('[GoHappy] Nuevo SW activo — recargando…');
                window.location.reload();
            });
        }

        // Fetch version.json con bust de cache (no-store)
        const r = await fetch('version.json?_=' + Date.now(), { cache: 'no-store' });
        if (!r.ok) return;
        const remote = await r.json();
        const remoteV = String(remote.version || '0').trim();
        if (remoteV && remoteV !== APP_VERSION) {
            console.warn(`[GoHappy] Versión desactualizada (local=${APP_VERSION} vs server=${remoteV}) — auto-actualizando…`);
            // Borrar todas las caches del SW
            if ('caches' in self) {
                const keys = await caches.keys();
                await Promise.all(keys.map(k => caches.delete(k)));
            }
            // Desregistrar SW
            if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map(reg => reg.unregister()));
            }
            // Reload con cache bypass
            setTimeout(() => window.location.replace(window.location.pathname + '?_v=' + remoteV), 200);
        }
    } catch (e) { /* offline o version.json no accesible — seguir normal */ }
})();

(function purgeStaleClientState() {
    try {
        const stored = localStorage.getItem('GoHappy_state_version');
        if (stored === APP_STATE_VERSION) return; // ya está limpio

        console.info('[GoHappy] State version bump → purgando caches:', stored, '→', APP_STATE_VERSION);

        // 1) Borrar todas las claves GoHappy_* / ai_* / gh_* EXCEPTO sesión Firebase
        const KEEP = new Set([
            'GoHappy_lang',                     // preferencia idioma
            'GoHappy_cookies_consent_v1'        // consentimiento GDPR
        ]);
        const FIREBASE_KEEP_PREFIX = 'firebase:';
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (!k) continue;
            if (KEEP.has(k)) continue;
            if (k.startsWith(FIREBASE_KEEP_PREFIX)) continue;
            if (k.startsWith('GoHappy_') || k.startsWith('ai_') || k.startsWith('gh_')) {
                try { localStorage.removeItem(k); } catch (e) {}
            }
        }

        // 2) SessionStorage
        try { sessionStorage.clear(); } catch (e) {}

        // 3) Service Worker caches (todas excepto las del navegador)
        if ('caches' in self) {
            caches.keys().then(keys => {
                keys.forEach(key => {
                    if (key.startsWith('gohappy-')) caches.delete(key).catch(() => {});
                });
            }).catch(() => {});
        }

        // 4) IndexedDB de Firestore (si la persistencia llegó a activarse)
        if (window.indexedDB && indexedDB.databases) {
            indexedDB.databases().then(dbs => {
                dbs.forEach(db => {
                    if (db.name && (db.name.startsWith('firestore') || db.name.startsWith('GoHappy'))) {
                        try { indexedDB.deleteDatabase(db.name); } catch (e) {}
                    }
                });
            }).catch(() => {});
        }

        localStorage.setItem('GoHappy_state_version', APP_STATE_VERSION);
        console.info('[GoHappy] Estado cliente reseteado ✓');
    } catch (e) {
        console.warn('[GoHappy] purge fallback:', e?.message);
    }
})();

const appState = {
    currentPage: 'map',
    user: null,
    location: null,
    transitioning: false
};

// ═══════════════════════════════════════════════════════════════════
// FORCE RESET — botón nuclear: borra todo y recarga limpio
// ═══════════════════════════════════════════════════════════════════
window.GoHappyForceReset = async () => {
    if (!confirm('Esto borrará TODOS los datos locales y reinstalará la app desde 0. ¿Continuar?')) return;
    try {
        // 1) Desregistrar TODOS los service workers
        if ('serviceWorker' in navigator) {
            const regs = await navigator.serviceWorker.getRegistrations();
            await Promise.all(regs.map(r => r.unregister()));
        }
        // 2) Borrar TODAS las caches
        if ('caches' in self) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
        }
        // 3) Borrar localStorage + sessionStorage
        try { localStorage.clear(); } catch (e) {}
        try { sessionStorage.clear(); } catch (e) {}
        // 4) Borrar IndexedDB
        if (indexedDB.databases) {
            const dbs = await indexedDB.databases();
            await Promise.all(dbs.map(db => new Promise(r => {
                try { const req = indexedDB.deleteDatabase(db.name); req.onsuccess = req.onerror = req.onblocked = r; }
                catch (e) { r(); }
            })));
        }
        // 5) Sign-out de Firebase
        try { await window.GoHappyAuthReal?.signOut?.(); } catch (e) {}
        // 6) Reload con cache bypass
        window.location.href = window.location.pathname + '?_t=' + Date.now();
    } catch (e) {
        alert('Reset error: ' + e.message + ' — recarga manualmente con Ctrl+Shift+R');
    }
};

// ═══════════════════════════════════════════════════════════════════
// DIAGNÓSTICO — abre con ?diag=1 en la URL
// Muestra estado completo de auth, Firestore, conectividad
// ═══════════════════════════════════════════════════════════════════
window.GoHappyDiagnose = async () => {
    const fbUser = window.GoHappyAuthReal?.currentUser;
    const localUser = window.GoHappyAuth?.checkAuth?.();
    let firestorePing = '⏳';
    try {
        const t0 = Date.now();
        await window.GoHappyDB.collection('users').doc('__ping__').get();
        firestorePing = `✓ ${Date.now() - t0}ms`;
    } catch (e) { firestorePing = '✗ ' + (e?.code || e?.message); }

    const report = {
        '🔥 Firebase Auth user': fbUser ? {
            uid: fbUser.uid,
            email: fbUser.email,
            isAnonymous: fbUser.isAnonymous,
            providerId: fbUser.providerData?.[0]?.providerId || 'none'
        } : '❌ NO HAY USER',
        '👤 Sesión local (_currentUser)': localUser ? {
            uid: localUser.uid,
            nickname: localUser.nickname,
            isGuest: localUser.isGuest,
            familyId: localUser.familyId
        } : '❌ NO HAY SESIÓN LOCAL',
        '🟰 ¿UIDs coinciden?': (fbUser && localUser) ? (fbUser.uid === localUser.uid ? '✓ SÍ' : '✗ NO COINCIDEN') : 'n/a',
        '💾 Firestore ping': firestorePing,
        '🛡️ Puede publicar?': fbUser && !fbUser.isAnonymous && localUser && !localUser.isGuest ? '✓ SÍ' : '✗ NO',
        '📦 SW cache version': 'gohappy-cache-v7.x',
        '🌐 Online': navigator.onLine ? '✓' : '✗'
    };

    const html = `<div style="position:fixed;inset:20px;background:white;z-index:99999;padding:20px;overflow:auto;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,0.3);font-family:monospace;font-size:13px;">
        <h2 style="margin:0 0 16px;color:#0B4C8F;">🔍 GoHappy Diagnóstico</h2>
        <pre style="background:#f8fafc;padding:14px;border-radius:10px;overflow:auto;font-size:11px;">${JSON.stringify(report, null, 2)}</pre>
        <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">
            <button onclick="this.closest('div[style*=fixed]').remove()" style="background:#0B4C8F;color:white;border:none;padding:12px 24px;border-radius:30px;font-weight:800;cursor:pointer;">Cerrar</button>
            <button onclick="window.GoHappyForceReset()" style="background:#DC2626;color:white;border:none;padding:12px 24px;border-radius:30px;font-weight:800;cursor:pointer;">🔥 Reinstalar app (reset total)</button>
            <button onclick="window.GoHappyAuth.renderAuthModal();this.closest('div[style*=fixed]').remove()" style="background:#0B71FC;color:white;border:none;padding:12px 24px;border-radius:30px;font-weight:800;cursor:pointer;">🔑 Login</button>
        </div>
    </div>`;
    const div = document.createElement('div');
    div.innerHTML = html;
    document.body.appendChild(div.firstChild);
    console.table(report);
};

// Auto-abrir si ?diag=1
if (new URLSearchParams(window.location.search).get('diag') === '1') {
    setTimeout(() => window.GoHappyDiagnose(), 1500);
}

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {

    // ─── REFERIDO + FAMILIA: detectar parámetros en URL ───
    try {
        const urlParams = new URLSearchParams(window.location.search);

        // Código de referido (premia al referidor)
        const refCode = urlParams.get('ref') || urlParams.get('referral') || urlParams.get('invite');
        if (refCode && /^[A-Z0-9\-]{3,20}$/i.test(refCode)) {
            localStorage.setItem('GoHappy_pending_referral', refCode.toUpperCase());
            console.log('[GoHappy] Código de referido detectado:', refCode);
        }

        // Código de familia (auto-join a la familia tras login)
        const famCode = urlParams.get('fam') || urlParams.get('family');
        if (famCode && /^[A-Z0-9]{6}$/i.test(famCode)) {
            localStorage.setItem('GoHappy_pending_family', famCode.toUpperCase());
            console.log('[GoHappy] Código de familia detectado:', famCode);
        }

        // Limpiar la URL si había alguno
        if (refCode || famCode) {
            const url = new URL(window.location.href);
            ['ref','referral','invite','fam','family'].forEach(k => url.searchParams.delete(k));
            window.history.replaceState({}, '', url.pathname + (url.search || '') + url.hash);
        }
    } catch (e) { console.warn('URL params parse:', e); }

    // i18n: detectar idioma ANTES de renderizar nada (sincronico)
    if (window.GoHappyI18n) {
        try {
            window.GoHappyI18n.init();
            // Aplicar tagline traducido al splash
            const t = window.GoHappyI18n.t.bind(window.GoHappyI18n);
            const splashTag = document.getElementById('splash-tagline');
            const splashFam = document.getElementById('splash-family');
            if (splashTag) splashTag.textContent = t('brand.tagline');
            if (splashFam) splashFam.textContent = t('brand.family');
        } catch (e) { console.warn('i18n init:', e); }
    }

    // Si GPS refina el idioma en background y difiere, recargar página
    window.addEventListener('GoHappy-lang-changed', () => {
        if (window.GoHappyApp && window.GoHappyApp.currentPage) {
            window.GoHappyApp.loadPage(window.GoHappyApp.currentPage);
        }
    });

    // SessionGuard: integridad, auto-logout y sync multi-tab (CRÍTICO seguridad)
    if (window.GoHappySessionGuard) {
        try { window.GoHappySessionGuard.init(); } catch (e) { console.warn('SessionGuard init:', e); }
    }

    // Tour de onboarding: se dispara REACTIVAMENTE desde el callback de auth
    // (ver más abajo en GoHappyAuth.init) cuando el usuario YA está dentro del app.
    // No usar timer ciego — antes saltaba en la pantalla de login.

    // Family Context (Sprint 1: memoria compartida) — carga en background
    if (window.GoHappyContext) {
        window.GoHappyContext.load().catch(e => console.warn('[Context] load:', e?.message));
    }

    // Proactive (Flujos E + F): sugerencias inteligentes al abrir
    if (window.GoHappyProactive) {
        try { window.GoHappyProactive.init(); } catch (e) {}
    }

    // PREFETCH: calentar caches de Today en background tan pronto haya auth
    // Esto hace que cuando el usuario abra Today, ya tenga datos listos en <100ms
    const prefetchTodayData = async () => {
        try {
            const user = window.GoHappyAuth?.checkAuth?.();
            if (!user || user.isGuest) return;
            const coords = window.lastKnownCoords || localStorage.getItem('GoHappy_last_coords') || '41.6520,-4.7286';

            // Prefetch en paralelo (fire-and-forget) — la respuesta queda cacheada
            if (window.GoHappyAI?.getRealEvents) {
                window.GoHappyAI.getRealEvents(coords, 'finde').catch(() => {});
            }
            const prefs = localStorage.getItem('GoHappy_family_prefs');
            if (prefs && window.GoHappyAI?.getTodayActivities) {
                try {
                    window.GoHappyAI.getTodayActivities(coords, JSON.parse(prefs)).catch(() => {});
                } catch (e) {}
            }
        } catch (e) { /* silent */ }
    };

    // Esperar 2s tras splash para no competir con el render inicial
    setTimeout(prefetchTodayData, 2500);

    // Banner de cookies (GDPR/UK GDPR) — primera visita
    if (window.GoHappyCookies) {
        try { window.GoHappyCookies.init(); } catch (e) { console.warn('cookies init:', e); }
    }

    // Desbloquear AudioContext en primer gesto del usuario
    document.addEventListener('touchstart', () => window.GoHappySound.unlock(), { once: true });
    document.addEventListener('click', () => window.GoHappySound.unlock(), { once: true });

    // Gemini proxy status check (informativo)
    if (!window.GEMINI_PROXY_ACTIVE) {
        console.info("[GoHappy] Gemini proxy desactivado.");
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

            // Tour de onboarding interactivo: solo cuando el usuario YA está dentro del app
            // (auth-modal cerrado, splash oculto, nav visible). La función start() además
            // valida 4 condiciones extra para no aparecer en momento equivocado.
            if (!user.isGuest && window.GoHappyTour && !window.GoHappyTour.hasSeen()) {
                // Esperamos a que onboarding familiar (si aplica) se haya mostrado/cerrado
                // Reintentamos hasta 6 veces (12s) hasta que las 4 condiciones se cumplan
                let attempts = 0;
                const tryStartTour = () => {
                    if (attempts++ >= 6) return;
                    if (window.GoHappyTour.hasSeen()) return;
                    // start() devuelve silenciosamente si no se cumplen las condiciones
                    window.GoHappyTour.start();
                    // Si tras intentar no se activó, reintentar en 2s
                    setTimeout(() => {
                        if (!window.GoHappyTour.hasSeen()) tryStartTour();
                    }, 2000);
                };
                setTimeout(tryStartTour, 3000);
            }
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
        // Híbrido: pointerdown para feedback visual instantáneo + click para disparar
        // (click respeta gestos del navegador como long-press, drag, etc — evita
        //  navegación accidental cuando el usuario hace swipe sobre la nav)
        let pressed = false;
        item.addEventListener('pointerdown', (e) => {
            pressed = true;
            const target = e.currentTarget;
            target.classList.add('nav-active-pop');
            setTimeout(() => target.classList.remove('nav-active-pop'), 280);
        }, { passive: true });

        item.addEventListener('pointercancel', () => { pressed = false; }, { passive: true });
        item.addEventListener('pointerleave', () => { pressed = false; }, { passive: true });

        item.addEventListener('click', (e) => {
            const target = e.currentTarget;
            const page = target.dataset.page;
            if (page === appState.currentPage) return;

            navItems.forEach(nav => nav.classList.remove('active'));
            target.classList.add('active');

            try { window.GoHappySound && window.GoHappySound.play('click'); } catch (err) {}
            requestAnimationFrame(() => loadPage(page));
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
    'tribu':       () => window.GoHappyTribu,
    'my_family':   () => window.GoHappyMyFamily,
    'adventures':  () => window.GoHappyAdventures
};

// Cache de DOM por página: vuelve INSTANTÁNEO el switch entre pestañas ya visitadas
// Guardamos los nodos detached para reinjectar sin re-render
const _pageCache = new Map(); // pageName -> { node, ts }
const _PAGE_CACHE_TTL = 60 * 1000; // 60s: tras esto re-renderizamos para datos frescos
const _PAGE_CACHE_MAX = 4;        // max 4 páginas en memoria

function _cacheGet(pageName) {
    const c = _pageCache.get(pageName);
    if (!c) return null;
    if (Date.now() - c.ts > _PAGE_CACHE_TTL) {
        _pageCache.delete(pageName);
        return null;
    }
    return c.node;
}

function _cacheSet(pageName, node) {
    if (_pageCache.size >= _PAGE_CACHE_MAX) {
        // Eliminar el más antiguo
        const oldest = [..._pageCache.entries()].sort((a,b) => a[1].ts - b[1].ts)[0];
        if (oldest) _pageCache.delete(oldest[0]);
    }
    _pageCache.set(pageName, { node, ts: Date.now() });
}

async function loadPage(pageName) {
    if (appState.transitioning) return;
    if (appState.currentPage === pageName) return; // ya estás aquí, ignorar
    appState.transitioning = true;

    const container = document.getElementById('main-content');
    const mapViewport = document.getElementById('map-viewport-v11');

    try {
        // 1. Route Guard (síncrono, sin esperas)
        const user = window.GoHappyAuth.checkAuth();
        const publicPages = ['legal', 'map'];
        if (!user && !publicPages.includes(pageName)) {
            window.GoHappyAuth.renderAuthModal();
            appState.transitioning = false;
            return;
        }

        // 2. Guardar la página actual en cache antes de cambiar (si no es map)
        const previousPage = appState.currentPage;
        if (previousPage && previousPage !== 'map' && previousPage !== pageName && container.firstChild) {
            const snapshot = container.cloneNode(true);
            _cacheSet(previousPage, snapshot);
        }

        appState.currentPage = pageName;
        updateNavStyles(pageName);

        // 3. Renderizar destino
        if (pageName === 'map') {
            container.classList.add('hidden');
            if (mapViewport) {
                mapViewport.style.display = 'flex';
                if (window.GoHappyMap) {
                    // No await — fire & forget para que el switch sea inmediato
                    window.GoHappyMap.render(mapViewport);
                }
            }
            window.GoHappySound && window.GoHappySound.play('map');
        } else {
            if (mapViewport) mapViewport.style.display = 'none';
            container.classList.remove('hidden');

            // 3a. Si hay cache fresca, reinyectarla INSTANTE (0 ms render)
            const cached = _cacheGet(pageName);
            if (cached) {
                container.innerHTML = '';
                while (cached.firstChild) container.appendChild(cached.firstChild);
                container.style.animation = 'pageEnterPremium 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards';
                setTimeout(() => { container.style.animation = ''; }, 230);
            } else {
                // 3b. Sin cache: skeleton inmediato + render async
                container.innerHTML = `
                    <div class="premium-loader" style="padding:20px; padding-top:40px;">
                        <div class="premium-shimmer" style="height:140px; border-radius:28px; margin-bottom:16px;"></div>
                        <div class="premium-shimmer" style="height:70px; border-radius:20px; margin-bottom:12px;"></div>
                        <div class="premium-shimmer" style="height:70px; border-radius:20px;"></div>
                    </div>`;

                const getRenderer = PAGE_RENDERERS[pageName];
                const renderer = getRenderer ? getRenderer() : null;

                if (renderer && renderer.render) {
                    // Animación arranca YA aunque el render sea async
                    container.style.animation = 'pageEnterPremium 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards';

                    // No bloqueamos el unlock de transitioning con el await
                    Promise.resolve(renderer.render(container)).then(() => {
                        container.style.animation = '';
                        // Stagger se activa enseguida
                        container.querySelectorAll('.stagger-group').forEach(g => {
                            requestAnimationFrame(() => g.classList.add('active'));
                        });
                    }).catch(err => {
                        console.error(`[GoHappy] render ${pageName} error:`, err);
                    });
                } else {
                    container.innerHTML = `
                        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:60vh; gap:16px; color:#94a3b8;">
                            <span style="font-size:48px;">🚧</span>
                            <h3 style="font-size:18px; font-weight:800; color:#334155; margin:0;">Próximamente</h3>
                        </div>`;
                }
            }
        }

    } catch (err) {
        console.error(`[GoHappy] Error cargando ${pageName}:`, err);
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

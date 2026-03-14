window.KidoaAuth = {
    // Estado interno para evitar múltiples guardados
    _currentUser: (function () {
        const stored = localStorage.getItem('kidoa_local_user');
        if (stored) {
            try { return JSON.parse(stored); } catch (e) { return null; }
        }
        return null;
    })(),

    init: (callback) => {
        // Escuchar cambios de estado de Firebase
        window.KidoaAuthReal.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    // Obtener perfil extendido de Firestore si existe
                    const doc = await window.KidoaDB.collection('users').doc(user.uid).get();
                    const profile = doc.exists ? doc.data() : {};

                    window.KidoaAuth._currentUser = {
                        uid: user.uid,
                        email: user.email || "Invitado",
                        nickname: profile.nickname || "Explorador",
                        points: profile.points || 0,
                        level: profile.level || "Bronce",
                        isGuest: user.isAnonymous,
                        photo: profile.photo || "👤",
                        referralCode: profile.referralCode || ""
                    };
                } catch (e) {
                    console.warn("Resilient Init: Error fetching firestore profile, using minimal local state", e);
                    window.KidoaAuth._currentUser = {
                        uid: user.uid,
                        email: user.email || "Invitado",
                        nickname: "Explorador",
                        points: 0,
                        level: "Bronce",
                        isGuest: user.isAnonymous,
                        photo: "👤"
                    };
                }
            } else {
                // Si no hay user en Firebase, buscar si hay una sesión local de "emergencia"
                const localUser = window.KidoaAuth._checkLocalSession();
                window.KidoaAuth._currentUser = localUser;
            }
            if (callback) callback(window.KidoaAuth._currentUser);
        });
    },

    checkAuth: () => {
        return window.KidoaAuth._currentUser;
    },

    // Validar código de invitación en Firestore
    validateInvitation: async (code) => {
        if (!code) return false;
        const snap = await window.KidoaDB.collection('invitations')
            .where('code', '==', code.toUpperCase())
            .where('used', '==', false)
            .get();
        return !snap.empty;
    },

    login: async (email, pass) => {
        try {
            const res = await window.KidoaAuthReal.signInWithEmailAndPassword(email, pass);
            return res.user;
        } catch (e) {
            console.error("Login Error:", e);
            throw e;
        }
    },

    register: async (email, pass, nickname) => {
        try {
            // 1. Crear usuario en Auth
            const res = await window.KidoaAuthReal.createUserWithEmailAndPassword(email, pass);
            const user = res.user;

            // 3. Crear perfil en Firestore
            const profile = {
                uid: user.uid,
                email,
                nickname,
                points: 50, // Bono de bienvenida
                level: "Semilla",
                referralCode: 'KNDR-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
                createdAt: new Date()
            };
            await window.KidoaDB.collection('users').doc(user.uid).set(profile);

            // 4. Marcar invitación como usada (opcional, depende de la lógica del beta)
            // Aquí podrías actualizar el doc de la invitación si fuera de un solo uso

            return user;
        } catch (e) {
            console.error("Registration Error:", e);
            throw e;
        }
    },

    logout: async () => {
        localStorage.removeItem('kidoa_local_user');
        await window.KidoaAuthReal.signOut();
        window.location.reload();
    },

    setGuestMode: async () => {
        try {
            const res = await window.KidoaAuthReal.signInAnonymously();
            return res.user;
        } catch (e) {
            console.error("Guest Auth Error (Firebase):", e);
            console.warn("⚠️ Usando Local Fallback para modo invitado");

            // Local Fallback
            const mockUser = {
                uid: 'local-guest-' + Date.now(),
                email: 'guest@local',
                nickname: 'Visitante Local',
                isGuest: true,
                points: 0,
                level: 'Bronce'
            };
            window.KidoaAuth._saveLocalSession(mockUser);
            window.KidoaAuth._currentUser = mockUser;
            return mockUser;
        }
    },

    _saveLocalSession: (user) => {
        localStorage.setItem('kidoa_local_user', JSON.stringify(user));
    },

    _checkLocalSession: () => {
        const stored = localStorage.getItem('kidoa_local_user');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                return null;
            }
        }
        return null;
    },

    googleLogin: async () => {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const res = await window.KidoaAuthReal.signInWithPopup(provider);
            // Si es nuevo usuario, crear perfil en Firestore
            const doc = await window.KidoaDB.collection('users').doc(res.user.uid).get();
            if (!doc.exists) {
                const profile = {
                    uid: res.user.uid,
                    email: res.user.email,
                    nickname: res.user.displayName || "Explorador",
                    points: 50,
                    level: "Semilla",
                    referralCode: 'KNDR-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
                    createdAt: new Date()
                };
                await window.KidoaDB.collection('users').doc(res.user.uid).set(profile);
            }
            return res.user;
        } catch (e) {
            console.error("Google Login Error:", e);
            throw e;
        }
    },

    appleLogin: async () => {
        try {
            const provider = new firebase.auth.OAuthProvider('apple.com');
            const res = await window.KidoaAuthReal.signInWithPopup(provider);
            // Lógica similar a Google para nuevo usuario
            const doc = await window.KidoaDB.collection('users').doc(res.user.uid).get();
            if (!doc.exists) {
                const profile = {
                    uid: res.user.uid,
                    email: res.user.email || "apple-user",
                    nickname: "Explorador Apple",
                    points: 50,
                    level: "Semilla",
                    referralCode: 'KNDR-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
                    createdAt: new Date()
                };
                await window.KidoaDB.collection('users').doc(res.user.uid).set(profile);
            }
            return res.user;
        } catch (e) {
            console.error("Apple Login Error:", e);
            throw e;
        }
    },

    renderAuthModal: () => {
        // Asegurarse de que no haya duplicados
        if (document.getElementById('auth-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'auth-modal';
        modal.className = 'modal auth-modal';
        modal.innerHTML = `
            <div class="auth-container slide-up-anim">
                <div class="auth-card premium-glass">
                    <div class="auth-header">
                        <div class="premium-logo-wrap" style="margin-bottom: 30px; transform: scale(1.05);">
                            <img src="assets/logo.png" alt="Kidoa" style="height: 115px; width: auto; object-fit: contain; mix-blend-mode: multiply;">
                        </div>
                        <h2 style="color:var(--primary-navy); font-size: 1.9rem; font-weight: 900; margin-bottom: 8px; letter-spacing: -0.5px;">Bienvenido a KIDOA</h2>
                        <p style="color: #64748b; font-size: 1rem; font-weight: 500;">Explora, comparte y crece con tu tribu</p>
                    </div>
                    
                    <div id="auth-form">
                        <div id="auth-error-msg" style="color: #ff4d4d; font-size: 12px; margin-bottom: 15px; display:none; background: rgba(255,77,77,0.1); padding: 10px; border-radius: 12px;"></div>
                        
                        <div id="register-fields" style="display:none;">
                            <input type="text" id="reg-nickname" placeholder="Tu Apodo / Nickname" class="auth-input">
                        </div>

                        <input type="email" id="auth-email" placeholder="Email" class="auth-input">
                        <input type="password" id="auth-pass" placeholder="Contraseña" class="auth-input">
                        
                        <label id="terms-label" style="display:none; align-items:center; justify-content: center; gap:8px; margin-top:12px; font-size:12px; color:#666; cursor:pointer;">
                            <input type="checkbox" id="accept-terms" style="width:20px; height:20px; accent-color:var(--primary-blue);">
                            <span>Acepto los <a href="#" id="show-terms-link" style="color:var(--primary-blue); font-weight:700; text-decoration:none;">Términos y Condiciones</a></span>
                        </label>
                        
                        <div style="display:flex; flex-direction:column; gap:12px; margin-top:20px;">
                            <button id="main-auth-btn" class="btn-primary" style="height: 54px; font-size: 1.1rem;">Entrar</button>
                            <button id="toggle-auth-mode" class="btn-text" style="font-size: 14px; margin-top: 5px;">¿No tienes cuenta? Regístrate</button>
                        </div>
                        
                        <div class="social-divider"><span>o continúa con</span></div>
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:15px;">
                            <button id="do-google" class="btn-outline" style="display:flex; align-items:center; justify-content:center; gap:10px; height: 50px; border-radius: 15px; background: white; border: 1px solid #e2e8f0; font-weight: 600;">
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18"> Google
                            </button>
                            <button id="do-apple" class="btn-outline" style="display:flex; align-items:center; justify-content:center; gap:10px; height: 50px; border-radius: 15px; background: #000; color: white; border: none; font-weight: 600; cursor: pointer;">
                                <svg width="20" height="20" viewBox="0 0 384 512" style="fill:white;">
                                    <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                                </svg> Apple
                            </button>

                        </div>

                        <div style="text-align: center; margin-top: 10px;">
                            <button id="do-guest" class="btn-outline" style="font-weight: 700; color: var(--text-main); font-size: 0.9rem; border: 1px solid #e2e8f0; background: #f8fafc; width: 100%; height: 50px; border-radius: 15px; cursor: pointer;">
                                Explorar como invitado
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        // Hide map UI elements behind the modal
        const mapSearch = document.querySelector('.map-search-container');
        const mapFilters = document.querySelector('.map-filters');
        const locateBtn = document.querySelector('.locate-fab');
        if (mapSearch) mapSearch.style.display = 'none';
        if (mapFilters) mapFilters.style.display = 'none';
        if (locateBtn) locateBtn.style.display = 'none';

        let isLoginMode = true;
        const showError = (msg) => {
            const errDiv = document.getElementById('auth-error-msg');
            errDiv.textContent = msg;
            errDiv.style.display = 'block';
        };

        const toggleMode = () => {
            isLoginMode = !isLoginMode;
            document.getElementById('register-fields').style.display = isLoginMode ? 'none' : 'block';
            document.getElementById('terms-label').style.display = isLoginMode ? 'none' : 'flex';
            document.getElementById('main-auth-btn').textContent = isLoginMode ? 'Entrar' : 'Registrarse';
            document.getElementById('toggle-auth-mode').textContent = isLoginMode ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión';
        };

        document.getElementById('toggle-auth-mode').addEventListener('click', toggleMode);

        document.getElementById('main-auth-btn').addEventListener('click', async () => {
            const email = document.getElementById('auth-email').value;
            const pass = document.getElementById('auth-pass').value;

            if (isLoginMode) {
                if (!email || !pass) return showError("Email y contraseña requeridos.");
                try {
                    await window.KidoaAuth.login(email, pass);
                    modal.remove();
                    location.reload();
                } catch (e) {
                    showError("Error al iniciar sesión. Revisa tus datos.");
                }
            } else {
                const nick = document.getElementById('reg-nickname').value;
                const termsAccepted = document.getElementById('accept-terms').checked;

                if (!email || !pass || !nick) return showError("Todos los campos son obligatorios.");
                if (!termsAccepted) return showError("Debes aceptar los Términos y Condiciones.");

                try {
                    await window.KidoaAuth.register(email, pass, nick);
                    modal.remove();
                    location.reload();
                } catch (e) {
                    console.error("Reg error details:", e);
                    let errMsg = "Error en el registro.";
                    if (e.code === 'auth/email-already-in-use') errMsg = "El email ya está registrado.";
                    if (e.code === 'auth/weak-password') errMsg = "La contraseña es muy débil (mín. 6 carecteres).";
                    if (e.code === 'auth/operation-not-allowed') errMsg = "El registro por email no está activado en Firebase.";

                    showError(errMsg);
                }
            }
        });

        document.getElementById('do-google').addEventListener('click', async () => {
            try {
                await window.KidoaAuth.googleLogin();
                modal.remove();
                location.reload();
            } catch (e) {
                showError("Error al conectar con Google.");
            }
        });

        document.getElementById('do-apple').addEventListener('click', async () => {
            try {
                await window.KidoaAuth.appleLogin();
                modal.remove();
                location.reload();
            } catch (e) {
                showError("Apple Login no disponible o cancelado.");
            }
        });

        document.getElementById('do-guest').addEventListener('click', async () => {
            try {
                await window.KidoaAuth.setGuestMode();
                modal.remove();
                location.reload();
            } catch (e) {
                showError("No se pudo iniciar modo invitado.");
            }
        });

        document.getElementById('show-terms-link').addEventListener('click', (e) => {
            e.preventDefault();
            window.KidoaApp.loadPage('legal');
            modal.remove();

            // Restore map elements
            if (mapSearch) mapSearch.style.display = 'flex';
            if (mapFilters) mapFilters.style.display = 'flex';
            if (locateBtn) locateBtn.style.display = 'flex';
        });

        // Ensure proper cleanup on login
        const cleanupModal = () => {
            modal.remove();
            if (mapSearch) mapSearch.style.display = 'flex';
            if (mapFilters) mapFilters.style.display = 'flex';
            if (locateBtn) locateBtn.style.display = 'flex';
        };

        // Wrap original remove calls
        const originalLogin = document.getElementById('main-auth-btn').onclick;
    }
};

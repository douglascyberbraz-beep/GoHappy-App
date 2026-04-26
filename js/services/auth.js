window.GoHappyAuth = {
    // Estado interno para evitar múltiples guardados
    _currentUser: (function () {
        const stored = localStorage.getItem('GoHappy_local_user');
        if (stored) {
            try { return JSON.parse(stored); } catch (e) { return null; }
        }
        return null;
    })(),

    init: (callback) => {
        // Escuchar cambios de estado de Firebase
        window.GoHappyAuthReal.onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    // Obtener perfil extendido de Firestore si existe
                    const doc = await window.GoHappyDB.collection('users').doc(user.uid).get();
                    const profile = doc.exists ? doc.data() : {};

                    // FIX: Cargar TODOS los campos del perfil en _currentUser (incluyendo firstName, lastName)
                    window.GoHappyAuth._currentUser = {
                        uid: user.uid,
                        email: user.email || "Invitado",
                        nickname: profile.nickname || "Explorador",
                        firstName: profile.firstName || "",
                        lastName: profile.lastName || "",
                        points: profile.points || 0,
                        weeklyPoints: profile.weeklyPoints || 0,
                        level: profile.level || "Explorador Novato",
                        isGuest: user.isAnonymous,
                        photo: profile.photo || "👤",
                        referralCode: profile.referralCode || "",
                        familyId: profile.familyId || null,
                        familyName: profile.familyName || null,
                        rol: profile.rol || null
                    };
                    // Persistir localmente para acceso offline
                    localStorage.setItem('GoHappy_local_user', JSON.stringify(window.GoHappyAuth._currentUser));
                } catch (e) {
                    console.warn("Resilient Init: Error fetching firestore profile, usando sesión local", e);
                    const local = window.GoHappyAuth._checkLocalSession();
                    window.GoHappyAuth._currentUser = local || {
                        uid: user.uid,
                        email: user.email || "Invitado",
                        nickname: "Explorador",
                        firstName: "",
                        lastName: "",
                        points: 0,
                        level: "Explorador Novato",
                        isGuest: user.isAnonymous,
                        photo: "👤",
                        familyId: null
                    };
                }
            } else {
                // Si no hay user en Firebase, buscar si hay una sesión local de "emergencia"
                const localUser = window.GoHappyAuth._checkLocalSession();
                window.GoHappyAuth._currentUser = localUser;
            }
            if (callback) callback(window.GoHappyAuth._currentUser);
        });
    },

    checkAuth: () => {
        return window.GoHappyAuth._currentUser;
    },

    // Validar código de invitación en Firestore y devolver datos del referidor
    validateInvitation: async (code) => {
        if (!code) return null;
        try {
            const snap = await window.GoHappyDB.collection('invitations')
                .where('code', '==', code.toUpperCase())
                .where('used', '==', false)
                .get();
            if (snap.empty) return null;
            return { docId: snap.docs[0].id, ...snap.docs[0].data() };
        } catch (e) {
            console.warn("validateInvitation error:", e);
            return null;
        }
    },

    // Buscar usuario por su referralCode y premiar con puntos
    _rewardReferrer: async (referralCode) => {
        if (!referralCode) return;
        try {
            const snap = await window.GoHappyDB.collection('users')
                .where('referralCode', '==', referralCode.toUpperCase())
                .limit(1)
                .get();
            if (!snap.empty) {
                const referrerId = snap.docs[0].id;
                const refPoints = window.GoHappyPoints ? (window.GoHappyPoints.REWARDS.REFERRAL || 500) : 500;
                const userRef = window.GoHappyDB.collection('users').doc(referrerId);
                await window.GoHappyDB.runTransaction(async (t) => {
                    const doc = await t.get(userRef);
                    if (doc.exists) {
                        t.update(userRef, {
                            points: (doc.data().points || 0) + refPoints,
                            weeklyPoints: (doc.data().weeklyPoints || 0) + refPoints
                        });
                    }
                });
                console.log(`✅ Referidor ${referrerId} recibió ${refPoints} pts`);
            }
        } catch (e) {
            console.warn("_rewardReferrer error:", e);
        }
    },

    login: async (email, pass) => {
        try {
            const res = await window.GoHappyAuthReal.signInWithEmailAndPassword(email, pass);
            return res.user;
        } catch (e) {
            console.error("Login Error:", e);
            throw e;
        }
    },

    register: async (email, pass, nickname, firstName = "", lastName = "", photo = "👤", referralCode = "") => {
        try {
            // 1. Crear usuario en Auth
            const res = await window.GoHappyAuthReal.createUserWithEmailAndPassword(email, pass);
            const user = res.user;

            // 2. Generar código de referido único para este nuevo usuario
            const myReferralCode = 'GH-' + Math.random().toString(36).substr(2, 6).toUpperCase();

            // 3. Crear perfil completo en Firestore
            const profile = {
                uid: user.uid,
                email,
                nickname,
                firstName,
                lastName,
                photo,
                points: 50, // Bono de bienvenida
                weeklyPoints: 50,
                level: "Explorador Novato",
                referralCode: myReferralCode,
                referredBy: referralCode.toUpperCase() || null,
                familyId: null,
                createdAt: new Date()
            };
            await window.GoHappyDB.collection('users').doc(user.uid).set(profile);

            // 4. FIX: Premiar al referidor si se usó su código
            if (referralCode && referralCode.trim() !== '') {
                await window.GoHappyAuth._rewardReferrer(referralCode.trim());
            }

            return user;
        } catch (e) {
            console.error("Registration Error:", e);
            throw e;
        }
    },

    logout: async () => {
        localStorage.removeItem('GoHappy_local_user');
        await window.GoHappyAuthReal.signOut();
        window.location.reload();
    },

    setGuestMode: async () => {
        try {
            const res = await window.GoHappyAuthReal.signInAnonymously();
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
            window.GoHappyAuth._saveLocalSession(mockUser);
            window.GoHappyAuth._currentUser = mockUser;
            return mockUser;
        }
    },

    _saveLocalSession: (user) => {
        localStorage.setItem('GoHappy_local_user', JSON.stringify(user));
    },

    _checkLocalSession: () => {
        const stored = localStorage.getItem('GoHappy_local_user');
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
            const res = await window.GoHappyAuthReal.signInWithPopup(provider);
            // Si es nuevo usuario, crear perfil completo en Firestore
            const doc = await window.GoHappyDB.collection('users').doc(res.user.uid).get();
            if (!doc.exists) {
                const nameParts = (res.user.displayName || 'Explorador').split(' ');
                const profile = {
                    uid: res.user.uid,
                    email: res.user.email,
                    nickname: nameParts[0] || "Explorador",
                    firstName: nameParts[0] || "",
                    lastName: nameParts.slice(1).join(' ') || "",
                    photo: res.user.photoURL || "👤",
                    points: 50,
                    weeklyPoints: 50,
                    level: "Explorador Novato",
                    referralCode: 'GH-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
                    familyId: null,
                    createdAt: new Date()
                };
                await window.GoHappyDB.collection('users').doc(res.user.uid).set(profile);
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
            const res = await window.GoHappyAuthReal.signInWithPopup(provider);
            // Lógica similar a Google para nuevo usuario
            const doc = await window.GoHappyDB.collection('users').doc(res.user.uid).get();
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
                await window.GoHappyDB.collection('users').doc(res.user.uid).set(profile);
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
            <div class="auth-container entry-anim">
                <div class="auth-card premium-glass" style="max-height: 90vh; overflow-y: auto;">
                    <div class="auth-header">
                        <div class="premium-logo-wrap" style="margin-bottom: 20px; display: flex; justify-content: center;">
                            <img src="assets/logo_gohappy_official.svg" alt="GoHappy Logo" style="width: 140px; height: auto;">
                        </div>
                        <h2 style="color:var(--primary-cobalt); font-size: 1.8rem; font-weight: 900; margin-bottom: 5px; letter-spacing: -1px;">Bienvenido a la Tribu</h2>
                        <p style="color: #64748b; font-size: 0.95rem; font-weight: 500;">Crea recuerdos inolvidables en familia</p>
                    </div>
                    
                    <div id="auth-form" style="margin-top: 20px;">
                        <div id="auth-error-msg" style="color: #ff4d4d; font-size: 12px; margin-bottom: 15px; display:none; background: rgba(255,77,77,0.1); padding: 12px; border-radius: 14px; font-weight: 600;"></div>
                        
                        <div id="register-fields" style="display:none;">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
                                <input type="text" id="reg-name" placeholder="Nombre" class="auth-input">
                                <input type="text" id="reg-surname" placeholder="Apellidos" class="auth-input">
                            </div>
                            <input type="text" id="reg-nickname" placeholder="Tu Apodo (Nickname)" class="auth-input">
                            
                            <div style="margin: 15px 0;">
                                <label style="font-size: 11px; font-weight: 800; color: var(--primary-cobalt); text-transform: uppercase; display: block; margin-bottom: 10px;">Elige tu Avatar</label>
                                <div id="avatar-selector" style="display: flex; gap: 10px; overflow-x: auto; padding: 5px; scrollbar-width: none;">
                                    <div class="avatar-option selected" data-emoji="👤">👤</div>
                                    <div class="avatar-option" data-emoji="🦁">🦁</div>
                                    <div class="avatar-option" data-emoji="🐼">🐼</div>
                                    <div class="avatar-option" data-emoji="🦄">🦄</div>
                                    <div class="avatar-option" data-emoji="🦊">🦊</div>
                                    <div class="avatar-option" data-emoji="🤖">🤖</div>
                                    <div class="avatar-option" data-emoji="👩‍🚀">👩‍🚀</div>
                                    <div class="avatar-option" data-emoji="🦒">🦒</div>
                                </div>
                            </div>

                            <div style="margin-top: 8px;">
                                <input type="text" id="reg-referral" placeholder="Código de invitación (opcional)" class="auth-input" style="font-size: 13px; letter-spacing: 1px; text-transform: uppercase;">
                                <p style="font-size: 11px; color: #94a3b8; margin: 4px 0 0 4px;">Si un amigo te invitó, ¡pega su código y él gana 500 pts! 🎁</p>
                            </div>
                        </div>

                        <input type="email" id="auth-email" placeholder="Correo electrónico" class="auth-input">
                        <input type="password" id="auth-pass" placeholder="Contraseña" class="auth-input">
                        
                        <label id="terms-label" style="display:none; align-items:center; justify-content: center; gap:8px; margin-top:12px; font-size:12px; color:#64748b; cursor:pointer;">
                            <input type="checkbox" id="accept-terms" style="width:18px; height:18px; accent-color:var(--primary-cobalt);">
                            <span>Acepto los <a href="#" id="show-terms-link" style="color:var(--primary-cobalt); font-weight:700;">Términos</a></span>
                        </label>
                        
                        <button id="main-auth-btn" class="btn-primary-gradient full-width" style="height: 55px; margin-top: 20px; font-size: 1.1rem; font-weight: 800; border: none; border-radius: 16px; box-shadow: 0 10px 20px rgba(11, 113, 252, 0.2);">Entrar</button>
                        
                        <button id="toggle-auth-mode" class="btn-text full-width" style="margin-top: 10px; font-size: 14px; font-weight: 600; color: #64748b;">¿No tienes cuenta? Regístrate gratis</button>
                        
                        <div class="social-divider" style="margin: 25px 0;"><span>O CONECTA CON</span></div>
                        
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                            <button id="do-google" class="social-btn-premium">
                                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20"> Google
                            </button>
                            <button id="do-apple" class="social-btn-premium" style="background: #000; color: white; border: none;">
                                <svg width="18" height="18" viewBox="0 0 384 512" style="fill:white;"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg> Apple
                            </button>
                        </div>

                        <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #f1f5f9;">
                            <button id="do-guest" style="background: none; border: none; color: #94a3b8; font-weight: 700; font-size: 14px; cursor: pointer; text-decoration: underline;">
                                Seguir como invitado
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
            document.getElementById('main-auth-btn').textContent = isLoginMode ? 'Entrar' : 'Crear Cuenta Gratis';
            document.getElementById('toggle-auth-mode').textContent = isLoginMode ? '¿No tienes cuenta? Regístrate gratis' : '¿Ya tienes cuenta? Inicia sesión';
        };

        let selectedEmoji = "👤";
        document.querySelectorAll('.avatar-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                selectedEmoji = opt.dataset.emoji;
            });
        });

        document.getElementById('toggle-auth-mode').addEventListener('click', toggleMode);

        document.getElementById('main-auth-btn').addEventListener('click', async () => {
            const email = document.getElementById('auth-email').value;
            const pass = document.getElementById('auth-pass').value;

            if (isLoginMode) {
                if (!email || !pass) return showError("Email y contraseña requeridos.");
                try {
                    await window.GoHappyAuth.login(email, pass);
                    modal.remove();
                    location.reload();
                } catch (e) {
                    showError("Error al iniciar sesión. Revisa tus datos.");
                }
            } else {
                const nick = document.getElementById('reg-nickname').value;
                const name = document.getElementById('reg-name').value;
                const surname = document.getElementById('reg-surname').value;
                const termsAccepted = document.getElementById('accept-terms').checked;
                // FIX: Leer código de referido del nuevo campo
                const referralInput = document.getElementById('reg-referral');
                const referralCode = referralInput ? referralInput.value.trim().toUpperCase() : '';

                if (!email || !pass || !nick || !name) return showError("Nombre, Apodo, Email y Contraseña requeridos.");
                if (!termsAccepted) return showError("Debes aceptar los Términos.");

                const mainBtn = document.getElementById('main-auth-btn');
                mainBtn.disabled = true;
                mainBtn.textContent = '⌛ Creando tu cuenta...';

                try {
                    // FIX: Pasar referralCode al register
                    await window.GoHappyAuth.register(email, pass, nick, name, surname, selectedEmoji, referralCode);
                    modal.remove();
                    location.reload();
                } catch (e) {
                    mainBtn.disabled = false;
                    mainBtn.textContent = 'Crear Cuenta Gratis';
                    console.error("Reg error details:", e);
                    let errMsg = "Error en el registro.";
                    if (e.code === 'auth/email-already-in-use') errMsg = "El email ya está registrado.";
                    if (e.code === 'auth/weak-password') errMsg = "La contraseña es muy débil (mín. 6 caracteres).";
                    if (e.code === 'auth/operation-not-allowed') errMsg = "El registro por email no está activado en Firebase.";
                    if (e.code === 'auth/invalid-email') errMsg = "El formato del email no es válido.";

                    showError(errMsg);
                }
            }
        });

        document.getElementById('do-google').addEventListener('click', async () => {
            try {
                await window.GoHappyAuth.googleLogin();
                modal.remove();
                location.reload();
            } catch (e) {
                showError("Error al conectar con Google.");
            }
        });

        document.getElementById('do-apple').addEventListener('click', async () => {
            try {
                await window.GoHappyAuth.appleLogin();
                modal.remove();
                location.reload();
            } catch (e) {
                showError("Apple Login no disponible o cancelado.");
            }
        });

        document.getElementById('do-guest').addEventListener('click', async () => {
            try {
                await window.GoHappyAuth.setGuestMode();
                modal.remove();
                location.reload();
            } catch (e) {
                showError("No se pudo iniciar modo invitado.");
            }
        });

        document.getElementById('show-terms-link').addEventListener('click', (e) => {
            e.preventDefault();
            window.GoHappyApp.loadPage('legal');
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


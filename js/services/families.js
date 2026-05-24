// ================================================================
// GoHappy Families Service — v1.0.0
// Gestiona la creación, unión y consulta de familias.
// ================================================================
window.GoHappyFamilies = {

    // Generar código de invitación único de 6 caracteres alfanuméricos
    _generateCode: () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sin chars ambiguos (0,O,I,1)
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    },

    // ────────────────────────────────────────────────
    // CREAR FAMILIA
    // ────────────────────────────────────────────────
    createFamily: async (familyName) => {
        const user = window.GoHappyAuth.checkAuth();
        if (!user || user.isGuest) throw new Error(window.L('Debes iniciar sesión para crear una familia.', 'You must sign in to create a family.'));

        // Validación del nombre
        const nombre = familyName.trim();
        if (!nombre || nombre.length < 2) throw new Error(window.L('El nombre de la familia debe tener al menos 2 caracteres.', 'Family name must be at least 2 characters.'));
        if (nombre.length > 40) throw new Error(window.L('El nombre no puede tener más de 40 caracteres.', 'Family name cannot exceed 40 characters.'));

        // Forzar online: si la SDK quedó en offline (persistence fail, sleep, etc) reactiva
        try {
            await window.GoHappyDB.enableNetwork();
        } catch (e) { /* ignore */ }

        // Helper: timeout amplio (30s) — Firestore puede tardar en frío
        const withTimeout = (promise, ms = 30000, label = 'firestore') =>
            Promise.race([
                promise,
                new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout-${label}`)), ms))
            ]);

        // Verificación local: si la sesión local ya dice que tiene familia, abortar YA
        // (evita 2 lecturas Firestore innecesarias que añaden latencia)
        if (user.familyId) {
            throw new Error(window.L('Ya perteneces a una familia. Sal de ella primero para crear una nueva.', 'You already belong to a family. Leave it first to create a new one.'));
        }

        // Generamos código localmente (6 chars sobre 32^6 ≈ 1B combinaciones).
        // Colisión es estadísticamente improbable y la transacción del join detecta.
        // Saltamos la query previa de comprobación que añadía 20s de timeout potencial.
        const codigoInvitacion = window.GoHappyFamilies._generateCode();

        // Crear la familia en Firestore
        const familiaData = {
            nombre,
            creadoPor: user.uid,
            fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
            codigoInvitacion,
            miembros: [user.uid],
            maxMiembros: 6
        };
        let familiaRef;
        try {
            familiaRef = await withTimeout(
                window.GoHappyDB.collection('families').add(familiaData),
                30000, 'crear-familia'
            );
        } catch (e) {
            console.error('[Families] create err:', e?.code, e?.message);
            if (e?.message?.startsWith('timeout-')) {
                throw new Error(window.L('La operación tardó demasiado. Comprueba tu conexión y reintenta.', 'The operation took too long. Check your connection and retry.'));
            }
            if (e?.code === 'permission-denied') {
                throw new Error(window.L('Permiso denegado. Revisa que estés bien identificado.', 'Permission denied. Check that you are properly signed in.'));
            }
            throw new Error(window.L('No se pudo crear la familia: ', 'Could not create the family: ') + (e?.message || window.L('error desconocido', 'unknown error')));
        }
        const familyId = familiaRef.id;

        // Actualizar el perfil del usuario como admin (set+merge para auto-heal
        // si el doc no existe todavía). No crítico — si falla, la familia ya está creada.
        try {
            await withTimeout(
                window.GoHappyDB.collection('users').doc(user.uid).set({
                    familyId,
                    rol: 'admin',
                    familyName: nombre
                }, { merge: true }),
                20000, 'actualizar-perfil'
            );
        } catch (e) {
            console.warn('[Families] update profile failed (non-fatal):', e?.message);
            // No tira error — la familia ya está creada; el usuario tendrá que recargar
        }

        // Actualizar sesión local
        window.GoHappyAuth._currentUser = {
            ...window.GoHappyAuth._currentUser,
            familyId,
            rol: 'admin',
            familyName: nombre
        };
        if (window.GoHappyAuth._saveLocalSession) window.GoHappyAuth._saveLocalSession(window.GoHappyAuth._currentUser);
        else localStorage.setItem('GoHappy_local_user', JSON.stringify(window.GoHappyAuth._currentUser));

        console.log(`✅ Familia "${nombre}" creada con ID ${familyId} y código ${codigoInvitacion}`);

        // Crear las 10 quests iniciales para esta familia
        if (window.GoHappyQuests && window.GoHappyQuests.bootstrapFamilyQuests) {
            window.GoHappyQuests.bootstrapFamilyQuests(familyId).catch(e =>
                console.warn('Bootstrap quests error (no crítico):', e)
            );
        }

        return { familyId, codigoInvitacion, nombre };
    },

    // ────────────────────────────────────────────────
    // UNIRSE A UNA FAMILIA CON CÓDIGO
    // ────────────────────────────────────────────────
    joinFamily: async (code) => {
        const user = window.GoHappyAuth.checkAuth();
        if (!user || user.isGuest) throw new Error(window.L('Debes iniciar sesión para unirte a una familia.', 'You must sign in to join a family.'));

        const codigoLimpio = (code || '').trim().toUpperCase();
        if (codigoLimpio.length !== 6) throw new Error(window.L('El código debe tener exactamente 6 caracteres.', 'Code must be exactly 6 characters.'));

        // Verificar que el usuario no tenga ya una familia
        const userDoc = await window.GoHappyDB.collection('users').doc(user.uid).get();
        if (userDoc.exists && userDoc.data().familyId) {
            throw new Error('Ya perteneces a una familia. Sal de ella primero para unirte a otra.');
        }

        // Buscar la familia por código
        const snap = await window.GoHappyDB.collection('families')
            .where('codigoInvitacion', '==', codigoLimpio)
            .limit(1)
            .get();

        if (snap.empty) throw new Error(window.L('Código incorrecto. Pídele el código al creador de la familia.', 'Wrong code. Ask the family creator for the code.'));

        const familiaDoc = snap.docs[0];
        const familiaData = familiaDoc.data();
        const familyId = familiaDoc.id;

        // Validar máximo de miembros (6)
        const miembros = familiaData.miembros || [];
        if (miembros.length >= 6) {
            throw new Error(window.L('Esta familia ya tiene 6 miembros. No puede admitir más.', 'This family already has 6 members. No more can join.'));
        }

        // Verificar que no sea ya miembro
        if (miembros.includes(user.uid)) {
            throw new Error(window.L('¡Ya eres miembro de esta familia!', 'You are already a member of this family!'));
        }

        // Añadir al usuario como miembro (transacción para evitar race conditions)
        await window.GoHappyDB.runTransaction(async (t) => {
            const ref = window.GoHappyDB.collection('families').doc(familyId);
            const doc = await t.get(ref);
            if (!doc.exists) throw new Error('La familia ya no existe.');
            const currentMembers = doc.data().miembros || [];
            if (currentMembers.length >= 6) throw new Error(window.L('La familia está llena (máx. 6 miembros).', 'Family is full (max 6 members).'));
            t.update(ref, { miembros: [...currentMembers, user.uid] });
        });

        // Actualizar el perfil del usuario
        await window.GoHappyDB.collection('users').doc(user.uid).set({
            familyId,
            rol: 'miembro',
            familyName: familiaData.nombre
        }, { merge: true });

        // Actualizar sesión local
        window.GoHappyAuth._currentUser = {
            ...window.GoHappyAuth._currentUser,
            familyId,
            rol: 'miembro',
            familyName: familiaData.nombre
        };
        if (window.GoHappyAuth._saveLocalSession) window.GoHappyAuth._saveLocalSession(window.GoHappyAuth._currentUser);
        else localStorage.setItem('GoHappy_local_user', JSON.stringify(window.GoHappyAuth._currentUser));

        console.log(`✅ ${user.uid} se unió a la familia "${familiaData.nombre}" (${familyId})`);
        return { familyId, nombre: familiaData.nombre };
    },

    // ────────────────────────────────────────────────
    // OBTENER DATOS DE LA FAMILIA ACTUAL
    // ────────────────────────────────────────────────
    getMyFamily: async () => {
        const user = window.GoHappyAuth.checkAuth();
        if (!user || !user.familyId) return null;

        try {
            const doc = await window.GoHappyDB.collection('families').doc(user.familyId).get();
            if (!doc.exists) return null;

            const data = doc.data();

            // Obtener perfiles de cada miembro
            const memberProfiles = await Promise.all(
                (data.miembros || []).map(async (uid) => {
                    try {
                        const uDoc = await window.GoHappyDB.collection('users').doc(uid).get();
                        return uDoc.exists
                            ? { uid, ...uDoc.data() }
                            : { uid, nickname: 'Miembro', photo: '👤', points: 0 };
                    } catch {
                        return { uid, nickname: 'Miembro', photo: '👤', points: 0 };
                    }
                })
            );

            return {
                id: doc.id,
                ...data,
                miembrosData: memberProfiles
            };
        } catch (e) {
            console.warn('getMyFamily error:', e);
            return null;
        }
    },

    // ────────────────────────────────────────────────
    // SALIR DE LA FAMILIA
    // ────────────────────────────────────────────────
    leaveFamily: async () => {
        const user = window.GoHappyAuth.checkAuth();
        if (!user || !user.familyId) throw new Error('No perteneces a ninguna familia.');
        if (user.rol === 'admin') throw new Error('Como administrador, debes transferir el rol antes de salir o eliminar la familia.');

        const familyId = user.familyId;

        await window.GoHappyDB.runTransaction(async (t) => {
            const ref = window.GoHappyDB.collection('families').doc(familyId);
            const doc = await t.get(ref);
            if (doc.exists) {
                const miembros = (doc.data().miembros || []).filter(uid => uid !== user.uid);
                t.update(ref, { miembros });
            }
        });

        await window.GoHappyDB.collection('users').doc(user.uid).set({
            familyId: null,
            rol: null,
            familyName: null
        }, { merge: true });

        window.GoHappyAuth._currentUser = {
            ...window.GoHappyAuth._currentUser,
            familyId: null,
            rol: null,
            familyName: null
        };
        if (window.GoHappyAuth._saveLocalSession) window.GoHappyAuth._saveLocalSession(window.GoHappyAuth._currentUser);
        else localStorage.setItem('GoHappy_local_user', JSON.stringify(window.GoHappyAuth._currentUser));
        return true;
    }
};

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
        if (!user || user.isGuest) throw new Error('Debes iniciar sesión para crear una familia.');

        // Validación del nombre
        const nombre = familyName.trim();
        if (!nombre || nombre.length < 2) throw new Error('El nombre de la familia debe tener al menos 2 caracteres.');
        if (nombre.length > 40) throw new Error('El nombre no puede tener más de 40 caracteres.');

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
            throw new Error('Ya perteneces a una familia. Sal de ella primero para crear una nueva.');
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
                throw new Error('La operación tardó demasiado. Comprueba tu conexión y reintenta.');
            }
            if (e?.code === 'permission-denied') {
                throw new Error('Permiso denegado. Revisa que estés bien identificado.');
            }
            throw new Error('No se pudo crear la familia: ' + (e?.message || 'error desconocido'));
        }
        const familyId = familiaRef.id;

        // Actualizar el perfil del usuario como admin (no crítico — si falla, lo arreglamos después)
        try {
            await withTimeout(
                window.GoHappyDB.collection('users').doc(user.uid).update({
                    familyId,
                    rol: 'admin',
                    familyName: nombre
                }),
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
        localStorage.setItem('GoHappy_local_user', JSON.stringify(window.GoHappyAuth._currentUser));

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
        if (!user || user.isGuest) throw new Error('Debes iniciar sesión para unirte a una familia.');

        const codigoLimpio = (code || '').trim().toUpperCase();
        if (codigoLimpio.length !== 6) throw new Error('El código debe tener exactamente 6 caracteres.');

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

        if (snap.empty) throw new Error('Código incorrecto. Pídele el código al creador de la familia.');

        const familiaDoc = snap.docs[0];
        const familiaData = familiaDoc.data();
        const familyId = familiaDoc.id;

        // Validar máximo de miembros (6)
        const miembros = familiaData.miembros || [];
        if (miembros.length >= 6) {
            throw new Error('Esta familia ya tiene 6 miembros. No puede admitir más.');
        }

        // Verificar que no sea ya miembro
        if (miembros.includes(user.uid)) {
            throw new Error('¡Ya eres miembro de esta familia!');
        }

        // Añadir al usuario como miembro (transacción para evitar race conditions)
        await window.GoHappyDB.runTransaction(async (t) => {
            const ref = window.GoHappyDB.collection('families').doc(familyId);
            const doc = await t.get(ref);
            if (!doc.exists) throw new Error('La familia ya no existe.');
            const currentMembers = doc.data().miembros || [];
            if (currentMembers.length >= 6) throw new Error('La familia está llena (máx. 6 miembros).');
            t.update(ref, { miembros: [...currentMembers, user.uid] });
        });

        // Actualizar el perfil del usuario
        await window.GoHappyDB.collection('users').doc(user.uid).update({
            familyId,
            rol: 'miembro',
            familyName: familiaData.nombre
        });

        // Actualizar sesión local
        window.GoHappyAuth._currentUser = {
            ...window.GoHappyAuth._currentUser,
            familyId,
            rol: 'miembro',
            familyName: familiaData.nombre
        };
        localStorage.setItem('GoHappy_local_user', JSON.stringify(window.GoHappyAuth._currentUser));

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

        await window.GoHappyDB.collection('users').doc(user.uid).update({
            familyId: null,
            rol: null,
            familyName: null
        });

        window.GoHappyAuth._currentUser = {
            ...window.GoHappyAuth._currentUser,
            familyId: null,
            rol: null,
            familyName: null
        };
        localStorage.setItem('GoHappy_local_user', JSON.stringify(window.GoHappyAuth._currentUser));
        return true;
    }
};

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

        // Verificar que el usuario no tenga ya una familia
        const userDoc = await window.GoHappyDB.collection('users').doc(user.uid).get();
        if (userDoc.exists && userDoc.data().familyId) {
            throw new Error('Ya perteneces a una familia. Sal de ella primero para crear una nueva.');
        }

        // Asegurar código único (máx 3 intentos)
        let codigoInvitacion = '';
        for (let i = 0; i < 3; i++) {
            const candidate = window.GoHappyFamilies._generateCode();
            const existing = await window.GoHappyDB.collection('familias')
                .where('codigoInvitacion', '==', candidate).get();
            if (existing.empty) { codigoInvitacion = candidate; break; }
        }
        if (!codigoInvitacion) throw new Error('Error generando código único. Inténtalo de nuevo.');

        // Crear la familia en Firestore
        const familiaData = {
            nombre,
            creadoPor: user.uid,
            fechaCreacion: new Date(),
            codigoInvitacion,
            miembros: [user.uid],
            maxMiembros: 6
        };
        const familiaRef = await window.GoHappyDB.collection('familias').add(familiaData);
        const familyId = familiaRef.id;

        // Actualizar el perfil del usuario como admin
        await window.GoHappyDB.collection('users').doc(user.uid).update({
            familyId,
            rol: 'admin',
            familyName: nombre
        });

        // Actualizar sesión local
        window.GoHappyAuth._currentUser = {
            ...window.GoHappyAuth._currentUser,
            familyId,
            rol: 'admin',
            familyName: nombre
        };
        localStorage.setItem('GoHappy_local_user', JSON.stringify(window.GoHappyAuth._currentUser));

        console.log(`✅ Familia "${nombre}" creada con ID ${familyId} y código ${codigoInvitacion}`);
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
        const snap = await window.GoHappyDB.collection('familias')
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
            const ref = window.GoHappyDB.collection('familias').doc(familyId);
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
            const doc = await window.GoHappyDB.collection('familias').doc(user.familyId).get();
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
            const ref = window.GoHappyDB.collection('familias').doc(familyId);
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

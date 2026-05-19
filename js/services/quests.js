// ================================================================
// GoHappy Quests Service v2.0 — Motor de Misiones Familiares
// ================================================================
// Arquitectura Firestore:
//   quests/{questId}                  → Catálogo global de misiones
//   completadas/{familyId}/registros/ → Historial de completaciones por familia
//   familias/{familyId}               → puntosTotales (actualizado en tiempo real)
//   users/{uid}                       → points, weeklyPoints (actualizado al completar)
// ================================================================

window.GoHappyQuests = {

    // ─────────────────────────────────────────────────────────
    // CONFIGURACIÓN
    // ─────────────────────────────────────────────────────────

    /** Límite de quests visibles en plan Gratuito */
    FREE_LIMIT: 3,

    /** Categorías y colores del sistema */
    CATEGORIAS: {
        fisica:     { icon: '🏃', label: 'Actividad Física',  color: '#E74C3C' },
        familiar:   { icon: '👨‍👩‍👧', label: 'Tiempo Familiar',  color: '#8E44AD' },
        educativa:  { icon: '📚', label: 'Educativa',         color: '#2980B9' },
        bienestar:  { icon: '🌱', label: 'Bienestar',         color: '#27AE60' },
        creativa:   { icon: '🎨', label: 'Creatividad',       color: '#E67E22' },
        social:     { icon: '🤝', label: 'Comunidad',         color: '#16A085' }
    },

    // ─────────────────────────────────────────────────────────
    // CATÁLOGO: 10 quests de ejemplo para bootstrap de familias
    // ─────────────────────────────────────────────────────────

    CATALOGO_DEFAULT: [
        {
            titulo:      'Paseo sin Pantallas',
            descripcion: 'Salid a pasear en familia durante 30 minutos sin móvil. Contad los pájaros que veáis.',
            icono:       '🌳',
            puntos:      50,
            categoria:   'fisica',
            frecuencia:  'diaria',
            activa:      true
        },
        {
            titulo:      'Desayuno Familiar',
            descripcion: 'Preparad el desayuno todos juntos sin prisas. Cada miembro elige un ingrediente.',
            icono:       '🥞',
            puntos:      40,
            categoria:   'familiar',
            frecuencia:  'diaria',
            activa:      true
        },
        {
            titulo:      'Cuento en Voz Alta',
            descripcion: 'Leed un capítulo de un libro en familia. Los mayores leen, los pequeños escuchan.',
            icono:       '📖',
            puntos:      60,
            categoria:   'educativa',
            frecuencia:  'diaria',
            activa:      true
        },
        {
            titulo:      'Hora del Abrazo',
            descripcion: 'Decidle algo bonito a cada miembro de la familia. Un abrazo de 20 segundos tiene efectos científicamente probados.',
            icono:       '🤗',
            puntos:      30,
            categoria:   'bienestar',
            frecuencia:  'diaria',
            activa:      true
        },
        {
            titulo:      'Reto Artístico Semanal',
            descripcion: 'Dibujad juntos el mismo objeto pero cada uno a su manera. Comparad los resultados al final.',
            icono:       '🎨',
            puntos:      100,
            categoria:   'creativa',
            frecuencia:  'semanal',
            activa:      true
        },
        {
            titulo:      'Explorador de Barrio',
            descripcion: 'Encontrad un rincón de vuestro barrio que no conozcáis. Sacad una foto y compartidla en la Tribu.',
            icono:       '🗺️',
            puntos:      80,
            categoria:   'fisica',
            frecuencia:  'semanal',
            activa:      true
        },
        {
            titulo:      'Llamada Solidaria',
            descripcion: 'Llamad a un familiar o amigo que lleve tiempo sin noticias vuestras. Los niños también participan.',
            icono:       '📞',
            puntos:      70,
            categoria:   'social',
            frecuencia:  'semanal',
            activa:      true
        },
        {
            titulo:      'Cocina con Ingrediente Raro',
            descripcion: 'Elegid un ingrediente que nunca hayáis cocinado y preparad algo con él. Votad si repetís.',
            icono:       '🥕',
            puntos:      90,
            categoria:   'familiar',
            frecuencia:  'semanal',
            activa:      true
        },
        {
            titulo:      'Meditación Familiar',
            descripcion: 'Sentaos en círculo 5 minutos, cerrad los ojos y respirad. Después, cada uno dice cómo se siente.',
            icono:       '🧘',
            puntos:      50,
            categoria:   'bienestar',
            frecuencia:  'diaria',
            activa:      true
        },
        {
            titulo:      'Expertos en Museo',
            descripcion: 'Visitad un museo, parque histórico o monumento. Que cada niño explique una cosa que aprendió.',
            icono:       '🏛️',
            puntos:      150,
            categoria:   'educativa',
            frecuencia:  'semanal',
            activa:      true
        },
        // ─── MISIONES MENSUALES ───────────────────────────────────────
        {
            titulo:      'Gran Aventura Familiar del Mes',
            descripcion: 'Planificad y realizad una excursión de un día completo a un lugar especial que nunca hayáis visitado juntos.',
            icono:       '🗺️',
            puntos:      500,
            categoria:   'familiar',
            frecuencia:  'mensual',
            activa:      true
        },
        {
            titulo:      'Reto Solidario Familiar',
            descripcion: 'Participad como familia en una actividad solidaria: banco de alimentos, limpieza de parque, recogida de ropa.',
            icono:       '❤️',
            puntos:      400,
            categoria:   'social',
            frecuencia:  'mensual',
            activa:      true
        },
        {
            titulo:      'Proyecto Creativo del Mes',
            descripcion: 'Cread juntos algo de principio a fin: un álbum de fotos, una maqueta, una pequeña obra de teatro o un cortometraje.',
            icono:       '🎬',
            puntos:      350,
            categoria:   'creativa',
            frecuencia:  'mensual',
            activa:      true
        }
    ],

    // ─────────────────────────────────────────────────────────
    // BOOTSTRAP: Crear quests iniciales para una familia nueva
    // ─────────────────────────────────────────────────────────

    /**
     * Crea las 10 quests del catálogo en Firestore para una familia nueva.
     * Llamado automáticamente al crear la familia.
     */
    /**
     * Crea una quest personalizada (ej. desde un plan guardado en Today)
     * @param {Object} q - { titulo, descripcion, icono, puntos, categoria, frecuencia }
     * @returns {Promise<{ok:boolean, id?:string, error?:string}>}
     */
    createCustomQuest: async (q) => {
        const user = window.GoHappyAuth?.checkAuth?.();
        if (!user || user.isGuest) return { ok: false, error: 'guest' };
        const familyId = user.familyId || null;
        try {
            const doc = {
                titulo:      String(q.titulo || '').slice(0, 120),
                descripcion: String(q.descripcion || '').slice(0, 400),
                icono:       q.icono || '✨',
                puntos:      Math.max(0, Math.min(parseInt(q.puntos || 50), 1000)),
                categoria:   q.categoria || 'familiar',
                frecuencia:  q.frecuencia || 'semanal',
                activa:      true,
                familyId,
                origen:      q.origen || 'today_plan',
                creadoEn:    firebase.firestore.FieldValue.serverTimestamp()
            };
            const ref = await window.GoHappyDB.collection('quests').add(doc);
            return { ok: true, id: ref.id };
        } catch (e) {
            console.warn('createCustomQuest error:', e?.message);
            return { ok: false, error: e?.message };
        }
    },

    bootstrapFamilyQuests: async (familyId) => {
        if (!familyId) return;
        try {
            const batch = window.GoHappyDB.batch();
            const col = window.GoHappyDB.collection('quests');

            window.GoHappyQuests.CATALOGO_DEFAULT.forEach(quest => {
                const ref = col.doc(); // ID auto-generado
                batch.set(ref, {
                    ...quest,
                    familyId,
                    creadoEn: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            await batch.commit();
            console.log(`✅ Bootstrap: 10 quests creadas para familia ${familyId}`);
        } catch (e) {
            console.error('bootstrapFamilyQuests error:', e);
        }
    },

    // ─────────────────────────────────────────────────────────
    // LECTURA: Obtener quests disponibles para hoy
    // ─────────────────────────────────────────────────────────

    /**
     * Devuelve las quests disponibles para la familia del usuario hoy.
     * Plan Free: máximo FREE_LIMIT quests.
     * Plan Premium: todas.
     */
    getQuestsDelDia: async () => {
        const user = window.GoHappyAuth.checkAuth();

        // Invitado: devolver quests de demo locales sin Firestore
        if (!user || user.isGuest) {
            return window.GoHappyQuests._getQuestsDemo();
        }

        const familyId = user.familyId;

        // Sin familia: devolver quests personales del catálogo (locales)
        if (!familyId) {
            return window.GoHappyQuests._getQuestsDemo(user.isPremium);
        }

        try {
            // 1. Obtener catálogo de quests de esta familia
            // Nota: filtramos 'activa' en cliente para evitar índice compuesto
            const snap = await window.GoHappyDB.collection('quests')
                .where('familyId', '==', familyId)
                .get();

            // Si la familia no tiene quests en Firestore, hacer bootstrap silencioso
            if (snap.empty) {
                console.log('🎯 Quest bootstrap para familia:', familyId);
                await window.GoHappyQuests.bootstrapFamilyQuests(familyId);
                return window.GoHappyQuests._getQuestsDemo(user.isPremium);
            }

            const hoy = window.GoHappyQuests._fechaHoy();
            const todasLasQuests = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter(q => q.activa !== false);

            // 2. Obtener IDs completadas HOY por la familia
            const completadasHoy = await window.GoHappyQuests._getCompletadasHoy(familyId, hoy);
            const idsCompletadasHoy = new Set(completadasHoy.map(c => c.questId));

            // 3. Marcar cada quest como completada o no
            const questsConEstado = todasLasQuests.map(q => ({
                ...q,
                completadaHoy: idsCompletadasHoy.has(q.id),
                completadaPor: completadasHoy.find(c => c.questId === q.id)?.completadoPor || null
            }));

            // 4. Separar por frecuencia
            const diarias   = questsConEstado.filter(q => q.frecuencia === 'diaria');
            const semanales = questsConEstado.filter(q => q.frecuencia === 'semanal');
            const mensuales = questsConEstado.filter(q => q.frecuencia === 'mensual');

            // Ordenar: primero no completadas, luego completadas
            const ordenar = arr => [
                ...arr.filter(q => !q.completadaHoy),
                ...arr.filter(q => q.completadaHoy)
            ];

            const resultado = [...ordenar(diarias), ...ordenar(semanales), ...ordenar(mensuales)];

            // 5. Aplicar límite Free/Premium
            const esPremium = user.isPremium || false;
            return esPremium ? resultado : resultado.slice(0, window.GoHappyQuests.FREE_LIMIT);

        } catch (e) {
            console.warn('getQuestsDelDia fallback:', e.message);
            return window.GoHappyQuests._getQuestsDemo(user.isPremium);
        }
    },

    // ─────────────────────────────────────────────────────────
    // COMPLETAR: Registrar quest completada + dar puntos
    // ─────────────────────────────────────────────────────────

    /**
     * Completa una quest. Registra en 'completadas/{familyId}/registros/',
     * suma puntos al usuario y a puntosTotales de la familia.
     * Impide doble completación el mismo día.
     */
    completarQuest: async (questId, questData) => {
        const user = window.GoHappyAuth.checkAuth();
        if (!user || user.isGuest) {
            return { ok: false, error: 'Inicia sesión para completar misiones.' };
        }
        if (!user.familyId) {
            return { ok: false, error: 'Necesitas una familia para completar quests.' };
        }

        const familyId = user.familyId;
        const hoy = window.GoHappyQuests._fechaHoy();

        try {
            const realQuestId = questId;
            const puntos = (questData && typeof questData === 'object' ? questData.puntos : null) || 50;

            // Verificar que no esté ya completada hoy
            const yaCompletada = await window.GoHappyQuests._yaCompletadaHoy(familyId, realQuestId, hoy);
            if (yaCompletada) {
                return { ok: false, error: 'Ya completasteis esta misión hoy. ¡Volved mañana!' };
            }

            const titulo = (typeof questData === 'object' ? questData.titulo : null) || 'Misión Completada';

            // Preferir Cloud Function (segura) si está disponible
            if (window.firebase && window.firebase.functions) {
                try {
                    const fn = window.firebase.functions().httpsCallable('completeQuest');
                    const result = await fn({ questId: realQuestId, familyId, puntos, titulo });
                    if (result.data && result.data.ok) {
                        // Actualizar sesión local de puntos
                        if (window.GoHappyAuth._currentUser) {
                            window.GoHappyAuth._currentUser.points = (window.GoHappyAuth._currentUser.points || 0) + puntos;
                            window.GoHappyAuth._currentUser.weeklyPoints = (window.GoHappyAuth._currentUser.weeklyPoints || 0) + puntos;
                            localStorage.setItem('GoHappy_local_user', JSON.stringify(window.GoHappyAuth._currentUser));
                        }
                        return { ok: true, puntos };
                    }
                } catch (fnErr) {
                    // Cloud Function no disponible (plan Spark) — usar flujo cliente
                    console.info('[Quests] Cloud Function no disponible, usando flujo cliente:', fnErr.code);
                }
            }

            // Flujo cliente: Registrar completación + actualizar puntos directamente
            // userId es OBLIGATORIO por las reglas de seguridad
            await window.GoHappyDB
                .collection('completadas').doc(familyId)
                .collection('registros').add({
                    questId:           realQuestId,
                    titulo,
                    userId:            user.uid,
                    completadoPorNick: user.nickname || 'Explorador',
                    fecha:             hoy,
                    timestamp:         firebase.firestore.FieldValue.serverTimestamp(),
                    puntosGanados:     puntos
                });

            // Actualizar puntos del usuario (atomic increment, sin race conditions)
            await window.GoHappyDB.collection('users').doc(user.uid).update({
                points:       firebase.firestore.FieldValue.increment(puntos),
                weeklyPoints: firebase.firestore.FieldValue.increment(puntos)
            });

            // Sumar puntos al total de la familia (atomic increment)
            await window.GoHappyDB.collection('families').doc(familyId).update({
                puntosTotales: firebase.firestore.FieldValue.increment(puntos)
            });

            // Registrar en 'activity' para Memories — incluir title obligatorio
            await window.GoHappyDB.collection('activity').add({
                userId:    user.uid,
                type:      'quest_completed',
                title:     titulo,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                points:    puntos
            });

            // Actualizar sesión local de puntos
            if (window.GoHappyAuth._currentUser) {
                window.GoHappyAuth._currentUser.points = (window.GoHappyAuth._currentUser.points || 0) + puntos;
                window.GoHappyAuth._currentUser.weeklyPoints = (window.GoHappyAuth._currentUser.weeklyPoints || 0) + puntos;
                localStorage.setItem('GoHappy_local_user', JSON.stringify(window.GoHappyAuth._currentUser));
            }

            console.log(`✅ Quest "${titulo}" completada. +${puntos} pts`);

            // --- CAPACITOR HAPTICS (Vibración Nativa) ---
            if (window.Capacitor && window.Capacitor.isNativePlatform()) {
                const { Haptics } = window.Capacitor.Plugins;
                if (Haptics) {
                    Haptics.notification({ type: 'SUCCESS' });
                }
            }

            return { ok: true, puntos };

        } catch (e) {
            console.error('completarQuest error:', e);
            return { ok: false, error: 'Error al guardar la completación. Inténtalo de nuevo.' };
        }
    },

    // ─────────────────────────────────────────────────────────
    // RACHA: Calcular días consecutivos con al menos 1 quest
    // ─────────────────────────────────────────────────────────

    /**
     * Devuelve el número de días consecutivos (racha) en los que
     * la familia completó al menos 1 quest.
     */
    getRacha: async (familyId) => {
        if (!familyId) return 0;
        try {
            // Generar las 30 fechas de los últimos 30 días en string
            const fechasUltimos30 = [];
            for (let i = 0; i < 30; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                fechasUltimos30.push(window.GoHappyQuests._fechaStr(d));
            }

            // Query simple por field 'fecha' (string YYYY-MM-DD), no requiere índice
            // 'in' clause acepta máx 30 valores ✅
            const snap = await window.GoHappyDB
                .collection('completadas').doc(familyId)
                .collection('registros')
                .where('fecha', 'in', fechasUltimos30)
                .get();

            if (snap.empty) return 0;

            const fechasConQuest = new Set(snap.docs.map(d => d.data().fecha));

            // Contar días consecutivos desde hoy hacia atrás
            let racha = 0;
            let fecha = new Date();

            for (let i = 0; i < 30; i++) {
                const clave = window.GoHappyQuests._fechaStr(fecha);
                if (fechasConQuest.has(clave)) {
                    racha++;
                    fecha.setDate(fecha.getDate() - 1);
                } else {
                    break; // Cadena rota
                }
            }

            return racha;
        } catch (e) {
            console.warn('getRacha error:', e);
            return 0;
        }
    },

    // ─────────────────────────────────────────────────────────
    // ESTADÍSTICAS: Puntos de familia y total completadas
    // ─────────────────────────────────────────────────────────

    getEstadisticasFamilia: async (familyId) => {
        if (!familyId) return { puntosTotales: 0, completadasHoy: 0, completadasTotal: 0 };
        try {
            // Puntos totales desde el doc de familia
            const familiaDoc = await window.GoHappyDB.collection('families').doc(familyId).get();
            const puntosTotales = familiaDoc.exists ? (familiaDoc.data().puntosTotales || 0) : 0;

            // Completadas hoy
            const hoy = window.GoHappyQuests._fechaHoy();
            const completadasHoy = await window.GoHappyQuests._getCompletadasHoy(familyId, hoy);

            return {
                puntosTotales,
                completadasHoy: completadasHoy.length,
                completadasTotal: null // Lazy: calculado solo si se necesita
            };
        } catch (e) {
            return { puntosTotales: 0, completadasHoy: 0, completadasTotal: 0 };
        }
    },

    // ─────────────────────────────────────────────────────────
    // HELPERS INTERNOS
    // ─────────────────────────────────────────────────────────

    /** Devuelve fecha de hoy como string 'YYYY-MM-DD' */
    _fechaHoy: () => window.GoHappyQuests._fechaStr(new Date()),

    _fechaStr: (date) => {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    /** Obtiene las completaciones de HOY para una familia */
    _getCompletadasHoy: async (familyId, hoy) => {
        try {
            const snap = await window.GoHappyDB
                .collection('completadas').doc(familyId)
                .collection('registros')
                .where('fecha', '==', hoy)
                .get();
            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            return [];
        }
    },

    /** Comprueba si una quest específica ya fue completada hoy por la familia */
    _yaCompletadaHoy: async (familyId, questId, hoy) => {
        try {
            const snap = await window.GoHappyDB
                .collection('completadas').doc(familyId)
                .collection('registros')
                .where('questId', '==', questId)
                .where('fecha', '==', hoy)
                .get();
            return !snap.empty;
        } catch (e) {
            return false;
        }
    },

    /** Quests de demostración para invitados o sin familia */
    _getQuestsDemo: (isPremium = false) => {
        const todas = [
            { id: 'demo-1', titulo: 'Paseo sin Pantallas', descripcion: 'Salid 30 minutos sin móvil y contad los pájaros.', icono: '🌳', puntos: 50, categoria: 'fisica', frecuencia: 'diaria', activa: true, completadaHoy: false },
            { id: 'demo-2', titulo: 'Desayuno Familiar', descripcion: 'Preparad el desayuno todos juntos sin prisas.', icono: '🥞', puntos: 40, categoria: 'familiar', frecuencia: 'diaria', activa: true, completadaHoy: false },
            { id: 'demo-3', titulo: 'Cuento en Voz Alta', descripcion: 'Leed un capítulo de un libro en familia.', icono: '📖', puntos: 60, categoria: 'educativa', frecuencia: 'diaria', activa: true, completadaHoy: false },
            { id: 'demo-4', titulo: 'Reto Artístico Semanal', descripcion: 'Dibujad juntos el mismo objeto, cada uno a su manera.', icono: '🎨', puntos: 100, categoria: 'creativa', frecuencia: 'semanal', activa: true, completadaHoy: false },
            { id: 'demo-5', titulo: 'Explorador de Barrio', descripcion: 'Encontrad un rincón que no conozcáis y sacad una foto.', icono: '🗺️', puntos: 80, categoria: 'fisica', frecuencia: 'semanal', activa: true, completadaHoy: false },
            { id: 'demo-6', titulo: 'Gran Aventura del Mes', descripcion: 'Planificad una excursión de un día a un lugar especial que nunca hayáis visitado.', icono: '🗺️', puntos: 500, categoria: 'familiar', frecuencia: 'mensual', activa: true, completadaHoy: false }
        ];
        return isPremium ? todas : todas.slice(0, window.GoHappyQuests.FREE_LIMIT);
    },

    // ─────────────────────────────────────────────────────────
    // COMPATIBILIDAD: Mantener API anterior para no romper código existente
    // ─────────────────────────────────────────────────────────

    /** @deprecated Usar getQuestsDelDia() */
    getActiveQuests: async () => window.GoHappyQuests.getQuestsDelDia(),

    /** @deprecated Usar completarQuest() */
    completeQuest: async (questId) => {
        const demos = window.GoHappyQuests._getQuestsDemo();
        const q = demos.find(d => d.id === questId) || { titulo: 'Misión', puntos: 100 };
        return window.GoHappyQuests.completarQuest(questId, q);
    },

    /** @deprecated Mantenido por compatibilidad con quests.js page */
    MISSION_TYPES: {
        EXPLORE:   { icon: '🗺️', label: 'Exploración', color: '#4A90D9' },
        PHOTO:     { icon: '📸', label: 'Fotógrafo',   color: '#E67E22' },
        GASTRO:    { icon: '🍽️', label: 'Gastro',      color: '#27AE60' },
        SOCIAL:    { icon: '🤝', label: 'Social',      color: '#8E44AD' },
        TRIVIA:    { icon: '🧠', label: 'Trivia',      color: '#E74C3C' },
        ADVENTURE: { icon: '🏃', label: 'Aventura',    color: '#16A085' }
    }
};

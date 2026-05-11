// ================================================================
// GoHappy i18n — Auto-detección de idioma por geolocalización
// España (ES) → Español  ·  Reino Unido (GB) → English
// Fallback: navigator.language → en si no es español
// ================================================================
window.GoHappyI18n = {
    lang: 'es',          // 'es' | 'en'
    country: 'ES',       // 'ES' | 'GB' | otros
    _overridden: false,  // si el usuario eligió manualmente

    init: () => {
        // ─── DETECCIÓN SINCRÓNICA (antes de renderizar nada) ───
        // 1. Si el usuario eligió manual, respetar
        const stored = localStorage.getItem('GoHappy_lang');
        if (stored && (stored === 'es' || stored === 'en')) {
            window.GoHappyI18n.lang = stored;
            window.GoHappyI18n._overridden = true;
        } else {
            // 2. Detectar por navigator.language (instantáneo)
            const navLang = (navigator.language || 'es-ES').toLowerCase();
            if (navLang.startsWith('es')) {
                window.GoHappyI18n.lang = 'es';
                window.GoHappyI18n.country = 'ES';
            } else {
                window.GoHappyI18n.lang = 'en';
                window.GoHappyI18n.country = 'GB';
            }
        }

        // 3. País por timezone (rápido y sin permisos)
        try {
            const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
            if (tz.includes('Madrid') || tz.includes('Canary')) {
                window.GoHappyI18n.country = 'ES';
                if (!window.GoHappyI18n._overridden) window.GoHappyI18n.lang = 'es';
            } else if (tz.includes('London') || tz.includes('Dublin') || tz.includes('Belfast')) {
                window.GoHappyI18n.country = 'GB';
                if (!window.GoHappyI18n._overridden) window.GoHappyI18n.lang = 'en';
            }
        } catch (e) {}

        window.GoHappyI18n._applyToDom();

        // 4. GPS en background (refina si difiere) — NO bloquea
        window.GoHappyI18n._refineFromGPS();
    },

    _refineFromGPS: () => {
        if (window.GoHappyI18n._overridden) return;
        if (!navigator.geolocation) return;
        try {
            navigator.geolocation.getCurrentPosition(async (pos) => {
                try {
                    const r = await fetch(`https://photon.komoot.io/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&limit=1`);
                    const data = await r.json();
                    const cc = (data.features?.[0]?.properties?.countrycode || '').toUpperCase();
                    const previousLang = window.GoHappyI18n.lang;

                    if (cc === 'ES') {
                        window.GoHappyI18n.country = 'ES';
                        if (!window.GoHappyI18n._overridden) window.GoHappyI18n.lang = 'es';
                    } else if (cc === 'GB' || cc === 'UK' || cc === 'IE') {
                        window.GoHappyI18n.country = cc;
                        if (!window.GoHappyI18n._overridden) window.GoHappyI18n.lang = 'en';
                    } else if (cc) {
                        window.GoHappyI18n.country = cc;
                    }

                    // Si el GPS cambió el idioma respecto a la detección sincrónica,
                    // disparar evento para recargar la página actual
                    if (previousLang !== window.GoHappyI18n.lang) {
                        window.GoHappyI18n._applyToDom();
                        window.dispatchEvent(new CustomEvent('GoHappy-lang-changed', {
                            detail: { lang: window.GoHappyI18n.lang, country: window.GoHappyI18n.country }
                        }));
                    }
                } catch (e) { /* falla photon, mantenemos detección previa */ }
            }, () => {}, { timeout: 4000, maximumAge: 600000 });
        } catch (e) {}
    },

    setLang: (lang) => {
        if (lang !== 'es' && lang !== 'en') return;
        window.GoHappyI18n.lang = lang;
        window.GoHappyI18n._overridden = true;
        try { localStorage.setItem('GoHappy_lang', lang); } catch (e) {}
        window.GoHappyI18n._applyToDom();
        // Forzar recarga de la página actual para reflejar cambios
        if (window.GoHappyApp && window.GoHappyApp.currentPage) {
            window.GoHappyApp.loadPage(window.GoHappyApp.currentPage);
        }
    },

    // Atajo de traducción
    t: (key, vars = {}) => {
        const dict = window.GoHappyI18n._strings[window.GoHappyI18n.lang] || {};
        let str = dict[key] || window.GoHappyI18n._strings.es[key] || key;
        Object.keys(vars).forEach(k => {
            str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k]);
        });
        return str;
    },

    // Aplicar idioma al DOM (atributo lang, nav labels)
    _applyToDom: () => {
        document.documentElement.setAttribute('lang', window.GoHappyI18n.lang);
        // Actualizar nav labels visibles
        document.querySelectorAll('.nav-item').forEach(item => {
            const page = item.dataset.page;
            const labelEl = item.querySelector('.label');
            if (labelEl && page) {
                const key = `nav.${page}`;
                const t = window.GoHappyI18n.t(key);
                if (t !== key) labelEl.textContent = t;
            }
        });
    },

    // Devuelve "Spanish" o "English" para meter en prompts IA
    aiLanguageName: () => window.GoHappyI18n.lang === 'es' ? 'Español (España)' : 'English (UK)',

    // ─────────────── DICCIONARIO ───────────────
    _strings: {
        es: {
            // NAV
            'nav.quests':       'Quests',
            'nav.care':         'Care',
            'nav.today':        'Today',
            'nav.map':          'Mapa',
            'nav.ranking':      'Top',
            'nav.moments':      'Moments',
            'nav.profile':      'Perfil',

            // TODAY
            'today.title':      '✨ Tu día hoy',
            'today.detecting':  'Detectando tu ciudad...',
            'today.view.events':'🎫 Eventos',
            'today.view.plans': '🪄 Planes IA',
            'today.view.week':  '📅 Semana',
            'today.filter.today':'Hoy',
            'today.filter.tomorrow':'Mañana',
            'today.filter.weekend':'Fin de semana',
            'today.loading.events':'Buscando eventos reales en tu ciudad...',
            'today.loading.plans': 'Diseñando vuestros planes...',
            'today.loading.week':  'Planificando vuestra semana...',
            'today.surprise':   '🪄 Sorpréndeme con 3 planes nuevos',
            'today.no.events':  'Sin eventos esta vez',
            'today.no.events.sub':'Prueba con otro día o vuelve más tarde.',
            'today.disclaimer': 'ⓘ Verifica horarios y entradas en la web oficial antes de ir',
            'today.save.plan':  '✨ Guardar plan',
            'today.plan.saved': '✅ Plan guardado',
            'today.no.plan':    'Sin planificar',
            'today.free.day':   'Día libre — disfrutad juntos',
            'today.change.prefs':'⚙️ Cambiar preferencias de familia',
            'today.questionnaire.title':'¿Cómo es vuestro plan ideal? 👨‍👩‍👧‍👦',
            'today.questionnaire.who':'Quiénes venís',
            'today.questionnaire.ages':'Edades niños',
            'today.questionnaire.pref':'Preferencia',
            'today.questionnaire.budget':'Presupuesto',
            'today.questionnaire.find':'Encontrar planes ✨',

            // QUESTS
            'quests.title':     '⚔️ Quests',
            'quests.subtitle':  'Misiones Familiares',
            'quests.tribu':     'Tribu',
            'quests.stat.free': 'Libres',
            'quests.stat.done': 'Hechas',
            'quests.stat.points':'Puntos',
            'quests.filter.all':'Todas',
            'quests.filter.daily':'☀️ Diarias',
            'quests.filter.weekly':'📅 Semanales',
            'quests.filter.monthly':'📆 Mensuales',
            'quests.filter.active':'🏃 Activas',
            'quests.complete':  '¡Misión cumplida! +{pts} pts 🎉',

            // CARE
            'care.title':       'Care',
            'care.subtitle':    'Tu coach IA en crianza · disponible 24/7',
            'care.welcome.title':'Hola, soy Care',
            'care.welcome.text':'Tu coach personal en crianza consciente.<br>Cuéntame qué te preocupa o elige una categoría arriba.',
            'care.placeholder': 'Pregunta a Care…',
            'care.cat.sleep':   'Sueño',
            'care.cat.food':    'Comida',
            'care.cat.tantrums':'Rabietas',
            'care.cat.homework':'Deberes',
            'care.cat.screens': 'Pantallas',
            'care.cat.siblings':'Hermanos',
            'care.cat.school':  'Cole',
            'care.cat.emotions':'Emociones',
            'care.error':       'Lo siento, no he podido responderte ahora mismo. Inténtalo de nuevo en unos segundos. 💙',

            // MOMENTS
            'moments.title':    '💝 Moments',
            'moments.subtitle': 'Vuestros recuerdos en familia, todo el año',
            'moments.privacy':  'Solo lo verá tu familia (Tribu privada)',
            'moments.capture':  '📷  Capturar momento',
            'moments.empty.title':'Aún no hay momentos',
            'moments.empty.text':'Sé el primero en capturar uno.<br>Toca el botón de arriba 👆',
            'moments.preview.title':'Tu momento ✨',
            'moments.preview.sub':'Solo lo verá tu familia',
            'moments.preview.caption':'Añade una nota (opcional)...',
            'moments.publish':  '📤  Compartir con la familia',
            'moments.published':'¡Momento compartido! +20 pts ✨',
            'moments.cancel':   'Cancelar',

            // RANKING
            'ranking.title':    '🏆 TOP TRIBU',
            'ranking.subtitle': 'Los líderes que mueven la comunidad GoHappy',
            'ranking.sites':    '🌟 Sitios',
            'ranking.members':  '🤝 Miembros',

            // MAPA
            'map.search':       'Pregunta a Gemini o busca un lugar...',
            'map.route':        '🗺️ Cómo llegar',
            'map.review':       '📝 Escribir Reseña',

            // GENÉRICOS
            'common.loading':       'Cargando...',
            'common.error':         'Algo ha ido mal. Inténtalo de nuevo.',
            'common.cancel':        'Cancelar',
            'common.continue':      'Continuar',
            'common.save':          'Guardar',
            'common.share':         'Compartir',
            'common.ok':            'OK',
            'common.retry':         'Reintentar',
            'common.next':          'Siguiente',
            'common.back':          'Volver',
            'common.skip':          'Saltar',
            'common.copy':          'Copiar',
            'common.copied':        '¡Copiado! ✅',
            'common.confirm':       'Confirmar',
            'common.delete':        'Eliminar',
            'common.edit':          'Editar',
            'common.close':         'Cerrar',
            'common.send':          'Enviar',
            'common.search':        'Buscar',

            // AUTH
            'auth.welcome':         'Bienvenido a la Tribu',
            'auth.tagline':         'Crea recuerdos inolvidables en familia',
            'auth.login':           'Entrar',
            'auth.register':        'Crear Cuenta Gratis',
            'auth.email':           'Correo electrónico',
            'auth.password':        'Contraseña',
            'auth.firstname':       'Nombre',
            'auth.lastname':        'Apellidos',
            'auth.nickname':        'Tu Apodo (Nickname)',
            'auth.avatar':          'Elige tu Avatar',
            'auth.referral':        'Código de invitación (opcional)',
            'auth.referral.help':   'Si un amigo te invitó, ¡pega su código y él gana 500 pts! 🎁',
            'auth.terms.accept':    'Acepto los',
            'auth.terms.link':      'Términos',
            'auth.toggle.register': '¿No tienes cuenta? Regístrate gratis',
            'auth.toggle.login':    '¿Ya tienes cuenta? Inicia sesión',
            'auth.connect.with':    'O CONECTA CON',
            'auth.guest':           'Seguir como invitado',
            'auth.creating':        '⌛ Creando tu cuenta...',
            'auth.err.required':    'Email y contraseña requeridos.',
            'auth.err.fields':      'Nombre, Apodo, Email y Contraseña requeridos.',
            'auth.err.terms':       'Debes aceptar los Términos.',
            'auth.err.login':       'Error al iniciar sesión. Revisa tus datos.',
            'auth.err.exists':      'El email ya está registrado.',
            'auth.err.weak':        'La contraseña es muy débil (mín. 6 caracteres).',
            'auth.err.email':       'El formato del email no es válido.',
            'auth.err.google':      'Error al conectar con Google.',
            'auth.err.apple':       'Apple Login no disponible o cancelado.',
            'auth.err.guest':       'No se pudo iniciar modo invitado.',

            // PROFILE
            'profile.loading':      'Sincronizando con la nube...',
            'profile.guest.title':  '¿Quién eres?',
            'profile.guest.sub':    'Identifícate para desbloquear tu nivel, puntos y premios exclusivos.',
            'profile.guest.btn':    'Entrar a GoHappy',
            'profile.guest.foot':   'Únete a miles de familias 🌍',
            'profile.points':       'PUNTOS',
            'profile.next.level':   'Faltan {n} para el siguiente',
            'profile.max.level':    '¡Nivel Máximo!',
            'profile.memories':     'Recuerdos',
            'profile.my.photos':    'Mis fotos',
            'profile.invite':       'Invitar',
            'profile.invite.gain':  '+500 pts',
            'profile.referral.title':'¡Invita y Gana! 🎁',
            'profile.referral.sub': 'Gana 500 puntos por cada amigo que se una.',
            'profile.your.code':    'Tu código personal',
            'profile.copy.link':    'Copiar Enlace',
            'profile.copy.linkfull':'Copiar Enlace de Invitación',
            'profile.copied':       '¡Copiado! ✅',
            'profile.my.family':    '👨‍👩‍👧‍👦 Mi Familia',
            'profile.family.loading':'Cargando...',
            'profile.no.family':    'Aún no perteneces a ninguna familia.',
            'profile.create.family':'¡Crea la tuya o únete con un código!',
            'profile.setup.family': '👨‍👩‍👧‍👦 Crear o Unirme a una Familia',
            'profile.family.label': 'Familia',
            'profile.admin':        '👑 Administrador',
            'profile.member':       '👤 Miembro',
            'profile.invite.code':  'Código de invitación',
            'profile.copy':         '📋 Copiar',
            'profile.members':      'Miembros',
            'profile.invite.slot':  'Invitar',
            'profile.leave.family': '🚪 Salir de la familia',
            'profile.leave.title':  '¿Salir de la familia?',
            'profile.leave.warn':   'Perderás el progreso compartido. Esta acción no se puede deshacer.',
            'profile.leave.btn':    'Salir',
            'profile.terms':        '📜 Términos y Soporte',
            'profile.logout':       '🚪 Cerrar Sesión',
            'profile.change.avatar':'Cambiar Avatar',
            'profile.save.avatar':  'Guardar Cambios',
            'profile.avatar.err':   'Error al guardar el avatar.',

            // FAMILY ONBOARDING
            'fam.welcome':          '¡Bienvenido, {name}!',
            'fam.intro':            'GoHappy es más divertido en familia.',
            'fam.create.join':      'Crea o únete a tu grupo familiar.',
            'fam.create.btn':       'Crear mi familia',
            'fam.create.sub':       'Sé el administrador y comparte el código',
            'fam.join.btn':         'Unirme a una familia',
            'fam.join.sub':         'Tengo un código de invitación de 6 letras',
            'fam.skip':             'Ahora no, continuar solo',
            'fam.name.placeholder': 'Ej: Los García Aventureros',
            'fam.name.help':        'Máximo 40 caracteres. Puedes cambiarlo después.',
            'fam.create.benefits':  '✨ Al crear tu familia:',
            'fam.benefit.code':     'Recibirás un código único de 6 letras',
            'fam.benefit.invite':   'Puedes invitar hasta 5 personas más',
            'fam.benefit.share':    'Compartiréis misiones y ranking',
            'fam.create.confirm':   'Crear familia ✨',
            'fam.code.title':       'Introduce el código de 6 letras que te compartieron',
            'fam.code.help':        '💡 Pídele el código al creador de tu familia.',
            'fam.join.confirm':     'Unirme a la familia 🔗',
            'fam.success.created':  '¡Familia "{name}" creada! 🏠',
            'fam.success.share':    'Comparte el código con tu familia para que se unan.',
            'fam.success.code.label':'🔑 Código de invitación',
            'fam.success.code.help': 'Compártelo con tu familia para que se unan',
            'fam.success.copy':     '📋 Copiar código',
            'fam.success.joined':   '¡Te has unido a "{name}"! 🔗',
            'fam.success.welcome':  '¡Ya eres parte de la familia! Explorad GoHappy juntos.',
            'fam.success.go':       '¡Vamos a explorar! 🚀',
            'fam.welcome.toast':    '¡Bienvenido a la familia! Empecéis a ganar puntos juntos 🚀',
            'fam.err.required':     'Introduce los 6 caracteres del código.',
            'fam.err.short':        'El nombre de la familia debe tener al menos 2 caracteres.',
            'fam.err.long':         'El nombre no puede tener más de 40 caracteres.',
            'fam.err.already':      'Ya perteneces a una familia. Sal de ella primero.',
            'fam.err.code':         'El código debe tener exactamente 6 caracteres.',
            'fam.err.notfound':     'Código incorrecto. Pídele el código al creador de la familia.',
            'fam.err.full':         'Esta familia ya tiene 6 miembros. No puede admitir más.',
            'fam.err.member':       '¡Ya eres miembro de esta familia!',

            // POINTS / TOAST
            'pts.new':              '¡+{n} puntos! ⭐',
            'pts.review':           '¡Reseña publicada! +{n} pts. ¡Gracias!',
            'pts.alert':            '¡Alerta reportada! +{n} pts.',
            'pts.moment':           '¡Momento compartido! +{n} pts ✨',
            'pts.plan':             '¡Plan "{title}" guardado! +{n} pts 🎉',
            'pts.quest':            '¡Misión cumplida! +{n} pts 🎉',

            // QUEST page extra
            'quests.empty':         'No hay misiones disponibles aún.',
            'quests.complete.btn':  'Completar',
            'quests.completing':    '¡Completando misión! 🚀',
            'quests.memory.prompt': '📸 ¿Guardas un recuerdo de este momento?',
            'quests.err':           'No se pudo completar la misión.',
            'quests.guest.err':     'Inicia sesión para completar misiones.',
            'quests.family.err':    'Necesitas una familia para completar quests.',
            'quests.already':       'Ya completasteis esta misión hoy. ¡Volved mañana!',

            // RANKING
            'ranking.loading':      'Calculando los puntos de la semana...',
            'ranking.empty':        '¡Aún no hay sitios en el ranking!',
            'ranking.community':    'COMUNIDAD',
            'ranking.you':          'Tú',
            'ranking.motivation':   '¡Tú puedes ser el próximo! 🚀',
            'ranking.motivation.sub':'Reporta peligros en SAFE, haz reseñas en el MAPA o completa QUESTS para sumar puntos semanales.',
            'ranking.reviews':      'reseñas',
            'ranking.places':       'Lugar',

            // MAP extras
            'map.search.placeholder':'Pregunta a Gemini o busca un lugar...',
            'map.search.thinking':  '✨ IA pensando...',
            'map.filter.all':       'Todos',
            'map.filter.parks':     'Parques 🌳',
            'map.filter.schools':   'Escuelas 🎓',
            'map.filter.theaters':  'Cine/Teatro 🎭',
            'map.filter.kidzones':  'Ludotecas 🏰',
            'map.filter.food':      'Comida 🍏',
            'map.review.modal.title':'Añadir a la Tribu',
            'map.review.review':    'Reseñar {name}',
            'map.review.help':      'Tu experiencia ayuda a cientos de familias.',
            'map.review.name':      'Nombre del lugar',
            'map.review.rating':    '¿Qué nota le das?',
            'map.review.opinion':   'Tu opinión (Breve)',
            'map.review.placeholder':'Limpieza, columpios, zona de sombra...',
            'map.review.publish':   '🚀 Publicar en el Mapa',
            'map.review.skip':      'Ahora no, gracias',
            'map.review.err':       'Completa el nombre y la nota. ⭐',
            'map.review.success':   '¡Reseña publicada! +{n} pts. ¡Gracias por ayudar a la comunidad! ✨',
            'map.review.fail':      'Error al guardar la reseña. Inténtalo de nuevo.',
            'map.hint':             '💡 Toca el "+" o mantén pulsado un sitio para reseñarlo',
            'map.add.review':       'Añadir reseña',
            'map.community.found':  '{n} {label} en tu zona',
            'map.searching':        'Buscando {label}…',
            'map.demo.warn':        'IA en modo demo. Mostrando todos los sitios.',
            'map.loading':          'Invocando mapa 3D...',
            'map.no.results':       'Sin resultados para "{q}"',
            'map.error':            'Error en la búsqueda. Intenta de nuevo.',

            // TODAY extras
            'today.no.plans':       'No hay planes que encajen hoy. Prueba a cambiar tus preferencias.',
            'today.designing':      'GoHappy IA está diseñando planes únicos...',
            'today.real.ia':        '✨ Planes generados por IA real',
            'today.cache':          '⚡ Planes desde caché',
            'today.real.events':    '✨ Eventos generados por IA real',
            'today.questionnaire.adults':'Adultos',
            'today.questionnaire.kids':'Niños',
            'today.questionnaire.ages.placeholder':'Ej: 3, 7',
            'today.questionnaire.any':'Cualquiera',
            'today.questionnaire.outdoor':'Al aire libre 🌳',
            'today.questionnaire.indoor':'A cubierto 🏠',
            'today.questionnaire.free':'Solo gratis 💸',
            'today.event.cta':      'Más info',
            'today.event.tickets':  'Comprar entradas',
            'today.no.plan.text':   'Día libre — disfrutad juntos',

            // ERRORS
            'err.load.page':        'Error al cargar página',
            'err.network':          'Error de conexión',
            'err.try.again':        'Inténtalo de nuevo en unos segundos.',
            'err.session':          'Identifícate para participar.'
        },

        en: {
            // NAV
            'nav.quests':       'Quests',
            'nav.care':         'Care',
            'nav.today':        'Today',
            'nav.map':          'Map',
            'nav.ranking':      'Top',
            'nav.moments':      'Moments',
            'nav.profile':      'Profile',

            // TODAY
            'today.title':      '✨ Your day today',
            'today.detecting':  'Detecting your city...',
            'today.view.events':'🎫 Events',
            'today.view.plans': '🪄 AI Plans',
            'today.view.week':  '📅 Week',
            'today.filter.today':'Today',
            'today.filter.tomorrow':'Tomorrow',
            'today.filter.weekend':'Weekend',
            'today.loading.events':'Finding real events in your city...',
            'today.loading.plans': 'Designing your plans...',
            'today.loading.week':  'Planning your week...',
            'today.surprise':   '🪄 Surprise me with 3 new plans',
            'today.no.events':  'No events this time',
            'today.no.events.sub':'Try another day or come back later.',
            'today.disclaimer': 'ⓘ Check times and tickets on the official website before going',
            'today.save.plan':  '✨ Save plan',
            'today.plan.saved': '✅ Plan saved',
            'today.no.plan':    'Unplanned',
            'today.free.day':   'Free day — enjoy together',
            'today.change.prefs':'⚙️ Change family preferences',
            'today.questionnaire.title':'What\'s your ideal plan? 👨‍👩‍👧‍👦',
            'today.questionnaire.who':'Who\'s coming',
            'today.questionnaire.ages':'Kids ages',
            'today.questionnaire.pref':'Preference',
            'today.questionnaire.budget':'Budget',
            'today.questionnaire.find':'Find plans ✨',

            // QUESTS
            'quests.title':     '⚔️ Quests',
            'quests.subtitle':  'Family Missions',
            'quests.tribu':     'Tribe',
            'quests.stat.free': 'Open',
            'quests.stat.done': 'Done',
            'quests.stat.points':'Points',
            'quests.filter.all':'All',
            'quests.filter.daily':'☀️ Daily',
            'quests.filter.weekly':'📅 Weekly',
            'quests.filter.monthly':'📆 Monthly',
            'quests.filter.active':'🏃 Active',
            'quests.complete':  'Mission complete! +{pts} pts 🎉',

            // CARE
            'care.title':       'Care',
            'care.subtitle':    'Your AI parenting coach · 24/7',
            'care.welcome.title':'Hi, I\'m Care',
            'care.welcome.text':'Your personal coach for conscious parenting.<br>Tell me what worries you or pick a category above.',
            'care.placeholder': 'Ask Care…',
            'care.cat.sleep':   'Sleep',
            'care.cat.food':    'Food',
            'care.cat.tantrums':'Tantrums',
            'care.cat.homework':'Homework',
            'care.cat.screens': 'Screens',
            'care.cat.siblings':'Siblings',
            'care.cat.school':  'School',
            'care.cat.emotions':'Emotions',
            'care.error':       'Sorry, I couldn\'t answer right now. Try again in a few seconds. 💙',

            // MOMENTS
            'moments.title':    '💝 Moments',
            'moments.subtitle': 'Your family memories, all year round',
            'moments.privacy':  'Only your family will see this (private Tribe)',
            'moments.capture':  '📷  Capture moment',
            'moments.empty.title':'No moments yet',
            'moments.empty.text':'Be the first to capture one.<br>Tap the button above 👆',
            'moments.preview.title':'Your moment ✨',
            'moments.preview.sub':'Only your family will see this',
            'moments.preview.caption':'Add a note (optional)...',
            'moments.publish':  '📤  Share with family',
            'moments.published':'Moment shared! +20 pts ✨',
            'moments.cancel':   'Cancel',

            // RANKING
            'ranking.title':    '🏆 TOP TRIBE',
            'ranking.subtitle': 'The leaders moving the GoHappy community',
            'ranking.sites':    '🌟 Places',
            'ranking.members':  '🤝 Members',

            // MAP
            'map.search':       'Ask Gemini or search a place...',
            'map.route':        '🗺️ Get directions',
            'map.review':       '📝 Write a Review',

            // GENERIC
            'common.loading':       'Loading...',
            'common.error':         'Something went wrong. Try again.',
            'common.cancel':        'Cancel',
            'common.continue':      'Continue',
            'common.save':          'Save',
            'common.share':         'Share',
            'common.ok':            'OK',
            'common.retry':         'Retry',
            'common.next':          'Next',
            'common.back':          'Back',
            'common.skip':          'Skip',
            'common.copy':          'Copy',
            'common.copied':        'Copied! ✅',
            'common.confirm':       'Confirm',
            'common.delete':        'Delete',
            'common.edit':          'Edit',
            'common.close':         'Close',
            'common.send':          'Send',
            'common.search':        'Search',

            // AUTH
            'auth.welcome':         'Welcome to the Tribe',
            'auth.tagline':         'Create unforgettable family memories',
            'auth.login':           'Sign in',
            'auth.register':        'Create Free Account',
            'auth.email':           'Email',
            'auth.password':        'Password',
            'auth.firstname':       'First name',
            'auth.lastname':        'Last name',
            'auth.nickname':        'Your nickname',
            'auth.avatar':          'Choose your avatar',
            'auth.referral':        'Invitation code (optional)',
            'auth.referral.help':   'If a friend invited you, paste their code and they win 500 pts! 🎁',
            'auth.terms.accept':    'I accept the',
            'auth.terms.link':      'Terms',
            'auth.toggle.register': 'No account? Sign up free',
            'auth.toggle.login':    'Already have an account? Sign in',
            'auth.connect.with':    'OR CONNECT WITH',
            'auth.guest':           'Continue as guest',
            'auth.creating':        '⌛ Creating your account...',
            'auth.err.required':    'Email and password required.',
            'auth.err.fields':      'Name, Nickname, Email and Password required.',
            'auth.err.terms':       'You must accept the Terms.',
            'auth.err.login':       'Sign-in failed. Check your details.',
            'auth.err.exists':      'Email is already registered.',
            'auth.err.weak':        'Password too weak (min. 6 characters).',
            'auth.err.email':       'Invalid email format.',
            'auth.err.google':      'Could not connect with Google.',
            'auth.err.apple':       'Apple Sign-in not available or cancelled.',
            'auth.err.guest':       'Could not start guest mode.',

            // PROFILE
            'profile.loading':      'Syncing with the cloud...',
            'profile.guest.title':  'Who are you?',
            'profile.guest.sub':    'Sign in to unlock your level, points and exclusive rewards.',
            'profile.guest.btn':    'Sign in to GoHappy',
            'profile.guest.foot':   'Join thousands of families 🌍',
            'profile.points':       'POINTS',
            'profile.next.level':   '{n} more to next level',
            'profile.max.level':    'Max Level!',
            'profile.memories':     'Memories',
            'profile.my.photos':    'My photos',
            'profile.invite':       'Invite',
            'profile.invite.gain':  '+500 pts',
            'profile.referral.title':'Invite & Earn! 🎁',
            'profile.referral.sub': 'Earn 500 points for every friend who joins.',
            'profile.your.code':    'Your personal code',
            'profile.copy.link':    'Copy Link',
            'profile.copy.linkfull':'Copy Invite Link',
            'profile.copied':       'Copied! ✅',
            'profile.my.family':    '👨‍👩‍👧‍👦 My Family',
            'profile.family.loading':'Loading...',
            'profile.no.family':    'You don\'t belong to any family yet.',
            'profile.create.family':'Create yours or join with a code!',
            'profile.setup.family': '👨‍👩‍👧‍👦 Create or Join a Family',
            'profile.family.label': 'Family',
            'profile.admin':        '👑 Admin',
            'profile.member':       '👤 Member',
            'profile.invite.code':  'Invitation code',
            'profile.copy':         '📋 Copy',
            'profile.members':      'Members',
            'profile.invite.slot':  'Invite',
            'profile.leave.family': '🚪 Leave family',
            'profile.leave.title':  'Leave the family?',
            'profile.leave.warn':   'You will lose shared progress. This cannot be undone.',
            'profile.leave.btn':    'Leave',
            'profile.terms':        '📜 Terms & Support',
            'profile.logout':       '🚪 Sign out',
            'profile.change.avatar':'Change Avatar',
            'profile.save.avatar':  'Save Changes',
            'profile.avatar.err':   'Could not save avatar.',

            // FAMILY ONBOARDING
            'fam.welcome':          'Welcome, {name}!',
            'fam.intro':            'GoHappy is more fun together.',
            'fam.create.join':      'Create or join your family group.',
            'fam.create.btn':       'Create my family',
            'fam.create.sub':       'Be the admin and share the code',
            'fam.join.btn':         'Join a family',
            'fam.join.sub':         'I have a 6-letter invitation code',
            'fam.skip':             'Not now, continue solo',
            'fam.name.placeholder': 'E.g.: The Smith Adventurers',
            'fam.name.help':        'Max 40 characters. You can change it later.',
            'fam.create.benefits':  '✨ When you create your family:',
            'fam.benefit.code':     'You\'ll get a unique 6-letter code',
            'fam.benefit.invite':   'You can invite up to 5 more people',
            'fam.benefit.share':    'You\'ll share missions and ranking',
            'fam.create.confirm':   'Create family ✨',
            'fam.code.title':       'Enter the 6-letter code you were given',
            'fam.code.help':        '💡 Ask the family creator for the code.',
            'fam.join.confirm':     'Join the family 🔗',
            'fam.success.created':  'Family "{name}" created! 🏠',
            'fam.success.share':    'Share the code so your family can join.',
            'fam.success.code.label':'🔑 Invitation code',
            'fam.success.code.help': 'Share it with your family to join',
            'fam.success.copy':     '📋 Copy code',
            'fam.success.joined':   'You joined "{name}"! 🔗',
            'fam.success.welcome':  'You\'re now part of the family! Explore GoHappy together.',
            'fam.success.go':       'Let\'s explore! 🚀',
            'fam.welcome.toast':    'Welcome to the family! Start earning points together 🚀',
            'fam.err.required':     'Enter all 6 characters of the code.',
            'fam.err.short':        'Family name must be at least 2 characters.',
            'fam.err.long':         'Name cannot exceed 40 characters.',
            'fam.err.already':      'You\'re already in a family. Leave it first.',
            'fam.err.code':         'Code must be exactly 6 characters.',
            'fam.err.notfound':     'Wrong code. Ask the family creator for the code.',
            'fam.err.full':         'This family already has 6 members. No more allowed.',
            'fam.err.member':       'You\'re already a member of this family!',

            // POINTS / TOAST
            'pts.new':              '+{n} points! ⭐',
            'pts.review':           'Review posted! +{n} pts. Thanks!',
            'pts.alert':            'Alert reported! +{n} pts.',
            'pts.moment':           'Moment shared! +{n} pts ✨',
            'pts.plan':             'Plan "{title}" saved! +{n} pts 🎉',
            'pts.quest':            'Mission complete! +{n} pts 🎉',

            // QUEST page extra
            'quests.empty':         'No missions available yet.',
            'quests.complete.btn':  'Complete',
            'quests.completing':    'Completing mission! 🚀',
            'quests.memory.prompt': '📸 Save a memory of this moment?',
            'quests.err':           'Could not complete the mission.',
            'quests.guest.err':     'Sign in to complete missions.',
            'quests.family.err':    'You need a family to complete quests.',
            'quests.already':       'You already completed this mission today. Come back tomorrow!',

            // RANKING
            'ranking.loading':      'Calculating weekly points...',
            'ranking.empty':        'No places in the ranking yet!',
            'ranking.community':    'COMMUNITY',
            'ranking.you':          'You',
            'ranking.motivation':   'You could be next! 🚀',
            'ranking.motivation.sub':'Report hazards in SAFE, review on the MAP or complete QUESTS to earn weekly points.',
            'ranking.reviews':      'reviews',
            'ranking.places':       'Place',

            // MAP extras
            'map.search.placeholder':'Ask Gemini or search a place...',
            'map.search.thinking':  '✨ AI thinking...',
            'map.filter.all':       'All',
            'map.filter.parks':     'Parks 🌳',
            'map.filter.schools':   'Schools 🎓',
            'map.filter.theaters':  'Cinema/Theatre 🎭',
            'map.filter.kidzones':  'Play centres 🏰',
            'map.filter.food':      'Food 🍏',
            'map.review.modal.title':'Add to the Tribe',
            'map.review.review':    'Review {name}',
            'map.review.help':      'Your experience helps hundreds of families.',
            'map.review.name':      'Place name',
            'map.review.rating':    'What\'s your rating?',
            'map.review.opinion':   'Your opinion (Brief)',
            'map.review.placeholder':'Cleanliness, playground, shaded area...',
            'map.review.publish':   '🚀 Publish on the Map',
            'map.review.skip':      'Not now, thanks',
            'map.review.err':       'Fill in name and rating. ⭐',
            'map.review.success':   'Review posted! +{n} pts. Thanks for helping the community! ✨',
            'map.review.fail':      'Could not save the review. Try again.',
            'map.hint':             '💡 Tap "+" or hold any place to review it',
            'map.add.review':       'Add review',
            'map.community.found':  '{n} {label} in your area',
            'map.searching':        'Searching {label}…',
            'map.demo.warn':        'AI in demo mode. Showing all places.',
            'map.loading':          'Loading 3D map...',
            'map.no.results':       'No results for "{q}"',
            'map.error':            'Search error. Try again.',

            // TODAY extras
            'today.no.plans':       'No plans fit today. Try changing your preferences.',
            'today.designing':      'GoHappy AI is designing unique plans...',
            'today.real.ia':        '✨ Plans generated by real AI',
            'today.cache':          '⚡ Plans from cache',
            'today.real.events':    '✨ Events generated by real AI',
            'today.questionnaire.adults':'Adults',
            'today.questionnaire.kids':'Kids',
            'today.questionnaire.ages.placeholder':'E.g.: 3, 7',
            'today.questionnaire.any':'Any',
            'today.questionnaire.outdoor':'Outdoor 🌳',
            'today.questionnaire.indoor':'Indoor 🏠',
            'today.questionnaire.free':'Free only 💸',
            'today.event.cta':      'More info',
            'today.event.tickets':  'Buy tickets',
            'today.no.plan.text':   'Free day — enjoy together',

            // ERRORS
            'err.load.page':        'Error loading page',
            'err.network':          'Connection error',
            'err.try.again':        'Try again in a few seconds.',
            'err.session':          'Sign in to participate.'
        }
    }
};

// Helper global corto para uso en pages: window.t('key', vars)
window.t = (key, vars) => window.GoHappyI18n ? window.GoHappyI18n.t(key, vars) : key;

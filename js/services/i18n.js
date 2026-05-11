// ================================================================
// GoHappy i18n — Auto-detección de idioma por geolocalización
// España (ES) → Español  ·  Reino Unido (GB) → English
// Fallback: navigator.language → en si no es español
// ================================================================
window.GoHappyI18n = {
    lang: 'es',          // 'es' | 'en'
    country: 'ES',       // 'ES' | 'GB' | otros
    _overridden: false,  // si el usuario eligió manualmente

    init: async () => {
        // 1. Si el usuario eligió manual, respetar
        const stored = localStorage.getItem('GoHappy_lang');
        if (stored && (stored === 'es' || stored === 'en')) {
            window.GoHappyI18n.lang = stored;
            window.GoHappyI18n._overridden = true;
            window.GoHappyI18n._applyToDom();
            return;
        }

        // 2. Detectar por navigator.language (rápido)
        const navLang = (navigator.language || 'es-ES').toLowerCase();
        if (navLang.startsWith('es')) {
            window.GoHappyI18n.lang = 'es';
            window.GoHappyI18n.country = 'ES';
        } else {
            window.GoHappyI18n.lang = 'en';
            window.GoHappyI18n.country = 'GB';
        }

        // 3. Refinar con GPS si está disponible (mejor precisión país)
        try {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(async (pos) => {
                    try {
                        const r = await fetch(`https://photon.komoot.io/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&limit=1`);
                        const data = await r.json();
                        const cc = (data.features?.[0]?.properties?.countrycode || '').toUpperCase();

                        if (cc === 'ES') {
                            window.GoHappyI18n.country = 'ES';
                            if (!window.GoHappyI18n._overridden) window.GoHappyI18n.lang = 'es';
                        } else if (cc === 'GB' || cc === 'UK' || cc === 'IE') {
                            window.GoHappyI18n.country = cc;
                            if (!window.GoHappyI18n._overridden) window.GoHappyI18n.lang = 'en';
                        } else {
                            window.GoHappyI18n.country = cc || window.GoHappyI18n.country;
                        }
                        window.GoHappyI18n._applyToDom();
                    } catch (e) { /* falla photon, mantenemos detección previa */ }
                }, () => {}, { timeout: 4000, maximumAge: 600000 });
            }
        } catch (e) {}

        window.GoHappyI18n._applyToDom();
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
            'common.loading':   'Cargando...',
            'common.error':     'Algo ha ido mal. Inténtalo de nuevo.',
            'common.cancel':    'Cancelar',
            'common.continue':  'Continuar',
            'common.save':      'Guardar',
            'common.share':     'Compartir',
            'common.ok':        'OK'
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
            'common.loading':   'Loading...',
            'common.error':     'Something went wrong. Try again.',
            'common.cancel':    'Cancel',
            'common.continue':  'Continue',
            'common.save':      'Save',
            'common.share':     'Share',
            'common.ok':        'OK'
        }
    }
};

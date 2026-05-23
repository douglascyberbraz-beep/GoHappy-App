window.GoHappyAI = {
    // Especialización en Crianza
    SYSTEM_PROMPT: `Eres GoHappy IA, la asistente oficial de la App GoHappy, experta líder en crianza consciente, salud infantil (0-15 años), psicología positiva y nutrición. 
    Tu misión es ayudar a padres modernos a encontrar planes y soluciones basados ESTRICTAMENTE en su zona geográfica actual.
    - Estilo: Empático, ultra-personalizado, premium.
    - Geografía: Identifica SIEMPRE la ciudad y provincia de las coordenadas proporcionadas y limita la información a esa zona.
    - Seguridad: Si detectas consultas médicas críticas, ofrece consejos de calma pero siempre recomienda visitar al pediatra.`,


    // ---
    // Las funciones getNews, getEvents y getBecas están definidas más abajo
    // con sus versiones PREMIUM (fuentes reales, datos detallados).
    // ---


    getTodayActivities: async (coordinates = "41.6520, -4.7286", preferences = null) => {
        const cityInfo = await window.GoHappyAI.getCityFromCoords(coordinates);
        const today = new Date();
        const dayNames = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
        const dayNamesEN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const lang = window.GoHappyI18n?.lang || 'es';
        const todayName = lang === 'en' ? dayNamesEN[today.getDay()] : dayNames[today.getDay()];
        const hour = today.getHours();
        const timeOfDay = hour < 12 ? (lang === 'en' ? 'morning' : 'mañana')
                        : hour < 18 ? (lang === 'en' ? 'afternoon' : 'tarde')
                                    : (lang === 'en' ? 'evening' : 'noche');

        let prefsContext = "";
        if (preferences) {
            prefsContext = `
PERFIL FAMILIAR ESPECÍFICO (ALTAMENTE PERSONALIZAR):
- Composición: ${preferences.adults} adultos + ${preferences.kids} niños.
- Edades exactas de los niños: ${preferences.ages || 'no especificadas'}.
- Entorno preferido: ${preferences.environment === 'Indoor' ? 'INTERIOR (espacios cerrados, refugios, museos, cines)' : preferences.environment === 'Outdoor' ? 'EXTERIOR (parques, rutas, aire libre)' : 'INDIFERENTE (mixto)'}.
- Presupuesto: ${preferences.budget === 'Free' ? 'SOLO GRATIS — descarta cualquier plan de pago' : 'Sin restricción de presupuesto'}.
- Distancia: ${preferences.distance === 'Walking' ? 'Solo lugares accesibles ANDANDO (< 1.5km)' : preferences.distance === 'ShortDrive' ? 'Cerca, máx 15 min en coche' : 'Cualquier distancia'}.

ADAPTA cada plan a estas edades específicas: si tienen 3-5 años evita museos largos, si tienen 10-14 sugiere retos más estimulantes.`;
        }

        const prompt = `Eres el Concierge Premium de actividades familiares REALES de GoHappy. Usa Google Search para encontrar lugares y horarios verificables.
Ubicación: ${cityInfo.full} (coords ${coordinates}).
Hoy es ${todayName} ${today.getDate()}/${today.getMonth()+1}/${today.getFullYear()}, ${timeOfDay}.
${prefsContext}

TAREA OBLIGATORIA:
1. Busca el CLIMA real previsto hoy en ${cityInfo.city} (no inventes).
2. Diseña EXACTAMENTE 3 planes REALES con sitios EXISTENTES en ${cityInfo.city}:
   - Lugar real verificable (busca en Google Maps, web del ayuntamiento, etc.)
   - Adapta a la HORA del día (mañana = desayuno/talleres, tarde = visitas, noche = espectáculos)
   - Si quieren 'Outdoor' pero llueve, propón refugios creativos similares
   - Diversifica los 3 planes (no 3 parques, mezcla tipos)
   - NO inventes nombres de sitios. Si dudas, usa lugares emblemáticos conocidos.
3. Para cada plan, JSON estricto con:
   - title: nombre creativo magnético (max 50 chars)
   - summary: 1 frase breve sobre por qué encaja con sus edades (max 90 chars)
   - typeLabel: "🌳 Al aire libre" o "🏠 A cubierto" o "⛅ Mixto"
   - location: NOMBRE REAL del lugar (ej "Museo de la Ciencia de Valladolid")
   - lat, lng: coords del lugar real
   - time: horario sugerido (ej "11:00 - 13:00")
   - duration: estimación (ej "2 horas")
   - price: "Gratis" o "5€/adulto" o "Desde 8€" (usa € en España, £ en UK)
   - age: rango de edad apropiado (ej "3-8 años")
   - highlights: array de 2 frases CORTAS (max 40 chars cada una)
   - packingList: array de 2-3 items esenciales
   - tip: 1 consejo práctico breve (max 70 chars)
   - link: URL oficial si la tienes, si no ""

Formato JSON estricto: [ { "title":"", "summary":"", "typeLabel":"", "location":"", "lat":NUM, "lng":NUM, "time":"", "duration":"", "price":"", "age":"", "highlights":["",""], "packingList":["",""], "tip":"", "link":"" } ]`;

        // Planes IA: SIN Search Grounding (Gemini conoce lugares emblemáticos por entrenamiento)
        // Esto ahorra cuota Grounding (limitada) y resuelve el 429
        return await window.GoHappyAI._callGemini(prompt, true, false);
    },

    // BETA TEST MODE: SIN límites — todos los usuarios disfrutan PREMIUM
    checkTodayLimit: () => ({ canRequest: true }),
    incrementTodayUsage: () => {},

    // ───────────────────────────────────────────────────────────
    // REVERSE GEOCODING — ciudad desde coords (Photon, gratuito)
    // ───────────────────────────────────────────────────────────
    getCityFromCoords: async (coords = "41.6520, -4.7286") => {
        // Cache 24h en localStorage
        const cacheKey = 'GoHappy_city_' + coords.replace(/[^0-9.,-]/g, '').slice(0, 14);
        try {
            const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
            if (cached && Date.now() - cached.t < 86400000) return cached.v;
        } catch (e) {}

        try {
            const [lat, lng] = coords.split(',').map(s => parseFloat(s.trim()));
            const r = await fetch(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}&limit=1`);
            const data = await r.json();
            const p = data.features?.[0]?.properties || {};
            const city = p.city || p.town || p.village || p.county || p.state || 'tu zona';
            const country = p.country || '';
            const result = { city, country, full: country ? `${city}, ${country}` : city };
            try { localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), v: result })); } catch (e) {}
            return result;
        } catch (e) {
            console.warn('[GoHappyAI] Reverse geocoding fallback:', e?.message);
            return { city: 'tu zona', country: '', full: 'tu zona' };
        }
    },

    // ───────────────────────────────────────────────────────────
    // EVENTOS REALES — actividades familiares en la ciudad
    // ───────────────────────────────────────────────────────────
    getRealEvents: async (coords = "41.6520, -4.7286", filter = 'hoy') => {
        // Sprint 3+: intentar primero Ticketmaster Discovery (eventos VERIFICADOS)
        try {
            if (window.GoHappyEvents && window.TICKETMASTER_KEY) {
                const [lat, lng] = String(coords).split(',').map(s => parseFloat(s.trim()));
                if (!isNaN(lat) && !isNaN(lng)) {
                    const tmEvents = await window.GoHappyEvents.getEvents(lat, lng, filter);
                    if (tmEvents && tmEvents.length >= 3) {
                        window.GoHappyAI._lastSource = 'ticketmaster';
                        return tmEvents;
                    }
                }
            }
        } catch (e) { console.warn('[Events] TM fallback:', e?.message); }

        // Fallback: Gemini con Search Grounding (configurado en functions/index.js)
        const cityInfo = await window.GoHappyAI.getCityFromCoords(coords);
        const today = new Date();
        const dayNames = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
        const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
        const todayStr = `${dayNames[today.getDay()]} ${today.getDate()} de ${monthNames[today.getMonth()]} de ${today.getFullYear()}`;

        let rango = '';
        if (filter === 'hoy')    rango = `HOY (${todayStr})`;
        if (filter === 'manana') rango = `MAÑANA`;
        if (filter === 'finde')  rango = `ESTE FIN DE SEMANA (sábado y domingo)`;

        const prompt = `Eres la agenda cultural familiar de GoHappy. La familia está en ${cityInfo.full} (coords: ${coords}).

MISIÓN OBLIGATORIA: Usa Google Search para encontrar 6 EVENTOS REALES y VERIFICABLES para familias con niños en ${cityInfo.city} para ${rango}. Busca explícitamente en webs oficiales (ayuntamiento, museos, teatros, ticketmaster, atrapalo, festivales locales).

Incluye una mezcla de:
- Talleres infantiles (museos, bibliotecas, centros culturales)
- Espectáculos (teatros, marionetas, cuentacuentos)
- Actividades al aire libre (rutas, parques temáticos, mercados artesanos)
- Cines (estrenos infantiles del momento)
- Eventos municipales (fiestas, ferias estacionales)
- Visitas guiadas familiares

REGLAS CRÍTICAS:
1. Cada evento DEBE existir realmente (no inventes nombres).
2. Si no encuentras 6 reales, devuelve los que sí encuentres (mínimo 3).
3. La linkUrl DEBE ser una URL real verificable (la fuente de donde sacaste el evento).
4. El nombre del lugar debe ser un sitio reconocible de ${cityInfo.city}.

Campos por evento:
- title: nombre EXACTO del evento
- description: 1-2 frases (qué van a hacer/aprender)
- category: taller | teatro | museo | aire-libre | cine | feria | mercado | ruta
- dayLabel: "HOY" | "MAÑANA" | "SÁBADO" | "DOMINGO"
- time: hora concreta (ej "17:00 - 19:00")
- location: lugar específico de ${cityInfo.city}
- distanceDesc: "A 5 min andando" | "A 10 min en coche"
- price: "Gratis" | "5€" | "Desde 8€"
- ages: ej "3-8 años" | "Todas las edades"
- linkText: "Web oficial" | "Comprar entradas"
- linkUrl: URL REAL de la web donde se compra/consulta el evento
- tip: 1 consejo práctico breve

Formato JSON estricto, sin markdown ni texto extra:
[ { "title":"", "description":"", "category":"", "dayLabel":"", "time":"", "location":"", "distanceDesc":"", "price":"", "ages":"", "linkText":"", "linkUrl":"", "tip":"" } ]`;

        // Eventos REALES: SÍ activamos Search Grounding (necesario para fechas/horas reales)
        return await window.GoHappyAI._callGemini(prompt, true, true);
    },

    // ───────────────────────────────────────────────────────────
    // PLANES SEMANALES — 7 días con 1-2 planes cada uno
    // ───────────────────────────────────────────────────────────
    getWeekPlans: async (coords = "41.6520, -4.7286", preferences = null) => {
        const cityInfo = await window.GoHappyAI.getCityFromCoords(coords);
        const today = new Date();
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            days.push({
                key: `d${i}`,
                date: d,
                dayName: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d.getDay()],
                num: d.getDate()
            });
        }

        let prefsContext = '';
        if (preferences) {
            prefsContext = `\nFamilia: ${preferences.adults} adultos + ${preferences.kids} niños (edades: ${preferences.ages}). Entorno preferido: ${preferences.environment}. Presupuesto: ${preferences.budget}. Distancia: ${preferences.distance}.`;
        }

        const prompt = `Eres el planificador familiar de GoHappy. Diseña planes para los próximos 7 días en ${cityInfo.full}.${prefsContext}

Para CADA día genera 1 plan principal (el mejor) con datos premium.
Días: ${days.map(d => `${d.dayName} ${d.num}`).join(', ')}

Para cada plan:
- title: creativo
- summary: 1-2 frases
- typeLabel: "🌳 Al aire libre" | "🏠 A cubierto" | "⛅ Mixto"
- time: hora sugerida
- duration: ej "2 horas"
- location: lugar real en ${cityInfo.city}
- price: "Gratis" o coste
- ages: rango edad
- icon: 1 emoji representativo

Formato JSON estricto:
{ "d0":{"title":"","summary":"","typeLabel":"","time":"","duration":"","location":"","price":"","ages":"","icon":""}, "d1":{}, "d2":{}, "d3":{}, "d4":{}, "d5":{}, "d6":{} }`;

        return await window.GoHappyAI._callGemini(prompt, true);
    },

    // Generador Dinámico de Mapa (Basado en Coordenadas)
    getDynamicLocations: async (coordinates = "41.6520, -4.7286") => {
        const prompt = `Actúa como guía turístico local familiar. Genera 8 sitios reales increíbles para ir con niños (parques, museos, ludotecas, restaurantes kid-friendly) en un radio cercano de las coordenadas GPS: ${coordinates}.
        Devuélvelos en formato JSON estricto para mapearlos directamente.
        Asegúrate de incluir sus nombres reales locales, no te inventes nombres de comercios si no existen, dales coordenadas muy cercanas al usuario.
        Formato esperado:
        [ { "id": UID_NUMERICO_UNICO, "name": "Nombre Real", "type": "park"|"museum"|"school"|"theater"|"kidzone"|"food", "lat": NUMERO, "lng": NUMERO, "rating": NUMERO_4_A_5, "reviews": NUMERO } ]`;

        return await window.GoHappyAI._callGemini(prompt);
    },

    // Búsqueda Semántica Dinámica
    searchDynamicLocations: async (query, coordinates = "41.6520, -4.7286") => {
        const prompt = `El usuario, ubicado en las coordenadas: ${coordinates}, ha buscado: "${query}".
        Recomienda 4 o 5 lugares locales reales que resuelvan perfectamente esta necesidad.
        Formato esperado JSON:
        [ { "id": UID_NUMERICO_UNICO, "name": "Nombre Real", "type": "park"|"museum"|"school"|"theater"|"kidzone"|"food"|"generic", "lat": NUMERO, "lng": NUMERO, "rating": 4.8, "reviews": 120 } ]`;

        return await window.GoHappyAI._callGemini(prompt);
    },

    // Generar Misiones Contextuales (IA)
    generateLocalQuests: async (coordinates = "41.6520, -4.7286") => {
        const prompt = `Crea 2 'Misiones Familiares' (Quests) divertidas y muy específicas para jugar hoy basadas en lugares REALES cerca de estas coordenadas GPS: ${coordinates}.
        IMPORTANTE: 
        1. Las misiones deben tener niveles de dificultad diferentes. Elige entre: "fácil", "media", "difícil".
        2. Los puntos otorgados DEBEN coincidir exactamente con la dificultad: fácil = 50 pts, media = 100 pts, difícil = 200 pts.
        3. Ten en cuenta el clima actual típico de la zona (si llueve, busca interiores).
        Formato JSON estricto: [ { "id": "q_ai_1", "title": "Nombre divertido", "description": "Breve descripción", "type": "EXPLORE"|"PHOTO"|"GASTRO"|"SOCIAL"|"TRIVIA"|"ADVENTURE", "category": "Misión", "difficulty": "fácil"|"media"|"difícil", "points": 100, "objectives": ["Paso 1", "Paso 2"], "totalSteps": 2, "status": "active" } ]`;

        return await window.GoHappyAI._callGemini(prompt);
    },

    // Generar Alerta/Consejo de Seguridad basado en Comunidad y Clima
    getDailySafeInsight: async (coordinates = "41.6520, -4.7286", activeAlerts = []) => {
        const cityInfo = await window.GoHappyAI.getCityFromCoords(coordinates);
        let alertsContext = "Sin alertas comunitarias reportadas cerca en este momento.";
        if (activeAlerts && activeAlerts.length > 0) {
            const alertsText = activeAlerts.map(a => `- ${a.title || ''} en ${a.location || ''}: ${a.description || ''}`).join('\n');
            alertsContext = `ALERTAS COMUNITARIAS ACTUALES EN LA ZONA:\n${alertsText}`;
        }
        const today = new Date();
        const dayNames = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
        const todayStr = dayNames[today.getDay()];

        const prompt = `Eres asesor de seguridad familiar de GoHappy. Genera un consejo REAL y específico para HOY (${todayStr} ${today.getDate()}/${today.getMonth()+1}/${today.getFullYear()}).

Ubicación: ${cityInfo.full} (coords ${coordinates}).

${alertsContext}

INSTRUCCIONES:
1. Busca el CLIMA REAL previsto hoy en ${cityInfo.city} (Google Search).
2. Busca si hay AVISOS oficiales activos de AEMET, Meteoalarm, o protección civil en esa zona hoy.
3. Combina clima + alertas comunitarias (si las hay) + estación del año.
4. Devuelve 2-3 frases con consejo REAL, ÚTIL y específico para familias con niños.
5. NO uses frases vacías tipo "Analizando..." o "Consulta a un profesional". Da info concreta.

Ejemplo: "Hoy en Valladolid: 18°C nublado, lluvia ligera por la tarde. AEMET sin avisos. Si vais al parque, llevad chubasquero ligero. Riesgo polen gramíneas medio."

Responde solo el consejo, sin introducción ni cierre.`;

        // useSearch:true → activa Search Grounding para clima/avisos reales
        return await window.GoHappyAI._callGemini(prompt, false, true);
    },

    // Generar Topic Diario para la Tribu
    getDailyTribuTopic: async (coordinates = "41.6520, -4.7286") => {
        const prompt = `Genera un post para un foro de padres ('La Tribu') en la ciudad correspondiente a las coordenadas GPS: ${coordinates}.
        Debe ser un debate o consejo interesante sobre crianza y la vida en esa ciudad específica.
        Formato JSON estricto: { "authorKey": "GoHappy_IA", "title": "El Debate del Día 🤖", "content": "Contenido del debate..." }`;
        return await window.GoHappyAI._callGemini(prompt, true);
    },

    // Obtener Noticias Locales (IA)
    getNews: async (coordinates = "41.6520, -4.7286") => {
        const prompt = `Actúa como redactor jefe de un diario local familiar. Ubicación GPS: ${coordinates}.
        Busca y resume 3-4 NOTICIAS REALES Y RECIENTES de esa ciudad o provincia.
        Temas: Educación, parques, sanidad infantil, avisos municipales o cultura para familias.
        Para cada noticia necesito:
        - Título: Conciso y real.
        - Resumen: 2 frases informativas.
        - Fuente: Nombre del medio (ej. El Norte de Castilla, Ayto Madrid).
        - Link: URL real de la noticia si existe.
        Formato JSON estricto: [ { "title": "", "summary": "", "sourceName": "", "link": "", "date": "Hoy" } ]`;
        return await window.GoHappyAI._callGemini(prompt, true);
    },

    // Obtener Eventos Culturales (IA)
    getEvents: async (coordinates = "41.6520, -4.7286") => {
        const prompt = `Actúa como agenda cultural infantil. Ubicación GPS: ${coordinates}.
        Busca 3 eventos reales para familias en esa zona esta semana.
        Formato JSON estricto: [ { "title": "", "date": "", "location": "", "price": "", "lat": NUM, "lng": NUM } ]`;
        return await window.GoHappyAI._callGemini(prompt, true);
    },

    // Obtener Becas y Ayudas (IA)
    getBecas: async (coordinates = "41.6520, -4.7286") => {
        const prompt = `Actúa como asesor administrativo experto en familias. Ubicación GPS: ${coordinates}.
        Identifica 3 AYUDAS O BECAS REALES (estatales de España, autonómicas o locales de esa provincia).
        Necesito detalles específicos:
        - title: Nombre de la ayuda.
        - description: Para qué sirve.
        - deadline: Plazo máximo (ej. 'Hasta el 30 de Mayo').
        - requirements: Requisitos principales.
        - howToApply: Pasos para solicitar (ej. 'Sede electrónica con Clave').
        - status: 'PLAZO ABIERTO' o 'PRÓXIMAMENTE'.
        Formato JSON estricto: [ { "title": "", "description": "", "deadline": "", "requirements": "", "howToApply": "", "status": "", "statusColor": "green"| "orange", "link": "" } ]`;
        return await window.GoHappyAI._callGemini(prompt, true);
    },

    // Chat Especializado
    chat: async (userMessage, history = []) => {
        const prompt = `${window.GoHappyAI.SYSTEM_PROMPT}\n\nHistorial: ${JSON.stringify(history)}\nUsuario: ${userMessage}`;
        const response = await window.GoHappyAI._callGemini(prompt, false); // false = return text, not json
        return response;
    },

    askAI: async (userMessage) => {
        return await window.GoHappyAI.chat(userMessage);
    },

    // Estado del último call: 'real' | 'cache' | 'cache-stale' | 'error' | 'rate-limited' | 'timeout' | 'no-auth'
    _lastSource: 'pending',
    _isReal: () => ['real', 'cache', 'cache-stale'].includes(window.GoHappyAI._lastSource),
    _refreshing: {}, // Tracking de SWR refresh activos

    // Fetch fresco para SWR (sin tocar cache existente hasta confirmar respuesta nueva)
    _fetchFresh: async (prompt, expectJson, cacheKey) => {
        try {
            const currentUser = window.GoHappyAuthReal && window.GoHappyAuthReal.currentUser;
            const idToken = currentUser ? await currentUser.getIdToken(false) : null;
            if (!idToken) return;
            const res = await fetch(window.GEMINI_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({ prompt, expectJson }),
                signal: AbortSignal.timeout(20000)
            });
            if (!res.ok) return;
            const data = await res.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) return;
            let result = text;
            if (expectJson) {
                let clean = text.replace(/```json/gi,'').replace(/```/g,'').replace(/\[\d+(?:,\s*\d+)*\]/g,'').trim();
                const s = Math.min(clean.indexOf('{')!==-1?clean.indexOf('{'):Infinity, clean.indexOf('[')!==-1?clean.indexOf('['):Infinity);
                const e = Math.max(clean.lastIndexOf('}'), clean.lastIndexOf(']'));
                if (s!==Infinity && e!==-1) clean = clean.substring(s, e+1);
                clean = clean.replace(/,(\s*[}\]])/g, '$1');
                try { result = JSON.parse(clean); } catch (e) { return; }
            } else {
                result = text.trim();
            }
            window.GoHappyAI._setCached(cacheKey, result);
            console.log('[GoHappyAI] SWR refresh OK');
        } catch (e) { /* refresh silencioso */ }
    },

    // Cache client-side localStorage — TTL extendido para máxima fluidez
    _CLIENT_CACHE_TTL:       6 * 60 * 60 * 1000,  // fresco: 6h
    _CLIENT_CACHE_STALE_TTL: 24 * 60 * 60 * 1000, // stale aceptable: 24h (sirve viejo + refresh en background)

    _cacheKey: (prompt, expectJson) => {
        // Hash simple sincrono
        const str = (expectJson ? 'J:' : 'T:') + prompt;
        let h = 0;
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) - h) + str.charCodeAt(i);
            h |= 0;
        }
        return 'ai_' + Math.abs(h).toString(36);
    },

    _getCached: (key) => {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const obj = JSON.parse(raw);
            const age = Date.now() - obj.t;
            // Hard expiry: stale TTL
            if (age > window.GoHappyAI._CLIENT_CACHE_STALE_TTL) {
                localStorage.removeItem(key);
                return null;
            }
            // Si está fresco (< TTL fresh) → servir tal cual
            // Si está stale pero válido → servirlo Y marcar para refresh background
            if (age > window.GoHappyAI._CLIENT_CACHE_TTL) {
                obj._stale = true;
            }
            return obj.v;
        } catch (e) { return null; }
    },

    // Para SWR: comprueba si el cache está stale (necesita refresh background)
    _isCacheStale: (key) => {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return false;
            const obj = JSON.parse(raw);
            const age = Date.now() - obj.t;
            return age > window.GoHappyAI._CLIENT_CACHE_TTL && age < window.GoHappyAI._CLIENT_CACHE_STALE_TTL;
        } catch (e) { return false; }
    },

    _setCached: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value }));
        } catch (e) { /* quota exceeded — limpiar entradas antiguas */
            try {
                Object.keys(localStorage)
                    .filter(k => k.startsWith('ai_'))
                    .slice(0, 10)
                    .forEach(k => localStorage.removeItem(k));
                localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: value }));
            } catch (e2) {}
        }
    },

    // Helper para llamadas a Gemini — proxy autenticado + caché client-side
    // useSearch: pasar true SOLO para eventos reales (consume cuota Grounding limitada)
    _callGemini: async (prompt, expectJson = true, useSearch = null) => {
        // Inyectar instrucción de idioma al inicio (auto-detectado por i18n)
        const langName = window.GoHappyI18n ? window.GoHappyI18n.aiLanguageName() : 'Español (España)';
        const country = window.GoHappyI18n ? window.GoHappyI18n.country : 'ES';
        const langPrefix = `IDIOMA OBLIGATORIO: Responde SIEMPRE en ${langName}. País del usuario: ${country}. Usa nombres de lugares, monedas (€/£) y unidades coherentes con ese país.\n\n`;

        // Inyectar contexto familiar (Sprint 1: memoria compartida)
        let ctxPrefix = '';
        try {
            const ctx = window.GoHappyContext && window.GoHappyContext.summary && window.GoHappyContext.summary();
            if (ctx) {
                ctxPrefix = `CONTEXTO FAMILIAR DEL USUARIO (úsalo para personalizar la respuesta, NO lo repitas literalmente):\n${JSON.stringify(ctx)}\n\n`;
            }
        } catch (e) { /* ignore */ }

        prompt = langPrefix + ctxPrefix + prompt;

        // Cache client-side primero (key incluye idioma)
        const cacheKey = window.GoHappyAI._cacheKey(prompt, expectJson);
        const cached = window.GoHappyAI._getCached(cacheKey);
        if (cached !== null) {
            const isStale = window.GoHappyAI._isCacheStale(cacheKey);
            window.GoHappyAI._lastSource = isStale ? 'cache-stale' : 'cache';

            // Stale-while-revalidate: servir cache YA y refrescar en background
            if (isStale && !window.GoHappyAI._refreshing?.[cacheKey]) {
                window.GoHappyAI._refreshing = window.GoHappyAI._refreshing || {};
                window.GoHappyAI._refreshing[cacheKey] = true;
                setTimeout(() => {
                    window.GoHappyAI._fetchFresh(prompt, expectJson, cacheKey).finally(() => {
                        delete window.GoHappyAI._refreshing[cacheKey];
                    });
                }, 100);
            }
            return cached;
        }

        // SIN demos: si no hay proxy, devolver null → UI muestra error apropiado
        if (!window.GEMINI_PROXY_ACTIVE || !window.GEMINI_PROXY_URL) {
            console.warn('[GoHappyAI] Proxy no activo');
            window.GoHappyAI._lastSource = 'error';
            return null;
        }

        try {
            // Token Firebase Auth (esperar hasta que esté disponible)
            let idToken = null;
            const currentUser = window.GoHappyAuthReal && window.GoHappyAuthReal.currentUser;
            if (currentUser) {
                try {
                    idToken = await currentUser.getIdToken(false);
                } catch (e) {
                    console.warn('[GoHappyAI] Token error:', e?.message);
                }
            }

            if (!idToken) {
                console.warn('[GoHappyAI] Sin sesión');
                window.GoHappyAI._lastSource = 'no-auth';
                return null;
            }

            const response = await fetch(window.GEMINI_PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ prompt, expectJson, useSearch }),
                signal: AbortSignal.timeout(20000) // 20s — proxy ya hace fallback interno
            });

            if (response.status === 429) {
                window.GoHappyAI._lastSource = 'rate-limited';
                console.warn('[GoHappyAI] Rate limit');
                return null;
            }

            if (response.status === 401) {
                console.warn('[GoHappyAI] Auth rechazado');
                window.GoHappyAI._lastSource = 'no-auth';
                return null;
            }

            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                console.error('[GoHappyAI] Proxy', response.status, errText.slice(0, 100));
                window.GoHappyAI._lastSource = 'error';
                return null;
            }

            const data = await response.json();
            const fromCache = response.headers.get('X-Cache') === 'HIT';

            if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
                console.warn('[GoHappyAI] Respuesta vacía');
                window.GoHappyAI._lastSource = 'error';
                return null;
            }

            const text = data.candidates[0].content.parts[0].text;

            // Sprint 3: extraer citas de Search Grounding (si las hay)
            try {
                const gm = data.candidates[0].groundingMetadata;
                if (gm && Array.isArray(gm.groundingChunks)) {
                    window.GoHappyAI._lastCitations = gm.groundingChunks
                        .map(c => c.web)
                        .filter(w => w && w.uri)
                        .map(w => ({ title: w.title || w.uri, uri: w.uri }))
                        .slice(0, 8);
                } else {
                    window.GoHappyAI._lastCitations = [];
                }
            } catch (e) { window.GoHappyAI._lastCitations = []; }

            let result;

            if (expectJson) {
                try {
                    // Limpieza robusta: markdown, citas [1], [2,3], y trailing commas
                    let clean = text
                        .replace(/```json/gi, '')
                        .replace(/```/g, '')
                        .replace(/\[\d+(?:,\s*\d+)*\]/g, '') // citas Search Grounding [1] [2,3]
                        .trim();
                    const s = Math.min(
                        clean.indexOf('{') !== -1 ? clean.indexOf('{') : Infinity,
                        clean.indexOf('[') !== -1 ? clean.indexOf('[') : Infinity
                    );
                    const e = Math.max(clean.lastIndexOf('}'), clean.lastIndexOf(']'));
                    if (s !== Infinity && e !== -1) clean = clean.substring(s, e + 1);
                    // Eliminar trailing commas comunes en JSON LLM
                    clean = clean.replace(/,(\s*[}\]])/g, '$1');
                    result = JSON.parse(clean);
                } catch (parseErr) {
                    console.error('[GoHappyAI] JSON parse error:', parseErr?.message);
                    window.GoHappyAI._lastSource = 'error';
                    return null;
                }
            } else {
                result = text.trim();
            }

            // Cache client-side la respuesta exitosa
            window.GoHappyAI._setCached(cacheKey, result);
            window.GoHappyAI._lastSource = fromCache ? 'cache' : 'real';

            return result;

        } catch (e) {
            if (e.name === 'TimeoutError' || e.name === 'AbortError') {
                console.warn('[GoHappyAI] Timeout');
                window.GoHappyAI._lastSource = 'timeout';
            } else {
                console.error('[GoHappyAI] Error de red:', e?.message || e);
                window.GoHappyAI._lastSource = 'error';
            }
            return null;
        }
    },

    // _getMockData ELIMINADO — la app solo usa IA real.
    // Si la IA falla, _callGemini retorna null y la UI muestra estado de error.
    _getMockData: () => null
};


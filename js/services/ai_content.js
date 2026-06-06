window.GoHappyAI = {

    // ─────────────────────────────────────────────────────────────
    // GEO-FENCING HELPERS — garantiza que TODO contenido respeta
    // el país del usuario (ES vs UK) en idioma + fuentes + currency.
    // ─────────────────────────────────────────────────────────────
    _geoContext: (cityInfo) => {
        const lang = window.GoHappyI18n?.lang || 'es';
        const country = (cityInfo?.country || '').toUpperCase();
        const isUK = lang === 'en' || ['UNITED KINGDOM', 'UK', 'GREAT BRITAIN', 'ENGLAND', 'SCOTLAND', 'WALES', 'NORTHERN IRELAND', 'IRELAND'].includes(country);
        return {
            lang,
            isUK,
            countryName:    isUK ? 'United Kingdom'        : 'España',
            countryCode:    isUK ? 'GB'                    : 'ES',
            currency:       isUK ? '£ (GBP)'               : '€ (EUR)',
            weatherAuth:    isUK ? 'Met Office'            : 'AEMET',
            councilWord:    isUK ? 'council'               : 'ayuntamiento',
            govSite:        isUK ? 'gov.uk'                : 'boe.es / sede electrónica',
            newspapers:     isUK ? 'BBC, The Guardian, local councils' : 'El País, El Mundo, El Norte de Castilla, prensa local',
            ticketsSites:   isUK ? 'Eventbrite UK, Ticketmaster.co.uk, See Tickets' : 'Ticketmaster, Atrapalo, Entradas.com, festivales locales'
        };
    },

    // Header obligatorio que se prepended a CADA prompt geo-sensible
    _geoGuard: (cityInfo) => {
        const g = window.GoHappyAI._geoContext(cityInfo);
        const langInstr = g.lang === 'en'
            ? `RESPOND IN BRITISH ENGLISH (behaviour, colour, mum, neighbourhood). Use £ for prices.`
            : `RESPONDE EN ESPAÑOL DE ESPAÑA (vosotros/vuestro, no ustedes). Usa € para precios.`;
        const countryRule = g.lang === 'en'
            ? `STRICT GEO RULE: ONLY include real places, events, news, advice from ${g.countryName} (${g.countryCode}). NEVER mention places, events, currencies or institutions from other countries. If you cannot find content in ${g.countryName}, return fewer items rather than mixing countries.`
            : `REGLA GEO ESTRICTA: SOLO incluye lugares, eventos, noticias o consejos reales de ${g.countryName} (${g.countryCode}). NUNCA menciones lugares, eventos, divisas o instituciones de otros países. Si no encuentras contenido en ${g.countryName}, devuelve menos elementos en lugar de mezclar países.`;
        const sources = g.lang === 'en'
            ? `Trusted sources: ${g.newspapers}. Weather: ${g.weatherAuth}. Tickets: ${g.ticketsSites}. Council/municipal: ${g.councilWord}, ${g.govSite}.`
            : `Fuentes fiables: ${g.newspapers}. Clima: ${g.weatherAuth}. Entradas: ${g.ticketsSites}. Municipal: ${g.councilWord}, ${g.govSite}.`;
        return `${langInstr}\n${countryRule}\n${sources}\n\n`;
    },

    // SYSTEM_PROMPT bilingüe según idioma del usuario
    get SYSTEM_PROMPT() {
        const lang = window.GoHappyI18n?.lang || 'es';
        if (lang === 'en') {
            return `You are GoHappy AI, the official assistant of the GoHappy App, leading expert in conscious parenting, child health (0-15 years), positive psychology and nutrition.
Your mission is to help modern parents find plans and solutions based STRICTLY on their current geographic area.
- Style: Empathetic, hyper-personalised, premium.
- Geography: ALWAYS identify the city and county from the provided coordinates and restrict information to that area within the UNITED KINGDOM.
- Safety: If you detect critical medical questions, offer calming advice but always recommend visiting their GP/paediatrician.
- Language: British English (behaviour, colour, mum, neighbourhood). Use £ for prices.`;
        }
        return `Eres GoHappy IA, la asistente oficial de la App GoHappy, experta líder en crianza consciente, salud infantil (0-15 años), psicología positiva y nutrición.
Tu misión es ayudar a padres modernos a encontrar planes y soluciones basados ESTRICTAMENTE en su zona geográfica actual.
- Estilo: Empático, ultra-personalizado, premium.
- Geografía: Identifica SIEMPRE la ciudad y provincia de las coordenadas proporcionadas y limita la información a esa zona DENTRO DE ESPAÑA.
- Seguridad: Si detectas consultas médicas críticas, ofrece consejos de calma pero siempre recomienda visitar al pediatra.
- Idioma: Español de España (vosotros/vuestro). Usa € para precios.`;
    },


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

        // ⭐ SÚPER PLAN: instrucción para blindar el plan nº1 con TODO lo que sabemos
        // del usuario (el contexto familiar completo ya se inyecta vía _callGemini).
        const superPlanRule = lang === 'en'
            ? `\nCRITICAL — PLAN #1 IS THE "SUPER PLAN OF THE DAY": it must be the SINGLE best possible plan for THIS exact family, maximally personalised. Cross every signal you have: children's exact ages, their interests, places they already loved (favouritePlaces), recent concerns from Care, their environment/budget/distance preferences, today's REAL weather and the time of day. It must feel hand-picked for them. Plans #2 and #3 are good diverse alternatives.`
            : `\nCRÍTICO — EL PLAN Nº1 ES EL "SÚPER PLAN DEL DÍA": debe ser EL mejor plan posible para ESTA familia concreta, lo más personalizado posible. Cruza TODAS las señales que tienes: edades exactas de los niños, sus intereses, lugares que ya les encantaron (favoritePlaces), preocupaciones recientes de Care, sus preferencias de entorno/presupuesto/distancia, el CLIMA real de hoy y la hora del día. Debe sentirse elegido a mano para ellos. Los planes nº2 y nº3 son buenas alternativas variadas.`;
        prefsContext += superPlanRule;

        const g = window.GoHappyAI._geoContext(cityInfo);
        const prompt = `${window.GoHappyAI._geoGuard(cityInfo)}${g.lang === 'en' ? 'You are the Premium Concierge for REAL family activities of GoHappy.' : 'Eres el Concierge Premium de actividades familiares REALES de GoHappy.'} Use Google Search to find verifiable places and times.
${g.lang === 'en' ? 'Location' : 'Ubicación'}: ${cityInfo.full} (coords ${coordinates}). Country: ${g.countryName}.
${g.lang === 'en' ? 'Today is' : 'Hoy es'} ${todayName} ${today.getDate()}/${today.getMonth()+1}/${today.getFullYear()}, ${timeOfDay}.
${prefsContext}

${g.lang === 'en'
? `MANDATORY TASK:
1. Look up today's REAL weather forecast in ${cityInfo.city} (do not invent it).
2. Design EXACTLY 3 REAL plans using EXISTING places in ${cityInfo.city}:
   - Real verifiable venue (check Google Maps, the council website, etc.)
   - Adapt to the TIME of day (morning = breakfast/workshops, afternoon = visits, evening = shows)
   - If they want 'Outdoor' but it rains, suggest similar creative indoor shelters
   - Diversify the 3 plans (not 3 parks — mix types)
   - Do NOT invent venue names. If unsure, use well-known landmark places.
3. For each plan, strict JSON with:
   - title: catchy creative name (max 50 chars)
   - summary: 1 short sentence on why it fits their ages (max 90 chars)
   - typeLabel: "🌳 Outdoor" | "🏠 Indoor" | "⛅ Mixed"
   - location: REAL name of the place (e.g. "Natural History Museum, London")
   - lat, lng: coords of the real place
   - time: suggested time (e.g. "11:00 - 13:00")
   - duration: estimate (e.g. "2 hours")
   - price: "Free" | "${(g.currency || '£').charAt(0)}5/adult" | "From ${(g.currency || '£').charAt(0)}8"
   - age: appropriate age range (e.g. "3-8 years")
   - highlights: array of 2 SHORT phrases (max 40 chars each)
   - packingList: array of 2-3 essential items
   - tip: 1 short practical tip (max 70 chars)
   - whyPerfect: ONLY for plan #1 — 1 short sentence (max 70 chars) explaining why it's PERFECT for this exact family (mention a real age/interest/preference). Leave "" for plans 2 and 3.
   - link: official URL if you have it, otherwise ""

Strict JSON: [ { "title":"", "summary":"", "typeLabel":"", "location":"", "lat":NUM, "lng":NUM, "time":"", "duration":"", "price":"", "age":"", "highlights":["",""], "packingList":["",""], "tip":"", "whyPerfect":"", "link":"" } ]`
: `TAREA OBLIGATORIA:
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
   - price: "Gratis" o "${(g.currency || '€').charAt(0)}5/adulto" o "Desde ${(g.currency || '€').charAt(0)}8"
   - age: rango de edad apropiado (ej "3-8 años")
   - highlights: array de 2 frases CORTAS (max 40 chars cada una)
   - packingList: array de 2-3 items esenciales
   - tip: 1 consejo práctico breve (max 70 chars)
   - whyPerfect: SOLO para el plan nº1 — 1 frase corta (max 70 chars) explicando por qué es PERFECTO para esta familia concreta (menciona edad/interés/preferencia real). En los planes 2 y 3 deja "".
   - link: URL oficial si la tienes, si no ""

Formato JSON estricto: [ { "title":"", "summary":"", "typeLabel":"", "location":"", "lat":NUM, "lng":NUM, "time":"", "duration":"", "price":"", "age":"", "highlights":["",""], "packingList":["",""], "tip":"", "whyPerfect":"", "link":"" } ]`}`;

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
        const g2 = window.GoHappyAI._geoContext(cityInfo);
        const EN = g2.lang === 'en';
        const cur = (g2.currency || '').charAt(0) || (EN ? '£' : '€');
        const today = new Date();
        const daysES = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
        const daysEN = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
        const monthsES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
        const monthsEN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const todayStr = EN
            ? `${daysEN[today.getDay()]} ${today.getDate()} ${monthsEN[today.getMonth()]} ${today.getFullYear()}`
            : `${daysES[today.getDay()]} ${today.getDate()} de ${monthsES[today.getMonth()]} de ${today.getFullYear()}`;

        let rango = '';
        if (filter === 'hoy')    rango = EN ? `TODAY (${todayStr})` : `HOY (${todayStr})`;
        if (filter === 'manana') rango = EN ? `TOMORROW` : `MAÑANA`;
        if (filter === 'finde')  rango = EN ? `THIS WEEKEND (Saturday & Sunday)` : `ESTE FIN DE SEMANA (sábado y domingo)`;

        const prompt = EN
            ? `${window.GoHappyAI._geoGuard(cityInfo)}You are GoHappy's family cultural agenda. The family is in ${cityInfo.full} (coords: ${coords}). Country: ${g2.countryName}.

MANDATORY MISSION: Use Google Search to find 6 REAL and VERIFIABLE events for families with children in ${cityInfo.city} for ${rango}. Search explicitly on official UK sites (${g2.councilWord}, museums, theatres, Eventbrite UK, Ticketmaster.co.uk, local festivals).

Include a mix of:
- Kids' workshops (museums, libraries, cultural centres)
- Shows (theatres, puppet shows, storytelling)
- Outdoor activities (trails, theme parks, craft markets)
- Cinema (current kids' releases)
- Council/town events (fairs, seasonal festivals)
- Family guided tours

CRITICAL RULES:
1. Every event MUST really exist (do not invent names).
2. If you can't find 6 real ones, return the ones you do find (minimum 3).
3. linkUrl MUST be a real verifiable URL (the source where you found the event).
4. The venue must be a recognisable place in ${cityInfo.city}.

Fields per event:
- title: EXACT name of the event
- description: 1-2 sentences (what they'll do/learn)
- category: workshop | theatre | museum | outdoor | cinema | fair | market | trail
- date: EXACT date in ISO format YYYY-MM-DD (e.g. "2026-05-24"). REQUIRED.
- time: specific time (e.g. "17:00 - 19:00")
- location: specific place in ${cityInfo.city}
- distanceDesc: "5 min walk" | "10 min drive"
- price: "Free" | "${cur}5" | "From ${cur}8"
- ages: e.g. "3-8 years" | "All ages"
- linkText: "Official site" | "Buy tickets"
- linkUrl: REAL URL of the page to buy/check the event
- tip: 1 short practical tip

Strict JSON, no markdown or extra text:
[ { "title":"", "description":"", "category":"", "date":"YYYY-MM-DD", "time":"", "location":"", "distanceDesc":"", "price":"", "ages":"", "linkText":"", "linkUrl":"", "tip":"" } ]`
            : `${window.GoHappyAI._geoGuard(cityInfo)}Eres la agenda cultural familiar de GoHappy. La familia está en ${cityInfo.full} (coords: ${coords}). País: ${g2.countryName}.

MISIÓN OBLIGATORIA: Usa Google Search para encontrar 6 EVENTOS REALES y VERIFICABLES para familias con niños en ${cityInfo.city} para ${rango}. Busca explícitamente en webs oficiales (${g2.councilWord}, museos, teatros, ticketmaster, atrapalo, festivales locales).

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
- date: FECHA EXACTA del evento en formato ISO YYYY-MM-DD (ej "2026-05-24"). OBLIGATORIO.
- time: hora concreta (ej "17:00 - 19:00")
- location: lugar específico de ${cityInfo.city}
- distanceDesc: "A 5 min andando" | "A 10 min en coche"
- price: "Gratis" | "${cur}5" | "Desde ${cur}8"
- ages: ej "3-8 años" | "Todas las edades"
- linkText: "Web oficial" | "Comprar entradas"
- linkUrl: URL REAL de la web donde se compra/consulta el evento
- tip: 1 consejo práctico breve

Formato JSON estricto, sin markdown ni texto extra:
[ { "title":"", "description":"", "category":"", "date":"YYYY-MM-DD", "time":"", "location":"", "distanceDesc":"", "price":"", "ages":"", "linkText":"", "linkUrl":"", "tip":"" } ]`;

        // Eventos REALES: SÍ activamos Search Grounding (necesario para fechas/horas reales)
        let eventos = await window.GoHappyAI._callGemini(prompt, true, true);

        // FALLBACK ANTI-PANTALLA-VACÍA: si el grounding está saturado o no devolvió
        // nada, pedimos actividades familiares REALES y habituales de la ciudad
        // (museos, teatros, bibliotecas, mercados reconocibles) que el modelo conoce
        // por entrenamiento — SIN depender de Google Search. Marcamos que la
        // programación concreta se consulta en la web oficial (no inventamos fechas).
        if (!Array.isArray(eventos) || eventos.length === 0) {
            const fbPrompt = `${window.GoHappyAI._geoGuard(cityInfo)}${g2.lang === 'en'
                ? `List 5 REAL, well-known family activities/venues in ${cityInfo.city} (${g2.countryName}) that regularly host children's programmes (museums, theatres, libraries, parks, cultural centres). Use ONLY real recognisable places. Do NOT invent exact dates — set date to "" and tell the family to check the official site for the current schedule.`
                : `Lista 5 actividades/lugares familiares REALES y reconocibles de ${cityInfo.city} (${g2.countryName}) que suelen tener programación infantil (museos, teatros, bibliotecas, parques, centros culturales). Usa SOLO sitios reales reconocibles. NO inventes fechas exactas — pon date en "" y di que se consulte la web oficial para la programación actual.`}

Campos por item: title, description, category (taller|teatro|museo|aire-libre|cine|feria|mercado|ruta), date (""), time ("Consulta web" / "Check site"), location (sitio real de ${cityInfo.city}), distanceDesc, price, ages, linkText ("Web oficial"/"Official site"), linkUrl (web oficial real del lugar), tip.
Formato JSON estricto, sin markdown:
[ { "title":"", "description":"", "category":"", "date":"", "time":"", "location":"", "distanceDesc":"", "price":"", "ages":"", "linkText":"", "linkUrl":"", "tip":"" } ]`;
            const fb = await window.GoHappyAI._callGemini(fbPrompt, true, false);
            if (Array.isArray(fb) && fb.length > 0) {
                window.GoHappyAI._lastSource = 'ai-knowledge';
                eventos = fb;
            }
        }
        return eventos;
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

        const gw = window.GoHappyAI._geoContext(cityInfo);
        const prompt = `${window.GoHappyAI._geoGuard(cityInfo)}${gw.lang === 'en'
            ? `You are GoHappy's family planner. Design plans for the next 7 days in ${cityInfo.full} (${gw.countryName}).${prefsContext}

For EACH day generate 1 main plan (the best) with premium data.
Days: ${days.map(d => `${d.dayName} ${d.num}`).join(', ')}

Per plan:
- title, summary (1-2 sentences)
- typeLabel: "🌳 Outdoor" | "🏠 Indoor" | "⛅ Mixed"
- time, duration
- location: REAL place in ${cityInfo.city} (${gw.countryName})
- price: "Free" or cost in ${gw.currency}
- ages, icon`
            : `Eres el planificador familiar de GoHappy. Diseña planes para los próximos 7 días en ${cityInfo.full} (${gw.countryName}).${prefsContext}

Para CADA día genera 1 plan principal (el mejor) con datos premium.
Días: ${days.map(d => `${d.dayName} ${d.num}`).join(', ')}

Por plan:
- title, summary (1-2 frases)
- typeLabel: "🌳 Al aire libre" | "🏠 A cubierto" | "⛅ Mixto"
- time, duration
- location: lugar REAL en ${cityInfo.city} (${gw.countryName})
- price: "Gratis" o coste en ${gw.currency}
- ages, icon`}
JSON: { "d0":{"title":"","summary":"","typeLabel":"","time":"","duration":"","location":"","price":"","ages":"","icon":""}, "d1":{}, "d2":{}, "d3":{}, "d4":{}, "d5":{}, "d6":{} }`;

        return await window.GoHappyAI._callGemini(prompt, true);
    },

    // Generador Dinámico de Mapa (Basado en Coordenadas)
    getDynamicLocations: async (coordinates = "41.6520, -4.7286") => {
        const cityInfo = await window.GoHappyAI.getCityFromCoords(coordinates);
        const g = window.GoHappyAI._geoContext(cityInfo);
        const prompt = `${window.GoHappyAI._geoGuard(cityInfo)}${g.lang === 'en'
            ? `Act as a local family tour guide for ${cityInfo.full} (${g.countryName}). Generate 8 REAL amazing places for families with children (parks, museums, soft-play, kid-friendly restaurants) within a short radius of GPS: ${coordinates}.
ALL places MUST be in ${g.countryName}. Use real local UK names. Do not invent businesses. Coordinates very close to the user.`
            : `Actúa como guía turístico local familiar para ${cityInfo.full} (${g.countryName}). Genera 8 sitios reales increíbles para ir con niños (parques, museos, ludotecas, restaurantes kid-friendly) en un radio cercano de las coordenadas GPS: ${coordinates}.
TODOS los sitios DEBEN estar en ${g.countryName}. Usa nombres locales reales. No inventes comercios. Coordenadas muy cercanas al usuario.`}
JSON estricto:
[ { "id": UID, "name": "Real Name", "type": "park"|"museum"|"school"|"theater"|"kidzone"|"food", "lat": NUM, "lng": NUM, "rating": 4-5, "reviews": NUM } ]`;
        return await window.GoHappyAI._callGemini(prompt);
    },

    // Búsqueda Semántica Dinámica
    // IMPORTANTE: Gemini ALUCINA coordenadas. Por eso re-geocodificamos
    // cada resultado con Photon (real coords reales del Open Street Map).
    // Búsqueda HÍBRIDA y robusta:
    //  • Photon directo (OpenStreetMap) → siempre responde, coords EXACTAS
    //  • Gemini en paralelo → recomendaciones inteligentes + re-geocoding
    // Si Gemini falla, Photon solo ya da resultados precisos.
    searchDynamicLocations: async (query, coordinates = "41.6520, -4.7286") => {
        const [userLat, userLng] = coordinates.split(',').map(s => parseFloat(s.trim()));
        const distKm = (lat, lng) => Math.sqrt(
            Math.pow((lat - userLat) * 111, 2) +
            Math.pow((lng - userLng) * 111 * Math.cos(userLat * Math.PI / 180), 2)
        );

        // Mapeo OSM key/value → type interno GoHappy
        const osmToType = (k, v) => {
            if (k === 'leisure' && (v === 'park' || v === 'garden')) return 'park';
            if (k === 'leisure' && v === 'playground') return 'kidzone';
            if (k === 'tourism' && v === 'museum') return 'museum';
            if (k === 'tourism' && (v === 'zoo' || v === 'theme_park' || v === 'aquarium')) return 'kidzone';
            if (k === 'amenity' && (v === 'theatre' || v === 'cinema')) return 'theater';
            if (k === 'amenity' && ['cafe','restaurant','fast_food','ice_cream'].includes(v)) return 'food';
            if (k === 'amenity' && (v === 'library' || v === 'school' || v === 'kindergarten')) return 'school';
            if (k === 'shop' && v === 'toys') return 'kidzone';
            return 'generic';
        };

        // ── 1) PHOTON DIRECTO (preciso, siempre disponible) ──
        const photonSearch = (async () => {
            try {
                const u = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=8&lat=${userLat}&lon=${userLng}&lang=${(window.GoHappyI18n?.lang === 'en' ? 'en' : 'es')}`;
                const r = await fetch(u, { signal: AbortSignal.timeout(6000) });
                const data = await r.json();
                return (data?.features || []).map(f => {
                    const [lng, lat] = f.geometry?.coordinates || [];
                    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
                    if (distKm(lat, lng) > 60) return null;  // solo cercanos
                    const p = f.properties || {};
                    return {
                        id: 'ph-' + (p.osm_id || Math.random().toString(36).slice(2, 8)),
                        name: p.name || query,
                        type: osmToType(p.osm_key, p.osm_value),
                        lat, lng,
                        rating: 4.5,
                        _verified: true
                    };
                }).filter(Boolean);
            } catch (e) { return []; }
        })();

        // ── 2) GEMINI (recomendaciones) + re-geocoding Photon ──
        const geminiSearch = (async () => {
            try {
                const cityInfo = await window.GoHappyAI.getCityFromCoords(coordinates);
                const g = window.GoHappyAI._geoContext(cityInfo);
                const prompt = `${window.GoHappyAI._geoGuard(cityInfo)}${g.lang === 'en'
                    ? `User in ${cityInfo.full} (${g.countryName}) searched: "${query}". Recommend 4 REAL well-known places verifiable on Google Maps. Include FULL ADDRESS in the name.`
                    : `Usuario en ${cityInfo.full} (${g.countryName}) buscó: "${query}". Recomienda 4 lugares REALES verificables en Google Maps. Incluye DIRECCIÓN COMPLETA en el nombre.`}
JSON: [ { "name": "Real Name with Address", "type": "park"|"museum"|"theater"|"kidzone"|"food"|"generic" } ]`;
                const aiResults = await window.GoHappyAI._callGemini(prompt);
                if (!Array.isArray(aiResults)) return [];
                // Geocodificar cada nombre con Photon → coords reales
                return (await Promise.all(aiResults.slice(0, 4).map(async (loc) => {
                    try {
                        const u = `https://photon.komoot.io/api/?q=${encodeURIComponent(loc.name)}&limit=1&lat=${userLat}&lon=${userLng}`;
                        const r = await fetch(u, { signal: AbortSignal.timeout(5000) });
                        const data = await r.json();
                        const feat = data?.features?.[0];
                        if (feat?.geometry?.coordinates) {
                            const [lng, lat] = feat.geometry.coordinates;
                            if (distKm(lat, lng) < 60) {
                                return {
                                    id: 'ai-' + Math.random().toString(36).slice(2, 8),
                                    name: feat.properties?.name || loc.name.split(',')[0].trim(),
                                    type: loc.type || 'generic',
                                    lat, lng, rating: 4.7, _verified: true
                                };
                            }
                        }
                    } catch (e) {}
                    return null;
                }))).filter(Boolean);
            } catch (e) { return []; }
        })();

        // Combinar ambas fuentes (Photon directo tiene prioridad por precisión)
        const [photonRes, geminiRes] = await Promise.all([photonSearch, geminiSearch]);
        const combined = [...photonRes, ...geminiRes];

        // Dedupe por coords (~50m)
        const seen = new Set();
        return combined.filter(loc => {
            if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return false;
            const key = `${loc.lat.toFixed(4)},${loc.lng.toFixed(4)}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, 12);
    },

    // Generar Misiones Contextuales (IA)
    generateLocalQuests: async (coordinates = "41.6520, -4.7286") => {
        const cityInfo = await window.GoHappyAI.getCityFromCoords(coordinates);
        const g = window.GoHappyAI._geoContext(cityInfo);
        const prompt = `${window.GoHappyAI._geoGuard(cityInfo)}${g.lang === 'en'
            ? `Create 2 fun 'Family Missions' (Quests) very specific to play TODAY based on REAL places near ${cityInfo.full} (${g.countryName}).`
            : `Crea 2 'Misiones Familiares' (Quests) divertidas y muy específicas para jugar HOY basadas en lugares REALES cerca de ${cityInfo.full} (${g.countryName}).`}
1. ${g.lang === 'en' ? 'Missions must have different difficulty: "easy", "medium", "hard"' : 'Las misiones deben tener dificultades distintas: "fácil", "media", "difícil"'}
2. ${g.lang === 'en' ? 'Points exactly: easy=50, medium=100, hard=200' : 'Puntos exactos: fácil=50, media=100, difícil=200'}
3. ${g.lang === 'en' ? 'Account for typical UK weather (rain → indoor)' : 'Ten en cuenta el clima típico de la zona (si llueve, busca interiores)'}
JSON: [ { "id":"q_ai_1", "title":"", "description":"", "type":"EXPLORE"|"PHOTO"|"GASTRO"|"SOCIAL"|"TRIVIA"|"ADVENTURE", "category":"Misión", "difficulty":"${g.lang === 'en' ? 'easy|medium|hard' : 'fácil|media|difícil'}", "points":100, "objectives":["",""], "totalSteps":2, "status":"active" } ]`;
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

        const g = window.GoHappyAI._geoContext(cityInfo);
        const prompt = `${window.GoHappyAI._geoGuard(cityInfo)}${g.lang === 'en'
            ? `You are GoHappy's family safety advisor. Generate REAL specific advice for TODAY (${todayStr} ${today.getDate()}/${today.getMonth()+1}/${today.getFullYear()}).

Location: ${cityInfo.full} (coords ${coordinates}). Country: ${g.countryName}.

${alertsContext}

INSTRUCTIONS:
1. Search REAL weather forecast TODAY in ${cityInfo.city} (Google Search).
2. Check active official warnings from ${g.weatherAuth} or Meteoalarm for that area today.
3. Combine weather + community alerts + season.
4. Return 2-3 sentences with REAL, USEFUL advice for families with kids.
5. Concrete info only, no empty phrases.

Example: "Today in London: 14°C cloudy, light rain afternoon. Met Office no warnings. If you go to the park, take a light raincoat. Low grass pollen risk."

Respond only the advice, no intro or closing.`
            : `Eres asesor de seguridad familiar de GoHappy. Genera un consejo REAL y específico para HOY (${todayStr} ${today.getDate()}/${today.getMonth()+1}/${today.getFullYear()}).

Ubicación: ${cityInfo.full} (coords ${coordinates}). País: ${g.countryName}.

${alertsContext}

INSTRUCCIONES:
1. Busca el CLIMA REAL previsto hoy en ${cityInfo.city} (Google Search).
2. Busca si hay AVISOS oficiales activos de ${g.weatherAuth}, Meteoalarm, o protección civil en esa zona hoy.
3. Combina clima + alertas comunitarias (si las hay) + estación del año.
4. Devuelve 2-3 frases con consejo REAL, ÚTIL y específico para familias con niños.
5. NO uses frases vacías tipo "Analizando..." o "Consulta a un profesional". Da info concreta.

Ejemplo: "Hoy en Valladolid: 18°C nublado, lluvia ligera por la tarde. AEMET sin avisos. Si vais al parque, llevad chubasquero ligero. Riesgo polen gramíneas medio."

Responde solo el consejo, sin introducción ni cierre.`}`;

        // useSearch:true → activa Search Grounding para clima/avisos reales
        return await window.GoHappyAI._callGemini(prompt, false, true);
    },

    // Generar Topic Diario para la Tribu
    getDailyTribuTopic: async (coordinates = "41.6520, -4.7286") => {
        const cityInfo = await window.GoHappyAI.getCityFromCoords(coordinates);
        const g = window.GoHappyAI._geoContext(cityInfo);
        const prompt = `${window.GoHappyAI._geoGuard(cityInfo)}${g.lang === 'en'
            ? `Generate a post for a parents' forum ('The Tribe') for ${cityInfo.full} (${g.countryName}). Interesting parenting debate/advice relevant to life in that specific UK city.`
            : `Genera un post para un foro de padres ('La Tribu') en ${cityInfo.full} (${g.countryName}). Debate/consejo de crianza relevante para la vida en esa ciudad española.`}
JSON: { "authorKey": "GoHappy_IA", "title": "${g.lang === 'en' ? 'Debate of the Day 🤖' : 'El Debate del Día 🤖'}", "content": "..." }`;
        return await window.GoHappyAI._callGemini(prompt, true);
    },

    // Obtener Noticias Locales (IA)
    getNews: async (coordinates = "41.6520, -4.7286") => {
        const cityInfo = await window.GoHappyAI.getCityFromCoords(coordinates);
        const g = window.GoHappyAI._geoContext(cityInfo);
        const prompt = `${window.GoHappyAI._geoGuard(cityInfo)}${g.lang === 'en'
            ? `Act as editor of a local family newspaper. Location: ${cityInfo.full}, ${g.countryName}.
Find and summarise 3-4 REAL RECENT news items from that ${g.countryName} city/county ONLY.
Topics: Education, parks, child health, ${g.councilWord} notices or family culture.
Sources: ${g.newspapers}.`
            : `Actúa como redactor jefe de un diario local familiar. Ubicación: ${cityInfo.full}, ${g.countryName}.
Busca y resume 3-4 NOTICIAS REALES Y RECIENTES de esa ciudad/provincia de ${g.countryName} EXCLUSIVAMENTE.
Temas: Educación, parques, sanidad infantil, avisos del ${g.councilWord} o cultura para familias.
Fuentes: ${g.newspapers}.`}
JSON: [ { "title": "", "summary": "", "sourceName": "", "link": "", "date": "${g.lang === 'en' ? 'Today' : 'Hoy'}" } ]`;
        return await window.GoHappyAI._callGemini(prompt, true);
    },

    // Obtener Eventos Culturales (IA)
    getEvents: async (coordinates = "41.6520, -4.7286") => {
        const cityInfo = await window.GoHappyAI.getCityFromCoords(coordinates);
        const g = window.GoHappyAI._geoContext(cityInfo);
        const prompt = `${window.GoHappyAI._geoGuard(cityInfo)}${g.lang === 'en'
            ? `Act as a children's cultural agenda. Location: ${cityInfo.full}, ${g.countryName}.
Find 3 REAL family events in that ${g.countryName} area THIS week. Prices in ${g.currency}.`
            : `Actúa como agenda cultural infantil. Ubicación: ${cityInfo.full}, ${g.countryName}.
Busca 3 eventos reales para familias en esa zona de ${g.countryName} esta semana. Precios en ${g.currency}.`}
JSON: [ { "title": "", "date": "", "location": "", "price": "", "lat": NUM, "lng": NUM } ]`;
        return await window.GoHappyAI._callGemini(prompt, true);
    },

    // Obtener Becas y Ayudas (IA)
    getBecas: async (coordinates = "41.6520, -4.7286") => {
        const cityInfo = await window.GoHappyAI.getCityFromCoords(coordinates);
        const g = window.GoHappyAI._geoContext(cityInfo);
        const enHeader = g.lang === 'en' ? `Act as an expert family benefits advisor for ${cityInfo.full}, ${g.countryName}. ONLY UK grants/benefits/family help schemes (e.g. Universal Credit, Child Benefit, Free Childcare hours, council schemes, school admissions). NEVER include Spanish or non-UK schemes.` : '';
        const esHeader = g.lang === 'es' ? `Actúa como asesor administrativo experto en familias para ${cityInfo.full}, ${g.countryName}. SOLO ayudas/becas/programas familiares españoles (ej. Bono Familia, ayudas autonómicas, comedor escolar, plazas escuela infantil). NUNCA incluyas programas no españoles.` : '';
        const prompt = `${window.GoHappyAI._geoGuard(cityInfo)}${enHeader}${esHeader}
        Identifica 3 AYUDAS O BECAS REALES (estatales de España, autonómicas o locales de esa provincia).
${g.lang === 'en'
    ? `Required details per scheme:
- title: Name of the scheme
- description: What it provides
- deadline: Application deadline (e.g. 'By 30 May')
- requirements: Main eligibility
- howToApply: Steps (e.g. 'Apply on gov.uk with Government Gateway')
- status: 'OPEN' or 'UPCOMING'`
    : `Detalles requeridos por ayuda:
- title: Nombre
- description: Para qué sirve
- deadline: Plazo (ej. 'Hasta el 30 de Mayo')
- requirements: Requisitos principales
- howToApply: Pasos (ej. 'Sede electrónica con Clave')
- status: 'PLAZO ABIERTO' o 'PRÓXIMAMENTE'`}
JSON: [ { "title": "", "description": "", "deadline": "", "requirements": "", "howToApply": "", "status": "", "statusColor": "green"|"orange", "link": "" } ]`;
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

            // Cache client-side la respuesta exitosa.
            // IMPORTANTE: NO cachear respuestas VACÍAS (array [] u objeto {}).
            // Si un fallo transitorio (grounding saturado, timeout) devuelve vacío,
            // cachearlo serviría "0 resultados" durante horas → eventos/planes en blanco.
            const isEmptyResult =
                (Array.isArray(result) && result.length === 0) ||
                (result && typeof result === 'object' && !Array.isArray(result) && Object.keys(result).length === 0);
            if (!isEmptyResult) {
                window.GoHappyAI._setCached(cacheKey, result);
            }
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


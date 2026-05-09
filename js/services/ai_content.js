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
        let prefsContext = "";
        if (preferences) {
            prefsContext = `
            CONTEXTO DE LA FAMILIA:
            - Miembros: ${preferences.adults} adultos y ${preferences.kids} niños (edades: ${preferences.ages}).
            - Preferencia de entorno: ${preferences.environment === 'Indoor' ? 'Sitios cerrados/resguardados' : preferences.environment === 'Outdoor' ? 'Al aire libre' : 'Ambos'}.
            - Presupuesto: ${preferences.budget === 'Free' ? 'Solo planes gratuitos' : 'Cualquier presupuesto'}.
            - Distancia: ${preferences.distance === 'Walking' ? 'Cerca, para ir andando' : preferences.distance === 'ShortDrive' ? 'A poca distancia en coche' : 'Cualquier distancia'}.
            `;
        }

        const prompt = `Actúa como un 'Concierge' Premium de ocio familiar. Ubicación GPS: ${coordinates}.
        ${prefsContext}
        Tu misión es generar planes "Done for you" (completos, listos para hacer hoy mismo). Eres el servicio estrella de la app.
        1. Identifica la CIUDAD de estas coordenadas y el clima de hoy.
        2. Diseña 3 PLANES INOLVIDABLES reales en esa ciudad que encajen perfectamente con la familia descrita.
        3. Si la familia busca 'Outdoor' pero hace mal clima, busca refugios creativos.
        4. Necesitamos datos altamente estructurados y premium para cada plan:
           - Título: Creativo y magnético.
           - Resumen: Breve introducción de por qué es perfecto para sus edades.
           - typeLabel: "🌳 Al aire libre", "🏠 A cubierto", o "⛅ Mixto".
           - distanceDesc: Estimación descriptiva (ej. "A 10 min en coche", "Paseo de 5 min").
           - highlights: Array de 2 o 3 frases cortas sobre qué lo hace especial.
           - packingList: Array de 2 a 4 cosas esenciales para llevar (ej. "Agua", "Calcetines antideslizantes", "Gorra").
           - Horarios sugeridos, duración y precios detallados.
           - Enlace oficial (si requiere tickets o info), si no, "".
           - Tip/Consejo experto para padres.
        Formato JSON estricto: [ { "title": "", "summary": "", "typeLabel": "", "distanceDesc": "", "location": "", "lat": NUM, "lng": NUM, "time": "", "duration": "", "price": "", "age": "", "highlights": ["", ""], "packingList": ["", ""], "tip": "", "link": "" } ]`;

        return await window.GoHappyAI._callGemini(prompt);
    },

    // Check usage limits for free users
    checkTodayLimit: () => {
        const user = window.GoHappyAuth.checkAuth();
        const isPremium = user && (user.level === 'Oro' || user.level === 'Premium' || user.isPremium);
        if (isPremium) return { canRequest: true };

        const today = new Date().toDateString();
        const usage = JSON.parse(localStorage.getItem('GoHappy_today_usage') || '{}');

        if (usage.date !== today) {
            usage.date = today;
            usage.count = 0;
        }

        if (usage.count >= 3) {
            return { canRequest: false, limit: 3 };
        }

        return { canRequest: true, usage };
    },

    incrementTodayUsage: () => {
        const today = new Date().toDateString();
        const usage = JSON.parse(localStorage.getItem('GoHappy_today_usage') || '{}');
        usage.date = today;
        usage.count = (usage.count || 0) + 1;
        localStorage.setItem('GoHappy_today_usage', JSON.stringify(usage));
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
        let alertsContext = "No hay alertas comunitarias reportadas cerca en este momento.";
        if (activeAlerts && activeAlerts.length > 0) {
            const alertsText = activeAlerts.map(a => `- ${a.title} en ${a.location}: ${a.description}`).join('\n');
            alertsContext = `ALERTAS COMUNITARIAS ACTUALES EN LA ZONA:\n${alertsText}`;
        }

        const prompt = `Actúa como asesor de seguridad familiar de GoHappy. Ubicación: ${coordinates}.
        1. Identifica la CIUDAD y el CLIMA ACTUAL REAL de esa zona.
        2. Tienes la siguiente información de incidentes reportada por otros padres en la app:
        ${alertsContext}
        3. Genera un breve y útil resumen de precaución para HOY. Combina el clima con estas alertas de la comunidad (si las hay).
        4. Si no hay alertas, da un consejo de salud estacional (ej: polen, abrigo).
        No uses frases genéricas como "Analizando tu zona". Da información directa y útil en 2 o 3 frases.`;

        return await window.GoHappyAI._callGemini(prompt, false); // False = Devuelve texto, no JSON
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

    // Helper para llamadas a Gemini — siempre via proxy autenticado
    _callGemini: async (prompt, expectJson = true) => {
        // Si el proxy no está activo, usar datos de demo
        if (!window.GEMINI_PROXY_ACTIVE || !window.GEMINI_PROXY_URL) {
            return window.GoHappyAI._getMockData(prompt);
        }

        try {
            // Obtener token de Firebase Auth para autenticar la llamada al proxy
            let idToken = null;
            try {
                const currentUser = window.GoHappyAuthReal.currentUser;
                if (currentUser) {
                    idToken = await currentUser.getIdToken(false); // false = no forzar refresco
                }
            } catch (e) {
                console.warn('[GoHappyAI] No se pudo obtener token:', e);
            }

            if (!idToken) {
                // Sin token = sin IA real. Usar datos de demo.
                return window.GoHappyAI._getMockData(prompt);
            }

            const response = await fetch(window.GEMINI_PROXY_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ prompt, expectJson }),
                signal: AbortSignal.timeout(28000) // 28s timeout
            });

            // Rate limit superado
            if (response.status === 429) {
                const err = await response.json().catch(() => ({}));
                window.GoHappyToast && window.GoHappyToast.warning(
                    err.error || 'Límite de consultas IA alcanzado por hoy. Vuelve mañana. 🌙', 5000
                );
                return window.GoHappyAI._getMockData(prompt);
            }

            // Error de auth
            if (response.status === 401) {
                return window.GoHappyAI._getMockData(prompt);
            }

            if (!response.ok) {
                console.error('[GoHappyAI] Proxy error:', response.status);
                return window.GoHappyAI._getMockData(prompt);
            }

            const data = await response.json();

            if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
                return window.GoHappyAI._getMockData(prompt);
            }

            const text = data.candidates[0].content.parts[0].text;

            if (expectJson) {
                try {
                    let clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
                    const s = Math.min(
                        clean.indexOf('{') !== -1 ? clean.indexOf('{') : Infinity,
                        clean.indexOf('[') !== -1 ? clean.indexOf('[') : Infinity
                    );
                    const e = Math.max(clean.lastIndexOf('}'), clean.lastIndexOf(']'));
                    if (s !== Infinity && e !== -1) clean = clean.substring(s, e + 1);
                    return JSON.parse(clean);
                } catch (e) {
                    console.error('[GoHappyAI] JSON parse error:', e);
                    return window.GoHappyAI._getMockData(prompt);
                }
            }
            return text.trim();

        } catch (e) {
            if (e.name === 'TimeoutError') {
                console.warn('[GoHappyAI] Timeout — usando datos de demo');
            } else {
                console.error('[GoHappyAI] Error de red:', e);
            }
            return window.GoHappyAI._getMockData(prompt);
        }
    },

    _getMockData: (prompt) => {
        const lowerPrompt = prompt.toLowerCase();
        // Fallback robusto para demos sin internet/clave - Centrado en Valladolid/Castilla y León
        if (lowerPrompt.includes('today') || lowerPrompt.includes('activities') || lowerPrompt.includes('hoy')) return [
            { id: 1, title: "Pícnic de Lujo en el Campo Grande", summary: "Una tarde entre pavos reales y patos en el corazón verde de la ciudad.", time: "16:00 - 19:00", duration: "3 horas", location: "Parque Campo Grande", lat: 41.6444, lng: -4.7303, price: "Gratis", age: "Todas las edades", typeLabel: "🌳 Al aire libre", distanceDesc: "A 5 min andando", highlights: ["Ver a los pavos reales en libertad", "Alquilar una barca en el lago"], packingList: ["Pan seco para los patos", "Mantel de cuadros", "Cámara de fotos"], tip: "Llegad antes de las 17h para coger buen sitio en la sombra." },
            { id: 2, title: "Exploradores de la Ciencia", summary: "Un viaje interactivo al universo en el planetario.", time: "Mañana o Tarde", duration: "2 horas", location: "Museo de la Ciencia", lat: 41.6385, lng: -4.7431, price: "Desde 5€", age: "4-15 años", typeLabel: "🏠 A cubierto", distanceDesc: "A 10 min en coche", highlights: ["Proyección especial en el planetario", "Sala de los sentidos para los más peques"], packingList: ["Entradas digitales", "Ganas de aprender"], tip: "Comprad las entradas del planetario online para evitar colas." },
            { id: 3, title: "Ruta de los Reyes y Leyendas", summary: "Paseo por el centro histórico descubriendo secretos y fuentes.", time: "Flexible", duration: "1.5 horas", location: "Plaza Mayor", lat: 41.6525, lng: -4.7286, price: "Gratis", age: "6-12 años", typeLabel: "⛅ Mixto", distanceDesc: "A 2 min andando", highlights: ["Descubrir el pasadizo secreto", "Helado en la plaza Mayor"], packingList: ["Calzado cómodo", "Agua", "Gorra"], tip: "Empezad en la estatua del Conde Ansúrez." }
        ];

        if (lowerPrompt.includes('news') || lowerPrompt.includes('noticias')) return [
            { id: 101, title: "Nuevas ayudas a la Conciliación JCYL", summary: "La Junta de Castilla y León anuncia el nuevo programa de apoyo para familias con niños menores de 3 años.", source: "https://www.jcyl.es", sourceName: "Junta de Castilla y León", date: "Hoy" },
            { id: 102, title: "Valladolid amplía carriles bici escolares", summary: "El ayuntamiento mejora la seguridad en los accesos a los centros educativos del barrio de Parquesol.", source: "https://www.valladolid.es", sourceName: "Ayto. Valladolid", date: "Ayer" }
        ];

        if (lowerPrompt.includes('events') || lowerPrompt.includes('eventos')) return [
            { id: 201, title: "Taller de Teatro Infantil", date: "Próximo Sábado", location: "Teatro Calderón", price: "3€", lat: 41.6550, lng: -4.7240 }
        ];

        if (lowerPrompt.includes('becas') || lowerPrompt.includes('ayudas')) return [
            { title: "Ayudas de Comedor", description: "Beca de comedor para rentas bajas.", status: "PLAZO ABIERTO", statusColor: "green", linkText: "Bases" }
        ];

        if (lowerPrompt.includes('lugares') || lowerPrompt.includes('locations') || lowerPrompt.includes('guía turístico')) return [
            { id: 301, name: "Parque Ribera de Castilla", type: "park", lat: 41.6620, lng: -4.7250, rating: 4.8, reviews: 310 },
            { id: 302, name: "Teatro Zorrilla Infantil", type: "theater", lat: 41.6525, lng: -4.7290, rating: 4.5, reviews: 154 },
            { id: 303, name: "Ludoteca La Magia", type: "kidzone", lat: 41.6410, lng: -4.7400, rating: 4.9, reviews: 89 },
            { id: 304, name: "Restaurante Kid-Friendly El Parque", type: "food", lat: 41.6510, lng: -4.7320, rating: 4.3, reviews: 205 }
        ];

        return [];
    }
};


window.KidoaAI = {
    // Especialización en Crianza
    SYSTEM_PROMPT: `Eres KIDOA IA, la asistente oficial de la App KIDOA, experta líder en crianza consciente, salud infantil (0-15 años), psicología positiva y nutrición. 
    Tu misión es ayudar a padres modernos a encontrar planes y soluciones basados ESTRICTAMENTE en su zona geográfica actual.
    - Estilo: Empático, ultra-personalizado, premium.
    - Geografía: Identifica SIEMPRE la ciudad y provincia de las coordenadas proporcionadas y limita la información a esa zona.
    - Seguridad: Si detectas consultas médicas críticas, ofrece consejos de calma pero siempre recomienda visitar al pediatra.`,

    // Buscar Noticias Regionales
    getNews: async (coordinates = "41.6520, -4.7286") => {
        const prompt = `Actúa como periodista local. Ubicación del usuario: ${coordinates}.
        1. Identifica la CIUDAD y PROVINCIA de estas coordenadas.
        2. Busca 3 noticias o avisos oficiales REALES de HOY sobre crianza, parques, colegios o vida familiar específicos de esa ciudad o provincia.
        3. Prioriza fuentes oficiales (ayuntamientos, juntas regionales, diarios locales).
        4. No menciones otras regiones. Solo información de su zona o provincia autonoma.
        Formato JSON: [ { "title": "", "summary": "", "link": "url", "sourceName": "Fuente Local", "date": "Hoy" } ]`;

        return await window.KidoaAI._callGemini(prompt);
    },

    // Buscar Eventos Infantiles (0-15 años)
    getEvents: async (coordinates = "41.6520, -4.7286") => {
        const prompt = `Busca eventos infantiles (0-15 años) cerca de ${coordinates}.
        1. Identifica la CIUDAD de estas coordenadas.
        2. Busca eventos REALES para los próximos 7 días: teatro infantil, música, aire libre, talleres.
        3. Solo eventos en su municipio o municipios colindantes (su zona).
        Formato JSON: [ { "title": "", "date": "", "location": "Sitio Real", "price": "", "lat": NUM, "lng": NUM } ]`;

        return await window.KidoaAI._callGemini(prompt);
    },

    // Buscar Becas y Ayudas
    getBecas: async (coordinates = "41.6520, -4.7286") => {
        const prompt = `Ubicación: ${coordinates}.
        1. Identifica la PROVINCIA y COMUNIDAD AUTÓNOMA.
        2. Busca 3 becas o ayudas familiares activas en el boletín oficial de esa comunidad (ej: BOCYL, DOGC, BOCM, etc.) o del ayuntamiento local.
        3. Keywords: niños, crianza, infantil, educación.
        Formato JSON: [ { "title": "", "description": "", "status": "PLAZO ABIERTO", "statusColor": "green", "linkText": "Ver bases oficiales" } ]`;

        return await window.KidoaAI._callGemini(prompt);
    },

    getTodayActivities: async (coordinates = "41.6520, -4.7286", preferences = null) => {
        let prefsContext = "";
        if (preferences) {
            prefsContext = `
            CONTEXTO DE LA FAMILIA:
            - Miembros: ${preferences.adults} adultos y ${preferences.kids} niños (edades: ${preferences.ages}).
            - Preferencia: ${preferences.environment} (${preferences.environment === 'Indoor' ? 'Sitios cerrados/resguardados' : preferences.environment === 'Outdoor' ? 'Al aire libre' : 'Ambos'}).
            - Presupuesto: ${preferences.budget === 'Free' ? 'Solo planes gratuitos' : 'Cualquier presupuesto'}.
            - Distancia: ${preferences.distance === 'Walking' ? 'Cerca, para ir andando' : preferences.distance === 'ShortDrive' ? 'A poca distancia en coche' : 'Cualquier distancia'}.
            `;
        }

        const prompt = `Actúa como un planificador de ocio familiar experto y creativo. Ubicación del usuario: ${coordinates}.
        ${prefsContext}
        Tu misión es generar el hub "TODAY" (¿Qué hacer hoy?) totalmente personalizado.
        1. Identifica la CIUDAD y PROVINCIA de estas coordenadas.
        2. Genera 3-4 actividades para HOY mismo que encajen con el contexto familiar arriba descrito.
        3. IMPORTANTE: Sé muy específico con el clima. Si es invierno o llueve, prioriza ${preferences?.environment === 'Outdoor' ? 'sitios con encanto pero protegidos' : 'interiores'}. 
        4. No te limites solo a eventos oficiales. CREA PLANES basados en la geografía local:
           - "Picnic familiar en el Parque [Nombre]" (detallando qué llevar y mejor zona).
           - "Ruta de exploración de estatuas/fuentes por el centro".
           - "Tarde de juegos tradicionales en la Plaza [Nombre]".
           - Museos, cine o talleres REALES de la zona.
        5. Para cada actividad, necesito: 
           - Título MUY ATRACTIVO y EMOCIONANTE.
           - Resumen breve inspirador que explique POR QUÉ es ideal para niños de esas edades.
           - Horarios sugeridos para HOY.
           - Ubicación exacta (nombre del sitio real).
           - Coordenadas REALES (lat, lng).
           - Precio detallado (ej: "Gratis", "12€/adulto, 5€/niño", "Desde 10€").
           - Enlace oficial para comprar entradas o ver info (si existe, si no, vacío).
           - Edad recomendada específica.
           - DURACIÓN estimada (ej: "2 horas", "Toda la tarde").
           - CONSEJO CLAVE (ej: "Llevad calzado cómodo", "Reservad antes de ir").
        6. Formato JSON estricto: [ { "title": "", "summary": "", "time": "", "location": "", "lat": NUM, "lng": NUM, "price": "", "link": "", "age": "", "duration": "", "tip": "" } ]`;

        return await window.KidoaAI._callGemini(prompt);
    },

    // Check usage limits for free users
    checkTodayLimit: () => {
        const user = window.KidoaAuth.checkAuth();
        const isPremium = user && (user.level === 'Oro' || user.level === 'Premium' || user.isPremium);
        if (isPremium) return { canRequest: true };

        const today = new Date().toDateString();
        const usage = JSON.parse(localStorage.getItem('kidoa_today_usage') || '{}');

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
        const usage = JSON.parse(localStorage.getItem('kidoa_today_usage') || '{}');
        usage.count = (usage.count || 0) + 1;
        localStorage.setItem('kidoa_today_usage', JSON.stringify(usage));
    },

    // Generador Dinámico de Mapa (Basado en Coordenadas)
    getDynamicLocations: async (coordinates = "41.6520, -4.7286") => {
        const prompt = `Actúa como guía turístico local familiar. Genera 8 sitios reales increíbles para ir con niños (parques, museos, ludotecas, restaurantes kid-friendly) en un radio cercano de las coordenadas GPS: ${coordinates}.
        Devuélvelos en formato JSON estricto para mapearlos directamente.
        Asegúrate de incluir sus nombres reales locales, no te inventes nombres de comercios si no existen, dales coordenadas muy cercanas al usuario.
        Formato esperado:
        [ { "id": UID_NUMERICO_UNICO, "name": "Nombre Real", "type": "park"|"museum"|"school"|"theater"|"kidzone"|"food", "lat": NUMERO, "lng": NUMERO, "rating": NUMERO_4_A_5, "reviews": NUMERO } ]`;

        return await window.KidoaAI._callGemini(prompt);
    },

    // Búsqueda Semántica Dinámica
    searchDynamicLocations: async (query, coordinates = "41.6520, -4.7286") => {
        const prompt = `El usuario, ubicado en las coordenadas: ${coordinates}, ha buscado: "${query}".
        Recomienda 4 o 5 lugares locales reales que resuelvan perfectamente esta necesidad.
        Formato esperado JSON:
        [ { "id": UID_NUMERICO_UNICO, "name": "Nombre Real", "type": "park"|"museum"|"school"|"theater"|"kidzone"|"food"|"generic", "lat": NUMERO, "lng": NUMERO, "rating": 4.8, "reviews": 120 } ]`;

        return await window.KidoaAI._callGemini(prompt);
    },

    // Generar Misiones Contextuales
    generateLocalQuests: async (coordinates = "41.6520, -4.7286") => {
        const prompt = `Crea 2 'Misiones Familiares' (Quests) divertidas y muy específicas para jugar hoy basadas en lugares REALES cerca de estas coordenadas GPS: ${coordinates}.
        Ejemplo: "Encuentra la estatua en la Plaza de Zorrilla", "Haz un mini picnic en el Parque Ribera de Castilla".
        Ten en cuenta el clima actual típico de la zona.
        Formato JSON estricto: [ { "id": "q_ai_1", "title": "Nombre divertido", "description": "Breve descripción", "type": "EXPLORATION"|"CREATIVITY", "category": "Misión", "difficulty": "fácil"|"media", "points": 100, "objectives": ["Paso 1", "Paso 2"], "totalSteps": 2, "status": "active" } ]`;

        return await window.KidoaAI._callGemini(prompt);
    },

    // Generar Alerta/Consejo de Seguridad (Clima o Noticias)
    getDailySafeInsight: async (coordinates = "41.6520, -4.7286") => {
        const prompt = `Genera un consejo rápido de seguridad o meteorología infantil (1 o 2 frases) para una familia que se encuentra ahora mismo en la zona de las coordenadas GPS: ${coordinates}.
        Ejemplo: "Atención: Hoy se esperan lluvias a partir de las 17h, no olvides llevar paraguas y calzado adecuado."
        Formato texto plano.`;

        return await window.KidoaAI._callGemini(prompt, false); // False = Devuelve texto, no JSON
    },

    // Generar Topic Diario para la Tribu
    getDailyTribuTopic: async (coordinates = "41.6520, -4.7286") => {
        const prompt = `Genera un post para un foro de padres ('La Tribu') en la ciudad correspondiente a las coordenadas GPS: ${coordinates}.
        Debe ser un debate o consejo interesante sobre crianza y la vida en esa ciudad específica.
        Formato JSON estricto: { "authorKey": "KIDOA_IA", "title": "El Debate del Día 🤖", "content": "Contenido del debate..." }`;
        return await window.KidoaAI._callGemini(prompt, true);
    },

    // Chat Especializado
    chat: async (userMessage, history = []) => {
        const prompt = `${window.KidoaAI.SYSTEM_PROMPT}\n\nHistorial: ${JSON.stringify(history)}\nUsuario: ${userMessage}`;
        const response = await window.KidoaAI._callGemini(prompt, false); // false = return text, not json
        return response;
    },

    // Helper para llamadas a Gemini
    _callGemini: async (prompt, expectJson = true) => {
        if (!window.GEMINI_KEY || window.GEMINI_KEY.includes('PEGAR_AQUI')) {
            return window.KidoaAI._getMockData(prompt);
        }

        try {
            const requestBody = {
                contents: [{ parts: [{ text: prompt }] }]
            };

            if (expectJson) {
                requestBody.generationConfig = { response_mime_type: "application/json" };
            }

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${window.GEMINI_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Gemini API Error:", response.status, errorText);
                return window.KidoaAI._getMockData(prompt);
            }

            const data = await response.json();

            if (!data.candidates || !data.candidates[0].content) {
                console.error("Gemini returned no content:", data);
                return window.KidoaAI._getMockData(prompt);
            }

            const text = data.candidates[0].content.parts[0].text;

            if (expectJson) {
                try {
                    let cleanText = text.replace(/```json/gi, '').replace(/```/g, '').trim();
                    const firstBrace = cleanText.indexOf('{');
                    const firstBracket = cleanText.indexOf('[');
                    const lastBrace = cleanText.lastIndexOf('}');
                    const lastBracket = cleanText.lastIndexOf(']');

                    let startIndex = Math.min(
                        firstBrace !== -1 ? firstBrace : Infinity,
                        firstBracket !== -1 ? firstBracket : Infinity
                    );
                    let endIndex = Math.max(
                        lastBrace !== -1 ? lastBrace : -1,
                        lastBracket !== -1 ? lastBracket : -1
                    );

                    if (startIndex !== Infinity && endIndex !== -1) {
                        cleanText = cleanText.substring(startIndex, endIndex + 1);
                    }

                    return JSON.parse(cleanText);
                } catch (e) {
                    console.error("Error parsing Gemini JSON:", text, e);
                    return window.KidoaAI._getMockData(prompt);
                }
            }
            return text;
        } catch (e) {
            console.error("Network or execution error en KidoaAI:", e);
            return window.KidoaAI._getMockData(prompt);
        }
    },

    _getMockData: (prompt) => {
        const lowerPrompt = prompt.toLowerCase();
        // Fallback robusto para demos sin internet/clave - Centrado en Valladolid/Castilla y León
        if (lowerPrompt.includes('today') || lowerPrompt.includes('activities') || lowerPrompt.includes('hoy')) return [
            { id: 1, title: "Pícnic en el Campo Grande", summary: "Disfruta de una tarde entre pavos reales y patos en el corazón de Valladolid. ¡Llevad pan para los patos!", time: "16:00 - 19:00", location: "Parque Campo Grande", lat: 41.6444, lng: -4.7303, price: "Gratis", age: "Todas las edades" },
            { id: 2, title: "Ruta de Fuentes Monumentales", summary: "Explora las fuentes más famosas del centro: desde la Fuente de Cervantes hasta la Plaza Mayor.", time: "Mañana o Tarde", location: "Plaza Mayor", lat: 41.6525, lng: -4.7286, price: "Gratis", age: "6-12 años" },
            { id: 3, title: "Visita al Museo de la Ciencia", summary: "Descubre el planetario y las salas interactivas. Ideal para un día nublado.", time: "10:00 - 18:00", location: "Museo de la Ciencia", lat: 41.6385, lng: -4.7431, price: "5€", age: "4-15 años" }
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
